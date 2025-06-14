const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add the following line to disable unstable_enablePackageExports
defaultConfig.resolver.unstable_enablePackageExports = false;

// Add the following line to specify condition names for module resolution
defaultConfig.resolver.unstable_conditionNames = ["browser"];

module.exports = defaultConfig; 