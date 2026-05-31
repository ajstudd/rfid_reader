/**
 * Core types for the Smart Home provider system.
 */

/**
 * Result returned by a provider after executing an action.
 */
export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Every smart home provider must implement this interface.
 * To add a new provider, create a class implementing ISmartHomeProvider
 * and register it in the registry.
 */
export interface ISmartHomeProvider {
  /** Unique identifier, e.g. "philips_hue", "tuya", "mock" */
  name: string;

  /** Human-readable name, e.g. "Philips Hue", "Tuya Cloud" */
  displayName: string;

  /** Supported actions, e.g. ["turn_on", "turn_off", "toggle"] */
  supportedActions: string[];

  /**
   * Execute a smart home action.
   * @param action The action to perform (e.g., "turn_on", "toggle")
   * @param config Provider-specific configuration (bridge IP, API keys, etc.)
   * @param context Additional context about the card tap event
   */
  execute(
    action: string,
    config: Record<string, any>,
    context: ActionContext
  ): Promise<ActionResult>;

  /**
   * Validate provider-specific configuration before saving.
   * Returns validation result with errors if invalid.
   */
  validate(config: Record<string, any>): ValidationResult;

  /**
   * Get the JSON schema describing this provider's config fields.
   * Used by the frontend to render dynamic config forms.
   */
  getConfigSchema(): ConfigField[];
}

/**
 * Context passed to providers about the triggering event.
 */
export interface ActionContext {
  cardUID: string;
  userId: string | null;
  userName: string | null;
  deviceId: string;
  status: 'authorized' | 'denied' | 'unknown';
}

/**
 * Validation result from provider config check.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Describes a single configuration field for a provider.
 * Used to generate dynamic forms on the frontend.
 */
export interface ConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'json' | 'color';
  required: boolean;
  default?: any;
  description?: string;
  options?: { label: string; value: string }[];  // For 'select' type
}
