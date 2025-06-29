/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import updateNotifier from 'update-notifier';
import { getPackageJson } from '../../utils/package.js';
import { LoadedSettings } from '../../config/settings.js';

export async function checkForUpdates(
  settings?: LoadedSettings,
): Promise<string | null> {
  // Check if update checking is disabled (default is true - disabled)
  const disableUpdateCheck = settings?.merged.disableUpdateCheck ?? true;
  if (
    disableUpdateCheck ||
    process.env.GEMINI_CLI_DISABLE_UPDATE_CHECK === 'true'
  ) {
    return null;
  }
  try {
    const packageJson = await getPackageJson();
    if (!packageJson || !packageJson.name || !packageJson.version) {
      return null;
    }
    const notifier = updateNotifier({
      pkg: {
        name: packageJson.name,
        version: packageJson.version,
      },
      // check every time
      updateCheckInterval: 0,
      // allow notifier to run in scripts
      shouldNotifyInNpmScript: true,
    });

    if (notifier.update) {
      return `Gemini CLI update available! ${notifier.update.current} → ${notifier.update.latest}\nRun npm install -g ${packageJson.name} to update`;
    }

    return null;
  } catch (e) {
    console.warn('Failed to check for updates: ' + e);
    return null;
  }
}
