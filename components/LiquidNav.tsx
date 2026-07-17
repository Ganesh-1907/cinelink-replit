import React, {useRef, useEffect} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Spacing, Radius, Typography} from '../src/theme';

const SCREEN_W = Dimensions.get('window').width;

const TABS = [
  {icon: '⊞', label: 'Home', screen: 'Home', emoji: '🏠'},
  {icon: '🏆', label: 'Contests', screen: 'Contests', emoji: '🏆'},
  {icon: '🎥', label: 'Crew', screen: 'Crew', emoji: '🎥'},
  {icon: '✦', label: 'Discover', screen: 'Discover', emoji: '✨'},
  {icon: '◉', label: 'Profile', screen: 'Profile', emoji: '👤'},
];

const TAB_W = SCREEN_W / TABS.length;

interface LiquidNavProps {
  navigation: any;
  activeTab: number;
}

export function LiquidNav({navigation, activeTab}: LiquidNavProps) {
  const insets = useSafeAreaInsets();
  const indicatorX = useRef(new Animated.Value(activeTab * TAB_W)).current;
  const scaleAnims = useRef(TABS.map(() => new Animated.Value(1))).current;
  const opacityAnims = useRef(TABS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Slide indicator
    Animated.spring(indicatorX, {
      toValue: activeTab * TAB_W + (TAB_W - 32) / 2,
      useNativeDriver: true,
      speed: 18,
      bounciness: 8,
    }).start();

    // Scale active tab icon up, others down
    TABS.forEach((_, i) => {
      Animated.parallel([
        Animated.spring(scaleAnims[i], {
          toValue: i === activeTab ? 1.15 : 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 6,
        }),
        Animated.timing(opacityAnims[i], {
          toValue: i === activeTab ? 1 : 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [activeTab]);

  return (
    <View
      style={[styles.container, {paddingBottom: Math.max(insets.bottom, 8)}]}>
      {/* Sliding indicator pill */}
      <Animated.View
        style={[styles.indicator, {transform: [{translateX: indicatorX}]}]}
      />

      {TABS.map((tab, i) => {
        const isActive = activeTab === i;
        return (
          <TouchableOpacity
            key={tab.screen}
            onPress={() => navigation.navigate(tab.screen)}
            activeOpacity={0.75}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{selected: isActive}}>
            <Animated.View
              style={[styles.iconWrap, {transform: [{scale: scaleAnims[i]}]}]}>
              <Text style={[styles.emoji, isActive && styles.emojiActive]}>
                {tab.emoji}
              </Text>
            </Animated.View>

            <Animated.Text
              style={[
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
                {opacity: isActive ? opacityAnims[i] : 1},
              ]}>
              {tab.label}
            </Animated.Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.primaryMid,
    paddingTop: Spacing.sm,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 32,
    height: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    gap: 2,
    minHeight: 48,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
    opacity: 0.5,
  },
  emojiActive: {
    opacity: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  labelInactive: {
    color: Colors.textTertiary,
  },
});

export default LiquidNav;
