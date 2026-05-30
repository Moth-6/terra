require('dotenv').config();

class ConfigManager {
  constructor() {
    this.config = {
      // OpenAI
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4',
      },
      // Anthropic
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      },
      // Google Gemini
      gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      },
      // Ollama
      ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'llama2',
      },
      // Server settings
      defaultProvider: process.env.DEFAULT_PROVIDER || 'openai',
      port: process.env.PORT || 3000,
    };
  }

  /**
   * Get configuration for a specific provider
   * @param {string} provider
   * @returns {object}
   */
  getProviderConfig(provider) {
    const normalized = provider.toLowerCase();
    if (!this.config[normalized]) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    return this.config[normalized];
  }

  /**
   * Get default provider
   * @returns {string}
   */
  getDefaultProvider() {
    return this.config.defaultProvider;
  }

  /**
   * Check if provider is configured
   * @param {string} provider
   * @returns {boolean}
   */
  isProviderConfigured(provider) {
    const config = this.getProviderConfig(provider);

    if (provider.toLowerCase() === 'ollama') {
      // Ollama only requires baseUrl
      return !!config.baseUrl;
    }

    // All others require an API key
    return !!config.apiKey;
  }

  /**
   * Get all configured providers
   * @returns {string[]}
   */
  getConfiguredProviders() {
    const providers = ['openai', 'anthropic', 'gemini', 'ollama'];
    return providers.filter(p => this.isProviderConfigured(p));
  }

  /**
   * Get server port
   * @returns {number}
   */
  getPort() {
    return this.config.port;
  }

  /**
   * Log configuration status (without revealing secrets)
   */
  logStatus() {
    console.log('\n=== TERRA API Provider Status ===');
    console.log(`Default Provider: ${this.config.defaultProvider}`);
    console.log('Configured Providers:');
    ['openai', 'anthropic', 'gemini', 'ollama'].forEach(provider => {
      const configured = this.isProviderConfigured(provider);
      console.log(`  ${provider.padEnd(12)} : ${configured ? '✓ READY' : '✗ Not configured'}`);
    });
    console.log('==================================\n');
  }
}

module.exports = new ConfigManager();
