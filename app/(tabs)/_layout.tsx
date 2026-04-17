import React from "react";
import { Tabs } from "expo-router";
import FloatingTabBar, { TabBarItem } from "@/components/FloatingTabBar";

const TABS: TabBarItem[] = [
  { name: "(design)", route: "/(tabs)/(design)", icon: "auto-awesome", label: "Know Your Design" },
  { name: "(journey)", route: "/(tabs)/(journey)", icon: "schedule", label: "Journey" },
];

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => (
        <FloatingTabBar
          tabs={TABS}
          containerWidth={320}
        />
      )}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="(design)" />
      <Tabs.Screen name="(journey)" />
    </Tabs>
  );
}
