#!/bin/bash

# OCCO API Testing Script
# Tests all API endpoints and features

set -e

API_BASE="${API_BASE:-http://localhost:3000}"
API_KEY="${API_KEY:-dev_key_12345}"
TEST_WALLET="${TEST_WALLET:-7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU}"

echo "🧪 OCCO API Test Suite"
echo "======================"
echo "API Base: $API_BASE"
echo "API Key: ${API_KEY:0:10}..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS=0
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local expected_code="$4"
    local extra_args="$5"
    
    TESTS=$((TESTS + 1))
    echo -n "Test $TESTS: $name... "
    
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
        "$API_BASE$endpoint" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        $extra_args)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        if [ -n "$body" ]; then
            echo "   Response: $(echo $body | jq -c '.' 2>/dev/null || echo $body | head -c 100)"
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_code, got $http_code)"
        FAILED=$((FAILED + 1))
        if [ -n "$body" ]; then
            echo "   Response: $(echo $body | jq -c '.' 2>/dev/null || echo $body)"
        fi
    fi
    echo ""
}

echo "=== Health Checks ==="
test_endpoint "API Health" "GET" "/v1/health" "200"
echo ""

echo "=== Authentication Tests ==="
# Test without API key
echo -n "Test: No API key... "
response=$(curl -s -w "\n%{http_code}" "$API_BASE/v1/score/$TEST_WALLET")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Correctly rejected)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} (Should reject without API key)"
    FAILED=$((FAILED + 1))
fi
TESTS=$((TESTS + 1))
echo ""

# Test with invalid API key
echo -n "Test: Invalid API key... "
response=$(curl -s -w "\n%{http_code}" "$API_BASE/v1/score/$TEST_WALLET" \
    -H "Authorization: Bearer invalid_key_12345")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Correctly rejected)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} (Should reject invalid API key)"
    FAILED=$((FAILED + 1))
fi
TESTS=$((TESTS + 1))
echo ""

echo "=== Score Endpoints ==="
test_endpoint "Get wallet score" "GET" "/v1/score/$TEST_WALLET" "200"
test_endpoint "Get wallet report" "GET" "/v1/report/$TEST_WALLET" "200"
test_endpoint "Invalid wallet (too short)" "GET" "/v1/score/invalid" "400"
echo ""

echo "=== Rate Limiting Tests ==="
echo "Sending 10 rapid requests to test rate limiting..."
for i in {1..10}; do
    response=$(curl -s -w "\n%{http_code}" "$API_BASE/v1/score/$TEST_WALLET" \
        -H "Authorization: Bearer $API_KEY")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "429" ]; then
        echo -e "${YELLOW}Rate limit triggered on request $i${NC}"
        break
    fi
done
echo ""

echo "=== Cache Testing ==="
echo -n "Test: First request (cache miss)... "
response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE/v1/score/$TEST_WALLET" -D -)
if echo "$response" | grep -q "X-Cache: MISS"; then
    echo -e "${GREEN}✓ PASS${NC} (Cache miss)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARNING${NC} (Expected cache miss)"
fi
TESTS=$((TESTS + 1))
echo ""

echo -n "Test: Second request (cache hit)... "
response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE/v1/score/$TEST_WALLET" -D -)
if echo "$response" | grep -q "X-Cache: HIT"; then
    echo -e "${GREEN}✓ PASS${NC} (Cache hit)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARNING${NC} (Expected cache hit)"
fi
TESTS=$((TESTS + 1))
echo ""

echo "=== Performance Test ==="
echo "Testing response time (10 requests)..."
total_time=0
for i in {1..10}; do
    start=$(date +%s%N)
    curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE/v1/score/$TEST_WALLET" > /dev/null
    end=$(date +%s%N)
    elapsed=$((($end - $start) / 1000000)) # Convert to milliseconds
    total_time=$(($total_time + $elapsed))
    echo "  Request $i: ${elapsed}ms"
done
avg_time=$(($total_time / 10))
echo ""
echo "Average response time: ${avg_time}ms"
if [ $avg_time -lt 500 ]; then
    echo -e "${GREEN}✓ Performance goal met (<500ms)${NC}"
else
    echo -e "${YELLOW}⚠ Performance warning (>500ms)${NC}"
fi
echo ""

echo "======================"
echo "📊 Test Results"
echo "======================"
echo "Total Tests: $TESTS"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
