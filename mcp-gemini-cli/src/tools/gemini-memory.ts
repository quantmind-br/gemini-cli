/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { GeminiCliClient } from '../utils/gemini-client.js';
import { ServerConfig } from '../config/server-config.js';
import { GeminiToolResponse } from '../types/tools.js';

const GeminiMemoryParamsSchema = z.object({
  action: z.enum(['save', 'recall', 'list', 'clear']),
  content: z.string().optional(),
  key: z.string().optional(),
  working_directory: z.string().optional()
});

export interface GeminiMemoryParams {
  action: 'save' | 'recall' | 'list' | 'clear';
  content?: string;
  key?: string;
  working_directory?: string;
}

export class GeminiMemoryTool {
  private client: GeminiCliClient;
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
    this.client = new GeminiCliClient(config);
  }
  
  get name(): string {
    return 'gemini_memory';
  }
  
  get description(): string {
    return 'Save and recall information across sessions using Gemini CLI memory. Supports saving, recalling, listing, and clearing memory.';
  }
  
  get inputSchema(): object {
    return {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['save', 'recall', 'list', 'clear'],
          description: 'Action to perform: save (store information), recall (retrieve information), list (show all saved items), clear (remove all memory).'
        },
        content: {
          type: 'string',
          description: 'Content to save (required for save action).'
        },
        key: {
          type: 'string',
          description: 'Optional key/identifier for the saved content (for save and recall actions).'
        },
        working_directory: {
          type: 'string',
          description: 'Optional: Working directory for the operation. Defaults to current directory.'
        }
      },
      required: ['action']
    };
  }
  
  async execute(params: unknown): Promise<GeminiToolResponse> {
    try {
      // Validate parameters
      const validatedParams = GeminiMemoryParamsSchema.parse(params);
      
      // Validate required parameters for specific actions
      if (validatedParams.action === 'save' && !validatedParams.content) {
        return {
          success: false,
          message: 'Content is required for save action',
          error: 'Missing required parameter: content'
        };
      }
      
      // Build prompt for memory operation
      let prompt = '';
      const additionalArgs = ['--tool', 'save_memory'];
      
      switch (validatedParams.action) {
        case 'save':
          prompt = `Save to memory: ${validatedParams.content}`;
          if (validatedParams.key) {
            prompt += ` (key: ${validatedParams.key})`;
            additionalArgs.push('--key', validatedParams.key);
          }
          break;
          
        case 'recall':
          if (validatedParams.key) {
            prompt = `Recall from memory with key: ${validatedParams.key}`;
            additionalArgs.push('--key', validatedParams.key);
          } else {
            prompt = 'Recall all saved memory';
          }
          additionalArgs.push('--action', 'recall');
          break;
          
        case 'list':
          prompt = 'List all saved memory items';
          additionalArgs.push('--action', 'list');
          break;
          
        case 'clear':
          prompt = 'Clear all saved memory';
          additionalArgs.push('--action', 'clear');
          break;
      }
      
      // Execute Gemini CLI with save_memory tool
      const result = await this.client.executePrompt(prompt, {
        mode: 'memory',
        ...(validatedParams.working_directory && { workingDirectory: validatedParams.working_directory }),
        additionalArgs
      });
      
      // Enhance the response with memory-specific information
      if (result.success) {
        switch (validatedParams.action) {
          case 'save':
            result.message = `Successfully saved to memory`;
            if (validatedParams.key) {
              result.message += ` with key "${validatedParams.key}"`;
            }
            break;
            
          case 'recall':
            if (validatedParams.key) {
              result.message = `Successfully recalled memory for key "${validatedParams.key}"`;
            } else {
              result.message = 'Successfully recalled all memory';
            }
            break;
            
          case 'list':
            const itemCount = this.countMemoryItems(result.output || '');
            result.message = `Found ${itemCount} memory item(s)`;
            break;
            
          case 'clear':
            result.message = 'Successfully cleared all memory';
            break;
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
        message: `Failed to perform memory operation: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private countMemoryItems(output: string): number {
    const lines = output.split('\n');
    let count = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Count lines that look like memory items (usually start with a key or number)
      if (trimmed && (trimmed.match(/^\d+\./) || trimmed.match(/^[a-zA-Z0-9_-]+:/))) {
        count++;
      }
    }
    
    return count;
  }
}
