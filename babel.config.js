// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      //"expo-router/babel",
      // If you add Reanimated later, keep this AS THE LAST PLUGIN:
      // "react-native-reanimated/plugin",
    ],
  };
};