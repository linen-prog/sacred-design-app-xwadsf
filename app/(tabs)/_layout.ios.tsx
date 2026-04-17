import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs
      tabBarActiveTintColor="#6F8A6A"
      tabBarInactiveTintColor="rgba(47,62,47,0.35)"
      tabBarStyle={{ backgroundColor: "#F6F1E8" }}
    >
      <NativeTabs.Trigger name="(home)">
        <Icon sf="house" />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(design)">
        <Icon sf="sparkles" />
        <Label>My Design</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(journey)">
        <Icon sf="clock" />
        <Label>Journey</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
