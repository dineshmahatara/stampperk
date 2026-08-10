const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Keep Metro rooted on the mobile app (not the monorepo root).
config.projectRoot = projectRoot;
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.blockList = [
  /.*[/\\]apps[/\\]web[/\\]\.next[/\\].*/,
  /.*[/\\]apps[/\\]api[/\\]dist[/\\].*/,
  /.*[/\\]apps[/\\]api[/\\]prisma[/\\]dev\.db.*/,
];

module.exports = config;
