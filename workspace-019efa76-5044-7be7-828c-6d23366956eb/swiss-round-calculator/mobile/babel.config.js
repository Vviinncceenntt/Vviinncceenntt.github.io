module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-worklets/plugin enables worklets used by
      // react-native-reanimated v4 and react-native-gesture-handler.
      // (In Reanimated 3 the plugin lived inside
      //  react-native-reanimated/plugin; v4 moved it to the standalone
      //  react-native-worklets package, which Expo SDK 54 pins to
      //  0.5.1 in bundledNativeModules.json.)
      // MUST be listed LAST.
      'react-native-worklets/plugin',
    ],
  };
};
