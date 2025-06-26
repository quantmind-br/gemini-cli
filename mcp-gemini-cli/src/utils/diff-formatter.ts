/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as diff from 'diff';
import { FormattedDiff } from '../types/tools.js';

export class DiffFormatter {
  /**
   * Extracts diff information from Gemini CLI output
   */
  static extractDiffsFromOutput(output: string): FormattedDiff[] {
    const diffs: FormattedDiff[] = [];
    
    // Look for diff patterns in the output
    const diffPatterns = [
      // Standard unified diff format
      /^--- (.+)$/gm,
      /^\+\+\+ (.+)$/gm,
      // File creation/modification indicators
      /(?:Created|Modified|Updated)\s+(.+?)(?:\n|$)/gi,
      // Gemini CLI specific patterns
      /Successfully (?:created|wrote to|overwrote) (?:file|new file):\s*(.+?)(?:\n|$)/gi
    ];
    
    // Extract file paths that were modified
    const modifiedFiles = new Set<string>();
    
    for (const pattern of diffPatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        if (match[1] && !match[1].includes('Current') && !match[1].includes('Proposed')) {
          modifiedFiles.add(match[1].trim());
        }
      }
    }
    
    // Look for actual diff content
    const diffBlocks = this.extractDiffBlocks(output);
    
    for (const block of diffBlocks) {
      const formattedDiff = this.parseDiffBlock(block);
      if (formattedDiff) {
        diffs.push(formattedDiff);
      }
    }
    
    // If no diff blocks found but files were mentioned, create basic diffs
    if (diffs.length === 0 && modifiedFiles.size > 0) {
      for (const filePath of modifiedFiles) {
        diffs.push({
          file_path: filePath,
          diff: `File ${filePath} was modified`,
          change_type: 'modified',
          lines_added: 0,
          lines_removed: 0
        });
      }
    }
    
    return diffs;
  }
  
  /**
   * Extracts diff blocks from output text
   */
  private static extractDiffBlocks(output: string): string[] {
    const blocks: string[] = [];
    const lines = output.split('\n');
    let currentBlock: string[] = [];
    let inDiff = false;
    
    for (const line of lines) {
      // Start of a diff block
      if (line.startsWith('--- ') || line.startsWith('diff --git')) {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock.join('\n'));
        }
        currentBlock = [line];
        inDiff = true;
      }
      // Continuation of diff block
      else if (inDiff && (
        line.startsWith('+++ ') ||
        line.startsWith('@@ ') ||
        line.startsWith('+') ||
        line.startsWith('-') ||
        line.startsWith(' ') ||
        line.startsWith('\\')
      )) {
        currentBlock.push(line);
      }
      // End of diff block
      else if (inDiff && line.trim() === '') {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock.join('\n'));
          currentBlock = [];
        }
        inDiff = false;
      }
      // Not in diff, reset
      else if (inDiff) {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock.join('\n'));
          currentBlock = [];
        }
        inDiff = false;
      }
    }
    
    // Add final block if exists
    if (currentBlock.length > 0) {
      blocks.push(currentBlock.join('\n'));
    }
    
    return blocks;
  }
  
  /**
   * Parses a single diff block into a FormattedDiff
   */
  private static parseDiffBlock(block: string): FormattedDiff | null {
    const lines = block.split('\n');
    let filePath = '';
    let linesAdded = 0;
    let linesRemoved = 0;
    let changeType: 'created' | 'modified' | 'deleted' = 'modified';
    
    // Extract file path
    for (const line of lines) {
      if (line.startsWith('--- ')) {
        const path = line.substring(4).trim();
        if (path !== '/dev/null' && !path.includes('Current')) {
          filePath = path;
        }
      } else if (line.startsWith('+++ ')) {
        const path = line.substring(4).trim();
        if (path !== '/dev/null' && !path.includes('Proposed')) {
          filePath = path;
        }
      }
    }
    
    // If no file path found, try to extract from context
    if (!filePath) {
      const fileMatch = block.match(/(?:file|File)\s+(.+?)(?:\s|$)/);
      if (fileMatch?.[1]) {
        filePath = fileMatch[1];
      }
    }

    if (!filePath) {
      return null;
    }
    
    // Count added and removed lines
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        linesAdded++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        linesRemoved++;
      }
    }
    
    // Determine change type
    if (linesRemoved === 0 && linesAdded > 0) {
      changeType = 'created';
    } else if (linesAdded === 0 && linesRemoved > 0) {
      changeType = 'deleted';
    }
    
    return {
      file_path: filePath,
      diff: block,
      change_type: changeType,
      lines_added: linesAdded,
      lines_removed: linesRemoved
    };
  }
  
  /**
   * Creates a diff between two strings
   */
  static createDiff(
    oldContent: string,
    newContent: string,
    filePath: string
  ): FormattedDiff {
    const patch = diff.createPatch(
      filePath,
      oldContent,
      newContent,
      'Original',
      'Modified'
    );
    
    const lines = patch.split('\n');
    let linesAdded = 0;
    let linesRemoved = 0;
    
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        linesAdded++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        linesRemoved++;
      }
    }
    
    let changeType: 'created' | 'modified' | 'deleted' = 'modified';
    if (oldContent === '' && newContent !== '') {
      changeType = 'created';
    } else if (oldContent !== '' && newContent === '') {
      changeType = 'deleted';
    }
    
    return {
      file_path: filePath,
      diff: patch,
      change_type: changeType,
      lines_added: linesAdded,
      lines_removed: linesRemoved,
      original_content: oldContent,
      new_content: newContent
    };
  }
}
