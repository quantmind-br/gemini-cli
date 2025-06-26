#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig, validateConfig, ServerConfig } from './config/server-config.js';
import { GeminiEditTool } from './tools/gemini-edit.js';
import { GeminiAnalyzeTool } from './tools/gemini-analyze.js';
import { GeminiWriteTool } from './tools/gemini-write.js';
import { GeminiShellTool } from './tools/gemini-shell.js';
import { GeminiReadFileTool } from './tools/gemini-read-file.js';
import { GeminiListDirectoryTool } from './tools/gemini-list-directory.js';
import { GeminiGlobTool } from './tools/gemini-glob.js';
import { GeminiSearchTool } from './tools/gemini-search.js';
import { GeminiWebFetchTool } from './tools/gemini-web-fetch.js';
import { GeminiWebSearchTool } from './tools/gemini-web-search.js';
import { GeminiMemoryTool } from './tools/gemini-memory.js';
import { GeminiReadManyTool } from './tools/gemini-read-many.js';

interface MCPRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class GeminiMcpServer {
  private config: ServerConfig;
  private tools: Array<{
    name: string;
    description: string;
    inputSchema: object;
    execute: (params: unknown) => Promise<any>;
  }>;

  constructor(config?: ServerConfig) {
    this.config = config || loadConfig();

    // Validate configuration
    try {
      validateConfig(this.config);
    } catch (error) {
      console.error('Configuration error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    this.tools = [];
    this.registerTools();
  }
  
  private registerTools(): void {
    // Initialize tools with configuration
    const editTool = new GeminiEditTool(this.config);
    const analyzeTool = new GeminiAnalyzeTool(this.config);
    const writeTool = new GeminiWriteTool(this.config);
    const shellTool = new GeminiShellTool(this.config);
    const readFileTool = new GeminiReadFileTool(this.config);
    const listDirTool = new GeminiListDirectoryTool(this.config);
    const globTool = new GeminiGlobTool(this.config);
    const searchTool = new GeminiSearchTool(this.config);
    const webFetchTool = new GeminiWebFetchTool(this.config);
    const webSearchTool = new GeminiWebSearchTool(this.config);
    const memoryTool = new GeminiMemoryTool(this.config);
    const readManyTool = new GeminiReadManyTool(this.config);
    
    // Register tools
    this.tools = [
      {
        name: editTool.name,
        description: editTool.description,
        inputSchema: editTool.inputSchema,
        execute: editTool.execute.bind(editTool)
      },
      {
        name: analyzeTool.name,
        description: analyzeTool.description,
        inputSchema: analyzeTool.inputSchema,
        execute: analyzeTool.execute.bind(analyzeTool)
      },
      {
        name: writeTool.name,
        description: writeTool.description,
        inputSchema: writeTool.inputSchema,
        execute: writeTool.execute.bind(writeTool)
      },
      {
        name: shellTool.name,
        description: shellTool.description,
        inputSchema: shellTool.inputSchema,
        execute: shellTool.execute.bind(shellTool)
      },
      {
        name: readFileTool.name,
        description: readFileTool.description,
        inputSchema: readFileTool.inputSchema,
        execute: readFileTool.execute.bind(readFileTool)
      },
      {
        name: listDirTool.name,
        description: listDirTool.description,
        inputSchema: listDirTool.inputSchema,
        execute: listDirTool.execute.bind(listDirTool)
      },
      {
        name: globTool.name,
        description: globTool.description,
        inputSchema: globTool.inputSchema,
        execute: globTool.execute.bind(globTool)
      },
      {
        name: searchTool.name,
        description: searchTool.description,
        inputSchema: searchTool.inputSchema,
        execute: searchTool.execute.bind(searchTool)
      },
      {
        name: webFetchTool.name,
        description: webFetchTool.description,
        inputSchema: webFetchTool.inputSchema,
        execute: webFetchTool.execute.bind(webFetchTool)
      },
      {
        name: webSearchTool.name,
        description: webSearchTool.description,
        inputSchema: webSearchTool.inputSchema,
        execute: webSearchTool.execute.bind(webSearchTool)
      },
      {
        name: memoryTool.name,
        description: memoryTool.description,
        inputSchema: memoryTool.inputSchema,
        execute: memoryTool.execute.bind(memoryTool)
      },
      {
        name: readManyTool.name,
        description: readManyTool.description,
        inputSchema: readManyTool.inputSchema,
        execute: readManyTool.execute.bind(readManyTool)
      }
    ];
    
    if (this.config.debug) {
      console.error(`Registered ${this.tools.length} tools:`, this.tools.map(t => t.name));
    }
  }
  
  private async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              tools: this.tools.map(tool => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema
              }))
            }
          };

        case 'tools/call':
          const { name, arguments: args } = request.params;
          const tool = this.tools.find(t => t.name === name);

          if (!tool) {
            return {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32601,
                message: `Tool not found: ${name}`
              }
            };
          }

          if (this.config.debug) {
            console.error(`Executing tool: ${name}`, JSON.stringify(args, null, 2));
          }

          const result = await tool.execute(args);

          if (this.config.debug) {
            console.error(`Tool result:`, JSON.stringify(result, null, 2));
          }

          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            }
          };

        case 'initialize':
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: 'gemini-cli-mcp-server',
                version: '1.0.0'
              }
            }
          };

        default:
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`
            }
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (this.config.debug) {
        console.error(`Request handling error:`, errorMessage);
      }

      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: errorMessage
        }
      };
    }
  }
  
  async start(): Promise<void> {
    try {
      if (this.config.debug) {
        console.error('Starting Gemini CLI MCP Server...');
        console.error('Configuration:', JSON.stringify(this.config, null, 2));
      }

      // Set up stdio communication
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', async (data) => {
        const lines = data.toString().trim().split('\n');

        for (const line of lines) {
          if (line.trim()) {
            try {
              const request: MCPRequest = JSON.parse(line);
              const response = await this.handleRequest(request);
              process.stdout.write(JSON.stringify(response) + '\n');
            } catch (error) {
              if (this.config.debug) {
                console.error('Failed to parse request:', line, error);
              }
            }
          }
        }
      });

      if (this.config.debug) {
        console.error('Server started successfully');
      }
    } catch (error) {
      console.error('Failed to start server:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const server = new GeminiMcpServer();
  await server.start();
}

// Handle process signals
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
