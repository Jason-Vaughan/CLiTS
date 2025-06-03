# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/jasonvaughan/ai-debug-extractor/releases/tag/v0.1.0 