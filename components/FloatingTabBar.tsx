import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Href } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

export interface TabBarItem {
  name: string;
  route: Href;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}

interface FloatingTabBarProps extends Partial<BottomTabBarProps> {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

export default function FloatingTabBar({
  tabs,
  containerWidth = screenWidth * 0.88,
  borderRadius = 35,
  bottomMargin = 20,
  state,
  navigation,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();

  const activeTabIndex = state ? state.index : 0;

  const handleTabPress = (index: number) => {
    console.log('[FloatingTabBar] Tab pressed:', tabs[index]?.label, 'index:', index);
    if (navigation && state) {
      const event = navigation.emit({
        type: 'tabPress',
        target: state.routes[index]?.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) {
        navigation.navigate(state.routes[index]?.name);
      }
    }
  };

  return (
    <View style={[styles.safeArea, { paddingBottom: insets.bottom + bottomMargin }]}>
      <View style={[styles.container, { width: containerWidth, borderRadius }]}>
        {tabs.map((tab, index) => {
          const isActive = activeTabIndex === index;
          return (
            <TouchableOpacity
              key={index}
              style={styles.tab}
              onPress={() => handleTabPress(index)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={tab.icon}
                size={24}
                color={isActive ? '#6F8A6A' : 'rgba(47,62,47,0.35)'}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderWidth: 1,
    borderColor: 'rgba(111, 138, 106, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(47,62,47,0.35)',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#6F8A6A',
    fontFamily: 'Inter_600SemiBold',
  },
});
