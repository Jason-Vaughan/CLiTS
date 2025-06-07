# Troubleshooting Guide

This guide provides solutions to common issues you might encounter while using CLiTS.

## Chrome Connection Issues

**Problem:** CLiTS reports that it cannot connect to Chrome, or no debuggable targets are found.

**Solution:**

1.  **Ensure Chrome is running with remote debugging enabled.** You must start Chrome with the `--remote-debugging-port` flag. For example:
    \`\`\`bash
    /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222
    \`\`\`
2.  **Check the port.** Make sure that the port you specified (or the default, 9222) is not being used by another application. You can specify a different port with the `--chrome-port` flag.
3.  **Open a new tab.** If you have Chrome running but no tabs are open, CLiTS might not find a debuggable target. Try opening a new tab to a website.

## No Logs Extracted

**Problem:** CLiTS runs but does not extract any logs.

**Solution:**

1.  **Check your filters.** You might have filters applied that are too restrictive. Try running CLiTS with no filters to see if any logs are extracted.
2.  **Verify log sources.** Ensure that the log sources you are targeting (e.g., `console`, `network`) are actually generating logs in the application you are inspecting.
3.  **Check for errors in the CLiTS output.** Look for any error messages in the console where you are running CLiTS. These might provide clues as to what is going wrong.

## Interactive Mode Not Working

**Problem:** The interactive mode prompts do not appear or do not work as expected.

**Solution:**

1.  **Check your terminal compatibility.** Some terminals might have issues rendering the interactive prompts. Try running CLiTS in a different terminal application.
2.  **Ensure you are using the `--interactive` flag.** The interactive prompts will only appear if you run the `extract` command with the `--interactive` flag. 