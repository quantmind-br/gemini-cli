# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `npm install` - Install dependencies for all packages
- `npm run build` - Build all packages (cli and core)
- `npm run build:all` - Build packages and sandbox container
- `npm start` - Start the Gemini CLI from source
- `npm run preflight` - Run complete validation (linting, formatting, tests, build, typecheck)

### Testing
- `npm run test` - Run unit tests for all packages
- `npm run test:ci` - Run tests with coverage reports
- `npm run test:e2e` - Run integration tests
- `npm run test:integration:all` - Run all integration test variants

### Code Quality
- `npm run lint` - Run ESLint on all packages
- `npm run lint:fix` - Fix auto-fixable linting issues
- `npm run format` - Format code with Prettier
- `npm run typecheck` - TypeScript type checking

### Package-Specific Commands
- `npm run build:cli` - Build only CLI package
- `npm run build:core` - Build only Core package
- `npm run build:sandbox` - Build sandbox container
- `npm run debug` - Start CLI in debug mode with Node inspector

## Architecture Overview

### Package Structure
This is a monorepo with two main packages:

**packages/cli** - Frontend/User Interface
- React-based terminal UI using Ink framework
- Handles user input, display rendering, themes, and configuration
- Entry point: `packages/cli/index.ts` → `packages/cli/src/gemini.tsx`

**packages/core** - Backend/Business Logic  
- Core API communication, tool orchestration, and content generation
- Main exports: `packages/core/src/index.ts`
- Contains authentication, tool system, and configuration management

### Key Architectural Components

**Authentication System** (`packages/core/src/core/contentGenerator.ts`)
- Supports multiple auth methods: OAuth (personal), Gemini API key, Vertex AI
- OAuth flow handled in `packages/core/src/code_assist/oauth2.ts`

**Tool System** (`packages/core/src/tools/`)
- Central `ToolRegistry` manages built-in and discovered tools
- Built-in tools: file operations, search, shell execution, web access
- MCP (Model Context Protocol) support for external tool servers
- All tools implement standardized `Tool` interface with schema validation

**GeminiClient** (`packages/core/src/core/client.ts`)
- Main orchestrator for Gemini API communication
- Manages chat sessions, history compression, and streaming responses
- Handles token limits and automatic conversation summarization

**Configuration Management**
- Hierarchical: project `.gemini/` directory overrides user settings
- Extension system supports additional MCP servers and context files
- Settings control themes, tool inclusion/exclusion, authentication

**Memory and Context**
- User memory via MemoryTool for persistent context
- Project-specific GEMINI.md files for context
- Full context mode reads entire project structure

### Data Flow
1. CLI processes user input and applies themes
2. Core constructs Gemini API requests with tools
3. ContentGenerator handles authentication and API calls
4. Tool execution orchestrated with user confirmations
5. Streaming responses processed and formatted
6. CLI renders output with syntax highlighting and themes

## Development Guidelines

### Import Restrictions
- ESLint rule enforces no relative imports between packages
- Use package names: `@google/gemini-cli-core` from CLI package
- Import from built packages, not source files

### Authentication Development
- Use `GEMINI_API_KEY` environment variable for testing
- OAuth requires Google account authentication flow
- Vertex AI requires Google Cloud project setup

### Tool Development
- Extend `BaseTool` class in `packages/core/src/tools/tools.ts`
- Register new tools in `packages/core/src/tools/tool-registry.ts`
- Tools must implement schema, validation, and execution methods

### Testing Strategy
- Unit tests alongside source files using Vitest
- Integration tests validate end-to-end CLI functionality
- E2E tests require `GEMINI_API_KEY` environment variable

### Debugging
- Use `npm run debug` for Node inspector debugging
- Set `DEV=true npm start` for React DevTools connection
- Use React DevTools 4.x for Ink compatibility

### Sandbox Development
- Container sandboxing via Docker/Podman supported
- Set `GEMINI_SANDBOX=true` to enable
- Custom sandbox via `.gemini/sandbox.Dockerfile` in projects
- macOS Seatbelt profiles available for additional security

### Code Quality Standards
- All files must include Google license header
- Use TypeScript with strict settings
- Follow existing patterns for React components and hooks
- Prefer ES6 imports over require()
- Run `npm run preflight` before submitting changes

### Extension Development
- Extensions in `.gemini/extensions/` directories
- Each extension needs `gemini-extension.json` config
- Can add MCP servers, context files, and tool configurations
- Load order: workspace extensions override user extensions