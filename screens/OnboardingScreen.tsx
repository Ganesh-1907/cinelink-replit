import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StatusBar,
  Animated,
  SafeAreaView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LiquidPress} from '../components/LiquidPress';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Button} from '../components/ui';
import {useTheme} from '../src/context/ThemeContext';

const {width, height} = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🎬',
    title: 'Welcome to CineLink',
    subtitle: "India's #1 Cinema Network",
    description:
      'Connect with actors, directors, writers and film industry professionals across India.',
    bg: Colors.background,
    accent: Colors.primary,
  },
  {
    id: '2',
    emoji: '🎭',
    title: 'Find Auditions',
    subtitle: 'Your Break Awaits',
    description:
      'Browse hundreds of audition opportunities from top directors and production houses across India.',
    bg: Colors.background,
    accent: Colors.primary,
  },
  {
    id: '3',
    emoji: '🤝',
    title: 'Build Your Network',
    subtitle: 'Connect & Collaborate',
    description:
      'Message directors, join crew teams, and collaborate on short films, web series and more.',
    bg: Colors.background,
    accent: Colors.primary,
  },
  {
    id: '4',
    emoji: '⭐',
    title: 'Showcase Talent',
    subtitle: 'Your Portfolio, Your Story',
    description:
      'Upload your portfolio, acting reels and previous works. Get discovered by top filmmakers.',
    bg: Colors.background,
    accent: Colors.primary,
  },
];

interface OnboardingProps {
  onDone: () => void;
}

export default function OnboardingScreen({onDone}: OnboardingProps) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const isScrolling = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleDone = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    onDone();
  };

  const goNext = () => {
    if (isScrolling.current) return;
    if (currentIndex < SLIDES.length - 1) {
      isScrolling.current = true;
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
      setTimeout(() => { isScrolling.current = false; }, 400);
    } else {
      handleDone();
    }
  };

  const renderSlide = ({item}: any) => (
    <View style={styles.slide}>
      {/* Big emoji icon */}
      <View style={styles.emojiContainer}>
        <View style={[styles.emojiCircle, {borderColor: item.accent}]}>
          <Text style={styles.emoji}>{item.emoji}</Text>
        </View>
        {/* Decorative rings */}
        <View style={[styles.ring1, {borderColor: item.accent + '30'}]} />
        <View style={[styles.ring2, {borderColor: item.accent + '15'}]} />
      </View>

      {/* Text content */}
      <View style={styles.textContent}>
        <Text style={[styles.slideSubtitle, {color: item.accent}]}>
          {item.subtitle}
        </Text>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsRow}>
      {SLIDES.map((_, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={index}
            style={[styles.dot, {width: dotWidth, opacity}]}
          />
        );
      })}
    </View>
  );

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={Colors.background !== '#FFFFFF' ? 'light-content' : 'dark-content'}
        backgroundColor={Colors.background}
      />

      {/* Skip button */}
      {!isLastSlide && (
        <TouchableOpacity
          style={[styles.skipBtn, {top: insets.top + Spacing.sm}]}
          onPress={handleDone}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {x: scrollX}}}],
          {useNativeDriver: false},
        )}
        onMomentumScrollEnd={e => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Bottom section */}
      <View
        style={[
          styles.bottomSection,
          {paddingBottom: insets.bottom + Spacing['3xl']},
        ]}>
        {renderDots()}

        <Button
          label={isLastSlide ? '🚀 Get Started' : 'Next →'}
          onPress={goNext}
          variant="primary"
          size="lg"
          fullWidth
        />

        {isLastSlide && (
          <Text style={styles.termsText}>
            By continuing you agree to CineLink's Terms & Privacy Policy
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},

  skipBtn: {
    position: 'absolute',
    top: 50,
    right: Spacing.screenH,
    zIndex: 10,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  skipText: {...Typography.btn, color: Colors.textSecondary},

  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
  },

  emojiContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['4xl'],
  },

  emojiCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Colors.card,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },

  ring1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
  },

  ring2: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
  },

  emoji: {fontSize: 60},

  textContent: {alignItems: 'center'},

  slideSubtitle: {
    ...Typography.labelSm,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },

  slideTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    fontSize: 30,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 36,
  },

  description: {
    ...Typography.bodyLg,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: Spacing.sm,
  },

  bottomSection: {
    paddingHorizontal: Spacing['3xl'],
    alignItems: 'center',
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
    gap: Spacing.sm,
  },

  dot: {
    height: 8,
    borderRadius: Radius.xs,
    backgroundColor: Colors.primary,
  },

  termsText: {
    ...Typography.micro,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: Spacing.md,
  },
});
