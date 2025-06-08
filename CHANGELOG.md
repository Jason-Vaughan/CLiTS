# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.6-beta.0] - 2025-06-08

### Added
- **Hierarchical Element Navigation**: Interactive browser navigation with level-based DOM traversal using arrow keys
- **Enhanced Element Detection**: 53+ comprehensive selector patterns including Material-UI, data-testid, aria-label, and text-based detection
- **Direct CDP Clicking**: Improved click reliability with multiple fallback strategies and direct Chrome DevTools Protocol integration
- **Auto-Launch Chrome**: Automatic Chrome detection and launch with proper debugging flags on macOS
- **Advanced React Monitoring**: Component lifecycle tracking, hook monitoring, and prop change detection
- **Network Analysis**: Request/response correlation, WebSocket tracking, JWT token monitoring, and GraphQL support
- **State Management**: Redux state visualization, state change tracking, and middleware debugging
- **Performance Monitoring**: React render metrics, memory usage tracking, and event loop monitoring
- **User Interaction Recording**: DOM mutation tracking, CSS change monitoring, and user interaction recording

### Fixed
- **Log Level Validation**: Fixed "Invalid log entry: missing or invalid level property" warnings for console.log messages
- **Chrome Tab Connection**: Fixed connection mismatch between element detection and clicking operations
- **JavaScript Injection**: Resolved template literal escaping issues in Chrome evaluation scripts
- **CDP Input Domain**: Removed invalid Input.enable() calls that caused compatibility issues
- **Material-UI Filtering**: Enhanced class filtering with comprehensive regex pattern blocking

### Changed
- **Element Detection**: Now finds 79+ interactive elements on pages vs previous basic detection
- **Navigation UI**: Increased page size to show more elements (20 vs 15) with clear level indicators
- **Error Handling**: Improved error context and recovery throughout the application
- **Connection Stability**: Enhanced reconnection logic for Chrome browser refreshes and tab changes
- **Dependencies**: Removed Playwright dependency - now uses direct Chrome DevTools Protocol for all browser automation

### Removed
- **Playwright Dependency**: All browser automation now uses direct Chrome Remote Interface, eliminating the need for Playwright

## [1.0.0] - 2024-06-05

### Added
- Complete rebranding from AI-Debug-Extractor to CLITS (Chrome Log Inspector & Troubleshooting System)
- Finalized documentation with comprehensive examples
- Verified all CLI commands and options
- Updated example projects with new branding and package name

### Changed
- Repository name and URLs updated
- Package name changed to 'clits' on npm
- All imports and references updated to use new package name
- Example projects modernized with latest best practices

### Fixed
- Remaining old branding references
- Documentation inconsistencies
- Example project dependencies

## [0.3.0] - 2024-06-04

### Added
- Built-in log file export with `--output-file` parameter
- Advanced boolean filtering with AND/OR/NOT operators via `--advanced-filter`
- Error summary statistics with `--error-summary` flag
- Live mode with duration parameter via `--live-mode`
- Automatic reconnection for page refreshes and tab changes
- Comprehensive error handling and robustness improvements

### Fixed
- Timestamp handling issues with invalid timestamps
- "Cannot read properties of undefined (reading 'toLowerCase')" errors
- Improved error context and handling throughout
- Better null checking for log processing

### Changed
- Enhanced filtering capabilities with boolean combinations
- Improved user experience for long-running log collection

## [0.2.0] - 2024-04-27

### Added
- Chrome DevTools Protocol connection enhancements
- Expanded log filtering capabilities
- Better error categorization
- Extended timeout options

### Fixed
- Connection reliability issues
- Log timestamp consistency

## [0.1.0] - 2024-03-19

### Added
- Initial release with core functionality
- Chrome DevTools Protocol (CDP) integration
- File system log parsing
- Real-time log monitoring
- Multi-source log aggregation
- Intelligent filtering capabilities
- Platform-specific error handling
- Chrome-specific error handling with retry logic
- Comprehensive test suite
- CLI interface with extensive options
- TypeScript support
- Documentation and examples

### Fixed
- Handling of macOS task policy errors
- DEPRECATED_ENDPOINT error suppression
- Connection stability improvements
- Resource cleanup on error

[1.0.0]: https://github.com/jasonvaughan/clits/releases/tag/v1.0.0
[0.3.0]: https://github.com/jasonvaughan/clits/releases/tag/v0.3.0
[0.2.0]: https://github.com/jasonvaughan/clits/releases/tag/v0.2.0
[0.1.0]: https://github.com/jasonvaughan/clits/releases/tag/v0.1.0 