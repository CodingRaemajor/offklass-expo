import { useEffect } from "react";
import { router } from "expo-router";
import { loadJSON, ONBOARD_KEY, OnboardingData } from "../lib/storage";

export default function Index() {
  useEffect(() => {
    (async () => {
      const data = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      router.replace(data ? "/tabs/home" : "/onboarding");
    })();
  }, []);

  return null; // nothing to render; we redirect once the decision is made
}