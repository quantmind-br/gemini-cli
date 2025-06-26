/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { GeminiCliClient } from '../utils/gemini-client.js';
import { ServerConfig } from '../config/server-config.js';
import { GeminiEditParams, GeminiToolResponse } from '../types/tools.js';

const GeminiEditParamsSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  file_path: z.string().optional(),
  context_files: z.array(z.string()).optional(),
  working_directory: z.string().optional()
});

export class GeminiEditTool {
  private client: GeminiCliClient;
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
    this.client = new GeminiCliClient(config);
  }
  
  get name(): string {
    return 'gemini_edit_code';
  }
  
  get description(): string {
    return 'Edit code files using Gemini CLI. Provide a prompt describing the changes you want to make, optionally specify a target file and context files. Returns diffs showing the changes made.';
  }
  
  get inputSchema(): object {
    return {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the code changes to make. Be specific about what you want to edit, add, or modify.'
        },
        file_path: {
          type: 'string',
          description: 'Optional: Specific file to edit. If not provided, Gemini will determine which files to modify based on the prompt.'
        },
        context_files: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Optional: Additional files to include as context for the edit operation.'
        },
        working_directory: {
          type: 'string',
          description: 'Optional: Working directory for the operation. Defaults to current directory.'
        }
      },
      required: ['prompt']
    };
  }
  
  async execute(params: unknown): Promise<GeminiToolResponse> {
    try {
      // Validate parameters
      const validatedParams = GeminiEditParamsSchema.parse(params);
      
      // Prepare context files
      const contextFiles: string[] = [];
      
      if (validatedParams.file_path) {
        contextFiles.push(validatedParams.file_path);
      }
      
      if (validatedParams.context_files) {
        contextFiles.push(...validatedParams.context_files);
      }
      
      // Validate file extensions
      const invalidFiles = contextFiles.filter(file => 
        !this.isAllowedFileExtension(file)
      );
      
      if (invalidFiles.length > 0) {
        return {
          success: false,
          message: `Invalid file extensions: ${invalidFiles.join(', ')}. Allowed extensions: ${this.config.allowed_file_extensions?.join(', ')}`,
          error: 'Invalid file extensions'
        };
      }
      
      // Build enhanced prompt for editing
      let enhancedPrompt = validatedParams.prompt;
      
      if (validatedParams.file_path) {
        enhancedPrompt = `Edit the file "${validatedParams.file_path}": ${validatedParams.prompt}`;
      } else {
        enhancedPrompt = `Make the following code changes: ${validatedParams.prompt}`;
      }
      
      // Execute Gemini CLI
      const result = await this.client.executePrompt(enhancedPrompt, {
        ...(contextFiles.length > 0 && { files: contextFiles }),
        mode: 'edit',
        ...(validatedParams.working_directory && { workingDirectory: validatedParams.working_directory }),
        additionalArgs: ['--approval-mode', this.config.approval_mode || 'yolo']
      });
      
      // Enhance the response with edit-specific information
      if (result.success && result.diffs && result.diffs.length > 0) {
        const totalLinesAdded = result.diffs.reduce((sum, diff) => sum + diff.lines_added, 0);
        const totalLinesRemoved = result.diffs.reduce((sum, diff) => sum + diff.lines_removed, 0);
        
        result.message = `Successfully edited ${result.diffs.length} file(s). ` +
          `Added ${totalLinesAdded} lines, removed ${totalLinesRemoved} lines.`;
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
        message: `Failed to execute edit operation: ${error instanceof Error ? error.message : String(error)}`,
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
