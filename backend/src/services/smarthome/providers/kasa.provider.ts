import {
  ISmartHomeProvider,
  ActionResult,
  ActionContext,
  ValidationResult,
  ConfigField,
} from '../types';
import log from '../../../utils/logger';

/**
 * TP-Link Kasa Provider — controls Kasa smart devices over local network.
 * 
 * Kasa devices (smart plugs, bulbs, switches) can be controlled locally
 * without cloud dependency using their local API on port 9999.
 * 
 * The protocol uses a simple XOR cipher for obfuscation (not encryption).
 * This provider uses the HTTP local API available on newer Kasa devices.
 * 
 * Supported devices:
 *   - HS100/HS103/HS105 (Smart Plug)
 *   - HS110 (Smart Plug with Energy Monitoring)
 *   - KP115 (Smart Plug Mini)
 *   - LB100/LB110/LB120/LB130 (Smart Bulbs)
 *   - HS200/HS210/HS220 (Smart Switches)
 */
export class KasaProvider implements ISmartHomeProvider {
  name = 'kasa';
  displayName = 'TP-Link Kasa';
  supportedActions = ['turn_on', 'turn_off', 'toggle'];

  async execute(
    action: string,
    config: Record<string, any>,
    context: ActionContext
  ): Promise<ActionResult> {
    const { deviceIp, port = 9999 } = config;

    if (!deviceIp) {
      return {
        success: false,
        message: 'Kasa device IP address is required. Find it in the Kasa app or your router DHCP table.',
      };
    }

    log.info('KASA', `${action} → device at ${deviceIp}:${port}`);

    try {
      let command: Record<string, any>;

      switch (action) {
        case 'turn_on':
          command = {
            system: { set_relay_state: { state: 1 } },
          };
          break;
        case 'turn_off':
          command = {
            system: { set_relay_state: { state: 0 } },
          };
          break;
        case 'toggle':
          // Get current state first
          const stateResult = await this.sendCommand(deviceIp, port, {
            system: { get_sysinfo: {} },
          });

          if (stateResult.success && stateResult.data?.system?.get_sysinfo) {
            const currentState = stateResult.data.system.get_sysinfo.relay_state;
            command = {
              system: { set_relay_state: { state: currentState ? 0 : 1 } },
            };
          } else {
            // Fallback: turn on
            command = {
              system: { set_relay_state: { state: 1 } },
            };
          }
          break;
        default:
          return { success: false, message: `Unknown action: ${action}` };
      }

      const result = await this.sendCommand(deviceIp, port, command);

      if (result.success) {
        log.info('KASA', `[ OK ] ${action} successful for ${deviceIp}`);
        return {
          success: true,
          message: `Kasa device ${deviceIp}: ${action}`,
          data: result.data,
        };
      } else {
        log.warn('KASA', `[FAIL] Command failed: ${result.message}`);
        return result;
      }
    } catch (error: any) {
      log.error('KASA', `Connection failed: ${error.message}`);
      return {
        success: false,
        message: `Cannot reach Kasa device at ${deviceIp}: ${error.message}`,
      };
    }
  }

  /**
   * Send a command to the Kasa device using the local HTTP API.
   * 
   * Note: Traditional Kasa protocol uses TCP port 9999 with XOR cipher.
   * Newer firmware versions support a local HTTP API on port 80.
   * This implementation tries HTTP first, as it's simpler.
   */
  private async sendCommand(
    ip: string,
    port: number,
    command: Record<string, any>
  ): Promise<ActionResult> {
    try {
      // Try local HTTP API (newer firmware)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`http://${ip}/app?token=`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'passthrough', params: { requestData: JSON.stringify(command) } }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json();
        return {
          success: true,
          message: 'Command sent successfully',
          data: data.result ? JSON.parse(data.result.responseData || '{}') : data,
        };
      }

      return {
        success: false,
        message: `HTTP ${response.status} from device`,
      };
    } catch (error: any) {
      // HTTP API not available — device may need the legacy TCP protocol
      // which requires the tplink-smarthome-api npm package
      return {
        success: false,
        message: `Local API unavailable. Device may need the 'tplink-smarthome-api' npm package for legacy TCP protocol. Error: ${error.message}`,
      };
    }
  }

  validate(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];

    if (!config.deviceIp) {
      errors.push('Device IP address is required');
    } else {
      // Basic IP format check
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(config.deviceIp)) {
        errors.push('Invalid IP address format');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  getConfigSchema(): ConfigField[] {
    return [
      {
        key: 'deviceIp',
        label: 'Device IP Address',
        type: 'string',
        required: true,
        description: 'Local IP of the Kasa device (find in Kasa app → Device Info, or check your router)',
      },
      {
        key: 'port',
        label: 'Port',
        type: 'number',
        required: false,
        default: 9999,
        description: 'Device port (default: 9999)',
      },
    ];
  }
}
