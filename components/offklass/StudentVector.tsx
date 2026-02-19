import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Rect, Path, G } from "react-native-svg";

/**
 * Simple offline “student learning” vector illustration.
 * No external images. Uses react-native-svg.
 */
export default function StudentVector({ height = 260 }: { height?: number }) {
  return (
    <View style={[styles.wrap, { height }]}>
      <Svg width="100%" height="100%" viewBox="0 0 900 420">
        {/* soft background blobs */}
        <Circle cx="160" cy="160" r="110" fill="rgba(47,107,255,0.12)" />
        <Circle cx="740" cy="130" r="140" fill="rgba(6,182,212,0.12)" />
        <Circle cx="720" cy="330" r="120" fill="rgba(255,213,74,0.10)" />

        {/* desk */}
        <Rect x="160" y="305" width="580" height="40" rx="20" fill="rgba(17,24,39,0.12)" />
        <Rect x="190" y="290" width="520" height="34" rx="16" fill="rgba(255,255,255,0.85)" />

        {/* laptop */}
        <Rect x="470" y="240" width="170" height="96" rx="14" fill="rgba(47,107,255,0.20)" />
        <Rect x="485" y="252" width="140" height="70" rx="10" fill="rgba(255,255,255,0.85)" />
        <Rect x="455" y="332" width="200" height="14" rx="7" fill="rgba(17,24,39,0.18)" />

        {/* book */}
        <Rect x="255" y="248" width="140" height="92" rx="14" fill="rgba(6,182,212,0.18)" />
        <Rect x="265" y="258" width="120" height="72" rx="10" fill="rgba(255,255,255,0.85)" />
        <Rect x="315" y="258" width="4" height="72" rx="2" fill="rgba(17,24,39,0.10)" />

        {/* student */}
        <G>
          {/* body */}
          <Path
            d="M410 300c10-40 60-58 90-58s80 18 90 58v35H410v-35z"
            fill="rgba(47,107,255,0.30)"
          />
          {/* head */}
          <Circle cx="500" cy="200" r="42" fill="rgba(255,231,209,0.95)" />
          {/* hair */}
          <Path
            d="M465 198c0-28 25-46 55-46 28 0 48 18 48 42 0 9-3 18-9 26-7-15-21-25-40-25-22 0-39 11-54 29z"
            fill="rgba(17,24,39,0.85)"
          />
          {/* eyes */}
          <Circle cx="487" cy="205" r="4" fill="rgba(17,24,39,0.75)" />
          <Circle cx="514" cy="205" r="4" fill="rgba(17,24,39,0.75)" />
          {/* smile */}
          <Path d="M490 223c8 8 18 8 26 0" stroke="rgba(17,24,39,0.55)" strokeWidth="4" strokeLinecap="round" fill="none" />
          {/* arm */}
          <Path
            d="M440 295c10-22 28-34 55-34h20c-22 8-35 22-44 44l-31-10z"
            fill="rgba(255,231,209,0.95)"
          />
        </G>

        {/* floating “math bubbles” */}
        <G>
          <Circle cx="330" cy="120" r="46" fill="rgba(255,255,255,0.75)" />
          <Path d="M312 120h36" stroke="rgba(47,107,255,0.85)" strokeWidth="6" strokeLinecap="round" />
          <Path d="M330 102v36" stroke="rgba(47,107,255,0.85)" strokeWidth="6" strokeLinecap="round" />

          <Circle cx="610" cy="92" r="50" fill="rgba(255,255,255,0.75)" />
          <Path d="M590 92h40" stroke="rgba(6,182,212,0.85)" strokeWidth="6" strokeLinecap="round" />
          <Path d="M592 76l36 32" stroke="rgba(6,182,212,0.85)" strokeWidth="6" strokeLinecap="round" />

          <Circle cx="700" cy="205" r="44" fill="rgba(255,255,255,0.75)" />
          <Path d="M682 205h36" stroke="rgba(255,193,7,0.95)" strokeWidth="6" strokeLinecap="round" />
          <Path d="M690 190h20M690 220h20" stroke="rgba(255,193,7,0.95)" strokeWidth="6" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
});
