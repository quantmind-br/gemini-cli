/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { GeminiCliClient } from '../utils/gemini-client.js';
import { ServerConfig } from '../config/server-config.js';
import { GeminiToolResponse } from '../types/tools.js';

const GeminiGlobParamsSchema = z.object({
  pattern: z.string().min(1, 'Glob pattern is required'),
  path: z.string().optional(),
  case_sensitive: z.boolean().optional().default(false),
  respect_git_ignore: z.boolean().optional().default(true),
  working_directory: z.string().optional()
});

export interface GeminiGlobParams {
  pattern: string;
  path?: string;
  case_sensitive?: boolean;
  respect_git_ignore?: boolean;
  working_directory?: string;
}

export class GeminiGlobTool {
  private client: GeminiCliClient;
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
    this.client = new GeminiCliClient(config);
  }
  
  get name(): string {
    return 'gemini_find_files';
  }
  
  get description(): string {
    return 'Find files matching glob patterns using Gemini CLI. Returns absolute paths sorted by modification time (newest first).';
  }
  
  get inputSchema(): object {
    return {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern to match against (e.g., "*.py", "src/**/*.js", "**/*.{ts,tsx}").'
        },
        path: {
          type: 'string',
          description: 'Optional: Directory to search within. If omitted, searches current directory.'
        },
        case_sensitive: {
          type: 'boolean',
          description: 'Optional: Whether the search should be case-sensitive. Defaults to false.',
          default: false
        },
        respect_git_ignore: {
          type: 'boolean',
          description: 'Optional: Whether to respect .gitignore patterns. Defaults to true.',
          default: true
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
      const validatedParams = GeminiGlobParamsSchema.parse(params);
      
      // Build prompt for finding files
      let prompt = `Find files matching pattern "${validatedParams.pattern}"`;
      
      if (validatedParams.path) {
        prompt += ` in directory "${validatedParams.path}"`;
      }
      
      if (validatedParams.case_sensitive) {
        prompt += ' (case-sensitive)';
      }
      
      if (!validatedParams.respect_git_ignore) {
        prompt += ' (ignore .gitignore)';
      }
      
      // Build additional arguments
      const additionalArgs = ['--tool', 'glob'];
      
      if (validatedParams.path) {
        additionalArgs.push('--path', validatedParams.path);
      }
      
      if (validatedParams.case_sensitive !== undefined) {
        additionalArgs.push('--case-sensitive', validatedParams.case_sensitive.toString());
      }
      
      if (validatedParams.respect_git_ignore !== undefined) {
        additionalArgs.push('--respect-git-ignore', validatedParams.respect_git_ignore.toString());
      }
      
      // Execute Gemini CLI with glob tool
      const result = await this.client.executePrompt(prompt, {
        mode: 'glob',
        ...(validatedParams.working_directory && { workingDirectory: validatedParams.working_directory }),
        additionalArgs
      });
      
      // Enhance the response with glob-specific information
      if (result.success) {
        const fileCount = this.countFilesInOutput(result.output || '');
        result.message = `Found ${fileCount} file(s) matching pattern "${validatedParams.pattern}"`;
        
        // Extract file paths for files_changed
        const filePaths = this.extractFilePathsFromOutput(result.output || '');
        if (filePaths.length > 0) {
          result.files_changed = filePaths;
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
        message: `Failed to find files: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private countFilesInOutput(output: string): number {
    const lines = output.split('\n');
    let count = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Count lines that look like file paths
      if (trimmed && !trimmed.startsWith('Found') && !trimmed.startsWith('Searching') && 
          (trimmed.includes('/') || trimmed.includes('\\'))) {
        count++;
      }
    }
    
    return count;
  }
  
  private extractFilePathsFromOutput(output: string): string[] {
    const lines = output.split('\n');
    const filePaths: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Extract lines that look like file paths
      if (trimmed && !trimmed.startsWith('Found') && !trimmed.startsWith('Searching') && 
          (trimmed.includes('/') || trimmed.includes('\\'))) {
        filePaths.push(trimmed);
      }
    }
    
    return filePaths;
  }
}
