# Quick Start Guide

This guide will help you get started with CLiTS, the Chrome Log Inspector & Troubleshooting System.

## Installation

You can install CLiTS globally via npm:

\`\`\`bash
npm install -g clits
\`\`\`

## Basic Usage

The primary command for CLiTS is `extract`. You can use it to extract logs from local files or a running Chrome instance.

### Extracting from Chrome

To extract logs from a running Chrome instance, you must start Chrome with remote debugging enabled.

For example, on macOS, you can run:
\`\`\`bash
/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222
\`\`\`

Then, you can run the following command to extract all logs:

\`\`\`bash
clits extract --chrome
\`\`\`

### Interactive Mode

For a more guided experience, you can use the interactive mode. This will prompt you to select the monitoring features you want to enable.

\`\`\`bash
clits extract --chrome --interactive
\`\`\`

This will present you with a list of options to choose from:

\`\`\`
? Select monitoring features to enable: (Press <space> to select, <a> to toggle all, <i> to invert selection)
❯◯ React Hook Monitoring
 ◯ WebSocket Monitoring
 ◯ JWT Monitoring
 ◯ GraphQL Monitoring
 ◯ Redux State Monitoring
 ◯ Performance Monitoring
 ◯ Event Loop Monitoring
 ◯ User Interaction Recording
 ◯ DOM Mutation Monitoring
 ◯ CSS Change Monitoring
 ◯ Headless Mode
\`\`\`

### Command Completion

To enable command completion for your shell, run the following command and follow the instructions:

\`\`\`bash
clits completion
\`\`\`

This will provide you with the necessary script to add to your shell's configuration file (e.g., `~/.bashrc`, `~/.zshrc`). 