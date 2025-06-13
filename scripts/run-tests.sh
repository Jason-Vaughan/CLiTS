#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test directory setup
TEST_DIR="test-logs"
CHROME_DEBUG_DIR="/tmp/chrome-debug-test"

# Set path to ade command
ADE_CMD="node dist/cli.js"

echo -e "${GREEN}Setting up test environment...${NC}"

# Create test directories
mkdir -p $TEST_DIR

# Create test log files
echo "ERROR: Test error message from API" > "$TEST_DIR/api-error.log"
echo "WARNING: Authentication warning" > "$TEST_DIR/auth-warning.log"
echo "INFO: System startup complete" > "$TEST_DIR/system.log"
echo "DEBUG: Processing request" > "$TEST_DIR/debug.log"
echo "ERROR: Database connection failed" > "$TEST_DIR/db-error.log"

# Function to run a test and report result
run_test() {
    local test_name=$1
    local command=$2
    
    echo -e "\n${GREEN}Running test: ${test_name}${NC}"
    echo "Command: $command"
    
    if eval $command; then
        echo -e "${GREEN}✓ Test passed: ${test_name}${NC}"
        return 0
    else
        echo -e "${RED}✗ Test failed: ${test_name}${NC}"
        return 1
    fi
}

# Start Chrome with debugging enabled (in background)
echo -e "\n${GREEN}Starting Chrome with remote debugging...${NC}"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --remote-debugging-port=9222 \
    --user-data-dir=$CHROME_DEBUG_DIR \
    --no-first-run \
    --no-default-browser-check \
    --headless \
    &

CHROME_PID=$!

# Wait for Chrome to start
sleep 5

# Run tests
echo -e "\n${GREEN}Running tests...${NC}"

# Basic functionality tests
run_test "Basic Chrome Extraction" "$ADE_CMD extract --chrome"
run_test "Basic File Extraction" "$ADE_CMD extract -s $TEST_DIR -p '*.log'"
run_test "Combined Extraction" "$ADE_CMD extract --chrome -s $TEST_DIR -p '*.log'"

# Filtering tests
run_test "Log Level Filtering" "$ADE_CMD extract --chrome --log-levels error,warning"
run_test "Source Filtering" "$ADE_CMD extract --chrome --sources network,console"
run_test "Keyword Filtering" "$ADE_CMD extract --chrome --keywords 'error,failed'"
run_test "Domain Filtering" "$ADE_CMD extract --chrome --domains 'api.*,*.myservice.com'"
run_test "Exclusion Pattern" "$ADE_CMD extract --chrome --exclude 'DEPRECATED_ENDPOINT'"

# Formatting tests
run_test "Group by Source" "$ADE_CMD extract --chrome --group-by-source"
run_test "Group by Level" "$ADE_CMD extract --chrome --group-by-level"
run_test "With Stack Trace" "$ADE_CMD extract --chrome --log-levels error"

# Complex tests
run_test "Complex Filtering" "$ADE_CMD extract --chrome --log-levels error --keywords 'api,auth' --exclude 'health-check' --group-by-level"
run_test "Multiple File Patterns" "$ADE_CMD extract -s $TEST_DIR -p '*.log' '*.err' '*.debug'"

# Cleanup
echo -e "\n${GREEN}Cleaning up test environment...${NC}"

# Kill Chrome
if [ ! -z "$CHROME_PID" ]; then
    kill $CHROME_PID
fi

# Remove test directories with sudo if needed
sudo rm -rf $TEST_DIR
sudo rm -rf $CHROME_DEBUG_DIR

echo -e "\n${GREEN}Test cleanup complete!${NC}" 