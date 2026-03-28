const appJson = require("./app.json");

const IOS_CLIENT_ID_SUFFIX = ".apps.googleusercontent.com";

function getIosUrlScheme() {
  const iosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

  if (!iosClientId || !iosClientId.endsWith(IOS_CLIENT_ID_SUFFIX)) {
    return null;
  }

  const clientPrefix = iosClientId.slice(0, -IOS_CLIENT_ID_SUFFIX.length);
  return `com.googleusercontent.apps.${clientPrefix}`;
}

module.exports = () => {
  const expoConfig = appJson.expo;
  const iosUrlScheme = getIosUrlScheme();

  const pluginsWithoutGoogle = (expoConfig.plugins || []).filter((plugin) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
    return pluginName !== "@react-native-google-signin/google-signin";
  });

  const plugins = iosUrlScheme
    ? [
        ...pluginsWithoutGoogle,
        ["@react-native-google-signin/google-signin", { iosUrlScheme }],
      ]
    : [...pluginsWithoutGoogle, "@react-native-google-signin/google-signin"];

  return {
    ...expoConfig,
    plugins,
  };
};
