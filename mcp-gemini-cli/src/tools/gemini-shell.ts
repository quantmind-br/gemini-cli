/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { GeminiCliClient } from '../utils/gemini-client.js';
import { ServerConfig } from '../config/server-config.js';
import { GeminiShellParams, GeminiToolResponse } from '../types/tools.js';

const GeminiShellParamsSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  working_directory: z.string().optional(),
  timeout_ms: z.number().min(1000).max(600000).optional() // 1 second to 10 minutes
});

export class GeminiShellTool {
  private client: GeminiCliClient;
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
    this.client = new GeminiCliClient(config);
  }
  
  get name(): string {
    return 'gemini_shell_command';
  }
  
  get description(): string {
    return 'Execute shell commands using Gemini CLI. Provide a prompt describing the command or task you want to execute. Gemini will determine the appropriate command and execute it safely.';
  }
  
  get inputSchema(): object {
    return {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the command or task you want to execute. Be specific about what you want to accomplish.'
        },
        working_directory: {
          type: 'string',
          description: 'Optional: Working directory where the command should be executed. Defaults to current directory.'
        },
        timeout_ms: {
          type: 'number',
          minimum: 1000,
          maximum: 600000,
          description: 'Optional: Timeout for command execution in milliseconds. Defaults to server configuration.'
        }
      },
      required: ['prompt']
    };
  }
  
  async execute(params: unknown): Promise<GeminiToolResponse> {
    try {
      // Validate parameters
      const validatedParams = GeminiShellParamsSchema.parse(params);
      
      // Build enhanced prompt for shell execution
      let enhancedPrompt = this.buildShellPrompt(validatedParams);
      
      // Prepare additional arguments
      const additionalArgs: string[] = [
        '--approval-mode', this.config.approval_mode || 'yolo',
        '--enable-shell'
      ];
      
      // Add timeout if specified
      if (validatedParams.timeout_ms) {
        additionalArgs.push('--timeout', validatedParams.timeout_ms.toString());
      }
      
      // Execute Gemini CLI
      const result = await this.client.executePrompt(enhancedPrompt, {
        mode: 'shell',
        ...(validatedParams.working_directory && { workingDirectory: validatedParams.working_directory }),
        additionalArgs
      });
      
      // Enhance the response with shell-specific information
      if (result.success && result.command_executed) {
        result.message = `Successfully executed command: ${result.command_executed}`;
      } else if (result.success) {
        result.message = 'Shell operation completed successfully';
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
        message: `Failed to execute shell command: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private buildShellPrompt(params: GeminiShellParams): string {
    let prompt = 'Execute the following task using shell commands: ' + params.prompt;
    
    // Add safety instructions
    prompt += ' Please ensure the command is safe and appropriate for the current environment.';
    
    // Add working directory context if specified
    if (params.working_directory) {
      prompt += ` Execute in the directory: ${params.working_directory}`;
    }
    
    // Add common shell safety guidelines
    prompt += ' Avoid destructive operations unless explicitly requested. ' +
              'Prefer read-only operations when possible. ' +
              'If multiple commands are needed, execute them safely in sequence.';
    
    return prompt;
  }
}
