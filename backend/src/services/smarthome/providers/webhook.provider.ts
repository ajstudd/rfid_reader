import {
  ISmartHomeProvider,
  ActionResult,
  ActionContext,
  ValidationResult,
  ConfigField,
} from '../types';
import log from '../../../utils/logger';

/**
 * Webhook Provider — sends HTTP requests to any URL on card tap.
 * 
 * The most versatile provider. Can trigger:
 *   - IFTTT webhooks (→ Alexa, Google Home, anything)
 *   - Home Assistant automations
 *   - Node-RED flows
 *   - Any custom REST API
 * 
 * Supports template variables in the body:
 *   {{cardUID}}, {{userName}}, {{status}}, {{deviceId}}, {{action}}
 */
export class WebhookProvider implements ISmartHomeProvider {
  name = 'webhook';
  displayName = 'HTTP Webhook';
  supportedActions = ['trigger', 'turn_on', 'turn_off', 'toggle', 'custom'];

  async execute(
    action: string,
    config: Record<string, any>,
    context: ActionContext
  ): Promise<ActionResult> {
    const { url, method = 'POST', headers = {}, body, timeout = 5000 } = config;

    if (!url) {
      return { success: false, message: 'Webhook URL is not configured' };
    }

    log.info('WEBHOOK', `Sending ${method} → ${url}`);

    try {
      // Build request body with template variable substitution
      let requestBody: string | undefined;

      if (body) {
        let bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

        // Replace template variables
        bodyStr = bodyStr
          .replace(/\{\{cardUID\}\}/g, context.cardUID)
          .replace(/\{\{userName\}\}/g, context.userName || 'Unknown')
          .replace(/\{\{status\}\}/g, context.status)
          .replace(/\{\{deviceId\}\}/g, context.deviceId)
          .replace(/\{\{action\}\}/g, action);

        requestBody = bodyStr;
      }

      // Build headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      // Send the request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers: requestHeaders,
        body: method.toUpperCase() !== 'GET' ? requestBody : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();

      if (response.ok) {
        log.info('WEBHOOK', `✅ ${response.status} response from ${url}`);
        return {
          success: true,
          message: `Webhook responded ${response.status}`,
          data: {
            statusCode: response.status,
            response: responseText.substring(0, 500), // Truncate large responses
          },
        };
      } else {
        log.warn('WEBHOOK', `❌ ${response.status} from ${url}: ${responseText.substring(0, 200)}`);
        return {
          success: false,
          message: `Webhook returned ${response.status}: ${responseText.substring(0, 200)}`,
        };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        log.error('WEBHOOK', `Timeout after ${timeout}ms: ${url}`);
        return { success: false, message: `Webhook timed out after ${timeout}ms` };
      }

      log.error('WEBHOOK', `Request failed: ${error.message}`);
      return { success: false, message: `Webhook error: ${error.message}` };
    }
  }

  validate(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('URL is required');
    } else {
      try {
        new URL(config.url);
      } catch {
        errors.push('URL is not valid');
      }
    }

    if (config.method) {
      const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      if (!validMethods.includes(config.method.toUpperCase())) {
        errors.push(`Method must be one of: ${validMethods.join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  getConfigSchema(): ConfigField[] {
    return [
      {
        key: 'url',
        label: 'Webhook URL',
        type: 'string',
        required: true,
        description: 'The URL to send the HTTP request to',
      },
      {
        key: 'method',
        label: 'HTTP Method',
        type: 'select',
        required: false,
        default: 'POST',
        options: [
          { label: 'POST', value: 'POST' },
          { label: 'GET', value: 'GET' },
          { label: 'PUT', value: 'PUT' },
          { label: 'PATCH', value: 'PATCH' },
          { label: 'DELETE', value: 'DELETE' },
        ],
      },
      {
        key: 'headers',
        label: 'Custom Headers',
        type: 'json',
        required: false,
        default: {},
        description: 'Additional HTTP headers as JSON object',
      },
      {
        key: 'body',
        label: 'Request Body',
        type: 'json',
        required: false,
        description:
          'JSON body. Supports template variables: {{cardUID}}, {{userName}}, {{status}}, {{deviceId}}, {{action}}',
      },
      {
        key: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        required: false,
        default: 5000,
        description: 'Request timeout in milliseconds',
      },
    ];
  }
}
