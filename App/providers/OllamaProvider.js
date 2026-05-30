const BaseProvider = require('./BaseProvider');

class OllamaProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = 'Ollama';
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.model = config.model || 'llama2';
  }

  validate() {
    if (!this.baseUrl) {
      throw new Error('Ollama base URL is required');
    }
    if (!this.model) {
      throw new Error('Ollama model must be specified');
    }
    // Remove trailing slash if present
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
    return true;
  }

  async initialize() {
    this.validate();
    // Ollama is stateless, just verify connectivity
    const isHealthy = await this.healthCheck();
    if (!isHealthy) {
      console.warn(`[Ollama] Could not connect to ${this.baseUrl}. Ensure Ollama is running with: ollama serve`);
    }
    console.log(`[Ollama] Initialized with base URL: ${this.baseUrl}, model: ${this.model}`);
  }

  async generate(prompt) {
    try {
      const fetch = (await import('node-fetch')).default;

      const systemPrompt = 'You are a helpful assistant that generates walking trail coordinates. Output format must be: "label: latitude,longitude" for each waypoint.';

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: `${systemPrompt}\n\n${prompt}`,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Ollama API error: ${response.statusText} - ${errorData}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (error) {
      throw new Error(`Ollama generation failed: ${this.normalizeError(error)}`);
    }
  }

  async healthCheck() {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      console.error(`[Ollama] Health check failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = OllamaProvider;
