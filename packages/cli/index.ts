#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import process from 'node:process';

// Suppress punycode deprecation warning from 'uri-js' dependency
const originalEmit = process.emit;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(process.emit as any) = function (name: string, ...args: any[]): boolean {
  if (
    name === 'warning' &&
    typeof args[0] === 'object' &&
    (args[0] as { message?: string })?.message?.includes('punycode')
  ) {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = originalEmit.apply(process, [name, ...args] as any);
  return Boolean(result);
};

import './src/gemini.js';
import { main } from './src/gemini.js';

// --- Global Entry Point ---
main().catch((error) => {
  console.error('An unexpected critical error occurred:');
  if (error instanceof Error) {
    console.error(error.stack);
  } else {
    console.error(String(error));
  }
  process.exit(1);
});
