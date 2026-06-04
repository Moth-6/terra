const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ProviderFactory = require('./providers/ProviderFactory');
const ConfigManager = require('./config/ConfigManager');

const app = express();
const port = ConfigManager.getPort();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Store initialized providers in memory
const providerCache = {};

/**
 * Get or initialize a provider
 * @param {string} providerType
 * @returns {Promise<BaseProvider>}
 */
async function getProvider(providerType) {
  const provider = providerType.toLowerCase();

  if (!providerCache[provider]) {
    try {
      const providerInstance = ProviderFactory.createProvider(
        provider,
        ConfigManager.getProviderConfig(provider)
      );
      await providerInstance.initialize();
      providerCache[provider] = providerInstance;
    } catch (error) {
      throw new Error(`Failed to initialize ${provider} provider: ${error.message}`);
    }
  }

  return providerCache[provider];
}

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', async (req, res) => {
  try {
    const configuredProviders = ConfigManager.getConfiguredProviders();
    const healthStatus = {};

    for (const providerType of configuredProviders) {
      try {
        const provider = await getProvider(providerType);
        healthStatus[providerType] = await provider.healthCheck();
      } catch (error) {
        healthStatus[providerType] = false;
      }
    }

    res.json({
      status: 'OK',
      default_provider: ConfigManager.getDefaultProvider(),
      providers: healthStatus,
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
    });
  }
});

/**
 * List available providers
 * GET /providers
 */
app.get('/providers', (req, res) => {
  try {
    const configured = ConfigManager.getConfiguredProviders();
    res.json({
      available: ProviderFactory.getAvailableProviders(),
      configured: configured,
      default: ConfigManager.getDefaultProvider(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
    });
  }
});

/**
 * Generate trail using specified or default provider
 * POST /generate-trail
 * Body: { prompt, provider (optional) }
 */
app.post('/generate-trail', async (req, res) => {
  const { prompt, provider } = req.body;

  try {
    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required',
      });
    }

    // Use specified provider or fall back to default
    const providerType = provider || ConfigManager.getDefaultProvider();

    // Verify provider is configured
    if (!ConfigManager.isProviderConfigured(providerType)) {
      return res.status(400).json({
        error: `Provider '${providerType}' is not configured. Set required environment variables.`,
      });
    }

    // Get provider and generate
    const providerInstance = await getProvider(providerType);
    const response = await providerInstance.generate(prompt);

    // Format response to match OpenAI structure for backward compatibility
    res.json({
      choices: [
        {
          message: {
            content: response,
          },
        },
      ],
      provider: providerType,
    });
  } catch (error) {
    console.error(`[${error.constructor.name}] ${error.message}`);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * Geocode address using OpenStreetMap Nominatim (free, no API key required)
 * GET /geocode?q=<address>
 */
app.get('/geocode', async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.json([]);
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q.trim())}&format=json&limit=5&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TERRA-OpenSourceCompass/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.statusText}`);
    }

    const data = await response.json();
    const results = data.map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));

    res.json(results);
  } catch (error) {
    console.error(`[Geocode] ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Test endpoint for specific provider
 * POST /test-provider
 * Body: { provider, prompt (optional) }
 */
app.post('/test-provider', async (req, res) => {
  const { provider, prompt } = req.body;

  try {
    if (!provider) {
      return res.status(400).json({
        error: 'Provider is required',
      });
    }

    const testPrompt = prompt || 'Say "TERRA is working!"';
    const providerInstance = await getProvider(provider);
    const response = await providerInstance.generate(testPrompt);

    res.json({
      provider: provider,
      success: true,
      response: response.substring(0, 100), // First 100 chars
    });
  } catch (error) {
    res.status(500).json({
      provider: provider,
      success: false,
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`\n🌍 TERRA Server running at http://localhost:${port}`);
  ConfigManager.logStatus();
});

module.exports = app;
