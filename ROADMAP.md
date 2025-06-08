# CLiTS Development Roadmap

This document outlines the development plans and future features for CLiTS (Chrome Log Inspector & Troubleshooting System). We follow semantic versioning and maintain a clear vision for both short-term improvements and long-term goals.

## Current Version
- **Version**: 1.0.7-beta.3
- **Status**: Beta - Production Ready for OnDeck Integration
- **Focus**: Material-UI Support & Documentation Standards

### Current Release Highlights (v1.0.7-beta.3)
- ✅ Full Material-UI component pattern support (buttons, dialogs, tabs, switches, action areas)
- ✅ Enhanced save button detection (6 strategies)
- ✅ Advanced tab label discovery (CLI, regex, JSON output, nested support)
- ✅ Robust, automation-friendly, and future-proof for React/Material-UI projects

## Short-term Goals (Next 2-3 Releases)

### v1.0.8-beta.1 (Planned)
- [ ] **Material-UI Component Patterns**
  - [ ] Expand support for new and custom Material-UI components
  - [ ] Monitor for breaking changes in future Material-UI major versions
  - [ ] Add support for custom-styled or third-party-wrapped Material-UI elements

- [ ] **Custom Config File Support**
  - [ ] Implement user-editable config file (.clitsrc or clits.config.json)
  - [ ] Allow custom selectors and save button patterns
  - [ ] Enable project-level overrides for unique UI patterns

### v1.0.8-beta.2 (Planned)
- [ ] **Sample App & Regression Suite**
  - [ ] Provide sample Material-UI app for end-to-end testing
  - [ ] Include CLI-driven test suite for all detection strategies
  - [ ] Document CI/CD pipeline integration best practices

- [ ] **Advanced Save/Submit Detection**
  - [ ] Support complex save/submit workflows
  - [ ] Action chaining (click save, then confirm in modal)
  - [ ] Async save operations and progress indicators

### v1.0.9-beta.1 (Planned)
- [ ] **Accessibility & Internationalization**
  - [ ] Improved i18n/translated label detection
  - [ ] Multi-language ARIA role support
  - [ ] Documentation for multilingual automation

- [ ] **Performance & Usability**
  - [ ] Optimize selector search for large DOMs
  - [ ] Add verbose/debug output and dry-run mode
  - [ ] Enhanced error messages and troubleshooting

## Medium-term Goals (Next 3-6 Months)

### v1.1.0 (Planned)
- [ ] **Stable Release Preparation**
  - [ ] Complete framework support
  - [ ] Advanced debugging capabilities
  - [ ] Performance optimizations
  - [ ] Comprehensive test coverage

### v1.2.0 (Planned)
- [ ] **Community & Documentation**
  - [ ] Expanded real-world examples
  - [ ] Community contribution guidelines
  - [ ] Public changelog and roadmap maintenance
  - [ ] Integration with popular testing frameworks

## Long-term Vision

### v2.0.0 (Future)
- [ ] **Browser Extension Development**
  - [ ] Full browser extension support
  - [ ] Enhanced UI for log visualization
  - [ ] Advanced automation features
  - [ ] Cross-browser compatibility

- [ ] **Enterprise Features**
  - [ ] Advanced AI integration
  - [ ] Team collaboration features
  - [ ] Enterprise security features
  - [ ] Advanced reporting and analytics

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

*Note: This roadmap is subject to change based on community feedback and development priorities. Last updated: 2025-06-08* 