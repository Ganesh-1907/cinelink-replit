import React, {useState, useEffect} from 'react';
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
import api from '../src/api/client';
import {uploadImage, uploadVideo} from '../src/services/uploadService';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Input, Button, Chip, Card} from '../components/ui';
import {useApp} from '../src/context/AppContext';

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

export default function UploadFilmScreen({navigation, route}: any) {
  const insets = useSafeAreaInsets();
  const editingFilm = route?.params?.film;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Drama']);
  const [duration, setDuration] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [uploadType, setUploadType] = useState<'link' | 'file'>('link');
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterOffset, setPosterOffset] = useState(0);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(16 / 9);
  const {user, isAdmin, isApprovedDirector} = useApp();

  useEffect(() => {
    if (!isAdmin && !isApprovedDirector) {
      Alert.alert('Access Denied', 'Casting Director or Admin access required.', [
        {text: 'Go Back', onPress: () => navigation.goBack()}
      ]);
    }
  }, [isAdmin, isApprovedDirector, navigation]);

  useEffect(() => {
    if (editingFilm) {
      setTitle(editingFilm.title || '');
      setDescription(editingFilm.description || '');
      if (editingFilm.genre) {
        const parsed = editingFilm.genre.split(',').map((g: string) => g.trim());
        setSelectedGenres(parsed.filter(Boolean));
      } else {
        setSelectedGenres(['Drama']);
      }
      setDuration(editingFilm.duration || '');
      setPosterUrl(editingFilm.posterUrl || '');
      if (editingFilm.posterUrl) {
        setPosterUri(editingFilm.posterUrl);
        Image.getSize(editingFilm.posterUrl, (width, height) => {
          if (width && height) {
            setImageAspectRatio(width / height);
          }
        }, () => {});
      }
      if (editingFilm.posterOffset) {
        setPosterOffset(editingFilm.posterOffset);
      }
      if (editingFilm.videoLink) {
        setUploadType('link');
        setVideoLink(editingFilm.videoLink);
      } else if (editingFilm.videoUrl) {
        setUploadType('file');
        setVideoUrl(editingFilm.videoUrl);
      }
    }
  }, [editingFilm]);

  const pickPoster = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets && result.assets[0]?.uri) {
      const uri = result.assets[0].uri!;
      setPosterUri(uri);
      setPosterUrl(null);
      setUploadingPoster(true);
      Image.getSize(uri, (width, height) => {
        if (width && height) {
          setImageAspectRatio(width / height);
        }
      });
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

  const toggleGenre = (g: string) => {
    if (selectedGenres.includes(g)) {
      if (selectedGenres.length > 1) {
        setSelectedGenres(selectedGenres.filter(item => item !== g));
      }
    } else {
      setSelectedGenres([...selectedGenres, g]);
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
    if (!posterUrl) {
      Alert.alert('Poster Required', 'Please select and upload a film poster.');
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
      const payload = {
        title: title.trim(),
        description: description.trim(),
        genre: selectedGenres.join(', '),
        duration: duration.trim(),
        posterUrl: posterUrl || '',
        posterOffset: posterOffset || 0,
        videoLink: uploadType === 'link' ? videoLink.trim() : '',
        videoUrl: uploadType === 'file' ? videoUrl : '',
      };

      if (editingFilm) {
        await api.put(`/films/${editingFilm._id || editingFilm.id}`, payload);
        Alert.alert('Success! 🎬', 'Your film changes have been saved.', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      } else {
        await api.post('/films', payload);
        Alert.alert('Success! 🎬', 'Your short film has been uploaded.', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Try again!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: Colors.background}]}>
      <StatusBar
        barStyle={Colors.background !== '#FFFFFF' ? 'light-content' : 'dark-content'}
        backgroundColor={Colors.background}
      />
      <Header title={editingFilm ? "Edit Short Film" : "Upload Short Film"} navigation={navigation} />
      <ScrollView
        style={[styles.container, {backgroundColor: Colors.background}]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{paddingBottom: insets.bottom + Spacing['5xl']}}>
        <View style={styles.body}>
          
          {/* Header Step Timeline Section */}
          <View style={styles.formHeader}>
            <View style={styles.stepIndicatorContainer}>
              <View style={styles.stepDotActive} />
              <Text style={styles.stepText}>FILM INFORMATION</Text>
            </View>
            <Text style={styles.formTitle}>Share Your Creative Work</Text>
            <Text style={styles.formSubtitle}>
              Let's start with the basic details, genres, and media files of your short film.
            </Text>
          </View>

          {/* Section 1: Film Poster */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionLabel}>Film Poster *</Text>
            <Text style={styles.sectionSubtitle}>Add a high-quality thumbnail banner for your film (Required)</Text>
          </View>

          <View style={styles.posterWrapper}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.posterPicker}
              onPress={pickPoster}>
              {posterUri ? (
                <>
                  <View style={[styles.posterImageContainer, {aspectRatio: imageAspectRatio}]}>
                    <Image
                      source={{uri: posterUri}}
                      style={[
                        styles.posterImage,
                        {
                          transform: [{ translateY: posterOffset }]
                        }
                      ]}
                    />
                  </View>
                  <View style={styles.posterOverlay}>
                    <Text style={{fontSize: 22}}>📷</Text>
                    <Text style={styles.posterOverlayText}>Change Poster</Text>
                  </View>
                  {uploadingPoster && (
                    <View style={styles.overlay}>
                      <ActivityIndicator color={Colors.primary} />
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
                  <Text style={styles.posterIcon}>📤</Text>
                  <Text style={styles.posterEmptyText}>Upload Poster *</Text>
                  <Text style={styles.posterEmptySub}>
                    Recommended size 16:9 image (Max 5MB)
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {posterUri ? (
              <View style={styles.repositionContainer}>
                <Text style={styles.repositionLabel}>Adjust Portion Display (Vertical Crop)</Text>
                <View style={styles.repositionButtons}>
                  <TouchableOpacity onPress={() => setPosterOffset(prev => Math.max(-100, prev - 5))} style={styles.repositionBtn}><Text style={styles.repositionBtnText}>▲ Shift Up</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setPosterOffset(0)} style={styles.repositionBtn}><Text style={styles.repositionBtnText}>↺ Reset</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setPosterOffset(prev => Math.min(100, prev + 5))} style={styles.repositionBtn}><Text style={styles.repositionBtnText}>▼ Shift Down</Text></TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>

          {/* Section 2: Basic Details */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionLabel}>Basic Details</Text>
            <Text style={styles.sectionSubtitle}>Provide descriptive details of your short film project</Text>
          </View>

          <Input
            label="Film Title"
            required
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Oka Chinna Katha"
            containerStyle={{marginBottom: Spacing.md}}
          />

          <Input
            label="Description"
            required
            value={description}
            onChangeText={setDescription}
            placeholder="What is your film about? Cast, story, theme..."
            multiline
            numberOfLines={4}
            style={styles.multilineInput}
            containerStyle={{marginBottom: Spacing.md}}
          />

          <Input
            label="Duration (minutes)"
            required
            value={duration}
            onChangeText={setDuration}
            placeholder="e.g. 18"
            keyboardType="numeric"
            containerStyle={{marginBottom: Spacing.md}}
          />

          {/* Section 3: Genre Selection */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionLabel}>Genres *</Text>
            <Text style={styles.sectionSubtitle}>Select all genres that represent this film project</Text>
          </View>

          <View style={styles.genreGrid}>
            {GENRES.map(g => (
              <Chip
                key={g}
                label={g}
                selected={selectedGenres.includes(g)}
                onPress={() => toggleGenre(g)}
              />
            ))}
          </View>

          {/* Section 4: Video Attachment */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionLabel}>Video Attachment</Text>
            <Text style={styles.sectionSubtitle}>Provide access to view the video file or paste web link</Text>
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              activeOpacity={0.85}
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
              activeOpacity={0.85}
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
            <View style={{marginBottom: Spacing.md}}>
              <Input
                value={videoLink}
                onChangeText={setVideoLink}
                placeholder="Paste YouTube / Drive / Vimeo link"
                autoCapitalize="none"
              />
              <Text style={styles.hint}>
                Supported platforms: YouTube, Google Drive, Vimeo, Instagram
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
                  <Text style={styles.fileBoxText}>Uploading video file...</Text>
                  <Text style={styles.fileBoxSub}>This may take a couple of minutes</Text>
                </>
              ) : videoUrl ? (
                <>
                  <Text style={styles.fileBoxIcon}>✅</Text>
                  <Text style={styles.fileBoxText}>Video uploaded successfully!</Text>
                  <Text style={styles.fileBoxSub}>Tap here to select another file</Text>
                </>
              ) : (
                <>
                  <Text style={styles.fileBoxIcon}>📥</Text>
                  <Text style={styles.fileBoxText}>Upload Video File</Text>
                  <Text style={styles.fileBoxSub}>MP4 or MOV formats supported (Max 50MB)</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Section 5: Creator Benefits */}
          <Card
            variant="elevated"
            style={styles.benefitsBox}>
            <View style={styles.benefitsHeaderRow}>
              <Text style={styles.benefitsStar}>🌟</Text>
              <Text style={styles.benefitsTitle}>CineLink Creator Benefits</Text>
            </View>
            <View style={styles.benefitsList}>
              {[
                'Showcase your short film directly to casting directors & industry pros.',
                'Gather ratings, reviews, and constructive viewer feedback.',
                'Gain eligibility to submit your project to official contests.',
                'Enhance your personal creator portfolio and profile showcase.',
              ].map((item, i) => (
                <View key={i} style={styles.benefitsItemRow}>
                  <Text style={styles.benefitsBullet}>•</Text>
                  <Text style={styles.benefitsItem}>{item}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <Button
              label={editingFilm ? "Save Changes" : "Publish Short Film"}
              onPress={uploadFilm}
              size="lg"
              loading={loading || uploadingPoster || uploadingVideo}
              fullWidth
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  container: {flex: 1, backgroundColor: Colors.background},
  body: {padding: Spacing.screenH},
  formHeader: {
    marginBottom: Spacing.lg,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  stepDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  stepText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.primary,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  formTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  formSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  sectionHeaderContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  posterPicker: {
    width: '100%',
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.card,
    marginBottom: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterImageContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  posterImage: {width: '100%', height: '100%', resizeMode: 'cover'},
  posterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  posterOverlayText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  posterEmpty: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  posterIcon: {
    fontSize: 28,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  posterEmptyText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  posterEmptySub: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  posterWrapper: {
    marginBottom: Spacing.md,
  },
  repositionContainer: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  repositionLabel: {
    color: Colors.textSecondary,
    ...Typography.captionBold,
    marginBottom: Spacing.sm,
  },
  repositionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  repositionBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.button,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  repositionBtnText: {
    color: Colors.textPrimary,
    ...Typography.captionBold,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  overlayText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  multilineInput: {
    minHeight: 110,
    height: 110,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  toggleBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  toggleBtnActive: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  toggleBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
  },
  toggleBtnTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  hint: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: Spacing.xs,
  },
  fileBox: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  fileBoxDone: {
    borderColor: Colors.success,
    borderStyle: 'solid',
    backgroundColor: Colors.successFaint,
  },
  fileBoxIcon: {
    fontSize: 28,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  fileBoxText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  fileBoxSub: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  benefitsBox: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.lg,
  },
  benefitsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  benefitsStar: {
    fontSize: 18,
  },
  benefitsTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.primary,
    fontWeight: '600',
  },
  benefitsList: {
    gap: Spacing.sm,
  },
  benefitsItemRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  benefitsBullet: {
    color: Colors.primary,
    fontSize: 14,
  },
  benefitsItem: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  submitContainer: {
    marginTop: Spacing.sm,
  },
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
});
