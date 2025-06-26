/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { GeminiCliClient } from '../utils/gemini-client.js';
import { ServerConfig } from '../config/server-config.js';
import { GeminiWriteParams, GeminiToolResponse } from '../types/tools.js';

const GeminiWriteParamsSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  file_path: z.string().min(1, 'File path is required'),
  overwrite: z.boolean().optional().default(false),
  context_files: z.array(z.string()).optional(),
  working_directory: z.string().optional()
});

export class GeminiWriteTool {
  private client: GeminiCliClient;
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
    this.client = new GeminiCliClient(config);
  }
  
  get name(): string {
    return 'gemini_write_file';
  }
  
  get description(): string {
    return 'Create or modify files using Gemini CLI. Provide a prompt describing the file content you want to create, specify the target file path. Returns diffs showing the changes made.';
  }
  
  get inputSchema(): object {
    return {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the file content to create or modify. Be specific about the functionality, structure, and requirements.'
        },
        file_path: {
          type: 'string',
          description: 'Path where the file should be created or modified. Include the full path with file extension.'
        },
        overwrite: {
          type: 'boolean',
          description: 'Whether to overwrite the file if it already exists. Defaults to false.',
          default: false
        },
        context_files: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Optional: Additional files to include as context for the write operation.'
        },
        working_directory: {
          type: 'string',
          description: 'Optional: Working directory for the operation. Defaults to current directory.'
        }
      },
      required: ['prompt', 'file_path']
    };
  }
  
  async execute(params: unknown): Promise<GeminiToolResponse> {
    try {
      // Validate parameters
      const validatedParams = GeminiWriteParamsSchema.parse(params);
      
      // Validate file extension
      if (!this.isAllowedFileExtension(validatedParams.file_path)) {
        return {
          success: false,
          message: `Invalid file extension for "${validatedParams.file_path}". Allowed extensions: ${this.config.allowed_file_extensions?.join(', ')}`,
          error: 'Invalid file extension'
        };
      }
      
      // Validate context files if provided
      if (validatedParams.context_files) {
        const invalidFiles = validatedParams.context_files.filter(file => 
          !this.isAllowedFileExtension(file)
        );
        
        if (invalidFiles.length > 0) {
          return {
            success: false,
            message: `Invalid file extensions in context files: ${invalidFiles.join(', ')}`,
            error: 'Invalid file extensions'
          };
        }
      }
      
      // Build enhanced prompt for file writing
      let enhancedPrompt = this.buildWritePrompt(validatedParams);
      
      // Prepare context files
      const contextFiles: string[] = [];
      if (validatedParams.context_files) {
        contextFiles.push(...validatedParams.context_files);
      }
      
      // Execute Gemini CLI
      const result = await this.client.executePrompt(enhancedPrompt, {
        ...(contextFiles.length > 0 && { files: contextFiles }),
        mode: 'write',
        ...(validatedParams.working_directory && { workingDirectory: validatedParams.working_directory }),
        additionalArgs: [
          '--approval-mode', this.config.approval_mode || 'yolo',
          ...(validatedParams.overwrite ? ['--overwrite'] : [])
        ]
      });
      
      // Enhance the response with write-specific information
      if (result.success) {
        if (result.diffs && result.diffs.length > 0) {
          const diff = result.diffs.find(d => d.file_path === validatedParams.file_path);
          if (diff) {
            const action = diff.change_type === 'created' ? 'Created' : 'Modified';
            result.message = `${action} file "${validatedParams.file_path}" successfully. ` +
              `Added ${diff.lines_added} lines.`;
          }
        } else {
          result.message = `Successfully processed file "${validatedParams.file_path}".`;
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
        message: `Failed to execute write operation: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private buildWritePrompt(params: GeminiWriteParams): string {
    let prompt = '';
    
    // Determine if this is a creation or modification
    const action = params.overwrite ? 'Create or overwrite' : 'Create';
    
    prompt = `${action} a file at "${params.file_path}" with the following requirements: ${params.prompt}`;
    
    // Add file type specific instructions based on extension
    const extension = params.file_path.substring(params.file_path.lastIndexOf('.'));
    
    switch (extension) {
      case '.ts':
      case '.js':
        prompt += ' Ensure proper TypeScript/JavaScript syntax, include appropriate imports, and follow best practices.';
        break;
      case '.py':
        prompt += ' Ensure proper Python syntax, include appropriate imports, and follow PEP 8 style guidelines.';
        break;
      case '.java':
        prompt += ' Ensure proper Java syntax, include appropriate imports and package declarations.';
        break;
      case '.html':
        prompt += ' Ensure valid HTML structure with proper DOCTYPE and semantic elements.';
        break;
      case '.css':
        prompt += ' Ensure valid CSS syntax with proper selectors and properties.';
        break;
      case '.md':
        prompt += ' Use proper Markdown syntax with appropriate headers and formatting.';
        break;
      case '.json':
        prompt += ' Ensure valid JSON format with proper syntax.';
        break;
      case '.yaml':
      case '.yml':
        prompt += ' Ensure valid YAML format with proper indentation.';
        break;
    }
    
    // Add context instruction if context files are provided
    if (params.context_files && params.context_files.length > 0) {
      prompt += ` Use the following files as context: ${params.context_files.join(', ')}.`;
    }
    
    return prompt;
  }
  
  private isAllowedFileExtension(filePath: string): boolean {
    if (!this.config.allowed_file_extensions) {
      return true; // No restrictions
    }
    
    const extension = filePath.substring(filePath.lastIndexOf('.'));
    return this.config.allowed_file_extensions.includes(extension);
  }
}
