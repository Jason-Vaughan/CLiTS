#!/usr/bin/env node

/**
 * Build script for creating a release package
 * Usage: node scripts/build-release.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read package.json to get version
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;

console.log(`Building release for version ${version}...`);

try {
  // Clean up
  console.log('Cleaning up previous builds...');
  if (fs.existsSync(path.join(rootDir, 'dist'))) {
    execSync('rm -rf dist', { cwd: rootDir, stdio: 'inherit' });
  }

  // Run linter
  console.log('Running linter...');
  execSync('npm run lint', { cwd: rootDir, stdio: 'inherit' });

  // Run tests
  console.log('Running tests...');
  execSync('npm test', { cwd: rootDir, stdio: 'inherit' });

  // Build the project
  console.log('Building project...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

  // Create package
  console.log('Creating package...');
  execSync('npm pack', { cwd: rootDir, stdio: 'inherit' });

  console.log(`Release package created: clits-${version}.tgz`);
  console.log('To install globally:');
  console.log(`npm install -g clits-${version}.tgz`);
  console.log('\nTo publish to npm:');
  console.log('npm publish');

} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 