const path = require('path');
const {getDefaultConfig} = require('@react-native/metro-config');
const {withMetroConfig} = require('react-native-monorepo-config');

const root = path.resolve(__dirname, '..');

const config = withMetroConfig(getDefaultConfig(__dirname), {
  root,
  dirname: __dirname,
});

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@react-native-clipboard/clipboard': require.resolve('./clipboard-stub'),
};

module.exports = config;
