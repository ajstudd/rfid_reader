import {
  ISmartHomeProvider,
  ActionResult,
  ActionContext,
  ValidationResult,
  ConfigField,
} from '../types';
import log from '../../../utils/logger';
import crypto from 'crypto';

/**
 * Tuya Cloud Provider — controls Tuya/Smart Life devices via Cloud API.
 * 
 * Tuya powers the majority of smart devices in India:
 *   - Smart Life app devices
 *   - Wipro Smart, Syska, Philips (Indian editions)
 *   - Generic WiFi smart plugs, bulbs, fans
 * 
 * Setup:
 *   1. Create a Tuya IoT Platform account at https://iot.tuya.com
 *   2. Create a Cloud Project and link your Smart Life account
 *   3. Get your Access ID and Access Key from the project
 *   4. Find your device IDs from the device list
 * 
 * API Reference: https://developer.tuya.com/en/docs/cloud/
 */
export class TuyaProvider implements ISmartHomeProvider {
  name = 'tuya';
  displayName = 'Tuya / Smart Life';
  supportedActions = ['turn_on', 'turn_off', 'toggle'];

  async execute(
    action: string,
    config: Record<string, any>,
    context: ActionContext
  ): Promise<ActionResult> {
    const { accessId, accessKey, deviceId, region = 'in' } = config;

    if (!accessId || !accessKey || !deviceId) {
      return {
        success: false,
        message: 'Tuya accessId, accessKey, and deviceId are required. Create a project at https://iot.tuya.com',
      };
    }

    // Tuya Cloud API base URLs by region
    const regionUrls: Record<string, string> = {
      cn: 'https://openapi.tuyacn.com',
      us: 'https://openapi.tuyaus.com',
      eu: 'https://openapi.tuyaeu.com',
      in: 'https://openapi.tuyain.com',
    };

    const baseUrl = regionUrls[region] || regionUrls['in'];

    log.info('TUYA', `${action} → device ${deviceId} via ${baseUrl}`);

    try {
      // Step 1: Get access token
      const token = await this.getAccessToken(baseUrl, accessId, accessKey);

      if (!token) {
        return { success: false, message: 'Failed to obtain Tuya access token' };
      }

      // Step 2: Send command
      let commands: Array<{ code: string; value: any }>;

      switch (action) {
        case 'turn_on':
          commands = [{ code: 'switch_led', value: true }];
          break;
        case 'turn_off':
          commands = [{ code: 'switch_led', value: false }];
          break;
        case 'toggle':
          // Get current state first
          const currentState = await this.getDeviceState(
            baseUrl, accessId, accessKey, token, deviceId
          );
          const isOn = currentState?.result?.some(
            (s: any) => s.code === 'switch_led' && s.value === true
          );
          commands = [{ code: 'switch_led', value: !isOn }];
          break;
        default:
          return { success: false, message: `Unknown action: ${action}` };
      }

      const commandUrl = `${baseUrl}/v1.0/devices/${deviceId}/commands`;
      const timestamp = Date.now().toString();
      const sign = this.calculateSign(accessId, accessKey, token, timestamp);

      const response = await fetch(commandUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          client_id: accessId,
          sign,
          t: timestamp,
          sign_method: 'HMAC-SHA256',
          access_token: token,
        },
        body: JSON.stringify({ commands }),
      });

      const result: any = await response.json();

      if (result.success) {
        log.info('TUYA', `[ OK ] ${action} successful for device ${deviceId}`);
        return {
          success: true,
          message: `Tuya device ${deviceId}: ${action}`,
          data: result,
        };
      } else {
        log.warn('TUYA', `[FAIL] Error: ${result.msg}`);
        return { success: false, message: `Tuya error: ${result.msg}` };
      }
    } catch (error: any) {
      log.error('TUYA', `Request failed: ${error.message}`);
      return { success: false, message: `Tuya error: ${error.message}` };
    }
  }

  /**
   * Get Tuya Cloud API access token.
   */
  private async getAccessToken(
    baseUrl: string,
    accessId: string,
    accessKey: string
  ): Promise<string | null> {
    try {
      const timestamp = Date.now().toString();
      const signStr = accessId + timestamp;
      const sign = crypto
        .createHmac('sha256', accessKey)
        .update(signStr)
        .digest('hex')
        .toUpperCase();

      const response = await fetch(`${baseUrl}/v1.0/token?grant_type=1`, {
        method: 'GET',
        headers: {
          client_id: accessId,
          sign,
          t: timestamp,
          sign_method: 'HMAC-SHA256',
        },
      });

      const result: any = await response.json();
      return result.result?.access_token || null;
    } catch {
      return null;
    }
  }

  /**
   * Get current device state.
   */
  private async getDeviceState(
    baseUrl: string,
    accessId: string,
    accessKey: string,
    token: string,
    deviceId: string
  ): Promise<any> {
    try {
      const timestamp = Date.now().toString();
      const sign = this.calculateSign(accessId, accessKey, token, timestamp);

      const response = await fetch(`${baseUrl}/v1.0/devices/${deviceId}/status`, {
        headers: {
          client_id: accessId,
          sign,
          t: timestamp,
          sign_method: 'HMAC-SHA256',
          access_token: token,
        },
      });

      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Calculate HMAC-SHA256 sign for authenticated requests.
   */
  private calculateSign(
    accessId: string,
    accessKey: string,
    token: string,
    timestamp: string
  ): string {
    const signStr = accessId + token + timestamp;
    return crypto
      .createHmac('sha256', accessKey)
      .update(signStr)
      .digest('hex')
      .toUpperCase();
  }

  validate(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];

    if (!config.accessId) errors.push('Access ID is required (from Tuya IoT Platform)');
    if (!config.accessKey) errors.push('Access Key is required (from Tuya IoT Platform)');
    if (!config.deviceId) errors.push('Device ID is required');

    return { valid: errors.length === 0, errors };
  }

  getConfigSchema(): ConfigField[] {
    return [
      {
        key: 'accessId',
        label: 'Access ID',
        type: 'string',
        required: true,
        description: 'From your Tuya IoT Platform Cloud Project',
      },
      {
        key: 'accessKey',
        label: 'Access Key (Secret)',
        type: 'string',
        required: true,
        description: 'From your Tuya IoT Platform Cloud Project',
      },
      {
        key: 'deviceId',
        label: 'Device ID',
        type: 'string',
        required: true,
        description: 'The Tuya device ID to control',
      },
      {
        key: 'region',
        label: 'Region',
        type: 'select',
        required: false,
        default: 'in',
        options: [
          { label: 'India', value: 'in' },
          { label: 'US', value: 'us' },
          { label: 'EU', value: 'eu' },
          { label: 'China', value: 'cn' },
        ],
        description: 'Tuya Cloud region (should match your account region)',
      },
    ];
  }
}
