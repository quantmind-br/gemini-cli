/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CodeAnalysis, Issue, Suggestion, CodeMetrics } from '../types/tools.js';

export interface ParsedGeminiResponse {
  message: string;
  analysis?: CodeAnalysis;
  command_executed?: string;
  files_mentioned: string[];
}

export class ResponseParser {
  /**
   * Parses Gemini CLI output to extract structured information
   */
  static parseGeminiOutput(output: string, mode?: string): ParsedGeminiResponse {
    const result: ParsedGeminiResponse = {
      message: '',
      files_mentioned: []
    };
    
    // Extract main message
    result.message = this.extractMainMessage(output);
    
    // Extract files mentioned
    result.files_mentioned = this.extractFilesMentioned(output);
    
    // Extract command if it was executed
    const command = this.extractExecutedCommand(output);
    if (command) {
      result.command_executed = command;
    }

    // Parse analysis if in analyze mode
    if (mode === 'analyze') {
      const analysis = this.extractCodeAnalysis(output);
      if (analysis) {
        result.analysis = analysis;
      }
    }
    
    return result;
  }
  
  /**
   * Extracts the main message from Gemini output
   */
  private static extractMainMessage(output: string): string {
    const lines = output.split('\n');
    const meaningfulLines: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines, diff headers, and technical output
      if (
        trimmed === '' ||
        trimmed.startsWith('---') ||
        trimmed.startsWith('+++') ||
        trimmed.startsWith('@@') ||
        trimmed.startsWith('diff --git') ||
        trimmed.startsWith('index ') ||
        trimmed.match(/^[+-]\s*$/) ||
        trimmed.startsWith('Successfully created') ||
        trimmed.startsWith('Successfully wrote') ||
        trimmed.startsWith('Successfully overwrote')
      ) {
        continue;
      }
      
      // Include lines that look like explanations or summaries
      if (
        trimmed.length > 10 &&
        !trimmed.startsWith('+') &&
        !trimmed.startsWith('-') &&
        !trimmed.startsWith(' ')
      ) {
        meaningfulLines.push(trimmed);
      }
    }
    
    if (meaningfulLines.length === 0) {
      return 'Operation completed successfully';
    }
    
