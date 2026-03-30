const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const packageName = packageJson.name;

if (!packageName) {
  throw new Error('Package name is missing from package.json.');
}

const nodeModulesDir = path.join(rootDir, 'node_modules');
if (!fs.existsSync(nodeModulesDir)) {
  console.log('Skipping self builder link creation because node_modules was not found.');
  process.exit(0);
}

const linkPath = path.join(nodeModulesDir, packageName);
const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';

try {
  if (fs.existsSync(linkPath)) {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      const currentTarget = fs.realpathSync.native(linkPath);
      const expectedTarget = fs.realpathSync.native(rootDir);
      if (currentTarget === expectedTarget) {
        console.log(`Self builder link already exists: ${linkPath}`);
        process.exit(0);
      }
    }

    fs.rmSync(linkPath, { recursive: true, force: true });
  }

  fs.symlinkSync(rootDir, linkPath, symlinkType);
  console.log(`Created self builder link: ${linkPath} -> ${rootDir}`);
} catch (error) {
  console.error('Failed to create the self builder link.');
  throw error;
}
