import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {launchImageLibrary} from 'react-native-image-picker';
import auth from '@react-native-firebase/auth';
import api from '../src/api/client';
import {uploadImage, uploadVideo} from '../src/services/uploadService';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Input, Button, Chip, Card, EmptyState} from '../components/ui';

const GENRES = [
  'Drama',
  'Action',
  'Romance',
  'Comedy',
  'Thriller',
  'Sci-Fi',
  'Horror',
  'Documentary',
];

export default function UploadFilmScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('Drama');
  const [duration, setDuration] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [uploadType, setUploadType] = useState<'link' | 'file'>('link');
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const user = auth().currentUser;

  const pickPoster = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets && result.assets[0]?.uri) {
      const uri = result.assets[0].uri!;
      setPosterUri(uri);
      setPosterUrl(null);
      setUploadingPoster(true);
      try {
        const res = await uploadImage(uri);
        setPosterUrl(res.secureUrl);
      } catch {
        Alert.alert('Error', 'Poster upload failed.');
      } finally {
        setUploadingPoster(false);
      }
    }
  };

  const pickVideo = async () => {
    const result = await launchImageLibrary({
      mediaType: 'video',
      videoQuality: 'medium',
    });
    if (result.assets && result.assets[0]?.uri) {
      const uri = result.assets[0].uri!;
      setVideoUrl(null);
      setUploadingVideo(true);
      try {
        const res = await uploadVideo(uri);
        setVideoUrl(res.secureUrl);
      } catch {
        Alert.alert('Error', 'Video upload failed.');
      } finally {
        setUploadingVideo(false);
      }
    }
  };

  const uploadFilm = async () => {
    if (!title.trim() || !description.trim() || !duration.trim()) {
      Alert.alert(
        'Missing Info',
        'Please fill in Title, Description and Duration.',
      );
      return;
    }
    if (uploadType === 'link' && !videoLink.trim()) {
      Alert.alert('Missing Link', 'Please paste your video link.');
      return;
    }
    if (uploadType === 'file' && !videoUrl) {
      Alert.alert('Missing Video', 'Please upload a video file first.');
      return;
    }
    if (uploadingPoster || uploadingVideo) {
      Alert.alert('Please Wait', 'Files are still uploading...');
      return;
    }
    setLoading(true);
    try {
      await api.post('/films', {
        title: title.trim(),
        description: description.trim(),
        genre,
        duration: duration.trim(),
        posterUrl: posterUrl || '',
        videoLink: uploadType === 'link' ? videoLink.trim() : '',
        videoUrl: uploadType === 'file' ? videoUrl : '',
      });
      Alert.alert('Success! 🎬', 'Your short film has been uploaded.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch {
      Alert.alert('Error', 'Something went wrong. Try again!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: Colors.background}]}>
      <StatusBar
        barStyle={Colors.background === '#0A0A0A' ? 'light-content' : 'dark-content'}
        backgroundColor={Colors.background}
      />
      <Header title="Upload Short Film" navigation={navigation} />
      <ScrollView
        style={[styles.container, {backgroundColor: Colors.background}]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{paddingBottom: insets.bottom + Spacing['5xl']}}>
        <View style={styles.body}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.posterPicker}
            onPress={pickPoster}>
            {posterUri ? (
              <>
                <Image source={{uri: posterUri}} style={styles.posterImage} />
                {uploadingPoster && (
                  <View style={styles.overlay}>
                    <ActivityIndicator color={Colors.textInverse} />
                    <Text style={styles.overlayText}>Uploading poster...</Text>
                  </View>
                )}
                {posterUrl && !uploadingPoster && (
                  <View style={styles.doneBadge}>
                    <Text style={styles.doneBadgeText}>✅ Uploaded</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.posterEmpty}>
                <Text style={styles.posterIcon}>🎬</Text>
                <Text style={styles.posterEmptyText}>Tap to add poster</Text>
                <Text style={styles.posterEmptySub}>
                  Recommended: 16:9 image
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Input
            label="Film Title *"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Oka Chinna Katha"
          />

          <Input
            label="Description *"
            value={description}
            onChangeText={setDescription}
            placeholder="What is your film about? Cast, story, theme..."
            multiline
            numberOfLines={4}
          />

          <Input
            label="Duration (minutes) *"
            value={duration}
            onChangeText={setDuration}
            placeholder="e.g. 18"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Genre</Text>
          <View style={styles.genreGrid}>
            {GENRES.map(g => (
              <Chip
                key={g}
                label={g}
                selected={genre === g}
                onPress={() => setGenre(g)}
              />
            ))}
          </View>

          <Text style={styles.label}>Video Upload</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                uploadType === 'link' && styles.toggleBtnActive,
              ]}
              onPress={() => setUploadType('link')}>
              <Text
                style={[
                  styles.toggleBtnText,
                  uploadType === 'link' && styles.toggleBtnTextActive,
                ]}>
                🔗 Paste Link
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                uploadType === 'file' && styles.toggleBtnActive,
              ]}
              onPress={() => setUploadType('file')}>
              <Text
                style={[
                  styles.toggleBtnText,
                  uploadType === 'file' && styles.toggleBtnTextActive,
                ]}>
                📁 Upload File
              </Text>
            </TouchableOpacity>
          </View>

          {uploadType === 'link' ? (
            <View>
              <Input
                value={videoLink}
                onChangeText={setVideoLink}
                placeholder="Paste YouTube / Drive / Vimeo link"
                autoCapitalize="none"
              />
              <Text style={styles.hint}>
                Supported: YouTube, Google Drive, Vimeo, Instagram
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.fileBox, videoUrl ? styles.fileBoxDone : null]}
              onPress={pickVideo}>
              {uploadingVideo ? (
                <>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.fileBoxText}>Uploading video...</Text>
                  <Text style={styles.fileBoxSub}>This may take a moment</Text>
                </>
              ) : videoUrl ? (
                <>
                  <Text style={styles.fileBoxIcon}>✅</Text>
                  <Text style={styles.fileBoxText}>Video uploaded!</Text>
                  <Text style={styles.fileBoxSub}>Tap to replace</Text>
                </>
              ) : (
                <>
                  <Text style={styles.fileBoxIcon}>🎥</Text>
                  <Text style={styles.fileBoxText}>Tap to pick video file</Text>
                  <Text style={styles.fileBoxSub}>MP4 recommended</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Card
            variant="elevated"
            padding={Spacing.lg}
            style={styles.benefitsBox}>
            <Text style={styles.benefitsTitle}>
              🌟 CineLink Creator Benefits
            </Text>
            {[
              'Showcase your talent to industry professionals',
              'Get audience ratings & comments',
              'Participate in CineLink contests',
              'Build your cinema portfolio',
              'Reach filmmakers & casting directors',
            ].map((item, i) => (
              <Text key={i} style={styles.benefitsItem}>
                • {item}
              </Text>
            ))}
          </Card>

          <Button
            label="🎬 Upload Film"
            onPress={uploadFilm}
            size="lg"
            loading={loading || uploadingPoster || uploadingVideo}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  container: {flex: 1, backgroundColor: Colors.background},
  body: {padding: Spacing.screenH},
  posterPicker: {
    width: '100%',
    height: 200,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginBottom: Spacing.xs,
  },
  posterImage: {width: '100%', height: '100%', resizeMode: 'cover'},
  posterEmpty: {
    flex: 1,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  posterIcon: {fontSize: 40},
  posterEmptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  posterEmptySub: {color: Colors.textTertiary, fontSize: 12},
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  overlayText: {color: Colors.textInverse, fontSize: 13},
  doneBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  doneBadgeText: {color: Colors.success, fontSize: 12, fontWeight: 'bold'},
  label: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    marginTop: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {color: Colors.textSecondary, fontSize: 12, marginTop: Spacing.xs},
  genreGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm},
  toggleRow: {flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md},
  toggleBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleBtnText: {color: Colors.textSecondary, fontSize: 13, fontWeight: '500'},
  toggleBtnTextActive: {color: Colors.textInverse, fontWeight: 'bold'},
  fileBox: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  fileBoxDone: {
    borderColor: Colors.success,
    borderStyle: 'solid',
    backgroundColor: Colors.successFaint,
  },
  fileBoxIcon: {fontSize: 32},
  fileBoxText: {color: Colors.textSecondary, fontSize: 14, fontWeight: '600'},
  fileBoxSub: {color: Colors.textTertiary, fontSize: 12},
  benefitsBox: {marginTop: Spacing.xxl},
  benefitsTitle: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  benefitsItem: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
});
