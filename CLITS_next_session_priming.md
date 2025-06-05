# CLITS Next Session Priming

## Current Progress
- ✅ NPM Account & Authentication ready
- ✅ Removed hardcoded test files and references
- ✅ Moved OnDeck-specific tests to `moveto_OnDeck/` directory
- ✅ Updated CLI to use generic Chrome inspection
- ✅ Cleaned up project structure

## Next Session Tasks
1. Test Release Version
   - Run a complete test of the generic wizard functionality
   - Verify all CLI options work as documented
   - Test file system extraction
   - Test Chrome DevTools extraction
   - Verify output formats and logging

2. Final Pre-publish Checklist
   - Review package.json configuration
   - Verify all dependencies are correctly listed
   - Check README accuracy
   - Run npm pack --dry-run one final time
   - Review included files

3. Publishing
   - Run npm publish
   - Create GitHub release
   - Update documentation with published version

## Technical Notes
- Generic wizard implementation is in place but needs thorough testing
- OnDeck-specific tests have been preserved in `moveto_OnDeck/`
- CLI has been simplified to focus on core functionality

## Starting Point for Next Session
1. Start with testing the generic wizard:
   ```bash
   # Start Chrome with debugging
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

   # Run the wizard
   npm run start -- extract --chrome --interactive-login
   ```

2. Then proceed through the pre-publish checklist
3. Finally, execute the publish steps 