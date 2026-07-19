import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors, Spacing, Radius, Shadows, Typography} from '../src/theme';

interface LiquidNavProps {
  navigation: any;
  activeTab: number;
}

const tabs = [
  {key: 'Home', icon: '🏠', label: 'Home'},
  {key: 'Contests', icon: '🏆', label: 'Contests'},
  {key: 'Crew', icon: '🎥', label: 'Crew'},
  {key: 'Discover', icon: '✨', label: 'Discover'},
  {key: 'Profile', icon: '👤', label: 'Profile'},
];

export function LiquidNav({navigation, activeTab}: LiquidNavProps) {
  return (
    <View style={[styles.container, {backgroundColor: Colors.card, borderTopColor: Colors.border}]}>
      {tabs.map((tab, idx) => {
        const isActive = idx === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => navigation.navigate(tab.key)}
            activeOpacity={0.7}>
            <Text style={{fontSize: 22}}>{tab.icon}</Text>
            <Text style={[styles.label, {color: isActive ? (Colors.background === '#0A0A0A' ? Colors.primary : Colors.primaryDark) : Colors.textSecondary}]}>{tab.label}</Text>
            {isActive && <View style={[styles.indicator, {backgroundColor: Colors.primary}]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flexDirection: 'row', borderTopWidth: 1, paddingTop: Spacing.sm, paddingBottom: Spacing.xs + 8, ...Shadows.sm},
  tab: {flex: 1, alignItems: 'center', gap: 2, position: 'relative'},
  activeTab: {},
  label: {fontSize: 10, fontWeight: '600'},
  indicator: {width: 6, height: 6, borderRadius: 3, marginTop: 2},
});
