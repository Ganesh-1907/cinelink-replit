import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import {Colors, Typography, Radius} from '../../src/theme';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: AvatarSize;
  /** Show rose gold ring */
  ring?: boolean;
  ringColor?: string;
  /** Green online dot */
  online?: boolean;
  /** Blue tick verified badge */
  verified?: boolean;
  premium?: boolean;
}

const SIZE_MAP: Record<string, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 60,
  xl: 80,
};

function resolveSize(size: AvatarSize): number {
  return typeof size === 'number' ? size : SIZE_MAP[size] ?? 48;
}

function initials(name?: string | null): string {
  if (!name) {
    return '?';
  }
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0][0]?.toUpperCase() || '?';
  }
  return (
    (parts[0][0] || '') + (parts[parts.length - 1][0] || '')
  ).toUpperCase();
}

export function Avatar({
  uri,
  name,
  size = 'md',
  ring = false,
  ringColor,
  online = false,
  verified = false,
  premium = false,
}: AvatarProps) {
  const sz = resolveSize(size);
  const radius = sz / 2;
  const ringW = ring ? 2 : 0;
  const rColor = ringColor ?? Colors.primary;
  const outerSize = sz + ringW * 2 + (ring ? 4 : 0);

  return (
    <View style={{width: outerSize, height: outerSize, position: 'relative'}}>
      {/* Ring */}
      {ring && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: outerSize / 2,
            borderWidth: 2,
            borderColor: rColor,
          }}
        />
      )}

      {/* Image or initials */}
      <View
        style={{
          width: sz,
          height: sz,
          borderRadius: radius,
          backgroundColor: Colors.primaryFaint,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          margin: ring ? ringW + 2 : 0,
        }}>
        {uri ? (
          <Image
            source={{uri}}
            style={{width: sz, height: sz, borderRadius: radius}}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={{
              color: Colors.primary,
              fontSize: sz * 0.38,
              fontWeight: '700',
            }}>
            {initials(name)}
          </Text>
        )}
      </View>

      {/* Online indicator */}
      {online && (
        <View
          style={[
            styles.dot,
            {
              width: Math.max(10, sz * 0.22),
              height: Math.max(10, sz * 0.22),
              borderRadius: sz * 0.11,
              backgroundColor: Colors.success,
              bottom: ring ? ringW : 0,
              right: ring ? ringW : 0,
            },
          ]}
        />
      )}

      {/* Verified badge */}
      {verified && !online && (
        <View
          style={[
            styles.dot,
            {
              width: Math.max(14, sz * 0.28),
              height: Math.max(14, sz * 0.28),
              borderRadius: sz * 0.14,
              backgroundColor: Colors.info,
              bottom: ring ? ringW : 0,
              right: ring ? ringW : 0,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}>
          <Text style={{color: '#fff', fontSize: sz * 0.14, fontWeight: '800'}}>
            ✓
          </Text>
        </View>
      )}

      {/* Premium crown */}
      {premium && !verified && !online && (
        <View
          style={[
            styles.dot,
            {
              width: Math.max(14, sz * 0.28),
              height: Math.max(14, sz * 0.28),
              borderRadius: sz * 0.14,
              backgroundColor: Colors.primary,
              bottom: ring ? ringW : 0,
              right: ring ? ringW : 0,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}>
          <Text style={{fontSize: sz * 0.13}}>👑</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.background,
  },
});

export default Avatar;
