import React, { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import FloatingTabBar, { TabBarItem } from "@/components/FloatingTabBar";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { useAppState } from "@/contexts/AppStateContext";

const TABS: TabBarItem[] = [
  { name: "(home)", route: "/(tabs)/(home)", icon: "home", label: "Home" },
  { name: "(design)", route: "/(tabs)/(design)", icon: "auto-awesome", label: "My Design" },
  { name: "(journey)", route: "/(tabs)/(journey)", icon: "schedule", label: "Journey" },
  { name: "(profile)", route: "/(tabs)/(profile)", icon: "person", label: "Profile" },
];

export default function TabLayout() {
  useSubscriptionGuard();
  const router = useRouter();
  const { appState, isLoading } = useAppState();

  useEffect(() => {
    if (isLoading) return;
    if (!appState.revealViewed) {
      console.log("[TabLayout] revealViewed=false — guarding tabs access");
      if (appState.revealUnlocked) {
        console.log("[TabLayout] revealUnlocked=true — redirecting to /reveal");
        router.replace("/reveal");
      } else if (appState.quizCompleted) {
        console.log("[TabLayout] quizCompleted=true but not unlocked — redirecting to /partial-reveal");
        router.replace("/partial-reveal");
      } else {
        const resumeStep = appState.currentOnboardingStep || "/onboarding/welcome";
        console.log("[TabLayout] Quiz not complete — resuming onboarding at:", resumeStep);
        router.replace(resumeStep as any);
      }
    }
  }, [appState.revealViewed, appState.revealUnlocked, appState.quizCompleted, appState.currentOnboardingStep, isLoading, router]);

  return (
    <Tabs
      initialRouteName="(home)"
      tabBar={(props) => <FloatingTabBar tabs={TABS} {...props} />}
      screenOptions={{ headerShown: false }}
      sceneContainerStyle={{ backgroundColor: "transparent" }}
    >
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="(design)" />
      <Tabs.Screen name="(journey)" />
      <Tabs.Screen name="(profile)" />
    </Tabs>
  );
}
