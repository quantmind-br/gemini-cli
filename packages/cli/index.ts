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
process.emit = function (name, ...args: any[]) {
  if (name === 'warning' && typeof args[0] === 'object' && (args[0] as { message?: string })?.message?.includes('punycode')) {
    return false;
  }
  return originalEmit.apply(process, arguments as any);
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
