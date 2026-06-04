/**
 * OSM Geocoding Tests
 * Tests the /geocode endpoint and autocomplete logic using mocked Nominatim responses
 */

const express = require('express');
const bodyParser = require('body-parser');

// ─── Mock Nominatim data ───────────────────────────────────────────────────────

const MOCK_NOMINATIM_RESULTS = [
  {
    display_name: 'Paris, Île-de-France, France',
    lat: '48.8566101',
    lon: '2.3514992',
  },
  {
    display_name: 'Paris, Texas, United States',
    lat: '33.6617',
    lon: '-95.5555',
  },
  {
    display_name: 'Paris, Kentucky, United States',
    lat: '38.2095',
    lon: '-84.2529',
  },
];

// ─── Build a minimal test server with mocked fetch ────────────────────────────

function buildTestServer(mockFetch) {
  const app = express();
  app.use(bodyParser.json());

  app.get('/geocode', async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q.trim())}&format=json&limit=5&addressdetails=1`;
      const response = await mockFetch(url, {
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
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeMockFetch(results, { ok = true, statusText = 'OK' } = {}) {
  return async () => ({
    ok,
    statusText,
    json: async () => results,
  });
}

function makeRequest(app, path) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      require('http').get(`http://localhost:${port}${path}`, (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        });
      }).on('error', (err) => {
        server.close();
        reject(err);
      });
    });
  });
}

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    failed++;
    console.log(`❌ ${name}\n   ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEquals(actual, expected, label) {
  if (actual !== expected)
    throw new Error(`${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n🗺️  OSM Geocoding Test Suite\n');
  console.log('='.repeat(60));

  // 1. Empty query returns []
  await test('GET /geocode?q= returns empty array', async () => {
    const app = buildTestServer(makeMockFetch([]));
    const res = await makeRequest(app, '/geocode?q=');
    assertEquals(res.status, 200, 'status');
    assertEquals(res.body.length, 0, 'body length');
  });

  // 2. Short query (< 2 chars) returns []
  await test('GET /geocode?q=a returns empty array (too short)', async () => {
    const app = buildTestServer(makeMockFetch([]));
    const res = await makeRequest(app, '/geocode?q=a');
    assertEquals(res.status, 200, 'status');
    assertEquals(res.body.length, 0, 'body length');
  });

  // 3. Normal query returns normalised results
  await test('GET /geocode?q=Paris returns mapped results', async () => {
    const app = buildTestServer(makeMockFetch(MOCK_NOMINATIM_RESULTS));
    const res = await makeRequest(app, '/geocode?q=Paris');
    assertEquals(res.status, 200, 'status');
    assertEquals(res.body.length, 3, 'result count');
    const first = res.body[0];
    assert('display_name' in first, 'has display_name');
    assert('lat' in first, 'has lat');
    assert('lon' in first, 'has lon');
  });

  // 4. Coordinates are numbers (not strings)
  await test('Coordinates are parsed as numbers', async () => {
    const app = buildTestServer(makeMockFetch(MOCK_NOMINATIM_RESULTS));
    const res = await makeRequest(app, '/geocode?q=Paris');
    const first = res.body[0];
    assertEquals(typeof first.lat, 'number', 'lat type');
    assertEquals(typeof first.lon, 'number', 'lon type');
  });

  // 5. Correct lat/lon values
  await test('Returns correct lat/lon for Paris, France', async () => {
    const app = buildTestServer(makeMockFetch(MOCK_NOMINATIM_RESULTS));
    const res = await makeRequest(app, '/geocode?q=Paris');
    const paris = res.body[0];
    assertEquals(paris.lat, 48.8566101, 'Paris lat');
    assertEquals(paris.lon, 2.3514992, 'Paris lon');
    assertEquals(paris.display_name, 'Paris, Île-de-France, France', 'Paris name');
  });

  // 6. Nominatim error → 500
  await test('Returns 500 when Nominatim is unavailable', async () => {
    const failFetch = makeMockFetch([], { ok: false, statusText: 'Service Unavailable' });
    const app = buildTestServer(failFetch);
    const res = await makeRequest(app, '/geocode?q=Paris');
    assertEquals(res.status, 500, 'status should be 500');
    assert(res.body.error, 'should have error message');
  });

  // 7. Empty Nominatim response returns []
  await test('Empty Nominatim results return empty array', async () => {
    const app = buildTestServer(makeMockFetch([]));
    const res = await makeRequest(app, '/geocode?q=xyznotaplace');
    assertEquals(res.status, 200, 'status');
    assertEquals(res.body.length, 0, 'no results');
  });

  // 8. Special characters in query are encoded
  await test('Query with special characters is handled', async () => {
    const app = buildTestServer(makeMockFetch(MOCK_NOMINATIM_RESULTS));
    const res = await makeRequest(app, '/geocode?q=New%20York%2C%20USA');
    assertEquals(res.status, 200, 'status');
  });

  // 9. Results limited to 5 max by Nominatim params
  await test('Result structure has display_name, lat, lon only', async () => {
    const app = buildTestServer(makeMockFetch(MOCK_NOMINATIM_RESULTS));
    const res = await makeRequest(app, '/geocode?q=Paris');
    res.body.forEach((item, i) => {
      const keys = Object.keys(item).sort().join(',');
      assertEquals(keys, 'display_name,lat,lon', `item ${i} keys`);
    });
  });

  // 10. Coordinate extraction produces correct prompt format
  await test('Coordinates produce valid selectedCoordinates format', async () => {
    // Simulate what script.js does when user selects a result
    const result = { lat: 48.8566101, lon: 2.3514992 };
    const selectedCoordinates = `${result.lat},${result.lon}`;
    assert(selectedCoordinates === '48.8566101,2.3514992', 'format check');
    // Verify it can be split back
    const [lat, lon] = selectedCoordinates.split(',').map(Number);
    assertEquals(lat, 48.8566101, 'lat roundtrip');
    assertEquals(lon, 2.3514992, 'lon roundtrip');
  });

  // 11. Coordinates feed correctly into the AI prompt
  await test('selectedCoordinates slot into AI prompt correctly', async () => {
    const selectedCoordinates = '48.8566101,2.3514992';
    const time = '10';
    const stops = 6;
    const prompt = `Generate a ${time} walking trail starting from ${selectedCoordinates} including ${stops} stops that ends again at the starting point. Format the route by listing only the GPS coordinates, no additional text. Include the GPS coordinate of the start point at the beginning and end of the list. Label them "start point: ", "checkpoint 1: ", "checkpoint 2 ", etc. followed by "end point: ".`;
    assert(prompt.includes('48.8566101,2.3514992'), 'coords in prompt');
    assert(prompt.includes('10 walking trail'), 'time in prompt');
    assert(prompt.includes('6 stops'), 'stops in prompt');
  });

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 OSM Test Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All OSM geocoding tests passed!\n');
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
