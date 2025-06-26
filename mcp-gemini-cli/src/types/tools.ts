/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GeminiToolParams {
  prompt: string;
  file_path?: string;
  context_files?: string[];
  working_directory?: string;
}

export interface GeminiEditParams extends GeminiToolParams {
  file_path?: string;
  context_files?: string[];
}

export interface GeminiAnalyzeParams extends GeminiToolParams {
  file_paths?: string[];
  analysis_type?: 'code_review' | 'security' | 'performance' | 'general';
}

export interface GeminiWriteParams extends GeminiToolParams {
  file_path: string;
  overwrite?: boolean;
}

export interface GeminiShellParams extends GeminiToolParams {
  working_directory?: string;
  timeout_ms?: number;
}

export interface FormattedDiff {
  file_path: string;
  diff: string;
  change_type: 'created' | 'modified' | 'deleted';
  lines_added: number;
  lines_removed: number;
  original_content?: string;
  new_content?: string;
}

export interface CodeAnalysis {
  summary: string;
  issues: Issue[];
  suggestions: Suggestion[];
  metrics?: CodeMetrics;
  files_analyzed: string[];
}

export interface Issue {
  type: 'error' | 'warning' | 'info';
  message: string;
  file_path?: string;
  line_number?: number;
  severity: 'high' | 'medium' | 'low';
}

export interface Suggestion {
  description: string;
  file_path?: string;
  line_number?: number;
  proposed_change?: string;
  category: 'performance' | 'security' | 'maintainability' | 'style';
}

export interface CodeMetrics {
  lines_of_code: number;
  complexity_score?: number;
  test_coverage?: number;
  maintainability_index?: number;
}

export interface GeminiToolResponse {
  success: boolean;
  message: string;
  diffs?: FormattedDiff[];
  files_changed?: string[];
  analysis?: CodeAnalysis;
  command_executed?: string;
  output?: string;
  error?: string;
  execution_time_ms?: number;
}

export interface GeminiExecutionResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  execution_time_ms: number;
  command: string;
}

export type ToolName =
  | 'gemini_edit_code'
  | 'gemini_analyze_code'
  | 'gemini_write_file'
  | 'gemini_shell_command'
  | 'gemini_read_file'
  | 'gemini_list_directory'
  | 'gemini_find_files'
  | 'gemini_search_content'
  | 'gemini_web_fetch'
  | 'gemini_web_search'
  | 'gemini_memory'
  | 'gemini_read_many_files';
