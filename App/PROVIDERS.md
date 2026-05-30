# TERRA LLM Providers Documentation

## Architecture

TERRA uses a provider abstraction pattern that allows swapping between different LLM APIs transparently.

```
BaseProvider (abstract interface)
    ├── OpenAIProvider
    ├── AnthropicProvider
    ├── GeminiProvider
    └── OllamaProvider

ProviderFactory (creates providers)
ConfigManager (loads environment variables)
```

## Provider Interfaces

All providers implement:
- `initialize()` - Set up client connections
- `generate(prompt)` - Generate response from prompt
- `healthCheck()` - Verify API connectivity
- `validate()` - Verify configuration is complete

## Adding a New Provider

1. Create new file: `providers/YourProvider.js`
2. Extend `BaseProvider`
3. Implement required methods
4. Add case to `ProviderFactory.createProvider()`
5. Add env vars to `.env.example`
6. Update `ConfigManager` to load your env vars
7. Test with `test-providers.js`

## Configuration

All providers configured via environment variables in `.env`:

```
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Google Gemini
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-1.5-flash

# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Server
DEFAULT_PROVIDER=openai
PORT=3000
```

## API Endpoints

### GET /health
Health check for all configured providers.

Response:
```json
{
  "status": "OK",
  "default_provider": "openai",
  "providers": {
    "openai": true,
    "anthropic": true,
    "gemini": false,
    "ollama": true
  }
}
```

### GET /providers
List available and configured providers.

Response:
```json
{
  "available": ["openai", "anthropic", "gemini", "ollama"],
  "configured": ["openai", "anthropic", "ollama"],
  "default": "openai"
}
```

### POST /generate-trail
Generate coordinates for a trail.

Request:
```json
{
  "prompt": "Generate a 10-minute walking trail...",
  "provider": "anthropic"
}
```

Response:
```json
{
  "choices": [
    {
      "message": {
        "content": "start point: 40.7128,-74.0060\ncheckpoint 1: 40.7150,-74.0070\n..."
      }
    }
  ],
  "provider": "anthropic"
}
```

### POST /test-provider
Test a specific provider with a simple prompt.

Request:
```json
{
  "provider": "gemini",
  "prompt": "Say 'TERRA works!'"
}
```

## Error Handling

Each provider normalizes errors to consistent messages. Common errors:

- `API key is required` - Missing credentials in .env
- `Generation failed: ...` - API error (rate limit, invalid request, etc.)
- `Health check failed` - Cannot connect to provider

## Performance Notes

### OpenAI
- Slowest but most capable
- Higher costs
- Best for complex trail generation

### Anthropic
- Fast and cost-effective
- Good balance of capability and speed
- Recommended for production

### Gemini
- Fastest inference
- Good for real-time generation
- Lower cost than OpenAI

### Ollama
- Zero latency after model loads
- Free (open source models)
- Requires local GPU for speed
- Best for privacy-sensitive applications

## Security Considerations

- API keys stored in `.env` (NOT committed to git)
- `.env` is in `.gitignore` - verify before committing
- Ollama runs locally, no data sent to external servers
- Consider rate limiting in production
