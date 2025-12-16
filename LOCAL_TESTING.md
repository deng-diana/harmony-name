# Local Testing & Debugging Guide

## Prerequisites

1. **Environment Variables** (`.env.local`):
```bash
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

2. **Vector Database**: Ensure `src/lib/poems-db.json` exists (run `scripts/build-library.ts` if needed)

## Step-by-Step Local Reproduction

### 1. Start Development Server
```bash
npm run dev
```

### 2. Test with cURL

#### Valid Request
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "male",
    "dayMaster": "Wood",
    "strength": "Weak",
    "favourableElements": ["Water", "Wood"],
    "avoidElements": ["Fire", "Metal"],
    "surnamePreference": "auto",
    "recommendedNameLength": "3 characters (Surname + 2 Names)"
  }' | jq '.'
```

#### Expected Success Response
```json
{
  "names": [
    {
      "hanzi": "张清心",
      "pinyin": "Zhāng Qīng Xīn",
      "poeticMeaning": "...",
      "culturalHeritage": { ... },
      "anatomy": [ ... ],
      "masterComment": "..."
    }
  ]
}
```

### 3. Test Error Scenarios

#### Missing Environment Variables
```bash
# Unset DEEPSEEK_API_KEY
unset DEEPSEEK_API_KEY
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"dayMaster": "Wood", "favourableElements": ["Water"]}'
```

**Expected Error Response:**
```json
{
  "error": "Server configuration error",
  "details": "Missing: DEEPSEEK_API_KEY",
  "code": "ENV_MISSING"
}
```

**Expected Server Log:**
```
❌ Missing environment variables: DEEPSEEK_API_KEY
```

#### Invalid Request Body
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"invalid": "json"}' 
```

**Expected Error Response:**
```json
{
  "error": "Missing required fields",
  "details": "dayMaster and favourableElements are required",
  "code": "MISSING_FIELDS"
}
```

#### API Authentication Error (Invalid Key)
```bash
# Set invalid API key in .env.local
DEEPSEEK_API_KEY=sk-invalid
```

**Expected Error Response:**
```json
{
  "error": "AI service unavailable",
  "details": "Incorrect API key provided",
  "code": "API_ERROR",
  "status": 401
}
```

**Expected Server Log:**
```
❌ DeepSeek API error: {
  message: "Incorrect API key provided",
  status: 401,
  code: "invalid_api_key",
  baseURL: "configured",
  model: "deepseek-chat"
}
```

### 4. Check Server Logs

Watch terminal output for structured error logs:
- `❌ Missing environment variables: ...`
- `❌ Invalid JSON in request body: ...`
- `❌ DeepSeek API error: { ... }`
- `❌ JSON parse error: { ... }`
- `❌ Unexpected error: { ... }`

### 5. Using Test Script

```bash
chmod +x test-api.sh
./test-api.sh
```

## Common Issues & Solutions

### Issue: "ENV_MISSING" error
**Solution**: Check `.env.local` exists and contains all required variables

### Issue: "API_ERROR" with 401
**Solution**: Verify `DEEPSEEK_API_KEY` is correct and active

### Issue: "API_ERROR" with 400
**Solution**: Check `DEEPSEEK_BASE_URL` format (should be `https://api.deepseek.com` or end with `/v1`)

### Issue: "JSON_PARSE_ERROR"
**Solution**: Model returned invalid JSON. Check server logs for content preview.

### Issue: "EMPTY_RESPONSE"
**Solution**: API returned no choices. May indicate model overload or rate limit.

## DeepSeek Compatibility Notes

1. **BaseURL Format**: Automatically normalized to end with `/v1`
   - Input: `https://api.deepseek.com` → Normalized: `https://api.deepseek.com/v1`
   - Input: `https://api.deepseek.com/` → Normalized: `https://api.deepseek.com/v1`

2. **Model Name**: `deepseek-chat` (confirmed working)

3. **Response Format**: `response_format: { type: "json_object" }` is supported

4. **Timeout**: `maxDuration: 60` (Vercel Pro required for >10s)

