# ADE_next_session_priming.md

_Last updated: 2025-06-04_

## Current State

1. **Display Manager Issue Investigation**
   - Empty displays section in OnDeck-V9
   - Potential SharedImageManager and Invalid mailbox errors
   - MojoAudioOutputIPC failures reported

2. **CLITS (Chrome Log Inspector Tool System) Development**
   - Major improvements implemented in version 0.3.0:
     - Fixed timestamp handling issues
     - Fixed log processing errors (`toLowerCase` undefined)
     - Added built-in log file export
     - Added advanced boolean filtering
     - Added error summary statistics
     - Added live mode with duration
     - Improved reconnection handling
   - All requested improvements have been implemented

## Immediate Tasks (Next Session)

1. **Upgrade CLITS in OnDeck-V9 Project**
   - [ ] Uninstall previous version: `npm uninstall ai-debug-extractor`
   - [ ] Install new version: `npm install ai-debug-extractor@0.3.0`
   - [ ] Test with Display Manager debugging
   - [ ] Use new features like advanced filtering and live mode
   - [ ] Example: `clits extract --chrome --advanced-filter "(SharedImageManager AND error) OR Invalid\ mailbox" --live-mode 300 --error-summary --output-file=display-logs.json`

2. **Debug Display Manager**
   - [ ] Use improved CLITS to capture display errors
   - [ ] Focus on SharedImageManager and Invalid mailbox errors
   - [ ] Analyze connection between GPU and display issues
   - [ ] Try new error summary to identify patterns

3. **Tool Integration**
   - [ ] Complete AI assistant integration
   - [ ] Test error pattern matching
   - [ ] Document common error scenarios

## Recently Completed
- [x] CLITS tool improvements:
  - [x] Fixed timestamp handling issues
  - [x] Fixed log processing errors
  - [x] Added built-in log file export
  - [x] Added advanced boolean filtering
  - [x] Added error summary statistics
  - [x] Added live mode with duration parameter
  - [x] Improved reconnection handling
- [x] Initial CLITS implementation
- [x] Chrome DevTools Protocol integration
- [x] Basic log collection working
- [x] Tool documentation in ade-rule-every-chat.mdc
- [x] Identified key issues to fix

## Known Issues to Address

1. **Display Manager Issues**
   ```
   SharedImageManager::ProduceGpuMemoryBuffer failed
   Invalid mailbox
   ```
   Next steps:
   - Use improved CLITS for better error capture
   - Try the new advanced filtering to isolate specific patterns
   - Use live mode to capture issues as they happen

## Progress
- [x] Basic Chrome connection working
- [x] Log collection implemented
- [x] Timestamp handling
- [x] Error processing
- [x] Live mode implementation
- [ ] Display issue resolution

## Next Steps
1. Upgrade CLITS in the OnDeck-V9 project
2. Use the improved tool to debug the display manager issues
3. Document common error patterns and solutions
4. Complete debugging of display issues 