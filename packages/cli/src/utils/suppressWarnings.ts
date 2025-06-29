/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Suppresses known deprecation warnings from legacy dependencies.
 *
 * Current suppressions:
 * - punycode module deprecation (DEP0040) from jsdom/eslint dependencies
 *   This affects Node.js 22.x with legacy packages that haven't migrated
 *   to userland punycode alternatives yet.
 */
export function suppressKnownWarnings(): void {
  // Store original warning listeners
  const originalWarningListeners = process.listeners('warning');

  // Remove all existing warning listeners
  process.removeAllListeners('warning');

  // Add our custom warning filter
  process.on('warning', (warning) => {
    // Suppress punycode deprecation warnings
    if (
      warning.name === 'DeprecationWarning' &&
      warning.message.includes('punycode')
    ) {
      return; // Silently ignore
    }

    // For all other warnings, emit them normally
    console.warn(warning.message);

    // Also call original listeners for other warnings
    originalWarningListeners.forEach((listener) => {
      if (typeof listener === 'function') {
        listener(warning);
      }
    });
  });
}
