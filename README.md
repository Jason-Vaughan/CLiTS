# AI-Debug-Extractor (ADE)

A command-line tool for extracting, formatting, and sharing debugging data from AI and web projects. Designed to streamline the process of collecting and analyzing debug information for AI-assisted development.

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-debug-extractor

# Install dependencies
npm install

# Build the project
npm run build

# Link for global usage (optional)
npm link
```

## Usage

```bash
# Extract debug data
ai-debug-extractor extract

# More commands coming soon...
```

## Development

```bash
# Run in development mode
npm run dev

# Run linter
npm run lint

# Fix linter issues
npm run lint:fix
```

## Planned Features and Milestones

### Phase 1: CLI Foundation (Current)
- [x] Project setup and configuration
  - [x] Initialize Node.js project structure
  - [x] Set up TypeScript and ESLint
  - [x] Configure build process
  - [x] Add documentation and license
- [x] Basic CLI structure
  - [x] Command-line argument parsing
  - [x] Basic error handling
  - [x] Help and version information
- [x] Code Quality and Standards
  - [x] ESLint configuration
  - [x] TypeScript strict mode
  - [x] Module resolution (ESM/NodeNext)
- [ ] Basic Log Extraction (In Progress)
  - [ ] File system log reading
  - [ ] Basic parsing and formatting
  - [ ] Output generation
  - [ ] Error handling and validation

### Phase 2: Core Features
- [ ] Data Collection
  - [ ] Network request/response capture
  - [ ] Console log aggregation
  - [ ] Error stack trace collection
  - [ ] System information gathering
- [ ] Data Processing
  - [ ] Custom data source plugins
  - [ ] Data filtering and sanitization
  - [ ] Format conversion
  - [ ] Metadata enrichment
- [ ] Output Management
  - [ ] Multiple output formats (JSON, YAML, etc.)
  - [ ] Output file management
  - [ ] Compression options
  - [ ] Data validation

### Phase 3: Advanced Features
- [ ] Browser Integration
  - [ ] Chrome extension development
  - [ ] Firefox extension development
  - [ ] WebSocket communication
  - [ ] Browser console integration
- [ ] Real-time Features
  - [ ] Live monitoring
  - [ ] WebSocket server
  - [ ] Real-time data processing
  - [ ] Alert system
- [ ] Security and Privacy
  - [ ] Data encryption
  - [ ] PII detection and redaction
  - [ ] Access control
  - [ ] Audit logging

### Phase 4: Integration and Ecosystem
- [ ] Developer Experience
  - [ ] VS Code extension
  - [ ] JetBrains plugin
  - [ ] API documentation
  - [ ] Interactive CLI wizard
- [ ] CI/CD Integration
  - [ ] GitHub Actions integration
  - [ ] Jenkins plugin
  - [ ] GitLab CI integration
  - [ ] Automated testing support
- [ ] Community and Documentation
  - [ ] Documentation site
  - [ ] Plugin development guide
  - [ ] Community templates
  - [ ] Example projects

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 