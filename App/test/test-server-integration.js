/**
 * Server Integration Tests
 * Tests the Express server endpoints with mocked providers
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ProviderFactory = require('../providers/ProviderFactory');
const ConfigManager = require('../config/ConfigManager');
const MockProvider = require('./MockProvider');

// Create a test server
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Mock provider cache for testing
const providerCache = {};

async function getProvider(providerType) {
  const provider = providerType.toLowerCase();
  if (!providerCache[provider]) {
    const providerInstance = new MockProvider();
    await providerInstance.initialize();
    providerCache[provider] = providerInstance;
  }
  return providerCache[provider];
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      mock: await (await getProvider('mock')).healthCheck(),
    };
    res.json({
      status: 'OK',
      providers: healthStatus,
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

// List providers endpoint
app.get('/providers', (req, res) => {
  res.json({
    available: ProviderFactory.getAvailableProviders(),
    configured: ['mock'],
    default: 'mock',
  });
});

// Generate trail endpoint
app.post('/generate-trail', async (req, res) => {
  const { prompt, provider } = req.body;
  try {
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    const providerType = provider || 'mock';
    const providerInstance = await getProvider(providerType);
    const response = await providerInstance.generate(prompt);
    res.json({
      choices: [{ message: { content: response } }],
      provider: providerType,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test suite
const tests = [];
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    tests.push({ name, status: '✅ PASS' });
    console.log(`✅ ${name}`);
  } catch (error) {
    failed++;
    tests.push({ name, status: `❌ FAIL: ${error.message}` });
    console.log(`❌ ${name}\n   Error: ${error.message}`);
  }
}

// Helper function to make requests
async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = require('http').request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runIntegrationTests() {
  console.log('\n🚀 TERRA Server Integration Tests\n');
  console.log('='.repeat(60));

  // Start the test server
  const server = app.listen(3001, async () => {
    console.log('Test server running on port 3001\n');

    // Test 1: Health check endpoint
    await test('GET /health returns OK status', async () => {
      const response = await request('GET', '/health');
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      if (response.body.status !== 'OK') throw new Error('Status not OK');
      if (!response.body.providers) throw new Error('No providers in response');
    });

    // Test 2: Providers endpoint
    await test('GET /providers lists available providers', async () => {
      const response = await request('GET', '/providers');
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      if (!Array.isArray(response.body.available)) throw new Error('Available not array');
      if (response.body.available.length !== 4) throw new Error('Should have 4 providers');
      if (!response.body.available.includes('openai')) throw new Error('Missing openai');
      if (!response.body.available.includes('anthropic')) throw new Error('Missing anthropic');
      if (!response.body.available.includes('gemini')) throw new Error('Missing gemini');
      if (!response.body.available.includes('ollama')) throw new Error('Missing ollama');
    });

    // Test 3: Generate trail with default provider
    await test('POST /generate-trail generates coordinates', async () => {
      const response = await request('POST', '/generate-trail', {
        prompt: 'Generate a 5-minute trail from 40.7128,-74.0060',
      });
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      if (!response.body.choices) throw new Error('No choices in response');
      const content = response.body.choices[0].message.content;
      if (!content.includes('start point:')) throw new Error('Missing start point');
      if (!content.includes('checkpoint')) throw new Error('Missing checkpoint');
      if (!content.includes('end point:')) throw new Error('Missing end point');
    });

    // Test 4: Generate trail with specified provider
    await test('POST /generate-trail accepts provider parameter', async () => {
      const response = await request('POST', '/generate-trail', {
        prompt: 'Generate trail',
        provider: 'mock',
      });
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      if (response.body.provider !== 'mock') throw new Error('Provider mismatch');
    });

    // Test 5: Generate trail without prompt returns error
    await test('POST /generate-trail requires prompt', async () => {
      const response = await request('POST', '/generate-trail', {});
      if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
      if (!response.body.error) throw new Error('No error message');
      if (!response.body.error.includes('Prompt')) throw new Error('Error should mention prompt');
    });

    // Test 6: Response format compatibility
    await test('Response format matches OpenAI structure', async () => {
      const response = await request('POST', '/generate-trail', {
        prompt: 'test',
      });
      const data = response.body;
      if (!data.choices) throw new Error('Missing choices');
      if (!Array.isArray(data.choices)) throw new Error('Choices not array');
      if (!data.choices[0].message) throw new Error('Missing message');
      if (!data.choices[0].message.content) throw new Error('Missing content');
      if (typeof data.choices[0].message.content !== 'string') {
        throw new Error('Content not string');
      }
    });

    // Test 7: Coordinate regex parsing works
    await test('Coordinates can be parsed with regex', async () => {
      const response = await request('POST', '/generate-trail', {
        prompt: 'test',
      });
      const content = response.body.choices[0].message.content;
      const regex = /(?:start point|checkpoint \d+|end point):\s*([+-]?\d+\.\d+),\s*([+-]?\d+\.\d+)/gi;

      const matches = [];
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          lat: parseFloat(match[1]),
          lon: parseFloat(match[2]),
        });
      }

      if (matches.length < 3) throw new Error(`Expected >= 3 coords, got ${matches.length}`);

      // Verify coordinates are valid
      matches.forEach((coord) => {
        if (isNaN(coord.lat) || isNaN(coord.lon)) {
          throw new Error('Invalid coordinate values');
        }
        if (coord.lat < -90 || coord.lat > 90) {
          throw new Error('Latitude out of range');
        }
        if (coord.lon < -180 || coord.lon > 180) {
          throw new Error('Longitude out of range');
        }
      });
    });

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Integration Test Results: ${passed} passed, ${failed} failed\n`);

    server.close();

    if (failed === 0) {
      console.log('✅ All integration tests passed!\n');
      process.exit(0);
    } else {
      console.log('❌ Some integration tests failed.\n');
      process.exit(1);
    }
  });
}

runIntegrationTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
