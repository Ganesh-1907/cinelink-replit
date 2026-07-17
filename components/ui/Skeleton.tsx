import React, {useEffect, useRef} from 'react';
import {Animated, View, StyleSheet, ViewStyle} from 'react-native';
import {Colors, Radius, Spacing} from '../../src/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius,
  style,
}: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.65,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.3,
          duration: 850,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: borderRadius ?? Radius.sm,
          backgroundColor: Colors.cardElevated,
          opacity: shimmer,
        },
        style,
      ]}
    />
  );
}

// ─── Pre-built skeleton layouts ───────────────────────────────────────────────

export function SkeletonCard({style}: {style?: ViewStyle}) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={{flex: 1, gap: Spacing.xs}}>
          <Skeleton width="55%" height={14} />
          <Skeleton width="35%" height={12} />
        </View>
      </View>
      <Skeleton
        height={160}
        borderRadius={Radius.md}
        style={{marginVertical: Spacing.md}}
      />
      <Skeleton height={40} borderRadius={Radius.md} />
    </View>
  );
}

export function SkeletonListItem({style}: {style?: ViewStyle}) {
  return (
    <View style={[styles.listItem, style]}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={{flex: 1, gap: Spacing.xs}}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}

export function SkeletonText({
  lines = 3,
  style,
}: {
  lines?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[{gap: Spacing.sm}, style]}>
      {Array.from({length: lines}).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height={13}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.screenH,
  },
});

export default Skeleton;
