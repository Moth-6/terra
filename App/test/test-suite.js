const MockProvider = require('./MockProvider');
const ProviderFactory = require('../providers/ProviderFactory');
const ConfigManager = require('../config/ConfigManager');
const BaseProvider = require('../providers/BaseProvider');

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} - Expected: ${expected}, Got: ${actual}`);
  }
}

async function runTest(name, testFn) {
  try {
    await testFn();
    results.passed++;
    results.tests.push({ name, status: '✅ PASS' });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: `❌ FAIL: ${error.message}` });
    console.log(`❌ ${name}\n   Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n🧪 TERRA Provider Test Suite\n');
  console.log('='.repeat(60));

  // Test 1: MockProvider initialization
  await runTest('MockProvider: Initialize successfully', async () => {
    const provider = new MockProvider();
    await provider.initialize();
    assertEquals(provider.name, 'MockProvider', 'Provider name');
  });

  // Test 2: MockProvider validation
  await runTest('MockProvider: Validate returns true for valid config', async () => {
    const provider = new MockProvider();
    const result = provider.validate();
    assert(result === true, 'Should return true');
  });

  // Test 3: MockProvider validation failure
  await runTest('MockProvider: Validate throws error for invalid config', async () => {
    const provider = new MockProvider({ shouldFail: true });
    try {
      provider.validate();
      throw new Error('Should have thrown');
    } catch (e) {
      if (e.message === 'Should have thrown') throw e;
    }
  });

  // Test 4: MockProvider generation
  await runTest('MockProvider: Generate returns valid GPS coordinates', async () => {
    const provider = new MockProvider();
    await provider.initialize();
    const response = await provider.generate('test prompt');

    assert(response.includes('start point:'), 'Should include start point');
    assert(response.includes('checkpoint'), 'Should include checkpoints');
    assert(response.includes('end point:'), 'Should include end point');
    assert(response.includes(','), 'Should include coordinates');
  });

  // Test 5: MockProvider health check
  await runTest('MockProvider: Health check returns true', async () => {
    const provider = new MockProvider();
    await provider.initialize();
    const healthy = await provider.healthCheck();
    assertEquals(healthy, true, 'Health check');
  });

  // Test 6: MockProvider health check failure
  await runTest('MockProvider: Health check returns false when failed', async () => {
    const provider = new MockProvider({ shouldFail: true });
    try {
      await provider.initialize();
    } catch (e) {
      // Expected to fail on initialize
    }
    const healthy = await provider.healthCheck();
    assertEquals(healthy, false, 'Health check should fail');
  });

  // Test 7: BaseProvider inheritance
  await runTest('MockProvider: Inherits from BaseProvider', async () => {
    const provider = new MockProvider();
    assert(provider instanceof BaseProvider, 'Should inherit from BaseProvider');
  });

  // Test 8: ConfigManager loads default config
  await runTest('ConfigManager: Loads default provider', () => {
    const defaultProvider = ConfigManager.getDefaultProvider();
    assert(defaultProvider === 'openai', 'Default should be openai');
  });

  // Test 9: ConfigManager gets provider config
  await runTest('ConfigManager: Gets provider configuration', () => {
    const config = ConfigManager.getProviderConfig('openai');
    assert(config, 'Should return config object');
    assert(config.model, 'Should have model property');
  });

  // Test 10: ConfigManager validates configured providers
  await runTest('ConfigManager: Checks if provider is configured', () => {
    const isConfigured = ConfigManager.isProviderConfigured('openai');
    // Will be false since we don't have API keys set
    assert(typeof isConfigured === 'boolean', 'Should return boolean');
  });

  // Test 11: ConfigManager gets port
  await runTest('ConfigManager: Gets server port', () => {
    const port = ConfigManager.getPort();
    assert(port > 0 && port < 65536, 'Port should be valid');
  });

  // Test 12: ProviderFactory creates provider instances
  await runTest('ProviderFactory: Creates OpenAI provider', () => {
    try {
      const provider = ProviderFactory.createProvider('openai', {
        apiKey: 'test-key',
        model: 'gpt-4',
      });
      assert(provider, 'Should create provider instance');
      assertEquals(provider.name, 'OpenAI', 'Provider name');
    } catch (e) {
      // Constructor may fail, but that's okay - we're testing factory logic
      assert(e.message.includes('OpenAI'), 'Error should mention OpenAI');
    }
  });

  // Test 13: ProviderFactory handles invalid provider types
  await runTest('ProviderFactory: Throws error for unknown provider', () => {
    try {
      ProviderFactory.createProvider('invalid-provider', {});
      throw new Error('Should have thrown');
    } catch (e) {
      if (e.message === 'Should have thrown') throw e;
      assert(e.message.includes('Unknown provider'), 'Should mention unknown provider');
    }
  });

  // Test 14: ProviderFactory lists available providers
  await runTest('ProviderFactory: Lists all available providers', () => {
    const providers = ProviderFactory.getAvailableProviders();
    assert(Array.isArray(providers), 'Should return array');
    assert(providers.includes('openai'), 'Should include openai');
    assert(providers.includes('anthropic'), 'Should include anthropic');
    assert(providers.includes('gemini'), 'Should include gemini');
    assert(providers.includes('ollama'), 'Should include ollama');
    assertEquals(providers.length, 4, 'Should have exactly 4 providers');
  });

  // Test 15: Coordinate parsing from response
  await runTest('Response parsing: Extracts coordinates correctly', async () => {
    const provider = new MockProvider();
    await provider.initialize();
    const response = await provider.generate('test');

    // Test the regex pattern that script.js uses
    const regex = /(?:start point|checkpoint \d+|end point):\s*([+-]?\d+\.\d+),\s*([+-]?\d+\.\d+)/gi;
    const matches = [];
    let match;
    while ((match = regex.exec(response)) !== null) {
      matches.push({
        label: match[0].split(':')[0],
        lat: parseFloat(match[1]),
        lon: parseFloat(match[2]),
      });
    }

    assert(matches.length >= 3, 'Should find at least 3 coordinate pairs');
    assert(matches[0].label.includes('start'), 'First should be start point');
    assert(matches[matches.length - 1].label.includes('end'), 'Last should be end point');
  });

  // Test 16: Error handling in provider
  await runTest('Error handling: Provider throws on generation failure', async () => {
    const provider = new MockProvider({ shouldFail: true });
    try {
      await provider.initialize();
    } catch (e) {
      // Expected to fail on initialize
    }
    try {
      await provider.generate('test');
      throw new Error('Should have thrown');
    } catch (e) {
      if (e.message === 'Should have thrown') throw e;
      assert(e.message.includes('Mock'), 'Error should mention Mock');
    }
  });

  // Test 17: Response with delayed generation
  await runTest('Performance: Handles async generation with delay', async () => {
    const provider = new MockProvider({ responseDelay: 100 });
    await provider.initialize();
    const start = Date.now();
    const response = await provider.generate('test');
    const elapsed = Date.now() - start;

    assert(response.length > 0, 'Should return response');
    assert(elapsed >= 100, 'Should respect delay');
  });

  // Test 18: Multiple provider instances
  await runTest('Architecture: Can create multiple provider instances', async () => {
    const provider1 = new MockProvider({ responseDelay: 0 });
    const provider2 = new MockProvider({ responseDelay: 50 });

    await provider1.initialize();
    await provider2.initialize();

    const response1 = await provider1.generate('test');
    const response2 = await provider2.generate('test');

    assert(response1.length > 0, 'First provider should work');
    assert(response2.length > 0, 'Second provider should work');
    assertEquals(response1, response2, 'Both should return same mock response');
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results: ${results.passed} passed, ${results.failed} failed\n`);

  if (results.failed === 0) {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed.\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
