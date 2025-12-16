# API Route Failure Points Analysis

## 1. Environment Variables
- **Line 11**: `process.env.DEEPSEEK_API_KEY` - undefined → OpenAI client throws
- **Line 13**: `process.env.DEEPSEEK_BASE_URL` - undefined → connection fails
- **Line 7 (retriever.ts)**: `process.env.OPENAI_API_KEY` - undefined → RAG fails (but has fallback)

## 2. Request Body Parsing
- **Line 69**: `await request.json()` - Invalid JSON → throws
- **Line 70-79**: Missing required fields → undefined values in prompt

## 3. RAG Search (Non-blocking)
- **Line 89**: `searchPoems()` - OPENAI_API_KEY missing → throws (caught, continues)
- **Line 4 (retriever.ts)**: `poems-db.json` missing → import fails

## 4. DeepSeek API Call
- **Line 131**: `openai.chat.completions.create()` failures:
  - Network timeout
  - 401 Unauthorized (invalid API key)
  - 400 Bad Request (invalid model name or params)
  - 429 Rate limit
  - BaseURL format error (must end with `/v1`)

## 5. Model Response Parsing
- **Line 141**: `completion.choices[0]` - undefined if empty response
- **Line 141**: `completion.choices[0].message.content` - null/empty
- **Line 144**: `JSON.parse(content)` - Invalid JSON from model

## 6. Timeout
- **Line 5**: `maxDuration = 60` - Vercel free tier has 10s limit

## 7. Error Handling
- **Line 145-147**: Generic catch-all hides actual error details
- Frontend only sees "Failed" message

