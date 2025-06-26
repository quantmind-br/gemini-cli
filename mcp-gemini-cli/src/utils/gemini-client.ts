/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'child_process';
import { quote } from 'shell-quote';
import { ServerConfig } from '../config/server-config.js';
import { GeminiExecutionResult, GeminiToolResponse } from '../types/tools.js';
import { DiffFormatter } from './diff-formatter.js';
import { ResponseParser } from './response-parser.js';

export class GeminiCliClient {
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
  }
  
  async executePrompt(
    prompt: string,
    options: {
      files?: string[];
      mode?: 'edit' | 'analyze' | 'write' | 'shell' | 'read' | 'list' | 'glob' | 'search' | 'web_fetch' | 'web_search' | 'memory' | 'read_many';
      workingDirectory?: string;
      additionalArgs?: string[];
    } = {}
  ): Promise<GeminiToolResponse> {
    const startTime = Date.now();
    
    try {
      // Build command arguments
      const args = this.buildGeminiArgs(prompt, options);
      
      // Execute Gemini CLI
      const result = await this.executeGeminiCli(args, options.workingDirectory);

      // Parse the result
      const response = await this.parseGeminiOutput(result, options.mode);

      response.execution_time_ms = Date.now() - startTime;

      return response;
    } catch (error) {
      return {
        success: false,
        message: `Failed to execute Gemini CLI: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error),
        execution_time_ms: Date.now() - startTime
      };
    }
  }
  
  private buildGeminiArgs(
    prompt: string,
    options: {
      files?: string[];
      mode?: string;
      additionalArgs?: string[];
    }
  ): string[] {
    const args: string[] = [];
    
    // Add model if specified
    if (this.config.default_model) {
      args.push('--model', this.config.default_model);
    }
    
    // Add approval mode for non-interactive execution
    if (this.config.approval_mode === 'yolo') {
      // Set environment variable for YOLO mode
      process.env.GEMINI_APPROVAL_MODE = 'yolo';
    }
    
    // Add context files if provided
    if (options.files && options.files.length > 0) {
      const contextFiles = options.files.slice(0, this.config.max_context_files || 10);
      for (const file of contextFiles) {
        args.push('--context-file', file);
      }
    }
    
    // Add additional arguments
    if (options.additionalArgs) {
      args.push(...options.additionalArgs);
    }
    
    // Add the prompt
    args.push('--prompt', prompt);
    
    return args;
  }
  
  private async executeGeminiCli(
    args: string[],
    workingDirectory?: string
  ): Promise<GeminiExecutionResult> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const cwd = workingDirectory || this.config.working_directory || process.cwd();
      
      if (this.config.debug) {
        console.error(`Executing: ${this.config.gemini_cli_path} ${args.join(' ')}`);
        console.error(`Working directory: ${cwd}`);
      }
      
      const child = spawn(this.config.gemini_cli_path!, args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          GEMINI_APPROVAL_MODE: this.config.approval_mode,
          NO_COLOR: '1' // Disable colors for easier parsing
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Gemini CLI execution timed out after ${this.config.timeout_ms}ms`));
      }, this.config.timeout_ms || 300000);
      
      child.on('close', (code) => {
        clearTimeout(timeout);
        
        const result: GeminiExecutionResult = {
          stdout,
          stderr,
          exit_code: code || 0,
          execution_time_ms: Date.now() - startTime,
          command: `${this.config.gemini_cli_path} ${args.join(' ')}`
        };
        
        if (this.config.debug) {
          console.error(`Exit code: ${code}`);
          console.error(`Stdout length: ${stdout.length}`);
          console.error(`Stderr length: ${stderr.length}`);
        }
        
        resolve(result);
      });
      
      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn Gemini CLI: ${error.message}`));
      });
    });
  }
  
  private async parseGeminiOutput(
    result: GeminiExecutionResult,
    mode?: string
  ): Promise<GeminiToolResponse> {
    if (result.exit_code !== 0) {
      return {
        success: false,
        message: `Gemini CLI exited with code ${result.exit_code}`,
        error: result.stderr || 'Unknown error',
        output: result.stdout
      };
    }
    
    try {
      // Use ResponseParser to extract structured information
      const parsedResponse = ResponseParser.parseGeminiOutput(result.stdout, mode);
      
      // Extract diffs if present
      const diffs = DiffFormatter.extractDiffsFromOutput(result.stdout);
      
      return {
        success: true,
        message: parsedResponse.message || 'Operation completed successfully',
        ...(diffs.length > 0 && { diffs }),
        files_changed: diffs.map(d => d.file_path),
        ...(parsedResponse.analysis && { analysis: parsedResponse.analysis }),
        ...(parsedResponse.command_executed && { command_executed: parsedResponse.command_executed }),
        output: result.stdout
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to parse Gemini CLI output: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error),
        output: result.stdout
      };
    }
  }
}
