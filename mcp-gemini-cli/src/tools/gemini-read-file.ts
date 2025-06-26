/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { GeminiCliClient } from '../utils/gemini-client.js';
import { ServerConfig } from '../config/server-config.js';
import { GeminiToolResponse } from '../types/tools.js';

const GeminiReadFileParamsSchema = z.object({
  file_path: z.string().min(1, 'File path is required'),
  start_line: z.number().min(1).optional(),
  end_line: z.number().min(1).optional(),
  working_directory: z.string().optional()
});

export interface GeminiReadFileParams {
  file_path: string;
  start_line?: number;
  end_line?: number;
  working_directory?: string;
}

export class GeminiReadFileTool {
  private client: GeminiCliClient;
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
    this.client = new GeminiCliClient(config);
  }
  
  get name(): string {
    return 'gemini_read_file';
  }
  
  get description(): string {
    return 'Read the content of a specific file using Gemini CLI. Supports reading specific line ranges and handles text, images, and PDF files.';
  }
  
  get inputSchema(): object {
    return {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file to read. Can be absolute or relative to working directory.'
        },
        start_line: {
          type: 'number',
          minimum: 1,
          description: 'Optional: Starting line number for partial file reading.'
        },
        end_line: {
          type: 'number',
          minimum: 1,
          description: 'Optional: Ending line number for partial file reading.'
        },
        working_directory: {
          type: 'string',
          description: 'Optional: Working directory for the operation. Defaults to current directory.'
        }
      },
      required: ['file_path']
    };
  }
  
  async execute(params: unknown): Promise<GeminiToolResponse> {
    try {
      // Validate parameters
      const validatedParams = GeminiReadFileParamsSchema.parse(params);
      
      // Validate file extension
      if (!this.isAllowedFileExtension(validatedParams.file_path)) {
        return {
          success: false,
          message: `Invalid file extension for "${validatedParams.file_path}". Allowed extensions: ${this.config.allowed_file_extensions?.join(', ')}`,
          error: 'Invalid file extension'
        };
      }
      
      // Build prompt for reading file
      let prompt = `Read the file "${validatedParams.file_path}"`;
      
      if (validatedParams.start_line && validatedParams.end_line) {
        prompt += ` from line ${validatedParams.start_line} to line ${validatedParams.end_line}`;
      } else if (validatedParams.start_line) {
        prompt += ` starting from line ${validatedParams.start_line}`;
      } else if (validatedParams.end_line) {
        prompt += ` up to line ${validatedParams.end_line}`;
      }
      
      // Execute Gemini CLI with read_file tool
      const result = await this.client.executePrompt(prompt, {
        files: [validatedParams.file_path],
        mode: 'read',
        ...(validatedParams.working_directory && { workingDirectory: validatedParams.working_directory }),
        additionalArgs: ['--tool', 'read_file']
      });
      
      // Enhance the response with read-specific information
      if (result.success) {
        result.message = `Successfully read file "${validatedParams.file_path}"`;
        
        // Add file info to response
        result.files_changed = [validatedParams.file_path];
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
        message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private isAllowedFileExtension(filePath: string): boolean {
    if (!this.config.allowed_file_extensions) {
      return true; // No restrictions
    }
    
    const extension = filePath.substring(filePath.lastIndexOf('.'));
    return this.config.allowed_file_extensions.includes(extension);
  }
}
