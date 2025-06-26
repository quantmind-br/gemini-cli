/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { GeminiCliClient } from '../utils/gemini-client.js';
import { ServerConfig } from '../config/server-config.js';
import { GeminiToolResponse } from '../types/tools.js';

const GeminiWebSearchParamsSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  max_results: z.number().min(1).max(20).optional().default(10),
  working_directory: z.string().optional()
});

export interface GeminiWebSearchParams {
  query: string;
  max_results?: number;
  working_directory?: string;
}

export class GeminiWebSearchTool {
  private client: GeminiCliClient;
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
    this.client = new GeminiCliClient(config);
  }
  
  get name(): string {
    return 'gemini_web_search';
  }
  
  get description(): string {
    return 'Search the web using Gemini CLI. Performs Google searches and returns relevant results with URLs and snippets.';
  }
  
  get inputSchema(): object {
    return {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find information on the web.'
        },
        max_results: {
          type: 'number',
          minimum: 1,
          maximum: 20,
          description: 'Optional: Maximum number of search results to return. Defaults to 10.',
          default: 10
        },
        working_directory: {
          type: 'string',
          description: 'Optional: Working directory for the operation. Defaults to current directory.'
        }
      },
      required: ['query']
    };
  }
  
  async execute(params: unknown): Promise<GeminiToolResponse> {
    try {
      // Validate parameters
      const validatedParams = GeminiWebSearchParamsSchema.parse(params);
      
      // Build prompt for web search
      let prompt = `Search the web for: "${validatedParams.query}"`;
      
      if (validatedParams.max_results !== 10) {
        prompt += ` (return up to ${validatedParams.max_results} results)`;
      }
      
      // Build additional arguments
      const additionalArgs = ['--tool', 'google_web_search'];
      
      if (validatedParams.max_results !== undefined) {
        additionalArgs.push('--max-results', validatedParams.max_results.toString());
      }
      
      // Execute Gemini CLI with google_web_search tool
      const result = await this.client.executePrompt(prompt, {
        mode: 'web_search',
        ...(validatedParams.working_directory && { workingDirectory: validatedParams.working_directory }),
        additionalArgs
      });
      
      // Enhance the response with web search-specific information
      if (result.success) {
        const searchInfo = this.analyzeSearchResults(result.output || '');
        result.message = `Found ${searchInfo.resultCount} search result(s) for query "${validatedParams.query}"`;
        
        if (searchInfo.urls.length > 0) {
          result.message += ` from ${searchInfo.urls.length} source(s)`;
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
        message: `Failed to search web: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private analyzeSearchResults(output: string): { resultCount: number; urls: string[] } {
    const lines = output.split('\n');
    let resultCount = 0;
    const urls = new Set<string>();
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Count result indicators
      if (trimmed.match(/^\d+\./)) {
        resultCount++;
      }
      
      // Extract URLs
      const urlMatch = trimmed.match(/https?:\/\/[^\s]+/g);
      if (urlMatch) {
        urlMatch.forEach(url => urls.add(url));
      }
    }
    
    return {
      resultCount,
      urls: Array.from(urls)
    };
  }
}
