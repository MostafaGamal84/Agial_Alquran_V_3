const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const buildVersionTsPath = path.join(rootDir, 'src', 'environments', 'build-version.ts');
const buildVersionJsonPath = path.join(rootDir, 'src', 'assets', 'app-version.json');
const shouldBumpVersion = process.argv.includes('--bump');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

function normalizeVersion(version) {
  const segments = String(version || '1.0.0')
    .split('.')
    .map((segment) => Number.parseInt(segment, 10))
    .filter((segment) => Number.isFinite(segment));

  while (segments.length < 3) {
    segments.push(0);
  }

  return segments.slice(0, 3);
}

function incrementVersion(version) {
  const [majorStart, minorStart, patchStart] = normalizeVersion(version);
  let major = majorStart;
  let minor = minorStart;
  let patch = patchStart + 1;

  if (patch > 9) {
    patch = 0;
    minor += 1;
  }

  if (minor > 9) {
    minor = 0;
    major += 1;
  }

  return `${major}.${minor}.${patch}`;
}

if (shouldBumpVersion) {
  packageJson.version = incrementVersion(packageJson.version);
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
}

const buildTime = new Date().toISOString();
const currentVersion = packageJson.version || '1.0.0';
const buildVersion = {
  version: currentVersion,
  buildId: currentVersion,
  buildTime
};

const buildVersionTs = `export const buildVersion = ${JSON.stringify(buildVersion, null, 2)} as const;\n`;
const buildVersionJson = `${JSON.stringify(buildVersion, null, 2)}\n`;

fs.mkdirSync(path.dirname(buildVersionTsPath), { recursive: true });
fs.mkdirSync(path.dirname(buildVersionJsonPath), { recursive: true });

fs.writeFileSync(buildVersionTsPath, buildVersionTs, 'utf8');
fs.writeFileSync(buildVersionJsonPath, buildVersionJson, 'utf8');

console.log(`Build version updated: ${buildVersion.version}`);
