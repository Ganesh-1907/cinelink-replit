import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import auth from '@react-native-firebase/auth';
import api from '../src/api/client';
import {ADMIN_EMAIL} from '../src/api/config';
import {uploadImage} from '../src/services/uploadService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, Button, Input, Chip} from '../components/ui';

const ROLES = [
  'Hero',
  'Heroine',
  'Villain',
  'Supporting',
  'Child Artist',
  'Comedian',
  'Any Role',
];
const CATEGORIES = [
  'Movies',
  'Short Films',
  'Theatre',
  'YouTube / Web',
  'TV / OTT',
];

export default function PostAuditionScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [role, setRole] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [gender, setGender] = useState('Any');
  const [lastDate, setLastDate] = useState('');
  const [language, setLanguage] = useState('');
  const [contactLink, setContactLink] = useState('');
  const [poster, setPoster] = useState<any>(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [category, setCategory] = useState('Movies');
  const [budget, setBudget] = useState('');
  const [positions, setPositions] = useState('');

  const user = auth().currentUser;
  const isAdmin = user?.email === ADMIN_EMAIL;
  const directorName =
    user?.displayName || user?.email?.split('@')[0] || 'Director';
  const pendingUploadRef = React.useRef<Promise<string> | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      if (isAdmin) {
        setHasAccess(true);
        setAccessChecked(true);
        return;
      }
      const profile = await api.get<any>('/users/profile');
      setHasAccess(profile?.user?.isApprovedDirector === true);
    } catch (e) {
      console.log(e);
      setHasAccess(false);
    } finally {
      setAccessChecked(true);
    }
  };

  const pickPoster = () => {
    if (poster) {
      Alert.alert('🖼️ Poster Options', 'What would you like to do?', [
        {text: '🔄 Replace Photo', onPress: () => openGallery()},
        {
          text: '🗑️ Remove Photo',
          style: 'destructive',
          onPress: () => {
            setPoster(null);
            setPosterUrl('');
          },
        },
        {text: 'Cancel', style: 'cancel'},
      ]);
    } else {
      openGallery();
    }
  };

  const openGallery = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets?.[0]) {
      setPoster(result.assets[0]);
      pendingUploadRef.current = uploadPoster(result.assets[0].uri!);
    }
  };

  const uploadPoster = async (uri: string): Promise<string> => {
    setUploading(true);
    try {
      const result = await uploadImage(uri);
      setPosterUrl(result.secureUrl);
      return result.secureUrl;
    } catch (e) {
      Alert.alert('Upload failed', 'Could not upload poster.');
      setPoster(null);
      setPosterUrl('');
      return '';
    } finally {
      setUploading(false);
      pendingUploadRef.current = null;
    }
  };

  const postAudition = async () => {
    if (!agreedToGuidelines) {
      Alert.alert(
        'Required',
        'Please confirm you agree to the posting guidelines.',
      );
      return;
    }
    if (!title.trim() || !description.trim() || !location.trim()) {
      Alert.alert(
        'Missing Info',
        'Please fill Title, Description and Location.',
      );
      return;
    }
    let resolvedPosterUrl = posterUrl;
    if (pendingUploadRef.current) {
      resolvedPosterUrl = await pendingUploadRef.current;
      if (!resolvedPosterUrl) {
        return;
      }
    }
    setLoading(true);
    try {
      await api.post('/auditions', {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        role: role.trim(),
        ageMin: ageMin ? parseInt(ageMin) : undefined,
        ageMax: ageMax ? parseInt(ageMax) : undefined,
        gender,
        lastDate: lastDate.trim(),
        language: language.trim(),
        contactLink: contactLink.trim(),
        posterUrl: resolvedPosterUrl,
        category,
        budget: budget.trim(),
        positions: positions.trim(),
        directorName,
      });

      Alert.alert('Success! 🎬', 'Your audition is now live!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!accessChecked) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.checkingText}>Checking access...</Text>
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <View style={[styles.root, {backgroundColor: Colors.background}]}>
        <Header
          title="Post Audition"
          navigation={navigation}
          onBack={() => navigation.goBack()}
        />
        <ScrollView contentContainerStyle={styles.noAccessContainer}>
          <Text style={styles.noAccessIcon}>🎭</Text>
          <Text style={styles.noAccessTitle}>
            Casting Director Access Required
          </Text>
          <Text style={styles.noAccessText}>
            Only verified casting directors can post auditions on CineLink. This
            ensures actors are protected from fake auditions.
          </Text>
          <View style={styles.securityList}>
            <Text style={styles.securityTitle}>
              🔒 Our 5-Layer Verification:
            </Text>
            <Text style={styles.securityItem}>✅ Profile review</Text>
            <Text style={styles.securityItem}>✅ Government ID proof</Text>
            <Text style={styles.securityItem}>✅ Company documents</Text>
            <Text style={styles.securityItem}>✅ Phone verification</Text>
            <Text style={styles.securityItem}>✅ Admin approval call</Text>
          </View>
          <Button
            label="📋 Apply for Casting Director Access"
            onPress={() => navigation.navigate('CastingRequest')}
            variant="primary"
            fullWidth
          />
          <View style={{height: Spacing.md}} />
          <Button
            label="← Go Back"
            onPress={() => navigation.goBack()}
            variant="secondary"
            fullWidth
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: Colors.background}]}>
      <Header
        title="Post Audition"
        navigation={navigation}
        onBack={() => navigation.goBack()}
      />

      {/* FULLSCREEN POSTER MODAL */}
      <Modal
        visible={showFullscreen && poster !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullscreen(false)}>
        <TouchableOpacity
          style={styles.fullscreenBg}
          onPress={() => setShowFullscreen(false)}
          activeOpacity={1}>
          {poster?.uri ? (
            <Image
              source={{uri: poster.uri}}
              style={styles.fullscreenImage}
              resizeMode="contain"
              />
          ) : null}
          <Text style={styles.fullscreenHint}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>

      <ScrollView style={[styles.container, {backgroundColor: Colors.background}]} keyboardShouldPersistTaps="handled">
        {/* ACCESS BADGE */}
        <View style={styles.accessBadge}>
          <Text style={styles.accessBadgeText}>
            {isAdmin
              ? '🛡️ Admin — Posting Audition'
              : '✅ Verified Casting Director'}
          </Text>
        </View>

        <View style={[styles.section, {paddingBottom: insets.bottom + 40}]}>
          {/* POSTER PICKER */}
          <TouchableOpacity
            style={styles.posterPicker}
            onPress={() => {
              if (poster) {
                setShowFullscreen(true);
              } else {
                openGallery();
              }
            }}
            activeOpacity={0.9}>
            {poster?.uri ? (
              <>
                <Image source={{uri: poster.uri}} style={styles.posterImage} />
                <TouchableOpacity
                  style={styles.editPosterBtn}
                  onPress={pickPoster}>
                  <Text style={styles.editPosterText}>✏️ Edit</Text>
                </TouchableOpacity>
                {uploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color={Colors.textPrimary} />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </View>
                )}
                {posterUrl && !uploading && (
                  <View style={styles.uploadedBadge}>
                    <Text style={styles.uploadedText}>✅ Uploaded</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.posterPlaceholder}>
                <Text style={styles.posterIcon}>🎭</Text>
                <Text style={styles.posterText}>Tap to add poster</Text>
                <Text style={styles.posterSub}>
                  Optional — portrait format recommended
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* FORM FIELDS */}
          <Input
            label="Audition Title *"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Hero Role — Telugu Action Film"
            required
          />

          <Input
            label="Description *"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the role, storyline, requirements..."
            multiline
            required
          />

          <Input
            label="Location *"
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Hyderabad, Telangana"
            required
          />

          <Text style={styles.label}>Role Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}>
            {ROLES.map(r => (
              <Chip
                key={r}
                label={r}
                selected={role === r}
                onPress={() => setRole(r)}
              />
            ))}
          </ScrollView>

          <Text style={styles.label}>Category / Medium</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}>
            {CATEGORIES.map(c => (
              <Chip
                key={c}
                label={c}
                selected={category === c}
                onPress={() => setCategory(c)}
              />
            ))}
          </ScrollView>

          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {['Male', 'Female', 'Any'].map(g => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.genderBtn,
                  gender === g && styles.genderBtnActive,
                ]}
                onPress={() => setGender(g)}>
                <Text
                  style={[
                    styles.genderBtnText,
                    gender === g && styles.genderBtnTextActive,
                  ]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Age Range</Text>
          <View style={styles.ageRow}>
            <Input
              value={ageMin}
              onChangeText={setAgeMin}
              placeholder="Min age"
            />
            <Text style={styles.ageTo}>to</Text>
            <Input
              value={ageMax}
              onChangeText={setAgeMax}
              placeholder="Max age"
            />
          </View>

          <Input
            label="Language"
            value={language}
            onChangeText={setLanguage}
            placeholder="e.g. Telugu, Hindi, Tamil"
          />

          <Input
            label="Budget / Pay"
            value={budget}
            onChangeText={setBudget}
            placeholder="e.g. ₹5,000/day or Negotiable"
          />

          <Input
            label="Positions Available"
            value={positions}
            onChangeText={setPositions}
            placeholder="e.g. 2 Males, 1 Female"
          />

          <Input
            label="Last Date to Apply"
            value={lastDate}
            onChangeText={setLastDate}
            placeholder="e.g. June 30, 2026"
          />

          <Input
            label="Contact / Apply Link"
            value={contactLink}
            onChangeText={setContactLink}
            placeholder="WhatsApp / Google Form / Instagram link"
            hint="Actors will be redirected here when they tap Apply"
          />

          {/* GUIDELINES */}
          <View style={styles.guidelineBox}>
            <Text style={styles.guidelineTitle}>⚠️ Posting Guidelines</Text>
            <Text style={styles.guidelineItem}>
              ✅ Only post real, genuine auditions
            </Text>
            <Text style={styles.guidelineItem}>
              ✅ Contact link must be working
            </Text>
            <Text style={styles.guidelineItem}>
              ✅ Role and location must be accurate
            </Text>
            <Text style={styles.guidelineItem}>
              ❌ No money collection from actors
            </Text>
            <Text style={styles.guidelineItem}>
              ❌ No fake or expired auditions
            </Text>
            <Text style={styles.guidelineItem}>❌ No duplicate posts</Text>
            <Text style={styles.guidelineWarning}>
              Violation = immediate access revocation and permanent ban
            </Text>
          </View>

          {/* AGREEMENT */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAgreedToGuidelines(!agreedToGuidelines)}>
            <View
              style={[
                styles.checkbox,
                agreedToGuidelines && styles.checkboxChecked,
              ]}>
              {agreedToGuidelines && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I confirm this is a genuine audition and I agree to CineLink
              posting guidelines
            </Text>
          </TouchableOpacity>

          <Button
            label="🎭 Post Audition"
            onPress={postAudition}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={loading || uploading || !agreedToGuidelines}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.background},
  container: {flex: 1, backgroundColor: Colors.background},
  centerBox: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkingText: {color: Colors.textSecondary, ...Typography.body},

  noAccessContainer: {
    alignItems: 'center',
    padding: Spacing['3xl'],
    paddingBottom: Spacing['4xl'],
  },
  noAccessIcon: {fontSize: 64, marginBottom: Spacing.lg},
  noAccessTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  noAccessText: {
    color: Colors.textSecondary,
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
  securityList: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  securityTitle: {
    color: Colors.primary,
    fontWeight: 'bold',
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  securityItem: {
    color: Colors.textSecondary,
    ...Typography.bodySm,
    lineHeight: 28,
  },

  fullscreenBg: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {width: '100%', height: '90%'},
  fullscreenHint: {
    color: Colors.textSecondary,
    ...Typography.bodySm,
    marginTop: Spacing.md,
  },

  accessBadge: {
    backgroundColor: Colors.successFaint,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  accessBadgeText: {
    color: Colors.success,
    fontWeight: 'bold',
    ...Typography.label,
  },

  section: {padding: Spacing.xl},

  posterPicker: {
    width: '100%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  posterImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    resizeMode: 'cover',
    backgroundColor: Colors.card,
  },
  posterPlaceholder: {
    height: 180,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  posterIcon: {fontSize: 40},
  posterText: {color: Colors.textSecondary, ...Typography.label},
  posterSub: {color: Colors.textSecondary, ...Typography.caption},
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  uploadingText: {color: Colors.textPrimary, ...Typography.bodySm},
  uploadedBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  uploadedText: {color: Colors.success, ...Typography.captionBold},
  editPosterBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    zIndex: 10,
  },
  editPosterText: {color: Colors.textPrimary, ...Typography.captionBold},

  label: {
    color: Colors.primary,
    ...Typography.labelSm,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  chipScroll: {marginBottom: Spacing.sm},

  genderRow: {flexDirection: 'row', gap: Spacing.sm},
  genderBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  genderBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genderBtnText: {
    color: Colors.textSecondary,
    ...Typography.bodySm,
    fontWeight: '500',
  },
  genderBtnTextActive: {color: Colors.textPrimary, fontWeight: 'bold'},

  ageRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  ageTo: {color: Colors.textSecondary, ...Typography.body},

  guidelineBox: {
    backgroundColor: Colors.errorFaint,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  guidelineTitle: {
    color: Colors.error,
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  guidelineItem: {
    color: Colors.textSecondary,
    ...Typography.bodySm,
    lineHeight: 26,
  },
  guidelineWarning: {
    color: Colors.error,
    ...Typography.captionBold,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.xs,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {backgroundColor: Colors.primary},
  checkmark: {color: Colors.textPrimary, fontSize: 14, fontWeight: 'bold'},
  checkboxLabel: {
    color: Colors.textSecondary,
    ...Typography.caption,
    flex: 1,
    lineHeight: 18,
  },
});
