# Best Practices Guide

This guide provides best practices and recommendations for using CLiTS to get the most out of your debugging sessions.

## General Recommendations

*   **Start with a clean slate:** Whenever possible, start your debugging session with a fresh Chrome profile and no unnecessary tabs or extensions running. This will help reduce noise in the logs and provide more accurate results.
*   **Use the interactive mode:** If you are not sure which monitoring features to enable, start with the interactive mode (`--interactive`). This will guide you through the available options and help you configure your session.
*   **Be specific with filters:** To avoid being overwhelmed with data, use the filtering options (`--log-levels`, `--sources`, `--domains`, etc.) to narrow down the logs to what is most relevant to your investigation.

## Common Scenarios

### Debugging a Slow Page Load

1.  Run CLiTS with performance monitoring enabled: `clits extract --chrome --interactive` (and select "Performance Monitoring").
2.  Look for long tasks, layout shifts, and other performance bottlenecks in the extracted logs.
3.  Use the `performance` logs to identify the specific events and scripts that are causing delays.

### Investigating Network Issues

1.  Enable network and request/response correlation monitoring: `clits extract --chrome --interactive` (and select "WebSocket Monitoring" and other network options).
2.  Look for failed requests, long-running requests, and unexpected responses in the `network` and `websocket` logs.
3.  Use the correlated network entries to trace the full lifecycle of a request and its response.

### Tracking Down React Bugs

1.  Enable React hook and component lifecycle monitoring: `clits extract --chrome --interactive` (and select the relevant React options).
2.  Look for unexpected component re-renders, prop changes, or lifecycle events in the `react` and `console` logs.
3.  Use the detailed information in the logs to understand how your components are behaving and identify the source of the bug.

## Interpreting the Results

*   **Look for patterns:** Don't just focus on individual log entries. Look for patterns and sequences of events that might indicate a larger issue.
*   **Correlate different log types:** Use the timestamps to correlate events across different log sources (e.g., a network request followed by a DOM mutation).
*   **Use the error summary:** The `--error-summary` option can help you quickly identify the most frequent errors in your application. 