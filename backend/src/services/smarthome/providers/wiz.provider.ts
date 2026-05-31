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

      switch (action) {
        case 'turn_on': {
          const params: any = { state: true };
          if (config.brightness !== undefined) {
            params.dimming = Math.max(10, Math.min(100, config.brightness));
          }
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
            wizCommand = { method: 'setPilot', params: { state: !isOn } };
          } else {
            // Fallback: just turn on
            wizCommand = { method: 'setPilot', params: { state: true } };
          }
          break;
        }

        case 'set_brightness': {
          const brightness = Math.max(10, Math.min(100, config.brightness || 100));
          wizCommand = {
            method: 'setPilot',
            params: { state: true, dimming: brightness },
          };
          break;
        }

        case 'set_color_temp': {
          // WiZ supports 2200K to 6500K
          const temp = Math.max(2200, Math.min(6500, config.colorTemp || 4000));
          const params: any = { state: true, temp };
          if (config.brightness !== undefined) {
            params.dimming = Math.max(10, Math.min(100, config.brightness));
          }
          wizCommand = { method: 'setPilot', params };
          break;
        }

        case 'set_color': {
          const r = Math.max(0, Math.min(255, config.r || 255));
          const g = Math.max(0, Math.min(255, config.g || 255));
          const b = Math.max(0, Math.min(255, config.b || 255));
          const params: any = { state: true, r, g, b };
          if (config.brightness !== undefined) {
            params.dimming = Math.max(10, Math.min(100, config.brightness));
          }
          wizCommand = { method: 'setPilot', params };
          break;
        }

        case 'set_scene': {
          const sceneId = config.sceneId || 1;
          wizCommand = {
            method: 'setPilot',
            params: { state: true, sceneId },
          };
          break;
        }

        default:
          return { success: false, message: `Unknown action: ${action}` };
      }

      const result = await this.sendUDP(deviceIp, wizCommand);

      if (result.success) {
        log.info('WIZ', `✅ ${action} successful for ${deviceIp}`);
        return {
          success: true,
          message: `WiZ bulb ${deviceIp}: ${action}`,
          data: result.data,
        };
      } else {
        log.warn('WIZ', `❌ ${action} failed: ${result.message}`);
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
        key: 'r',
        label: 'Red (RGB)',
        type: 'number',
        required: false,
        description: 'Red channel 0-255. Used by set_color action.',
      },
      {
        key: 'g',
        label: 'Green (RGB)',
        type: 'number',
        required: false,
        description: 'Green channel 0-255. Used by set_color action.',
      },
      {
        key: 'b',
        label: 'Blue (RGB)',
        type: 'number',
        required: false,
        description: 'Blue channel 0-255. Used by set_color action.',
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
