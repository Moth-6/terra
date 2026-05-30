const BaseProvider = require('./BaseProvider');

class AnthropicProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = 'Anthropic';
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.client = null;
  }

  validate() {
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required');
    }
    if (!this.model) {
      throw new Error('Anthropic model must be specified');
    }
    return true;
  }

  async initialize() {
    this.validate();
    // Import Anthropic SDK
    const { Anthropic } = await import('@anthropic-ai/sdk');
    this.client = new Anthropic({
      apiKey: this.apiKey,
    });
    console.log(`[Anthropic] Initialized with model: ${this.model}`);
  }

  async generate(prompt) {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        system: 'You are a helpful assistant that generates walking trail coordinates. Output format must be: "label: latitude,longitude" for each waypoint.',
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      throw new Error('Unexpected response format from Anthropic');
    } catch (error) {
      throw new Error(`Anthropic generation failed: ${this.normalizeError(error)}`);
    }
  }

  async healthCheck() {
    try {
      if (!this.client) {
        await this.initialize();
      }
      // Anthropic doesn't have a dedicated health endpoint, so we check with a minimal call
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Say OK',
          },
        ],
      });
      return response.content?.length > 0;
    } catch (error) {
      console.error(`[Anthropic] Health check failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = AnthropicProvider;
