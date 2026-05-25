const path = require('path');
const { getConfig } = require('react-native-builder-bob/babel-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

const baseConfig = getConfig(
  {
    presets: ['module:@react-native/babel-preset'],
  },
  { root, pkg }
);

module.exports = {
  ...baseConfig,
  plugins: [...(baseConfig.plugins ?? []), 'react-native-worklets/plugin'],
};