    // Return the first few meaningful lines as the message
    return meaningfulLines.slice(0, 3).join(' ');
  }
  
  /**
   * Extracts file paths mentioned in the output
   */
  private static extractFilesMentioned(output: string): string[] {
    const files = new Set<string>();
    
    // Common patterns for file mentions
    const patterns = [
      /(?:file|File)\s+['"`]?([^'"`\s]+\.[a-zA-Z0-9]+)['"`]?/g,
      /(?:created|modified|updated|wrote to|overwrote)\s+['"`]?([^'"`\s]+\.[a-zA-Z0-9]+)['"`]?/gi,
      /['"`]([^'"`\s]*\.[a-zA-Z0-9]+)['"`]/g,
      /\b([a-zA-Z0-9_-]+\/[a-zA-Z0-9_\/-]*\.[a-zA-Z0-9]+)\b/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const filePath = match[1];
        if (filePath && this.isValidFilePath(filePath)) {
          files.add(filePath);
        }
      }
    }
    
    return Array.from(files);
  }
  
  /**
   * Extracts executed command from output
   */
  private static extractExecutedCommand(output: string): string | undefined {
    const commandPatterns = [
      /Executing command:\s*(.+)/i,
      /Running:\s*(.+)/i,
      /Command:\s*(.+)/i,
      /\$\s*(.+)/
    ];
    
    for (const pattern of commandPatterns) {
      const match = output.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
    
    return undefined;
  }
  
  /**
   * Extracts code analysis from output
   */
  private static extractCodeAnalysis(output: string): CodeAnalysis | undefined {
    const analysis: CodeAnalysis = {
      summary: '',
      issues: [],
      suggestions: [],
      files_analyzed: this.extractFilesMentioned(output)
    };
    
    // Extract summary
    analysis.summary = this.extractAnalysisSummary(output);

    // Extract issues
    analysis.issues = this.extractIssues(output);

    // Extract suggestions
    analysis.suggestions = this.extractSuggestions(output);
    
    // Extract metrics if present
    const metrics = this.extractMetrics(output);
    if (metrics) {
      analysis.metrics = metrics;
    }

    // Only return analysis if we found meaningful content
    if (analysis.summary || analysis.issues.length > 0 || analysis.suggestions.length > 0) {
      return analysis;
    }
    
    return undefined;
  }
  
  private static extractAnalysisSummary(output: string): string {
    const summaryPatterns = [
      /Summary:\s*(.+?)(?:\n\n|\n[A-Z]|$)/s,
      /Analysis:\s*(.+?)(?:\n\n|\n[A-Z]|$)/s,
      /Overview:\s*(.+?)(?:\n\n|\n[A-Z]|$)/s
    ];
    
    for (const pattern of summaryPatterns) {
      const match = output.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
    
    return this.extractMainMessage(output);
  }
  
  private static extractIssues(output: string): Issue[] {
    const issues: Issue[] = [];
    
    const issuePatterns = [
      /(?:Error|ERROR):\s*(.+?)(?:\n|$)/g,
      /(?:Warning|WARNING):\s*(.+?)(?:\n|$)/g,
      /(?:Issue|ISSUE):\s*(.+?)(?:\n|$)/g,
      /❌\s*(.+?)(?:\n|$)/g,
      /⚠️\s*(.+?)(?:\n|$)/g
    ];
    
    for (const pattern of issuePatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const message = match[1]?.trim();
        if (message) {
          const type = pattern.source.toLowerCase().includes('error') ? 'error' :
                      pattern.source.toLowerCase().includes('warning') ? 'warning' : 'info';

          issues.push({
            type,
            message,
            severity: type === 'error' ? 'high' : type === 'warning' ? 'medium' : 'low'
          });
        }
      }
    }
    
    return issues;
  }
  
  private static extractSuggestions(output: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    const suggestionPatterns = [
      /(?:Suggestion|SUGGESTION):\s*(.+?)(?:\n|$)/g,
      /(?:Recommend|RECOMMEND):\s*(.+?)(?:\n|$)/g,
      /💡\s*(.+?)(?:\n|$)/g,
      /Consider:\s*(.+?)(?:\n|$)/g
    ];
    
    for (const pattern of suggestionPatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const description = match[1]?.trim();
        if (description) {
          suggestions.push({
            description,
            category: 'maintainability'
          });
        }
      }
    }
    
    return suggestions;
  }
  
  private static extractMetrics(output: string): CodeMetrics | undefined {
    const metrics: Partial<CodeMetrics> = {};
    
    const locMatch = output.match(/(?:lines of code|LOC):\s*(\d+)/i);
    if (locMatch?.[1]) {
      metrics.lines_of_code = parseInt(locMatch[1], 10);
    }

    const complexityMatch = output.match(/complexity:\s*(\d+(?:\.\d+)?)/i);
    if (complexityMatch?.[1]) {
      metrics.complexity_score = parseFloat(complexityMatch[1]);
    }

    const coverageMatch = output.match(/coverage:\s*(\d+(?:\.\d+)?)%/i);
    if (coverageMatch?.[1]) {
      metrics.test_coverage = parseFloat(coverageMatch[1]);
    }
    
    if (Object.keys(metrics).length > 0) {
      return metrics as CodeMetrics;
    }
    
    return undefined;
  }
  
  private static isValidFilePath(path: string): boolean {
    // Basic validation for file paths
    return (
      path.length > 0 &&
      path.includes('.') &&
      !path.includes(' ') &&
      !path.startsWith('http') &&
      !path.includes('://') &&
      path.length < 500
    );
  }
}
