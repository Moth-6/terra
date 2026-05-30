const ProviderFactory = require('./providers/ProviderFactory');
const ConfigManager = require('./config/ConfigManager');

async function testProviders() {
  console.log('\n🧪 TERRA Provider Integration Tests\n');
  console.log('='.repeat(50));

  const configured = ConfigManager.getConfiguredProviders();
  const testPrompt = 'Generate 3 GPS checkpoints near 40.7128,-74.0060. Format: "checkpoint 1: latitude,longitude"';

  let passCount = 0;
  let failCount = 0;

  for (const providerType of configured) {
    console.log(`\nTesting ${providerType.toUpperCase()}...`);

    try {
      const provider = ProviderFactory.createProvider(
        providerType,
        ConfigManager.getProviderConfig(providerType)
      );

      await provider.initialize();
      console.log(`  ✓ Initialization successful`);

      const isHealthy = await provider.healthCheck();
      if (!isHealthy) {
        throw new Error('Health check failed');
      }
      console.log(`  ✓ Health check passed`);

      const response = await provider.generate(testPrompt);
      if (!response || response.length < 10) {
        throw new Error('Response too short or empty');
      }
      console.log(`  ✓ Generation successful (${response.length} characters)`);
      console.log(`  Response preview: ${response.substring(0, 80)}...`);

      passCount++;
      console.log(`  ✅ PASS`);
    } catch (error) {
      failCount++;
      console.log(`  ❌ FAIL: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed\n`);

  if (failCount === 0 && passCount > 0) {
    console.log('✅ All providers operational!\n');
    process.exit(0);
  } else if (configured.length === 0) {
    console.log('⚠️  No providers configured. Set API keys in .env\n');
    process.exit(1);
  } else {
    console.log('❌ Some providers failed. Check configuration.\n');
    process.exit(1);
  }
}

testProviders().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
