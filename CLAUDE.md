# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gemini CLI is a command-line AI workflow tool that connects to Google's Gemini AI models. It features a React-based terminal UI using Ink and supports tools, MCP servers, and multimodal capabilities.

## Essential Commands

**Development Workflow:**
```bash
npm run preflight        # Full validation (build, test, lint, typecheck)
npm run build           # Build all packages
npm start               # Start development server
npm run test            # Run unit tests
npm run test:e2e        # Run integration tests
npm run lint            # ESLint checking
npm run typecheck       # TypeScript validation
```

**Testing:**
```bash
npm run test:ci         # CI tests with coverage
npm run test:integration:all  # All integration tests
```

## Architecture

**Monorepo Structure:**
- `packages/cli/` - Frontend terminal UI (React + Ink)
- `packages/core/` - Backend AI logic and API communication
- `integration-tests/` - End-to-end testing
- `bundle/` - Built distribution

**Key Technologies:**
- Node.js 18+ with TypeScript and ES Modules
- React 19 with Ink for terminal UI
- Vitest testing framework
- Google Gemini AI SDK (`@google/genai`)
- Model Context Protocol SDK

## Code Patterns

**Preferred Patterns:**
- Plain objects with TypeScript interfaces over classes
- ES Module syntax for encapsulation
- Functional programming with array operators
- React Hooks for state management
- Immutable data patterns

**Testing Conventions:**
- Co-located test files (`.test.ts`, `.test.tsx`)
- Extensive mocking of Node.js built-ins (`fs`, `os`, `child_process`)
- Use `vi.mock()` from Vitest for ES modules
- `ink-testing-library` for React component testing

## Tool System

The core package includes an extensible tool registry:
- Built-in tools: file system, shell, web fetch, web search, memory, MCP client
- Tools require user confirmation for write operations
- MCP server integration for external capabilities

## Important Notes

- Always run `npm run preflight` before submitting changes
- Main branch is called "main"
- See GEMINI.md for detailed coding conventions and React guidelines
- Test files should mock critical dependencies at the top of the file
- Use `unknown` instead of `any` for type safety