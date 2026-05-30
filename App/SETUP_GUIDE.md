# TERRA Multi-API Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd App
npm install
```

### 2. Configure API Keys

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

#### OpenAI
- Get key: https://platform.openai.com/api/keys
- Add to `.env`: `OPENAI_API_KEY=sk-...`

#### Anthropic Claude
- Get key: https://console.anthropic.com/keys
- Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

#### Google Gemini
- Get key: https://aistudio.google.com/app/apikeys
- Add to `.env`: `GEMINI_API_KEY=AIzaSy...`

#### Ollama (Local)
- Install: https://ollama.ai/
- Run: `ollama serve` in a separate terminal
- Models: `ollama list` to see available models
- No API key needed, configure base URL and model in `.env`

### 3. Run Server
```bash
node server.js
```

### 4. Open App
Open `index.html` in a browser

### 5. Test Providers
Health check: `curl http://localhost:3000/health`
Available providers: `curl http://localhost:3000/providers`
Test provider: `curl -X POST http://localhost:3000/test-provider -d '{"provider":"openai"}' -H "Content-Type: application/json"`

## Troubleshooting

### Provider not showing in dropdown
- Check that API key is set in `.env`
- Restart server after changing `.env`
- Check server logs for configuration errors

### Request fails with "Provider is not configured"
- Verify API key is correctly set in `.env`
- Check for typos in provider names

### Ollama "connection refused"
- Ensure Ollama is running: `ollama serve`
- Check base URL in `.env` (default: `http://localhost:11434`)
- Verify model is installed: `ollama list`

### API rate limit errors
- OpenAI: Wait or upgrade account
- Anthropic: Check quota at console.anthropic.com
- Gemini: Check quota at aistudio.google.com
- Ollama: No rate limits (local)
