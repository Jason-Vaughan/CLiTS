#!/bin/bash

# CLiTS v1.0.7 Dynamic Navigation Discovery Test
# Tests all new features: discover-links, navigate by link-text, navigate by url-contains

echo "🚀 CLiTS v1.0.7 Dynamic Navigation Discovery Test"
echo "================================================"

# Build the project first
echo "📦 Building CLiTS..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Test 1: Discover all navigation links
echo "🔗 Test 1: Discovering all navigation links"
echo "Command: npm run start -- discover-links --chrome-port 9222"
echo ""

npm run start -- discover-links --chrome-port 9222 > /tmp/clits_test_output.json 2>&1
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Link discovery successful"
    # Extract just the JSON part (after the npm run output)
    tail -n +4 /tmp/clits_test_output.json | jq '.links[] | {text: .text, url: .url}' 2>/dev/null || tail -n +4 /tmp/clits_test_output.json
    echo ""
else
    echo "❌ Link discovery failed"
    cat /tmp/clits_test_output.json
    exit 1
fi

# Test 2: Navigate by exact link text
echo "🎯 Test 2: Navigate by exact link text"
echo "Command: npm run start -- navigate --link-text 'Dashboard' --chrome-port 9222"
echo ""

RESULT=$(npm run start -- navigate --link-text "Dashboard" --chrome-port 9222 2>&1)

if [[ $RESULT == *"Successfully navigated via link-text"* ]]; then
    echo "✅ Navigation by link text successful"
    echo "$RESULT"
    echo ""
else
    echo "❌ Navigation by link text failed"
    echo "$RESULT"
    exit 1
fi

# Test 3: Navigate by fuzzy link text
echo "🔍 Test 3: Navigate by fuzzy link text"
echo "Command: npm run start -- navigate --link-text 'task' --chrome-port 9222"
echo ""

RESULT=$(npm run start -- navigate --link-text "task" --chrome-port 9222 2>&1)

if [[ $RESULT == *"Successfully navigated via link-text"* ]]; then
    echo "✅ Fuzzy navigation successful"
    echo "$RESULT"
    echo ""
else
    echo "❌ Fuzzy navigation failed"
    echo "$RESULT"
    exit 1
fi

# Test 4: Navigate by URL pattern
echo "🌐 Test 4: Navigate by URL contains pattern"
echo "Command: npm run start -- navigate --url-contains 'display' --chrome-port 9222"
echo ""

RESULT=$(npm run start -- navigate --url-contains "display" --chrome-port 9222 2>&1)

if [[ $RESULT == *"Successfully navigated via url-pattern"* ]]; then
    echo "✅ URL pattern navigation successful"
    echo "$RESULT"
    echo ""
else
    echo "❌ URL pattern navigation failed"
    echo "$RESULT"
    exit 1
fi

# Test 5: clits-inspect actions
echo "🤖 Test 5: clits-inspect automation actions"
echo "Command: node dist/cli-inspect.js --auto --json --action discover-links --port 9222"
echo ""

INSPECT_RESULT=$(node dist/cli-inspect.js --auto --json --action discover-links --port 9222 2>/dev/null)

if [ $? -eq 0 ]; then
    LINK_COUNT=$(echo "$INSPECT_RESULT" | jq '.links | length' 2>/dev/null)
    echo "✅ clits-inspect discover-links successful"
    echo "Found $LINK_COUNT navigation links"
    echo ""
else
    echo "❌ clits-inspect discover-links failed"
    exit 1
fi

# Test 6: clits-inspect navigate-by-text
echo "🎮 Test 6: clits-inspect navigate-by-text action"
echo "Command: node dist/cli-inspect.js --auto --json --action navigate-by-text --link-text 'Zone' --port 9222"
echo ""

NAVIGATE_RESULT=$(node dist/cli-inspect.js --auto --json --action navigate-by-text --link-text "Zone" --port 9222 2>/dev/null)

if [ $? -eq 0 ]; then
    NAVIGATED_URL=$(echo "$NAVIGATE_RESULT" | jq -r '.navigated.url' 2>/dev/null)
    echo "✅ clits-inspect navigate-by-text successful"
    echo "Navigated to: $NAVIGATED_URL"
    echo ""
else
    echo "❌ clits-inspect navigate-by-text failed"
    exit 1
fi

# Test 7: Error handling - invalid link text
echo "⚠️  Test 7: Error handling - invalid link text"
echo "Command: npm run start -- navigate --link-text 'NonexistentPage' --chrome-port 9222"
echo ""

RESULT=$(npm run start -- navigate --link-text "NonexistentPage" --chrome-port 9222 2>&1)

if [[ $RESULT == *"Navigation failed"* ]]; then
    echo "✅ Error handling successful"
    echo "Correctly detected missing link"
    echo ""
else
    echo "❌ Error handling failed"
    echo "$RESULT"
    exit 1
fi

# Test 8: Error handling via clits-inspect
echo "⚠️  Test 8: Error handling via clits-inspect"
echo "Command: node dist/cli-inspect.js --auto --json --action navigate-by-text --link-text 'NonexistentPage' --port 9222"
echo ""

INSPECT_ERROR=$(node dist/cli-inspect.js --auto --json --action navigate-by-text --link-text "NonexistentPage" --port 9222 2>/dev/null)

if [[ $INSPECT_ERROR == *"No link found matching text"* ]]; then
    echo "✅ clits-inspect error handling successful"
    echo "Correctly detected missing link with detailed error message"
    echo ""
else
    echo "❌ clits-inspect error handling failed"
    echo "$INSPECT_ERROR"
    exit 1
fi

echo "🎉 ALL TESTS PASSED!"
echo "=========================="
echo ""
echo "CLiTS v1.0.7 Dynamic Navigation Discovery Features:"
echo "✅ Link discovery (discover-links command)"
echo "✅ Navigate by link text (fuzzy matching)"
echo "✅ Navigate by URL pattern (substring matching)"  
echo "✅ clits-inspect automation actions"
echo "✅ Error handling for missing links"
echo "✅ clits-inspect error handling with detailed messages"
echo "✅ JSON output for automation scripts"
echo ""
echo "🚀 Ready for CissorCLITS integration!"
echo "🚀 Hard-coded URLs are now optional!"
echo "🚀 Automation scripts are now self-healing!" 