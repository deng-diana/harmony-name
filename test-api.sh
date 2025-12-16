#!/bin/bash
# Test script for /api/generate endpoint

BASE_URL="${1:-http://localhost:3000}"
ENDPOINT="${BASE_URL}/api/generate"

echo "🧪 Testing API endpoint: ${ENDPOINT}"
echo ""

# Test 1: Valid request
echo "📝 Test 1: Valid request"
curl -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "male",
    "dayMaster": "Wood",
    "strength": "Weak",
    "favourableElements": ["Water", "Wood"],
    "avoidElements": ["Fire", "Metal"],
    "surnamePreference": "auto",
    "recommendedNameLength": "3 characters (Surname + 2 Names)"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo "---"
echo ""

# Test 2: Missing required fields
echo "📝 Test 2: Missing required fields"
curl -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "male"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo "---"
echo ""

# Test 3: Invalid JSON
echo "📝 Test 3: Invalid JSON"
curl -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{ invalid json }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo "✅ Tests complete. Check server logs for detailed error messages."

