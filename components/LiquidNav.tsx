import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Spacing, Shadows} from '../src/theme';
import {useTheme} from '../src/context/ThemeContext';

interface LiquidNavProps {
  navigation: any;
  activeRouteName: string;
}

const tabs = [
  {key: 'Home', icon: '🏠', label: 'Home'},
  {key: 'Crew', icon: '🎥', label: 'Crew'},
  {key: 'Discover', icon: '✨', label: 'Discover'},
  {key: 'Messages', icon: '💬', label: 'Chats'},
  {key: 'Profile', icon: '👤', label: 'Profile'},
];

export function LiquidNav({navigation, activeRouteName}: LiquidNavProps) {
  const insets = useSafeAreaInsets();
  const {mode} = useTheme(); // Subscribes to theme changes for instant UI update!

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          paddingBottom: Spacing.xs + 8 + insets.bottom,
        },
      ]}>
      {tabs.map((tab, idx) => {
        const isActive = tab.key === activeRouteName;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => navigation.navigate(tab.key)}
            activeOpacity={0.7}>
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text
              style={[
                styles.label,
                {
                  color: isActive
                    ? Colors.background !== '#FFFFFF'
                      ? Colors.primary
                      : Colors.primaryDark
                    : Colors.textSecondary,
                },
              ]}>
              {tab.label}
            </Text>
            {isActive && (
              <View
                style={[styles.indicator, {backgroundColor: Colors.primary}]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    ...Shadows.sm,
  },
  tab: {flex: 1, alignItems: 'center', gap: 2, position: 'relative'},
  activeTab: {},
  tabIcon: {fontSize: 19},
  label: {fontSize: 10, fontWeight: '600'},
  indicator: {width: 6, height: 6, borderRadius: 3, marginTop: 2},
});
