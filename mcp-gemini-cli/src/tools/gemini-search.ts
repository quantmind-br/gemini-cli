/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { GeminiCliClient } from '../utils/gemini-client.js';
import { ServerConfig } from '../config/server-config.js';
import { GeminiToolResponse } from '../types/tools.js';

const GeminiSearchParamsSchema = z.object({
  pattern: z.string().min(1, 'Search pattern is required'),
  path: z.string().optional(),
  include: z.string().optional(),
  exclude: z.string().optional(),
  case_sensitive: z.boolean().optional().default(false),
  max_results: z.number().min(1).max(1000).optional().default(100),
  working_directory: z.string().optional()
});

export interface GeminiSearchParams {
  pattern: string;
  path?: string;
  include?: string;
  exclude?: string;
  case_sensitive?: boolean;
  max_results?: number;
  working_directory?: string;
}

export class GeminiSearchTool {
  private client: GeminiCliClient;
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
    this.client = new GeminiCliClient(config);
  }
  
  get name(): string {
    return 'gemini_search_content';
  }
  
  get description(): string {
    return 'Search for text patterns within files using Gemini CLI. Supports regex patterns and file filtering.';
  }
  
  get inputSchema(): object {
    return {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Regular expression pattern to search for (e.g., "function\\s+myFunction", "TODO:", "class\\s+\\w+").'
        },
        path: {
          type: 'string',
          description: 'Optional: Directory to search within. Defaults to current directory.'
        },
        include: {
          type: 'string',
          description: 'Optional: Glob pattern to filter which files are searched (e.g., "*.js", "src/**/*.{ts,tsx}").'
        },
        exclude: {
          type: 'string',
          description: 'Optional: Glob pattern to exclude files from search (e.g., "*.test.js", "node_modules/**").'
        },
        case_sensitive: {
          type: 'boolean',
          description: 'Optional: Whether the search should be case-sensitive. Defaults to false.',
          default: false
        },
        max_results: {
          type: 'number',
          minimum: 1,
          maximum: 1000,
          description: 'Optional: Maximum number of results to return. Defaults to 100.',
          default: 100
        },
        working_directory: {
          type: 'string',
          description: 'Optional: Working directory for the operation. Defaults to current directory.'
        }
      },
      required: ['pattern']
    };
  }
  
  async execute(params: unknown): Promise<GeminiToolResponse> {
    try {
      // Validate parameters
      const validatedParams = GeminiSearchParamsSchema.parse(params);
      
      // Build prompt for searching content
      let prompt = `Search for pattern "${validatedParams.pattern}" in files`;
      
      if (validatedParams.path) {
        prompt += ` within directory "${validatedParams.path}"`;
      }
      
      if (validatedParams.include) {
        prompt += ` including files matching "${validatedParams.include}"`;
      }
      
      if (validatedParams.exclude) {
        prompt += ` excluding files matching "${validatedParams.exclude}"`;
      }
      
      if (validatedParams.case_sensitive) {
        prompt += ' (case-sensitive)';
      }
      
      prompt += ` (max ${validatedParams.max_results} results)`;
      
      // Build additional arguments
      const additionalArgs = ['--tool', 'search_file_content'];
      
      if (validatedParams.path) {
        additionalArgs.push('--path', validatedParams.path);
      }
      
      if (validatedParams.include) {
        additionalArgs.push('--include', validatedParams.include);
      }
      
      if (validatedParams.exclude) {
        additionalArgs.push('--exclude', validatedParams.exclude);
      }
      
      if (validatedParams.case_sensitive !== undefined) {
        additionalArgs.push('--case-sensitive', validatedParams.case_sensitive.toString());
      }
      
      if (validatedParams.max_results !== undefined) {
        additionalArgs.push('--max-results', validatedParams.max_results.toString());
      }
      
      // Execute Gemini CLI with search_file_content tool
      const result = await this.client.executePrompt(prompt, {
        mode: 'search',
        ...(validatedParams.working_directory && { workingDirectory: validatedParams.working_directory }),
        additionalArgs
      });
      
      // Enhance the response with search-specific information
      if (result.success) {
        const searchResults = this.parseSearchResults(result.output || '');
        result.message = `Found ${searchResults.matchCount} match(es) in ${searchResults.fileCount} file(s) for pattern "${validatedParams.pattern}"`;
        
        // Extract file paths for files_changed
        if (searchResults.filePaths.length > 0) {
          result.files_changed = searchResults.filePaths;
        }
      }
      
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          message: `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`,
          error: 'Validation error'
        };
      }
      
      return {
        success: false,
        message: `Failed to search content: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private parseSearchResults(output: string): { matchCount: number; fileCount: number; filePaths: string[] } {
    const lines = output.split('\n');
    let matchCount = 0;
    const filePaths = new Set<string>();
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Count matches (lines with line numbers)
      if (trimmed.match(/^\d+:/)) {
        matchCount++;
      }
      
      // Extract file paths (lines that look like file paths)
      if (trimmed && (trimmed.includes('/') || trimmed.includes('\\')) && 
          !trimmed.includes(':') && !trimmed.startsWith('Found') && !trimmed.startsWith('Searching')) {
        filePaths.add(trimmed);
      }
    }
    
    return {
      matchCount,
      fileCount: filePaths.size,
      filePaths: Array.from(filePaths)
    };
  }
}
