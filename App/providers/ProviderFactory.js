const OpenAIProvider = require('./OpenAIProvider');
const AnthropicProvider = require('./AnthropicProvider');
const GeminiProvider = require('./GeminiProvider');
const OllamaProvider = require('./OllamaProvider');

class ProviderFactory {
  /**
   * Create a provider instance based on type
   * @param {string} type - Provider type (openai, anthropic, gemini, ollama)
   * @param {object} config - Provider-specific configuration
   * @returns {BaseProvider}
   */
  static createProvider(type, config) {
    const normalizedType = type.toLowerCase();

    switch (normalizedType) {
      case 'openai':
        return new OpenAIProvider({
          apiKey: config.apiKey || process.env.OPENAI_API_KEY,
          model: config.model || process.env.OPENAI_MODEL || 'gpt-4',
        });

      case 'anthropic':
        return new AnthropicProvider({
          apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
          model: config.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        });

      case 'gemini':
        return new GeminiProvider({
          apiKey: config.apiKey || process.env.GEMINI_API_KEY,
          model: config.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        });

      case 'ollama':
        return new OllamaProvider({
          baseUrl: config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          model: config.model || process.env.OLLAMA_MODEL || 'llama2',
        });

      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Get list of available providers
   * @returns {string[]}
   */
  static getAvailableProviders() {
    return ['openai', 'anthropic', 'gemini', 'ollama'];
  }

  /**
   * Validate provider can be created with given config
   * @param {string} type
   * @param {object} config
   * @returns {boolean}
   */
  static validateProvider(type, config) {
    try {
      const provider = this.createProvider(type, config);
      return provider.validate();
    } catch (error) {
      console.error(`Provider validation failed for ${type}: ${error.message}`);
      return false;
    }
  }
}

module.exports = ProviderFactory;
