/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ServerConfig {
  gemini_cli_path?: string;
  default_model?: string;
  max_context_files?: number;
  timeout_ms?: number;
  approval_mode?: 'auto' | 'manual' | 'yolo';
  max_file_size_mb?: number;
  allowed_file_extensions?: string[];
  working_directory?: string;
  debug?: boolean;
}

export const DEFAULT_CONFIG: ServerConfig = {
  gemini_cli_path: 'gemini',
  default_model: 'gemini-2.0-flash-exp',
  max_context_files: 10,
  timeout_ms: 300000, // 5 minutes
  approval_mode: 'yolo',
  max_file_size_mb: 10,
  allowed_file_extensions: [
    '.ts', '.js', '.tsx', '.jsx',
    '.py', '.java', '.cpp', '.c', '.h',
    '.go', '.rs', '.php', '.rb',
    '.html', '.css', '.scss', '.sass',
    '.json', '.yaml', '.yml', '.xml',
    '.md', '.txt', '.sql', '.sh',
    '.dockerfile', '.gitignore'
  ],
  working_directory: process.cwd(),
  debug: false
};

export function loadConfig(): ServerConfig {
  const config: ServerConfig = { ...DEFAULT_CONFIG };
  
  // Load from environment variables
  if (process.env.GEMINI_CLI_PATH) {
    config.gemini_cli_path = process.env.GEMINI_CLI_PATH;
  }
  
  if (process.env.GEMINI_MODEL) {
    config.default_model = process.env.GEMINI_MODEL;
  }
  
  if (process.env.MCP_TIMEOUT_MS) {
    config.timeout_ms = parseInt(process.env.MCP_TIMEOUT_MS, 10);
  }
  
  if (process.env.MCP_APPROVAL_MODE) {
    config.approval_mode = process.env.MCP_APPROVAL_MODE as 'auto' | 'manual' | 'yolo';
  }
  
  if (process.env.MCP_MAX_CONTEXT_FILES) {
    config.max_context_files = parseInt(process.env.MCP_MAX_CONTEXT_FILES, 10);
  }
  
  if (process.env.MCP_WORKING_DIRECTORY) {
    config.working_directory = process.env.MCP_WORKING_DIRECTORY;
  }
  
  if (process.env.MCP_DEBUG) {
    config.debug = process.env.MCP_DEBUG === 'true';
  }
  
  return config;
}

export function validateConfig(config: ServerConfig): void {
  if (!config.gemini_cli_path) {
    throw new Error('gemini_cli_path is required');
  }
  
  if (config.timeout_ms && config.timeout_ms < 1000) {
    throw new Error('timeout_ms must be at least 1000ms');
  }
  
  if (config.max_context_files && config.max_context_files < 1) {
    throw new Error('max_context_files must be at least 1');
  }
  
  if (config.max_file_size_mb && config.max_file_size_mb < 0.1) {
    throw new Error('max_file_size_mb must be at least 0.1MB');
  }
}
