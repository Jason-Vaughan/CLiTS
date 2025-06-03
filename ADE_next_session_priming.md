# ADE_next_session_priming.md

_Last updated: 2025-06-03_

## Current State

1. **Display Manager Issue Investigation**
   - Empty displays section in OnDeck-V9
   - Potential SharedImageManager and Invalid mailbox errors
   - MojoAudioOutputIPC failures reported

2. **CLITS (Chrome Log Inspector Tool System) Development**
   - Basic functionality working:
     - Successfully connects to Chrome debug port
     - Identifies correct target page
     - Can collect logs
   - Current Issues:
     - Timestamp handling during page refreshes
     - Log processing errors (`toLowerCase` undefined)
     - Need better refresh handling

## Immediate Tasks (Next Session)

1. **Fix CLITS Tool Issues**
   - [ ] Add proper timestamp normalization
   - [ ] Fix log processing crash
   - [ ] Implement refresh handling
   - [ ] Add `--live-mode` with duration parameter
   - [ ] Improve error reporting format

2. **Debug Display Manager**
   - [ ] Use fixed CLITS to capture display errors
   - [ ] Focus on SharedImageManager and Invalid mailbox errors
   - [ ] Analyze connection between GPU and display issues

3. **Tool Integration**
   - [ ] Complete AI assistant integration
   - [ ] Test error pattern matching
   - [ ] Document common error scenarios

## Recently Completed
- [x] Initial CLITS implementation
- [x] Chrome DevTools Protocol integration
- [x] Basic log collection working
- [x] Tool documentation in ade-rule-every-chat.mdc
- [x] Identified key issues to fix

## Known Issues to Address

1. **Timestamp Handling**
   ```
   warn: Invalid timestamp encountered
   ```
   Next steps:
   - Add timestamp validation
   - Implement normalization across page reloads
   - Add better error context

2. **Log Processing**:
   ```
   Failed to extract debug data: Cannot read properties of undefined (reading 'toLowerCase')
   ```
   Proposed solution:
   - Add null checks
   - Improve error handling
   - Add debug logging

3. **Page Refresh Handling**:
   - Need to handle disconnect/reconnect cycle
   - Maintain log consistency across refreshes
   - Add automatic reconnection

## Progress
- [x] Basic Chrome connection working
- [x] Log collection implemented
- [ ] Timestamp handling
- [ ] Error processing
- [ ] Live mode implementation
- [ ] Display issue resolution

## Next Steps
1. Fix the timestamp and log processing issues in CLITS
2. Implement better refresh handling
3. Use the improved tool to debug the display manager issues
4. Document common error patterns and solutions 