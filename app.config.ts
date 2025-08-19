// app.config.ts
import { ExpoConfig, ConfigContext } from "expo/config";
import "dotenv/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "offklass-expo",
  slug: "offklass-expo",
  scheme: "offklass",
  version: "1.0.0",
  orientation: "portrait",
  newArchEnabled: true,
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash-icon.png",
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
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
  },
  web: { favicon: "./assets/favicon.png" },
  plugins: ["expo-router", "expo-video", "expo-asset"],
  experiments: { typedRoutes: true, tsconfigPaths: true },
  assetBundlePatterns: ["**/*"],
});