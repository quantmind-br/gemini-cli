/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { GeminiCliClient } from '../utils/gemini-client.js';
import { ServerConfig } from '../config/server-config.js';
import { GeminiToolResponse } from '../types/tools.js';

const GeminiReadManyParamsSchema = z.object({
  paths: z.array(z.string()).min(1, 'At least one path is required'),
  exclude: z.array(z.string()).optional(),
  max_files: z.number().min(1).max(100).optional().default(50),
  respect_git_ignore: z.boolean().optional().default(true),
  working_directory: z.string().optional()
});

export interface GeminiReadManyParams {
  paths: string[];
  exclude?: string[];
  max_files?: number;
  respect_git_ignore?: boolean;
  working_directory?: string;
}

export class GeminiReadManyTool {
  private client: GeminiCliClient;
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
    this.client = new GeminiCliClient(config);
  }
  
  get name(): string {
    return 'gemini_read_many_files';
  }
  
  get description(): string {
    return 'Read content from multiple files or directories using Gemini CLI. Concatenates content with file separators.';
  }
  
  get inputSchema(): object {
    return {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: {
            type: 'string'
          },
          minItems: 1,
          description: 'Array of file paths or glob patterns to read. Can include directories, files, or glob patterns.'
        },
        exclude: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Optional: Array of glob patterns to exclude from reading (e.g., ["*.test.js", "node_modules/**"]).'
        },
        max_files: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: 'Optional: Maximum number of files to read. Defaults to 50.',
          default: 50
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
      required: ['paths']
    };
  }
  
  async execute(params: unknown): Promise<GeminiToolResponse> {
    try {
      // Validate parameters
      const validatedParams = GeminiReadManyParamsSchema.parse(params);
      
      // Validate file extensions for allowed paths
      const invalidPaths = validatedParams.paths.filter(path => 
        !this.isAllowedPath(path)
      );
      
      if (invalidPaths.length > 0) {
        return {
          success: false,
          message: `Invalid file extensions in paths: ${invalidPaths.join(', ')}. Allowed extensions: ${this.config.allowed_file_extensions?.join(', ')}`,
          error: 'Invalid file extensions'
        };
      }
      
      // Build prompt for reading multiple files
      let prompt = `Read content from multiple files/paths: ${validatedParams.paths.join(', ')}`;
      
      if (validatedParams.exclude && validatedParams.exclude.length > 0) {
        prompt += ` excluding: ${validatedParams.exclude.join(', ')}`;
      }
      
      if (validatedParams.max_files !== 50) {
        prompt += ` (max ${validatedParams.max_files} files)`;
      }
      
      if (!validatedParams.respect_git_ignore) {
        prompt += ' (ignore .gitignore)';
      }
      
      // Build additional arguments
      const additionalArgs = ['--tool', 'read_many_files'];
      
      if (validatedParams.exclude && validatedParams.exclude.length > 0) {
        additionalArgs.push('--exclude', validatedParams.exclude.join(','));
      }
      
      if (validatedParams.max_files !== undefined) {
        additionalArgs.push('--max-files', validatedParams.max_files.toString());
      }
      
      if (validatedParams.respect_git_ignore !== undefined) {
        additionalArgs.push('--respect-git-ignore', validatedParams.respect_git_ignore.toString());
      }
      
      // Execute Gemini CLI with read_many_files tool
      const result = await this.client.executePrompt(prompt, {
        files: validatedParams.paths,
        mode: 'read_many',
        ...(validatedParams.working_directory && { workingDirectory: validatedParams.working_directory }),
        additionalArgs
      });
      
      // Enhance the response with read-many-specific information
      if (result.success) {
        const readInfo = this.analyzeReadManyResults(result.output || '');
        result.message = `Successfully read ${readInfo.fileCount} file(s)`;
        
        if (readInfo.totalSize > 0) {
          result.message += ` (${readInfo.totalSize} characters total)`;
        }
        
        // Set files_changed to the files that were actually read
        if (readInfo.filePaths.length > 0) {
          result.files_changed = readInfo.filePaths;
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
        message: `Failed to read multiple files: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private isAllowedPath(path: string): boolean {
    if (!this.config.allowed_file_extensions) {
      return true; // No restrictions
    }
    
    // For glob patterns or directories, allow them
    if (path.includes('*') || path.includes('**') || !path.includes('.')) {
      return true;
    }
    
    const extension = path.substring(path.lastIndexOf('.'));
    return this.config.allowed_file_extensions.includes(extension);
  }
  
  private analyzeReadManyResults(output: string): { fileCount: number; totalSize: number; filePaths: string[] } {
    const lines = output.split('\n');
    let fileCount = 0;
    const filePaths: string[] = [];
    const totalSize = output.length;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for file separator patterns (usually "--- filepath ---")
      const separatorMatch = trimmed.match(/^---\s+(.+?)\s+---$/);
      if (separatorMatch && separatorMatch[1]) {
        fileCount++;
        filePaths.push(separatorMatch[1]);
      }
    }
    
    return { fileCount, totalSize, filePaths };
  }
}
