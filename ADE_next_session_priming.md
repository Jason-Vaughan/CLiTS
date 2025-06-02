# ADE_next_session_priming.md

_Last updated: 2025-05-31 22:20 PDT_

## Next Session Tasks

**Primary Focus:** Finalize Linter Fixes, Enforce Seamless Session Handoff, and Maintain Project Hygiene

- [x] Create a new, fully isolated project in: **/Users/jasonvaughan/Documents/AI-Debug-Extractor/**
- [x] Ensure all dependencies, scripts, and documentation are contained entirely within this folder.
- [x] Add `ade-rule-every-chat.mdc` for project rules (note: filename must be lowercase)
- [x] Initialize a new, separate Git repository in this folder (no shared git history)
- [x] Add a `README.md` describing project purpose, goals, architecture, install/run/contribute, BSD/MIT compliance
- [x] Add a `package.json` for Node.js CLI tool
- [x] Set up a `.gitignore` for Node.js
- [x] Document all dependencies and installation steps in the README
- [x] Scaffold the initial CLI codebase (e.g., `src/cli.ts`)
- [x] Add a LICENSE file (MIT)
- [x] Add ESLint configuration and fix most module/linter issues
- [ ] Finalize remaining linter fixes:
    - [ ] Remove unused DEFAULT_TEMPLATE in report.ts
    - [ ] Fix package.json import in cli.ts (NodeNext/ESM compatibility)
    - [ ] Remove unused ora import in cli.ts
    - [ ] Run linter to verify all fixes
- [ ] Add a checklist of planned features and milestones to the README
- [ ] Ensure every session ends with:
    - [ ] Progress and next steps updated in this file
    - [ ] Documentation and rules reviewed/updated if needed
    - [ ] Git commit (with user confirmation)
    - [ ] Clear, actionable next steps for the following session

## Starting Point for Next Session

- Project is fully initialized, isolated, and documented.
- All core files and structure are in place.
- Most linter and module issues are fixed; a few remain (see above).
- No git remotes are set (local-only for now).
- **Next session must:**
    1. Complete the remaining linter/code hygiene tasks above.
    2. Add a planned features/milestones checklist to the README.
    3. Always update this file at the end of the session with progress and next steps.
    4. Review and update `ade-rule-every-chat.mdc` if new rules or clarifications are needed.
    5. Confirm all work is committed and the working tree is clean.
    6. Follow the session wrap-up procedure as defined in the rules file—no user correction should be needed.

## Context from Previous Sessions

- The need for this tool arose from wanting to streamline AI debugging and data extraction from browser/network logs.
- The tool should be reusable for any AI or web project, not just OnDeck-V9.
- All development, dependencies, and documentation must remain within the `AI-Debug-Extractor/` folder.
- CLI tool is the first deliverable, with a browser extension as a future milestone.
- Session wrap-up and priming process is now mandatory for every session.

## Current Progress

- [x] Folder created at the correct location
- [x] Rule file created as `ade-rule-every-chat.mdc`
- [x] Project initialization and documentation
- [x] Git repo setup
- [x] Initial CLI code scaffolding
- [x] LICENSE file added
- [x] ESLint and module resolution mostly fixed
- [ ] All linter/code hygiene issues resolved
- [ ] Planned features/milestones checklist added to README
- [ ] Session wrap-up and priming process enforced for all future sessions 