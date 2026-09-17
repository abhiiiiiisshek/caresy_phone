const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Metro only watches projectRoot by default; the npm workspace deps
// (@caresy/types, @caresy/utils) live outside it, at the monorepo root.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Without this, Metro's hierarchical lookup can resolve a hoisted package
// to the wrong workspace member in an npm workspaces monorepo.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
