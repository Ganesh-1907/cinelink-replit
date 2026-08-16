import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import api from '../src/api/client';
import Video from 'react-native-video';
import {uploadVideo} from '../src/services/uploadService';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Button, Header, Input} from '../components/ui';
import {useApp} from '../src/context/AppContext';
import {useTheme} from '../src/context/ThemeContext';

const MAX_DURATION = 90;

export default function UploadReelsScreen({navigation}: any) {
  const {isDark} = useTheme();
  const {user: currentUser} = useApp();
  const [videoUri, setVideoUri] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoSelected, setVideoSelected] = useState(false);

  /* ── PICK VIDEO ── */
  const pickVideo = async () => {
    const result = await launchImageLibrary({
      mediaType: 'video',
      videoQuality: 'medium',
    });
    if (result.assets && result.assets[0]?.uri) {
      setVideoUri(result.assets[0].uri);
      setVideoSelected(true);
      setVideoDuration(0);
    }
  };

  /* ── UPLOAD REEL ── */
  const uploadReel = async () => {
    if (!videoUri) {
      Alert.alert('Missing Video', 'Please select a video first.');
      return;
    }
    if (videoDuration > MAX_DURATION) {
      Alert.alert(
        'Video Too Long',
        `Maximum is 90 seconds. Your video is ${Math.floor(videoDuration)}s.`,
      );
      return;
    }
    if (!caption.trim()) {
      Alert.alert('Missing Caption', 'Please add a caption.');
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      /* Upload video to R2 */
      const result = await uploadVideo(videoUri);
      setUploading(false);

      /* Get user profile from backend */
      const profileRes = await api.get<any>('/users/profile');
      const userData = profileRes?.user || {};

      const creatorName =
        userData.fullName ||
        userData.displayName ||
        userData.name ||
        currentUser?.displayName ||
        currentUser?.email?.split('@')[0] ||
        'Creator';

      const creatorAvatar =
        userData.photoUrl || userData.photoURL || currentUser?.photoURL || '';

      await api.post('/reels', {
        videoUrl: result.secureUrl,
        creatorName,
        creatorAvatar,
        caption: caption.trim(),
      });

      Alert.alert('Success! 🎬', 'Your reel has been uploaded.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e) {
      console.log('Upload error:', e);
      Alert.alert('Error', 'Failed to upload reel. Try again.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const isDisabled = !videoSelected || videoDuration > MAX_DURATION || loading;

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: Colors.background}]}>
      <Header
        title="Upload Reel"
        navigation={navigation}
        onBack={() => navigation.goBack()}
      />
      <ScrollView style={[styles.container, {backgroundColor: Colors.background}]} keyboardShouldPersistTaps="handled">
        {/* VIDEO PICKER / PREVIEW */}
        {videoSelected ? (
          <View style={styles.videoContainer}>
            <Video
              source={{uri: videoUri}}
              style={styles.video}
              resizeMode="cover"
              paused
              controls
              onLoad={data => setVideoDuration(data.duration)}
            />

            {/* DURATION */}
            <View style={styles.durationRow}>
              <Text style={styles.durationLabel}>Duration:</Text>
              <Text
                style={[
                  styles.durationValue,
                  videoDuration > MAX_DURATION && styles.durationError,
                ]}>
                {Math.floor(videoDuration)}s / {MAX_DURATION}s max
              </Text>
            </View>

            <TouchableOpacity style={styles.changeBtn} onPress={pickVideo}>
              <Text style={styles.changeBtnText}>🔄 Change Video</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.picker} onPress={pickVideo}>
            <Text style={styles.pickerIcon}>🎬</Text>
            <Text style={styles.pickerText}>Tap to select video</Text>
            <Text style={styles.pickerSub}>
              Max 90 seconds · MP4 recommended
            </Text>
          </TouchableOpacity>
        )}

        {/* TOO LONG WARNING */}
        {videoSelected && videoDuration > MAX_DURATION && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              ⚠️ Video too long! Maximum is 90 seconds.
            </Text>
          </View>
        )}

        {/* CAPTION */}
        <Input
          label="Caption"
          required
          value={caption}
          onChangeText={setCaption}
          placeholder="Add a caption... #cinema #acting"
          multiline
          hint={`${caption.length}/300`}
        />

        {/* UPLOAD BUTTON */}
        <Button
          label={
            uploading
              ? 'Uploading video...'
              : loading
              ? 'Saving...'
              : '🎬  Upload Reel'
          }
          onPress={uploadReel}
          variant="primary"
          size="lg"
          fullWidth
          disabled={isDisabled}
          loading={loading}
        />

        {/* TIPS */}
        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>💡 Tips for better reels</Text>
          <Text style={styles.tipsItem}>
            • Keep videos under 60s for best engagement
          </Text>
          <Text style={styles.tipsItem}>
            • Good lighting makes a huge difference
          </Text>
          <Text style={styles.tipsItem}>
            • Add relevant hashtags in caption
          </Text>
          <Text style={styles.tipsItem}>
            • Vertical videos (9:16) look best
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },

  videoContainer: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  video: {width: '100%', height: 320},

  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  durationLabel: {...Typography.label, color: Colors.textSecondary},
  durationValue: {...Typography.label, color: Colors.primary},
  durationError: {color: Colors.error},

  changeBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  changeBtnText: {...Typography.label, color: Colors.primary},

  picker: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.lg,
    paddingVertical: 60,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  pickerIcon: {fontSize: 60, marginBottom: Spacing.lg},
  pickerText: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  pickerSub: {...Typography.caption, color: Colors.textSecondary},

  errorBox: {
    backgroundColor: Colors.errorFaint,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    marginBottom: Spacing.lg,
  },
  errorText: {...Typography.bodySm, color: Colors.error},

  tipsBox: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tipsTitle: {
    ...Typography.label,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  tipsItem: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
});
