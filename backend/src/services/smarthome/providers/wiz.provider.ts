import {
  ISmartHomeProvider,
  ActionResult,
  ActionContext,
  ValidationResult,
  ConfigField,
} from '../types';
import log from '../../../utils/logger';
import dgram from 'dgram';

/**
 * WiZ Provider — controls WiZ smart lights over local network (UDP).
 * 
 * WiZ lights (Havells WiZ, Philips WiZ, Signify WiZ) communicate via
 * UDP on port 38899 using JSON payloads. No cloud, no bridge, no API keys.
 * 
 * Setup:
 *   1. Connect the WiZ bulb to your WiFi using the WiZ app
 *   2. Find the bulb's local IP from:
 *      - WiZ app → Bulb settings → "About" section
 *      - Or your router's DHCP client list
 *   3. Use that IP in the config below
 * 
 * Supported commands:
 *   - turn_on / turn_off / toggle
 *   - set_brightness (0-100%)
 *   - set_color_temp (2200K-6500K)
 *   - set_color (RGB)
 *   - set_scene (WiZ built-in scenes)
 * 
 * WiZ Scene IDs:
 *   1: Ocean, 2: Romance, 3: Sunset, 4: Party, 5: Fireplace,
 *   6: Cozy, 7: Forest, 8: Pastel Colors, 9: Wake Up, 10: Bedtime,
 *   11: Warm White, 12: Daylight, 13: Cool White, 14: Night Light,
 *   15: Focus, 16: Relax, 17: True Colors, 18: TV Time,
 *   19: Plant Growth, 20: Spring, 21: Summer, 22: Fall, 23: Deep Dive,
 *   24: Jungle, 25: Mojito, 26: Club, 27: Christmas, 28: Halloween,
 *   29: Candlelight, 30: Golden White, 31: Pulse, 32: Steampunk
 */
export class WizProvider implements ISmartHomeProvider {
  name = 'wiz';
  displayName = 'WiZ (Havells / Signify)';
  supportedActions = [
    'turn_on',
    'turn_off',
    'toggle',
    'set_brightness',
    'set_color_temp',
    'set_color',
    'set_scene',
  ];

  private readonly WIZ_PORT = 38899;
  private readonly UDP_TIMEOUT = 3000;

  async execute(
    action: string,
    config: Record<string, any>,
    context: ActionContext
  ): Promise<ActionResult> {
    const { deviceIp } = config;

    if (!deviceIp) {
      return {
        success: false,
        message: 'WiZ bulb IP address is required. Find it in the WiZ app or your router DHCP table.',
      };
    }

    log.info('WIZ', `${action} → bulb at ${deviceIp}:${this.WIZ_PORT}`);

    try {
      let wizCommand: Record<string, any>;

      const buildParams = (cfg: Record<string, any>) => {
        const p: Record<string, any> = {};
        if (cfg.brightness !== undefined) p.dimming = Math.max(10, Math.min(100, cfg.brightness));
        
        if (cfg.sceneId !== undefined && action === 'set_scene') {
          p.sceneId = cfg.sceneId;
          return p;
        }

        let r = -1, g = -1, b = -1;
        if (cfg.colorHex && typeof cfg.colorHex === 'string') {
          const hex = cfg.colorHex.replace(/^#/, '').toLowerCase();
          if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
          }
        } else if (cfg.r !== undefined || cfg.g !== undefined || cfg.b !== undefined) {
          r = Math.max(0, Math.min(255, cfg.r || 255));
          g = Math.max(0, Math.min(255, cfg.g || 255));
          b = Math.max(0, Math.min(255, cfg.b || 255));
        }

        const isWhite = r === 255 && g === 255 && b === 255;
        const hasColor = r !== -1;

        if (action === 'set_color') {
          if (isWhite) {
            // Pure white on RGB LEDs looks purple/blue. Route to dedicated white LEDs.
            p.temp = cfg.colorTemp || 4000;
          } else {
            p.r = r; p.g = g; p.b = b;
          }
        } else if (action === 'set_color_temp') {
          p.temp = cfg.colorTemp !== undefined ? Math.max(2200, Math.min(6500, cfg.colorTemp)) : 4000;
        } else {
          // For toggle/turn_on: prioritize non-white color, then temp, then scene
          if (hasColor && !isWhite) {
            p.r = r; p.g = g; p.b = b;
          } else if (cfg.colorTemp !== undefined) {
            p.temp = Math.max(2200, Math.min(6500, cfg.colorTemp));
          } else if (cfg.sceneId !== undefined) {
            p.sceneId = cfg.sceneId;
          } else if (isWhite) {
            p.temp = 4000; // Fallback for #ffffff
          }
        }
        
        return p;
      };

      switch (action) {
        case 'turn_on':
        case 'set_brightness':
        case 'set_color_temp':
        case 'set_color':
        case 'set_scene': {
          const params: any = { state: true, ...buildParams(config) };
          wizCommand = { method: 'setPilot', params };
          break;
        }

        case 'turn_off':
          wizCommand = { method: 'setPilot', params: { state: false } };
          break;

        case 'toggle': {
          // Get current state first
          const state = await this.sendUDP(deviceIp, { method: 'getPilot' });
          if (state.success && state.data?.result) {
            const isOn = state.data.result.state;
            const params: any = { state: !isOn };
            if (!isOn) {
              // If we are turning it ON, apply the rest of the config (colors, brightness)
              Object.assign(params, buildParams(config));
            }
            wizCommand = { method: 'setPilot', params };
          } else {
            // Fallback: just turn on with config
            wizCommand = { method: 'setPilot', params: { state: true, ...buildParams(config) } };
          }
          break;
        }

        default:
          return { success: false, message: `Unknown action: ${action}` };
      }

      const result = await this.sendUDP(deviceIp, wizCommand);

      if (result.success) {
        log.info('WIZ', `[ OK ] ${action} successful for ${deviceIp}`);
        return {
          success: true,
          message: `WiZ bulb ${deviceIp}: ${action}`,
          data: result.data,
        };
      } else {
        log.warn('WIZ', `[FAIL] ${action} failed: ${result.message}`);
        return result;
      }
    } catch (error: any) {
      log.error('WIZ', `Error: ${error.message}`);
      return {
        success: false,
        message: `WiZ error: ${error.message}`,
      };
    }
  }

