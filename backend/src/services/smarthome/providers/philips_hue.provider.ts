import {
  ISmartHomeProvider,
  ActionResult,
  ActionContext,
  ValidationResult,
  ConfigField,
} from '../types';
import log from '../../../utils/logger';

/**
 * Philips Hue Provider — controls Hue lights via the local Bridge API.
 * 
 * The Hue Bridge exposes a REST API on your local network:
 *   PUT http://<bridge-ip>/api/<api-key>/lights/<id>/state
 * 
 * To get your API key:
 *   1. Find bridge IP at https://discovery.meethue.com
 *   2. Press the link button on the bridge
 *   3. POST to http://<bridge-ip>/api with {"devicetype": "rfid_auth"}
 *   4. Save the returned username as your apiKey
 * 
 * This is a READY-TO-USE implementation — just configure bridgeIp, apiKey, and lightId.
 */
export class PhilipsHueProvider implements ISmartHomeProvider {
  name = 'philips_hue';
  displayName = 'Philips Hue';
  supportedActions = ['turn_on', 'turn_off', 'toggle', 'set_brightness', 'set_color'];

  async execute(
    action: string,
    config: Record<string, any>,
    context: ActionContext
  ): Promise<ActionResult> {
    const { bridgeIp, apiKey, lightId, groupId } = config;

    if (!bridgeIp || !apiKey) {
      return {
        success: false,
        message: 'Hue Bridge IP and API key are required. See provider docs for setup.',
      };
    }

    const targetType = groupId ? 'groups' : 'lights';
    const targetId = groupId || lightId;

    if (!targetId) {
      return { success: false, message: 'Either lightId or groupId is required' };
    }

    const stateEndpoint = targetType === 'groups' ? 'action' : 'state';
    const url = `http://${bridgeIp}/api/${apiKey}/${targetType}/${targetId}/${stateEndpoint}`;

    let body: Record<string, any> = {};

    switch (action) {
      case 'turn_on':
        body = { on: true };
        if (config.brightness !== undefined) {
          body.bri = Math.round((config.brightness / 100) * 254);
        }
        break;
      case 'turn_off':
        body = { on: false };
        break;
      case 'toggle':
        // Hue doesn't have native toggle — need to get current state first
        try {
          const stateRes = await fetch(
            `http://${bridgeIp}/api/${apiKey}/${targetType}/${targetId}`
          );
          const stateData: any = await stateRes.json();
          const currentOn = targetType === 'groups'
            ? stateData.state?.any_on
            : stateData.state?.on;
          body = { on: !currentOn };
        } catch {
          // Fallback: just turn on
          body = { on: true };
        }
        break;
      case 'set_brightness':
        body = {
          on: true,
          bri: Math.round(((config.brightness || 100) / 100) * 254),
        };
        break;
      case 'set_color':
        body = {
          on: true,
          hue: config.color?.hue || 0,
          sat: config.color?.saturation || 254,
        };
        if (config.brightness !== undefined) {
          body.bri = Math.round((config.brightness / 100) * 254);
        }
        break;
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }

    log.info('HUE', `${action} → ${targetType}/${targetId} at ${bridgeIp}`);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      // Hue API returns an array of results
      const hasError = Array.isArray(result) && result.some((r: any) => r.error);

      if (hasError) {
        const errorMsg = result
          .filter((r: any) => r.error)
          .map((r: any) => r.error.description)
          .join('; ');
        log.warn('HUE', `❌ ${errorMsg}`);
        return { success: false, message: `Hue error: ${errorMsg}` };
      }

      log.info('HUE', `✅ ${action} successful`);
      return {
        success: true,
        message: `Hue ${targetType}/${targetId}: ${action}`,
        data: result,
      };
    } catch (error: any) {
      log.error('HUE', `Connection failed: ${error.message}`);
      return {
        success: false,
        message: `Cannot reach Hue Bridge at ${bridgeIp}: ${error.message}`,
      };
    }
  }

  validate(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];

    if (!config.bridgeIp) errors.push('Bridge IP address is required');
    if (!config.apiKey) errors.push('API key is required (press link button on bridge to generate)');
    if (!config.lightId && !config.groupId) {
      errors.push('Either lightId or groupId is required');
    }

    return { valid: errors.length === 0, errors };
  }

  getConfigSchema(): ConfigField[] {
    return [
      {
        key: 'bridgeIp',
        label: 'Bridge IP Address',
        type: 'string',
        required: true,
        description: 'Local IP of your Hue Bridge (find at https://discovery.meethue.com)',
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'string',
        required: true,
        description: 'Hue Bridge API key (generated via link button)',
      },
      {
        key: 'lightId',
        label: 'Light ID',
        type: 'string',
        required: false,
        description: 'ID of a specific light to control',
      },
      {
        key: 'groupId',
        label: 'Group/Room ID',
        type: 'string',
        required: false,
        description: 'ID of a light group/room (use instead of lightId to control multiple lights)',
      },
      {
        key: 'brightness',
        label: 'Brightness (%)',
        type: 'number',
        required: false,
        default: 100,
        description: 'Brightness level (0-100)',
      },
      {
        key: 'color',
        label: 'Color (Hue/Sat)',
        type: 'json',
        required: false,
        description: 'Color as JSON: { "hue": 0-65535, "saturation": 0-254 }',
      },
    ];
  }
}
