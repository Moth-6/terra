const BaseProvider = require('../providers/BaseProvider');

/**
 * Mock provider for testing without real API calls
 */
class MockProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'MockProvider';
    this.shouldFail = config.shouldFail || false;
    this.responseDelay = config.responseDelay || 0;
  }

  validate() {
    if (this.shouldFail) {
      throw new Error('Mock validation failed');
    }
    return true;
  }

  async initialize() {
    this.validate();
    console.log('[Mock] Initialized');
  }

  async generate(prompt) {
    if (this.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.responseDelay));
    }

    if (this.shouldFail) {
      throw new Error('Mock generation failed');
    }

    // Return realistic GPS coordinate format
    return `start point: 40.7128,-74.0060
checkpoint 1: 40.7150,-74.0070
checkpoint 2: 40.7165,-74.0085
checkpoint 3: 40.7180,-74.0100
checkpoint 4: 40.7170,-74.0090
checkpoint 5: 40.7155,-74.0075
end point: 40.7128,-74.0060`;
  }

  async healthCheck() {
    if (this.shouldFail) {
      return false;
    }
    return true;
  }
}

module.exports = MockProvider;
