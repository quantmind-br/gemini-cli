/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { GeminiCliClient } from '../utils/gemini-client.js';
import { ServerConfig } from '../config/server-config.js';
import { GeminiAnalyzeParams, GeminiToolResponse } from '../types/tools.js';

const GeminiAnalyzeParamsSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  file_paths: z.array(z.string()).optional(),
  analysis_type: z.enum(['code_review', 'security', 'performance', 'general']).optional(),
  working_directory: z.string().optional()
});

export class GeminiAnalyzeTool {
  private client: GeminiCliClient;
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
    this.client = new GeminiCliClient(config);
  }
  
  get name(): string {
    return 'gemini_analyze_code';
  }
  
  get description(): string {
    return 'Analyze code using Gemini CLI. Provide a prompt describing what you want to analyze, optionally specify files and analysis type. Returns structured analysis with issues, suggestions, and insights.';
  }
  
  get inputSchema(): object {
    return {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the analysis you want to perform. Be specific about what aspects of the code you want to analyze.'
        },
        file_paths: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Optional: Specific files to analyze. If not provided, Gemini will analyze relevant files based on the prompt.'
        },
        analysis_type: {
          type: 'string',
          enum: ['code_review', 'security', 'performance', 'general'],
          description: 'Optional: Type of analysis to perform. Defaults to "general".'
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
      const validatedParams = GeminiAnalyzeParamsSchema.parse(params);
      
      // Validate file extensions if files are specified
      if (validatedParams.file_paths) {
        const invalidFiles = validatedParams.file_paths.filter(file => 
          !this.isAllowedFileExtension(file)
        );
        
        if (invalidFiles.length > 0) {
          return {
            success: false,
            message: `Invalid file extensions: ${invalidFiles.join(', ')}. Allowed extensions: ${this.config.allowed_file_extensions?.join(', ')}`,
            error: 'Invalid file extensions'
          };
        }
      }
      
      // Build enhanced prompt for analysis
      let enhancedPrompt = this.buildAnalysisPrompt(validatedParams);
      
      // Execute Gemini CLI
      const result = await this.client.executePrompt(enhancedPrompt, {
        ...(validatedParams.file_paths && { files: validatedParams.file_paths }),
        mode: 'analyze',
        ...(validatedParams.working_directory && { workingDirectory: validatedParams.working_directory }),
        additionalArgs: ['--analysis-mode']
      });
      
      // Enhance the response with analysis-specific information
      if (result.success && result.analysis) {
        const issueCount = result.analysis.issues.length;
        const suggestionCount = result.analysis.suggestions.length;
        const filesAnalyzed = result.analysis.files_analyzed.length;
        
        result.message = `Analysis completed. Analyzed ${filesAnalyzed} file(s), ` +
          `found ${issueCount} issue(s) and ${suggestionCount} suggestion(s).`;
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
        message: `Failed to execute analysis: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private buildAnalysisPrompt(params: GeminiAnalyzeParams): string {
    let prompt = '';
    
    // Add analysis type specific instructions
    switch (params.analysis_type) {
      case 'code_review':
        prompt = 'Perform a comprehensive code review. Look for code quality issues, best practices violations, potential bugs, and areas for improvement. ';
        break;
      case 'security':
        prompt = 'Perform a security analysis. Look for potential security vulnerabilities, unsafe practices, and security best practices violations. ';
        break;
      case 'performance':
        prompt = 'Perform a performance analysis. Look for performance bottlenecks, inefficient algorithms, and optimization opportunities. ';
        break;
      case 'general':
      default:
        prompt = 'Analyze the code and provide insights. ';
        break;
    }
    
    // Add the user's specific prompt
    prompt += params.prompt;
    
    // Add file-specific instructions if files are specified
    if (params.file_paths && params.file_paths.length > 0) {
      prompt += ` Focus on the following files: ${params.file_paths.join(', ')}.`;
    }
    
    // Add structured output request
    prompt += ' Please provide a structured analysis with specific issues, suggestions, and actionable recommendations.';
    
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
