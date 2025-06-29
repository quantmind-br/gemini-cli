#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Suppress known deprecation warnings from legacy dependencies
import { suppressKnownWarnings } from './src/utils/suppressWarnings.js';
suppressKnownWarnings();

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
