import {
  ISmartHomeProvider,
  ActionResult,
  ActionContext,
  ValidationResult,
  ConfigField,
} from '../types';
import log from '../../../utils/logger';

/**
 * Mock Provider — simulates smart home device control for testing.
 * 
 * Use this to verify the entire action pipeline works correctly
 * without any real hardware. Configurable delay and success/failure.
 */
export class MockProvider implements ISmartHomeProvider {
  name = 'mock';
  displayName = 'Mock / Test';
  supportedActions = ['turn_on', 'turn_off', 'toggle', 'set_brightness'];

  async execute(
    action: string,
    config: Record<string, any>,
    context: ActionContext
  ): Promise<ActionResult> {
    const delay = config.mockDelay || 200;
    const shouldSucceed = config.mockSuccess !== false; // default true
    const deviceName = config.mockDeviceName || 'Mock Device';

    log.info('MOCK', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    log.info('MOCK', `🎭 Simulating: ${action} → "${deviceName}"`);
    log.info('MOCK', `   Card: ${context.cardUID}`);
    log.info('MOCK', `   User: ${context.userName || 'Unknown'}`);
    log.info('MOCK', `   Delay: ${delay}ms | Will succeed: ${shouldSucceed}`);

    // Simulate network/device latency
    await new Promise((resolve) => setTimeout(resolve, delay));

    if (!shouldSucceed) {
      log.warn('MOCK', `   ❌ Simulated failure for "${deviceName}"`);
      log.info('MOCK', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      return {
        success: false,
        message: `Mock failure: ${deviceName} did not respond`,
      };
    }

    let stateMessage = '';
    switch (action) {
      case 'turn_on':
        stateMessage = `${deviceName} turned ON 💡`;
        break;
      case 'turn_off':
        stateMessage = `${deviceName} turned OFF ⚫`;
        break;
      case 'toggle':
        stateMessage = `${deviceName} toggled 🔄`;
        break;
      case 'set_brightness':
        const brightness = config.brightness || 100;
        stateMessage = `${deviceName} brightness set to ${brightness}% 🔆`;
        break;
      default:
        stateMessage = `${deviceName}: ${action}`;
    }

    log.info('MOCK', `   ✅ ${stateMessage}`);
    log.info('MOCK', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return {
      success: true,
      message: stateMessage,
      data: { action, deviceName, simulated: true },
    };
  }

  validate(config: Record<string, any>): ValidationResult {
    // Mock provider accepts any config
    return { valid: true, errors: [] };
  }

  getConfigSchema(): ConfigField[] {
    return [
      {
        key: 'mockDeviceName',
        label: 'Device Name',
        type: 'string',
        required: false,
        default: 'Mock Device',
        description: 'Name of the simulated device (for logging)',
      },
      {
        key: 'mockDelay',
        label: 'Simulated Delay (ms)',
        type: 'number',
        required: false,
        default: 200,
        description: 'Simulates network latency in milliseconds',
      },
      {
        key: 'mockSuccess',
        label: 'Simulate Success',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Set to false to simulate a device failure',
      },
      {
        key: 'brightness',
        label: 'Brightness (%)',
        type: 'number',
        required: false,
        default: 100,
        description: 'Brightness level for set_brightness action (0-100)',
      },
    ];
  }
}
