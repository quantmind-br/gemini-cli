/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { GeminiCliClient } from '../utils/gemini-client.js';
import { ServerConfig } from '../config/server-config.js';
import { GeminiToolResponse } from '../types/tools.js';

const GeminiListDirectoryParamsSchema = z.object({
  path: z.string().min(1, 'Directory path is required'),
  ignore: z.array(z.string()).optional(),
  respect_git_ignore: z.boolean().optional().default(true),
  working_directory: z.string().optional()
});

export interface GeminiListDirectoryParams {
  path: string;
  ignore?: string[];
  respect_git_ignore?: boolean;
  working_directory?: string;
}

export class GeminiListDirectoryTool {
  private client: GeminiCliClient;
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
    this.client = new GeminiCliClient(config);
  }
  
  get name(): string {
    return 'gemini_list_directory';
  }
  
  get description(): string {
    return 'List the contents of a directory using Gemini CLI. Returns files and subdirectories with type indicators and respects .gitignore patterns.';
  }
  
  get inputSchema(): object {
    return {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the directory to list. Can be absolute or relative to working directory.'
        },
        ignore: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Optional: Array of glob patterns to ignore (e.g., ["*.log", ".git"]).'
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
      required: ['path']
    };
  }
  
  async execute(params: unknown): Promise<GeminiToolResponse> {
    try {
      // Validate parameters
      const validatedParams = GeminiListDirectoryParamsSchema.parse(params);
      
      // Build prompt for listing directory
      let prompt = `List the contents of directory "${validatedParams.path}"`;
      
      if (validatedParams.ignore && validatedParams.ignore.length > 0) {
        prompt += ` ignoring patterns: ${validatedParams.ignore.join(', ')}`;
      }
      
      if (!validatedParams.respect_git_ignore) {
        prompt += ' (do not respect .gitignore)';
      }
      
      // Build additional arguments
      const additionalArgs = ['--tool', 'list_directory'];
      
      if (validatedParams.ignore && validatedParams.ignore.length > 0) {
        additionalArgs.push('--ignore', validatedParams.ignore.join(','));
      }
      
      if (validatedParams.respect_git_ignore !== undefined) {
        additionalArgs.push('--respect-git-ignore', validatedParams.respect_git_ignore.toString());
      }
      
      // Execute Gemini CLI with list_directory tool
      const result = await this.client.executePrompt(prompt, {
        mode: 'list',
        ...(validatedParams.working_directory && { workingDirectory: validatedParams.working_directory }),
        additionalArgs
      });
      
      // Enhance the response with list-specific information
      if (result.success) {
        result.message = `Successfully listed directory "${validatedParams.path}"`;
        
        // Extract directory info from output
        const directoryInfo = this.parseDirectoryListing(result.output || '');
        if (directoryInfo.fileCount > 0 || directoryInfo.dirCount > 0) {
          result.message += ` (${directoryInfo.fileCount} files, ${directoryInfo.dirCount} directories)`;
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
        message: `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private parseDirectoryListing(output: string): { fileCount: number; dirCount: number } {
    const lines = output.split('\n');
    let fileCount = 0;
    let dirCount = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('[DIR]')) {
        dirCount++;
      } else if (trimmed && !trimmed.startsWith('Directory listing') && !trimmed.startsWith('---')) {
        fileCount++;
      }
    }
    
    return { fileCount, dirCount };
  }
}
