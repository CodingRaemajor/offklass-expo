// app.config.ts
import { ExpoConfig, ConfigContext } from "expo/config";
import "dotenv/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Offklass",
  slug: "offklass",
  scheme: "offklass",
  version: "1.0.0",
  orientation: "portrait",
  newArchEnabled: true,
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.parthpatel2005.offklassexpo",
    infoPlist: {
      // 👇 You answered “yes” (standard/exempt only), so set this to false
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.parthpatel2005.offklassexpo",
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#5A52E0",
    },
    edgeToEdgeEnabled: true,
  },
  web: { favicon: "./assets/favicon.png" },
  plugins: ["expo-router", "expo-video", "expo-asset"],
  experiments: { typedRoutes: true, tsconfigPaths: true },
  assetBundlePatterns: ["**/*"],
});