  /**
   * Send a UDP command to the WiZ bulb and wait for response.
   * WiZ uses UDP port 38899 with JSON payloads.
   */
  private sendUDP(
    ip: string,
    command: Record<string, any>
  ): Promise<ActionResult> {
    return new Promise((resolve) => {
      const socket = dgram.createSocket('udp4');
      const message = Buffer.from(JSON.stringify(command));
      let resolved = false;

      // Timeout handler
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          socket.close();
          resolve({
            success: false,
            message: `WiZ bulb at ${ip} did not respond within ${this.UDP_TIMEOUT}ms`,
          });
        }
      }, this.UDP_TIMEOUT);

      // Listen for response
      socket.on('message', (msg) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          socket.close();

          try {
            const response = JSON.parse(msg.toString());

            if (response.error) {
              resolve({
                success: false,
                message: `WiZ error: ${JSON.stringify(response.error)}`,
                data: response,
              });
            } else {
              resolve({
                success: true,
                message: 'Command accepted',
                data: response,
              });
            }
          } catch {
            resolve({
              success: true,
              message: 'Command sent (unparseable response)',
              data: { raw: msg.toString() },
            });
          }
        }
      });

      // Error handler
      socket.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          socket.close();
          resolve({
            success: false,
            message: `UDP error: ${err.message}`,
          });
        }
      });

      // Send the command
      socket.send(message, this.WIZ_PORT, ip, (err) => {
        if (err && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          socket.close();
          resolve({
            success: false,
            message: `Failed to send UDP packet: ${err.message}`,
          });
        }
      });
    });
  }

  validate(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];

    if (!config.deviceIp) {
      errors.push('Bulb IP address is required');
    } else {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(config.deviceIp)) {
        errors.push('Invalid IP address format');
      }
    }

    if (config.brightness !== undefined) {
      if (config.brightness < 10 || config.brightness > 100) {
        errors.push('Brightness must be between 10 and 100');
      }
    }

    if (config.colorTemp !== undefined) {
      if (config.colorTemp < 2200 || config.colorTemp > 6500) {
        errors.push('Color temperature must be between 2200K and 6500K');
      }
    }

    if (config.sceneId !== undefined) {
      if (config.sceneId < 1 || config.sceneId > 32) {
        errors.push('Scene ID must be between 1 and 32');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  getConfigSchema(): ConfigField[] {
    return [
      {
        key: 'deviceIp',
        label: 'Bulb IP Address',
        type: 'string',
        required: true,
        description: 'Local IP of the WiZ bulb (find in WiZ app → Bulb → About, or check your router)',
      },
      {
        key: 'brightness',
        label: 'Brightness (%)',
        type: 'number',
        required: false,
        default: 100,
        description: 'Brightness level (10-100). WiZ minimum is 10%.',
      },
      {
        key: 'colorTemp',
        label: 'Color Temperature (K)',
        type: 'number',
        required: false,
        default: 4000,
        description: 'Color temperature in Kelvin (2200 = warm, 6500 = cool daylight). Used by set_color_temp action.',
      },
      {
        key: 'colorHex',
        label: 'Color',
        type: 'color',
        required: false,
        default: '#ffffff',
        description: 'Choose a color. Used by set_color action.',
      },
      {
        key: 'sceneId',
        label: 'Scene ID',
        type: 'select',
        required: false,
        description: 'WiZ built-in scene. Used by set_scene action.',
        options: [
          { label: '1 — Ocean', value: '1' },
          { label: '2 — Romance', value: '2' },
          { label: '3 — Sunset', value: '3' },
          { label: '4 — Party', value: '4' },
          { label: '5 — Fireplace', value: '5' },
          { label: '6 — Cozy', value: '6' },
          { label: '7 — Forest', value: '7' },
          { label: '9 — Wake Up', value: '9' },
          { label: '10 — Bedtime', value: '10' },
          { label: '11 — Warm White', value: '11' },
          { label: '12 — Daylight', value: '12' },
          { label: '13 — Cool White', value: '13' },
          { label: '14 — Night Light', value: '14' },
          { label: '15 — Focus', value: '15' },
          { label: '16 — Relax', value: '16' },
          { label: '18 — TV Time', value: '18' },
          { label: '27 — Christmas', value: '27' },
          { label: '28 — Halloween', value: '28' },
          { label: '29 — Candlelight', value: '29' },
          { label: '30 — Golden White', value: '30' },
        ],
      },
    ];
  }
}
