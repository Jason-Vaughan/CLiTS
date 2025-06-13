# CLITS Node.js API Example

This example demonstrates how to integrate [CLITS](../../README.md) (Chrome Log Inspector & Troubleshooting System) into a Node.js API application. It shows how to handle Chrome debugging logs, manage errors, and expose debugging information through REST endpoints.

## Features

- Express.js REST API
- Chrome Debug Protocol integration via CLITS
- Error handling and logging
- Configurable retry logic
- Environment-based configuration

## Prerequisites

- **Node.js** >= 16
- **Google Chrome** (latest recommended)
- **CLITS** (installed globally or as a dependency)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create a `.env` file in the root directory:**
   ```env
   PORT=3000
   LOG_LEVEL=info
   NODE_ENV=development
   ```

3. **Start Chrome with remote debugging enabled:**
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --remote-debugging-port=9222 \
     --user-data-dir=/tmp/chrome-debug
   ```

4. **Start the API server:**
   ```bash
   npm run dev
   ```

## API Endpoints

### Get All Logs
```http
GET /api/debug/logs?limit=100
```
Returns console logs of all types (error, warning, info).

### Get Error Logs
```http
GET /api/debug/errors?limit=50
```
Returns only error logs.

### Get Network Requests
```http
GET /api/debug/network?includeResponses=true&limit=50
```
Returns network request information.

### Clear Logs
```http
POST /api/debug/clear
```
Clears all collected logs.

## Error Handling

The example includes comprehensive error handling:

- Chrome Extractor specific errors
- Validation errors
- General server errors
- Automatic retries for transient failures

## Logging

Logs are written to:
- Console (all levels, colored output)
- `error.log` (error level only)
- `combined.log` (all levels)

## Configuration

The ChromeExtractor is configured with:
- Retry logic for connection failures
- Error suppression for known issues
- Customizable log collection

## Example Usage

1. **Start Chrome with remote debugging:**
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --remote-debugging-port=9222 \
     --user-data-dir=/tmp/chrome-debug
   ```

2. **Start the API server:**
   ```bash
   npm run dev
   ```

3. **Make requests to the API:**
   ```bash
   # Get all logs
   curl http://localhost:3000/api/debug/logs

   # Get error logs
   curl http://localhost:3000/api/debug/errors

   # Get network requests with responses
   curl http://localhost:3000/api/debug/network?includeResponses=true

   # Clear logs
   curl -X POST http://localhost:3000/api/debug/clear
   ```

## Error Handling Examples

The API handles various error scenarios:

```json
// Chrome connection error
{
  "error": "Chrome Extractor Error",
  "message": "Failed to connect to Chrome instance",
  "details": {
    "port": 9222,
    "attempts": 3
  }
}

// Validation error
{
  "error": "Validation Error",
  "message": "Invalid limit parameter: must be a positive integer"
}

// Server error
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

For more details and advanced usage, see the [main CLITS documentation](../../README.md). 