const BaseProvider = require('./BaseProvider');

class GeminiProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = 'GoogleGemini';
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-1.5-flash';
    this.client = null;
  }

  validate() {
    if (!this.apiKey) {
      throw new Error('Google Gemini API key is required');
    }
    if (!this.model) {
      throw new Error('Gemini model must be specified');
    }
    return true;
  }

  async initialize() {
    this.validate();
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    this.client = new GoogleGenerativeAI(this.apiKey);
    console.log(`[Gemini] Initialized with model: ${this.model}`);
  }

  async generate(prompt) {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const model = this.client.getGenerativeModel({ model: this.model });
      const systemPrompt = 'You are a helpful assistant that generates walking trail coordinates. Output format must be: "label: latitude,longitude" for each waypoint.';

      const response = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt + '\n\n' + prompt }],
          },
        ],
      });

      const textResponse = response.response.text();
      return textResponse;
    } catch (error) {
      throw new Error(`Gemini generation failed: ${this.normalizeError(error)}`);
    }
  }

  async healthCheck() {
    try {
      if (!this.client) {
        await this.initialize();
      }
      const model = this.client.getGenerativeModel({ model: this.model });
      const response = await model.generateContent('Say OK');
      return response.response.text().length > 0;
    } catch (error) {
      console.error(`[Gemini] Health check failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = GeminiProvider;
