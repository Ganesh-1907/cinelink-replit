import React, {useState} from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Spacing, Radius, HitSlop} from '../src/theme';

const {width, height} = Dimensions.get('window');

export default function ImageViewerScreen({route, navigation}: any) {
  const {imageUrl} = route.params;
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />

      <TouchableOpacity
        style={[styles.closeBtn, {top: insets.top + Spacing.lg}]}
        onPress={() => navigation.goBack()}
        hitSlop={HitSlop.md}
        accessibilityLabel="Close image">
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      {loading && (
        <ActivityIndicator
          color={Colors.primary}
          size="large"
          style={styles.loader}
        />
      )}

      <Image
        source={{uri: imageUrl}}
        style={styles.image}
        resizeMode="contain"
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width,
    height,
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.screenH,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loader: {
    position: 'absolute',
    zIndex: 5,
  },
});
