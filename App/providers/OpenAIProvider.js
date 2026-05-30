const BaseProvider = require('./BaseProvider');

class OpenAIProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = 'OpenAI';
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4';
    this.client = null;
  }

  validate() {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    if (!this.model) {
      throw new Error('OpenAI model must be specified');
    }
    return true;
  }

  async initialize() {
    this.validate();
    // OpenAI native fetch implementation
    console.log(`[OpenAI] Initialized with model: ${this.model}`);
  }

  async generate(prompt) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates walking trail coordinates.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      throw new Error(`OpenAI generation failed: ${this.normalizeError(error)}`);
    }
  }

  async healthCheck() {
    try {
      // Quick check: verify API key format and connectivity
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error(`[OpenAI] Health check failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = OpenAIProvider;
