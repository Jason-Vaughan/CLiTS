# CLITS_next_session_priming.md

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

1. **Vitest Migration (Jest → Vitest) [COMPLETED]**
   - [x] Remove Jest and ts-jest dependencies
   - [x] Install Vitest and related plugins
   - [x] Update test scripts in package.json to use Vitest
   - [x] Refactor test files for Vitest compatibility
   - [x] Add robust test injection hooks to ChromeExtractor
   - [x] Run and verify all tests with Vitest
   - [x] Document migration issues and changes
   - [x] Commit all changes to git
   - **Result:** All but one integration test now pass. All log collection and suppression logic is robust and future-proof.

2. **Upgrade CLITS in OnDeck-V9 Project**
   - [ ] Uninstall previous version: `npm uninstall clits`
   - [ ] Install new version: `npm install clits@0.3.0`
   - [ ] Test with Display Manager debugging
   - [ ] Use new features like advanced filtering and live mode
   - [ ] Example: `clits extract --chrome --advanced-filter "(SharedImageManager AND error) OR Invalid\ mailbox" --live-mode 300 --error-summary --output-file=display-logs.json`

3. **Debug Display Manager**
   - [ ] Use improved CLITS to capture display errors
   - [ ] Focus on SharedImageManager and Invalid mailbox errors
   - [ ] Analyze connection between GPU and display issues
   - [ ] Try new error summary to identify patterns

4. **Tool Integration**
   - [ ] Complete AI assistant integration
   - [ ] Test error pattern matching
   - [ ] Document common error scenarios

## Recently Completed
- [x] CLITS tool improvements
- [x] Initial CLITS implementation
- [x] Chrome DevTools Protocol integration
- [x] Basic log collection working
- [x] Tool documentation in ade-rule-every-chat.mdc
- [x] Identified key issues to fix
- [x] **Vitest migration and test refactor**

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

2. **Test Cleanup on Failure**
   - The only remaining failing test is `should properly clean up resources on failure` in `chrome-extractor.test.ts`.
   - **Next session:** Refactor `ChromeExtractor.extract()` to ensure `client.close()` is always called on error, even during setup failures.

## Progress
- [x] Basic Chrome connection working
- [x] Log collection implemented
- [x] Timestamp handling
- [x] Error processing
- [x] Live mode implementation
- [x] Vitest migration and robust test refactor
- [ ] Display issue resolution
- [ ] Test cleanup on failure (next)

## Next Steps
1. Fix cleanup on failure in `ChromeExtractor.extract()` so all tests pass
2. Upgrade CLITS in the OnDeck-V9 project
3. Use the improved tool to debug the display manager issues
4. Document common error patterns and solutions
5. Complete debugging of display issues 