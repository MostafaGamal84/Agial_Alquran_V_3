'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createBuilder } = require('@angular-devkit/architect');

async function runVersionedBrowserBuilder(options, context) {
  const {
    delegateBuilder = '@angular-devkit/build-angular:browser',
    bumpVersionOnProduction = true,
    versionScript = 'scripts/write-build-version.js',
    ...delegateOptions
  } = options;

  const configurationNames = String(context.target?.configuration ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const isProductionBuild = configurationNames.includes('production');
  const shouldBump =
    bumpVersionOnProduction === true &&
    isProductionBuild &&
    delegateOptions.watch !== true;

  if (shouldBump) {
    const workspaceRoot = context.workspaceRoot ?? process.cwd();
    const scriptPath = path.resolve(workspaceRoot, versionScript);
    context.logger.info(`Bumping build version using ${scriptPath}`);

    const result = spawnSync(process.execPath, [scriptPath, '--bump'], {
      cwd: workspaceRoot,
      stdio: 'inherit'
    });

    if (result.status !== 0) {
      context.logger.error('Failed to bump build version before the production build.');
      return { success: false };
    }
  }

  const builderRun = await context.scheduleBuilder(delegateBuilder, delegateOptions, {
    target: context.target
  });
  try {
    return await builderRun.result;
  } finally {
    await builderRun.stop();
  }
}

module.exports = createBuilder(runVersionedBrowserBuilder);
