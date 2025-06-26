/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { GeminiCliClient } from '../utils/gemini-client.js';
import { ServerConfig } from '../config/server-config.js';
import { GeminiToolResponse } from '../types/tools.js';

const GeminiWebFetchParamsSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  timeout_ms: z.number().min(1000).max(60000).optional().default(30000),
  working_directory: z.string().optional()
});

export interface GeminiWebFetchParams {
  url: string;
  timeout_ms?: number;
  working_directory?: string;
}

export class GeminiWebFetchTool {
  private client: GeminiCliClient;
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
    this.client = new GeminiCliClient(config);
  }
  
  get name(): string {
    return 'gemini_web_fetch';
  }
  
  get description(): string {
    return 'Fetch content from a URL using Gemini CLI. Retrieves web pages, APIs, and other web resources.';
  }
  
  get inputSchema(): object {
    return {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          description: 'URL to fetch content from. Must be a valid HTTP/HTTPS URL.'
        },
        timeout_ms: {
          type: 'number',
          minimum: 1000,
          maximum: 60000,
          description: 'Optional: Timeout for the request in milliseconds. Defaults to 30000 (30 seconds).',
          default: 30000
        },
        working_directory: {
          type: 'string',
          description: 'Optional: Working directory for the operation. Defaults to current directory.'
        }
      },
      required: ['url']
    };
  }
  
  async execute(params: unknown): Promise<GeminiToolResponse> {
    try {
      // Validate parameters
      const validatedParams = GeminiWebFetchParamsSchema.parse(params);
      
      // Build prompt for web fetch
      const prompt = `Fetch content from URL: ${validatedParams.url}`;
      
      // Build additional arguments
      const additionalArgs = ['--tool', 'web_fetch'];
      
      if (validatedParams.timeout_ms !== undefined) {
        additionalArgs.push('--timeout', validatedParams.timeout_ms.toString());
      }
      
      // Execute Gemini CLI with web_fetch tool
      const result = await this.client.executePrompt(prompt, {
        mode: 'web_fetch',
        ...(validatedParams.working_directory && { workingDirectory: validatedParams.working_directory }),
        additionalArgs
      });
      
      // Enhance the response with web fetch-specific information
      if (result.success) {
        const contentInfo = this.analyzeWebContent(result.output || '');
        result.message = `Successfully fetched content from ${validatedParams.url}`;
        
        if (contentInfo.contentLength > 0) {
          result.message += ` (${contentInfo.contentLength} characters)`;
        }
        
        if (contentInfo.contentType) {
          result.message += ` - ${contentInfo.contentType}`;
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
        message: `Failed to fetch web content: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private analyzeWebContent(output: string): { contentLength: number; contentType?: string } {
    const contentLength = output.length;
    let contentType: string | undefined;
    
    // Try to detect content type from output
    if (output.includes('<!DOCTYPE html') || output.includes('<html')) {
      contentType = 'HTML';
    } else if (output.trim().startsWith('{') && output.trim().endsWith('}')) {
      contentType = 'JSON';
    } else if (output.trim().startsWith('<') && output.trim().endsWith('>')) {
      contentType = 'XML';
    } else if (output.includes('Content-Type:')) {
      const contentTypeMatch = output.match(/Content-Type:\s*([^\n\r]+)/i);
      if (contentTypeMatch && contentTypeMatch[1]) {
        contentType = contentTypeMatch[1].trim();
      }
    }
    
    return { contentLength, contentType };
  }
}
