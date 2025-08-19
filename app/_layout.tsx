import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../lib/colors";

/**
 * Root layout:
 * - Pushes content below the notch (iOS) with SafeAreaView (top/left/right).
 * - Provides gesture handler root.
 * - Sets a consistent background color for all screens.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: Colors.bg }}
          edges={["top", "left", "right"]}
        >
          <Slot />
        </SafeAreaView>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}