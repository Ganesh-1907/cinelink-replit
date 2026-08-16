import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Animated} from 'react-native';
import {Card} from '../components/ui';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {useTheme} from '../src/context/ThemeContext';

interface CompletionItem {
  label: string;
  done: boolean;
  emoji: string;
  points: number;
}

interface Props {
  name: string;
  phone: string;
  bio: string;
  photoUrl: string;
  role: string;
  portfolioPhotos: string[];
  introVideoLink: string;
  portfolio1: string;
  onItemPress?: () => void;
}

export default function ProfileCompletionCard({
  name,
  phone,
  bio,
  photoUrl,
  role,
  portfolioPhotos,
  introVideoLink,
  portfolio1,
  onItemPress,
}: Props) {
  const {isDark} = useTheme();
  const items: CompletionItem[] = [
    {
      label: 'Add your full name',
      emoji: '👤',
      done: !!name?.trim(),
      points: 20,
    },
    {label: 'Add profile photo', emoji: '📸', done: !!photoUrl, points: 20},
    {label: 'Write your bio', emoji: '✍️', done: !!bio?.trim(), points: 15},
    {label: 'Add phone number', emoji: '📱', done: !!phone?.trim(), points: 15},
    {
      label: 'Select your role',
      emoji: '🎭',
      done: !!role && role !== '',
      points: 10,
    },
    {
      label: 'Add portfolio photos',
      emoji: '🖼️',
      done: portfolioPhotos?.length > 0,
      points: 10,
    },
    {
      label: 'Add intro video link',
      emoji: '🎬',
      done: !!introVideoLink?.trim(),
      points: 5,
    },
    {
      label: 'Add previous works',
      emoji: '🔗',
      done: !!portfolio1?.trim(),
      points: 5,
    },
  ];

  const totalPoints = items.reduce((sum, i) => sum + i.points, 0);
  const earnedPoints = items
    .filter(i => i.done)
    .reduce((sum, i) => sum + i.points, 0);
  const percent = Math.round((earnedPoints / totalPoints) * 100);

  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: percent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const pending = items.filter(i => !i.done);

  const getColor = () => {
    if (percent >= 80) {
      return Colors.success;
    }
    if (percent >= 50) {
      return Colors.warning;
    }
    return Colors.primary;
  };

  const getMessage = () => {
    if (percent === 100) {
      return "🌟 Perfect profile! You're all set!";
    }
    if (percent >= 80) {
      return '🔥 Almost there! Just a few more steps.';
    }
    if (percent >= 50) {
      return '💪 Good progress! Keep going.';
    }
    return '🚀 Complete your profile to get discovered!';
  };

  if (percent === 100) {
    return (
      <View style={styles.completeContainer}>
        <View style={styles.completeInner}>
          <Text style={styles.completeEmoji}>🌟</Text>
          <Text style={styles.completeTitle}>Profile Complete!</Text>
          <Text style={styles.completeSub}>
            You're fully set up to get discovered
          </Text>
        </View>
      </View>
    );
  }

  const barColor = getColor();

  return (
    <View style={styles.completionContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Profile Strength</Text>
          <Text style={styles.message}>{getMessage()}</Text>
        </View>
        <View
          style={[
            styles.percentBadge,
            {backgroundColor: barColor + '20', borderColor: barColor},
          ]}>
          <Text style={[styles.percentText, {color: barColor}]}>
            {percent}%
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.barBackground}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: animWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: barColor,
            },
          ]}
        />
      </View>

      <Text style={styles.pendingLabel}>
        {pending.length} item{pending.length !== 1 ? 's' : ''} remaining:
      </Text>

      {/* Pending items */}
      <View style={styles.itemsList}>
        {pending.slice(0, 4).map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.item}
            onPress={onItemPress}
            activeOpacity={0.7}>
            <Text style={styles.itemEmoji}>{item.emoji}</Text>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>+{item.points}%</Text>
            </View>
          </TouchableOpacity>
        ))}
        {pending.length > 4 && (
          <Text style={styles.moreText}>+{pending.length - 4} more items</Text>
        )}
      </View>

      {/* Completed items preview */}
      <View style={styles.doneRow}>
        {items
          .filter(i => i.done)
          .map((item, i) => (
            <View key={i} style={styles.doneChip}>
              <Text style={styles.doneEmoji}>{item.emoji}</Text>
              <Text style={styles.doneCheck}>✓</Text>
            </View>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  completeContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  completionContainer: {
    paddingVertical: Spacing.md,
  },
  completeInner: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  completeEmoji: {fontSize: 40, marginBottom: Spacing.sm},
  completeTitle: {
    ...Typography.h3,
    color: Colors.success,
    marginBottom: Spacing.xs,
  },
  completeSub: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  headerText: {flex: 1, marginRight: Spacing.sm},
  title: {
    ...Typography.label,
    color: Colors.textPrimary,
    fontSize: 16,
    marginBottom: Spacing.xs,
  },
  message: {
    ...Typography.caption,
    color: Colors.textSecondary,
    maxWidth: '90%',
  },

  percentBadge: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minWidth: 52,
    alignItems: 'center',
  },
  percentText: {fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary},

  barBackground: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.xs,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  barFill: {height: '100%', borderRadius: Radius.xs},

  pendingLabel: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  itemsList: {gap: Spacing.sm, marginBottom: Spacing.md},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  itemEmoji: {fontSize: 18},
  itemLabel: {flex: 1, ...Typography.body, color: Colors.textPrimary},
  pointsBadge: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  pointsText: {...Typography.micro, color: Colors.primary},

  doneRow: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs},
  doneChip: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  doneEmoji: {fontSize: 12},
  doneCheck: {...Typography.captionBold, color: Colors.success},

  moreText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
