import { ISmartHomeProvider } from './types';
import { MockProvider } from './providers/mock.provider';
import { WebhookProvider } from './providers/webhook.provider';
import { PhilipsHueProvider } from './providers/philips_hue.provider';
import { TuyaProvider } from './providers/tuya.provider';
import { KasaProvider } from './providers/kasa.provider';
import { WizProvider } from './providers/wiz.provider';
import log from '../../utils/logger';

/**
 * Provider Registry — manages all available smart home providers.
 * 
 * To add a new provider:
 *   1. Create a file in providers/ implementing ISmartHomeProvider
 *   2. Import it here
 *   3. Add it to initBuiltInProviders()
 * 
 * Or register dynamically at runtime:
 *   registry.register(new MyCustomProvider());
 */
class ProviderRegistry {
  private providers: Map<string, ISmartHomeProvider> = new Map();

  /**
   * Register a smart home provider.
   * @param provider The provider instance to register
   */
  register(provider: ISmartHomeProvider): void {
    if (this.providers.has(provider.name)) {
      log.warn('REGISTRY', `Provider "${provider.name}" is being replaced`);
    }
    this.providers.set(provider.name, provider);
    log.info('REGISTRY', `Registered provider: ${provider.displayName} (${provider.name})`);
  }

  /**
   * Get a provider by name.
   */
  get(name: string): ISmartHomeProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Check if a provider exists.
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get all registered providers.
   */
  getAll(): ISmartHomeProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider names and their supported actions.
   * Useful for API responses and frontend dropdowns.
   */
  getSummary(): Array<{
    name: string;
    displayName: string;
    supportedActions: string[];
    configSchema: any[];
  }> {
    return this.getAll().map((p) => ({
      name: p.name,
      displayName: p.displayName,
      supportedActions: p.supportedActions,
      configSchema: p.getConfigSchema(),
    }));
  }
}

// Singleton instance
const registry = new ProviderRegistry();

/**
 * Initialize all built-in providers.
 * Call this once during server startup.
 */
export function initProviders(): void {
  log.info('REGISTRY', 'Initializing smart home providers...');

  registry.register(new MockProvider());
  registry.register(new WebhookProvider());
  registry.register(new PhilipsHueProvider());
  registry.register(new TuyaProvider());
  registry.register(new KasaProvider());
  registry.register(new WizProvider());

  log.info('REGISTRY', `${registry.getAll().length} providers registered`);
}

export default registry;
