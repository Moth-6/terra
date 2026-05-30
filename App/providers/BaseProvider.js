/**
 * Abstract base class for LLM providers
 * All providers must implement these methods
 */
class BaseProvider {
  constructor(config) {
    this.config = config;
    this.name = 'BaseProvider';
  }

  /**
   * Validate configuration before initialization
   * @returns {boolean}
   */
  validate() {
    throw new Error('validate() must be implemented');
  }

  /**
   * Initialize provider-specific client
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize() must be implemented');
  }

  /**
   * Generate text from prompt
   * @param {string} prompt - User prompt
   * @returns {Promise<string>} - Generated text
   */
  async generate(prompt) {
    throw new Error('generate() must be implemented');
  }

  /**
   * Normalize error messages across providers
   * @param {Error} error
   * @returns {string}
   */
  normalizeError(error) {
    return error.message || 'Unknown error';
  }

  /**
   * Health check - verify API connectivity
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented');
  }
}

module.exports = BaseProvider;
