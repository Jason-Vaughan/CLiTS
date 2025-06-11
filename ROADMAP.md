# CLiTS Development Roadmap

This document outlines the development plans and future features for CLiTS (Chrome Log Inspector & Troubleshooting System). We follow semantic versioning and maintain a clear vision for both short-term improvements and long-term goals.

## Current Version
- **Version**: 1.0.7-beta.3
- **Status**: Beta - Production Ready for OnDeck Integration
- **Focus**: Transitioning to Development Methodology Framework

### Current Release Highlights (v1.0.7-beta.3)
- ✅ Full Material-UI component pattern support (buttons, dialogs, tabs, switches, action areas)
- ✅ Enhanced save button detection (6 strategies)
- ✅ Advanced tab label discovery (CLI, regex, JSON output, nested support)
- ✅ Robust, automation-friendly, and future-proof for React/Material-UI projects

## Short-term Goals (Next 2-3 Releases)

### v1.0.8-beta.1 (Planned) - Registry System Foundation
- [ ] **Element Registry System**
  - [ ] Registry JSON format implementation
  - [ ] Basic CRUD commands (`register`, `update`, `validate`)
  - [ ] Registry-based targeting system
  - [ ] Migration tools for existing selectors

- [ ] **Registry Integration**
  - [ ] Material-UI component auto-registration
  - [ ] Custom selector pattern support
  - [ ] Project-level registry configuration
  - [ ] Registry validation and maintenance tools

### v1.0.8-beta.2 (Planned) - Framework Integration
- [ ] **React Integration**
  - [ ] `@clits/react` package development
  - [ ] `useClitsElement` hook implementation
  - [ ] Component auto-registration system
  - [ ] TypeScript definitions generation

- [ ] **Build Tool Integration**
  - [ ] Webpack/Vite plugin development
  - [ ] Auto-discovery during build
  - [ ] Registry validation on build
  - [ ] TypeScript type generation

### v1.0.9-beta.1 (Planned) - Smart UI Management
- [ ] **Passive Scanning System**
  - [ ] Non-interfering element discovery
  - [ ] Smart UI state management
  - [ ] Automatic interference handling
  - [ ] Safe interaction modes

- [ ] **Workflow Management**
  - [ ] Workflow definition format
  - [ ] Step-by-step execution engine
  - [ ] Error recovery and retry logic
  - [ ] Workflow validation tools

### v1.0.8-beta.0 (Completed)
  - [x] **visionCLITS - Visual State Capture** ✅ COMPLETED
        - [x] **Core Screenshot Features** ✅ COMPLETED
      - [x] Dedicated `clits vision` command for visual capture
      - [x] Element-specific screenshots with CSS selector support
      - [x] Full-page screenshot capability
      - [x] Base64/stdout output for AI integration
      - [x] Batch screenshot mode for multiple selectors

  - [x] **Visual State Metadata** ✅ COMPLETED
    - [x] Element bounding box extraction
    - [x] Visibility state detection
    - [x] Text content capture
    - [x] Computed style information
    - [x] JSON metadata output

  - [x] **Integration Features** ✅ COMPLETED
    - [x] Chainable with navigation/interaction commands
    - [x] Error handling with context screenshots
    - [x] Comprehensive logging and traceability
    - [x] AI-friendly output formats

## Medium-term Goals (Next 3-6 Months)

### v2.0.0-beta.1 (Planned)
- [ ] **Development Methodology Framework**
  - [ ] Complete registry system
  - [ ] Full framework integration
  - [ ] Development workflow tools
  - [ ] CI/CD integration

### v2.0.0-beta.2 (Planned)
- [ ] **Advanced Automation Features**
  - [ ] Visual regression testing
  - [ ] Performance monitoring
  - [ ] State management integration
  - [ ] Cross-browser support

## Long-term Vision

### v2.1.0 (Future)
- [ ] **Enterprise Features**
  - [ ] Team collaboration tools
  - [ ] Advanced security features
  - [ ] Enterprise reporting
  - [ ] Integration with enterprise tools

### v2.2.0 (Future)
- [ ] **AI & Machine Learning**
  - [ ] Automated test generation
  - [ ] Smart element discovery
  - [ ] Predictive maintenance
  - [ ] Anomaly detection

## Contributing to the Roadmap

We welcome community input on our roadmap. If you have suggestions for features or improvements:

1. Open an issue with the `roadmap` label
2. Describe the feature or improvement
3. Explain its benefits and use cases
4. Provide any relevant technical details

### How to Use This Roadmap
- Add new requests as issues or PRs in the CLITS repo
- Reference this file in sprint planning and roadmap discussions
- Update after each major release to reflect new priorities

## Version Policy

- **Beta Releases**: Feature-complete but may contain bugs
- **Stable Releases**: Thoroughly tested and production-ready
- **Major Versions**: Include breaking changes and major features
- **Minor Versions**: Add features in a backward-compatible manner
- **Patch Versions**: Backward-compatible bug fixes

## Release Schedule

- **Beta Releases**: Every 2-3 weeks
- **Stable Releases**: Every 2-3 months
- **Major Versions**: Every 6-12 months

## Support Policy

- **Current Version**: Full support
- **Previous Version**: Security updates only
- **Beta Versions**: Community support
- **Stable Versions**: Full support with SLA

---

*Note: This roadmap is subject to change based on community feedback and development priorities. Last updated: 2025-06-11* 