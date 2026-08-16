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
  SafeAreaView,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import api from '../src/api/client';
import {uploadImage} from '../src/services/uploadService';
import {useApp} from '../src/context/AppContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Input, Chip, DatePickerModal} from '../components/ui';
import {useTheme} from '../src/context/ThemeContext';

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

export default function PostAuditionScreen({navigation, route}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const editingAudition = route?.params?.audition;

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
  const [posterOffset, setPosterOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [category, setCategory] = useState('Movies');
  const [budget, setBudget] = useState('');
  const [positions, setPositions] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(16 / 9);

  const {isAdmin, isApprovedDirector, user} = useApp();
  const directorName =
    user?.displayName || user?.email?.split('@')[0] || 'Director';
  const pendingUploadRef = React.useRef<Promise<string> | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (editingAudition) {
      setTitle(editingAudition.title || '');
      setDescription(editingAudition.description || '');
      setLocation(editingAudition.location || '');
      setRole(editingAudition.role || '');
      setAgeMin(editingAudition.ageMin ? String(editingAudition.ageMin) : '');
      setAgeMax(editingAudition.ageMax ? String(editingAudition.ageMax) : '');
      setGender(editingAudition.gender || 'Any');
      setLastDate(editingAudition.lastDate || '');
      setLanguage(editingAudition.lang || editingAudition.language || '');
      setContactLink(editingAudition.contactLink || '');
      setPosterUrl(editingAudition.posterUrl || '');
      setCategory(editingAudition.category || 'Movies');
      setBudget(editingAudition.budget || '');
      setPositions(editingAudition.positions || '');
      setAgreedToGuidelines(true);
      if (editingAudition.posterUrl) {
        setPoster({uri: editingAudition.posterUrl});
        Image.getSize(editingAudition.posterUrl, (w, h) => {
          if (w && h) {
            setImageAspectRatio(w / h);
          }
        }, () => {});
      }
      if (editingAudition.posterOffset) {
        setPosterOffset(editingAudition.posterOffset);
      }
    }
  }, [editingAudition]);

  const checkAccess = async () => {
    try {
      if (isAdmin) {
        setHasAccess(true);
        setAccessChecked(true);
        return;
      }
      const profile = await api.get<any>('/users/profile');
      const isDirector = profile?.user?.isApprovedDirector === true;
      if (!isDirector) {
        setHasAccess(false);
        setAccessChecked(true);
        return;
      }

      if (editingAudition) {
        setHasAccess(true);
        setAccessChecked(true);
        return;
      }

      const audRes = await api.get<{auditions: any[]}>('/auditions');
      const userAuditions = (audRes.auditions || []).filter(
        (a: any) => (a.postedById || a.directorId) === user?.uid
      );
      if (userAuditions.length >= 1) {
        Alert.alert(
          'Limit Reached',
          'Directors can only post one audition. Please edit your existing audition or contact admin to upgrade.',
          [{text: 'OK', onPress: () => navigation.goBack()}]
        );
        setHasAccess(false);
      } else {
        setHasAccess(true);
      }
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
        {text: '🔍 View Fullscreen', onPress: () => setShowFullscreen(true)},
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
      const uri = result.assets[0].uri!;
      setPoster(result.assets[0]);
      Image.getSize(uri, (w, h) => {
        if (w && h) {
          setImageAspectRatio(w / h);
        }
      });
      pendingUploadRef.current = uploadPoster(uri);
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
    if (!resolvedPosterUrl) {
      Alert.alert(
        'Poster Required',
        'Please select and upload a poster/banner image for the audition.',
      );
      return;
    }
    setLoading(true);
    try {
      const payload = {
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
        posterOffset: posterOffset || 0,
        category,
        budget: budget.trim(),
        positions: positions.trim(),
        directorName,
      };

      if (editingAudition) {
        await api.put(`/auditions/${editingAudition._id || editingAudition.id}`, payload);
        Alert.alert('Success! 🎬', 'Your audition changes have been saved!', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      } else {
        await api.post('/auditions', payload);
        Alert.alert('Success! 🎬', 'Your audition is now live!', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      }
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
      <SafeAreaView style={[styles.root, {backgroundColor: Colors.background}]}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, {backgroundColor: Colors.background}]}>
      <Header
        title={editingAudition ? "Edit Audition" : "Post Audition"}
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

      <ScrollView 
        style={[styles.container, {backgroundColor: Colors.background}]} 
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{paddingBottom: insets.bottom + Spacing['5xl']}}>
        
        {/* ACCESS BADGE */}
        <View style={styles.accessBadge}>
          <Text style={styles.accessBadgeText}>
            {isAdmin
              ? '🛡️ Admin — Posting Audition'
              : '✅ Verified Casting Director'}
          </Text>
        </View>

        <View style={styles.body}>
          
          {/* Header Step Timeline Section */}
          <View style={styles.formHeader}>
            <View style={styles.stepIndicatorContainer}>
              <View style={styles.stepDotActive} />
              <Text style={styles.stepText}>AUDITION DETAILS</Text>
            </View>
            <Text style={styles.formTitle}>{editingAudition ? "Edit Audition Project" : "Post a New Audition"}</Text>
            <Text style={styles.formSubtitle}>
              Fill in the role details, location, age criteria, and guidelines to find the perfect cast.
            </Text>
          </View>

          {/* Section 1: Audition Poster */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionLabel}>Audition Poster / Banner *</Text>
            <Text style={styles.sectionSubtitle}>Add a clear landscape banner for the audition listing (Required)</Text>
          </View>

          <View style={styles.posterWrapper}>
            <TouchableOpacity
              style={styles.posterPicker}
              onPress={pickPoster}
              activeOpacity={0.85}>
              {poster?.uri ? (
                <>
                  <View style={[styles.posterImageContainer, {aspectRatio: imageAspectRatio}]}>
                    <Image
                      source={{uri: poster.uri}}
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
                  {uploading && (
                    <View style={styles.overlay}>
                      <ActivityIndicator color={Colors.primary} />
                      <Text style={styles.overlayText}>Uploading poster...</Text>
                    </View>
                  )}
                  {posterUrl && !uploading && (
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
                    Recommended: 16:9 banner format (Max 5MB)
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {poster?.uri ? (
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

          {/* Section 2: Project Details */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionLabel}>Project Details</Text>
            <Text style={styles.sectionSubtitle}>Provide titles, requirements, and location information</Text>
          </View>

          <Input
            label="Audition Title"
            required
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Hero Role — Telugu Action Film"
            containerStyle={{marginBottom: Spacing.md}}
          />

          <Input
            label="Description"
            required
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the role, storyline, requirements..."
            multiline
            numberOfLines={4}
            style={styles.multilineInput}
            containerStyle={{marginBottom: Spacing.md}}
          />

          <Input
            label="Location"
            required
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Hyderabad, Telangana"
            containerStyle={{marginBottom: Spacing.md}}
          />

          {/* Section 3: Role & Category */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionLabel}>Role Type</Text>
            <Text style={styles.sectionSubtitle}>Select the primary type of role you are casting</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={{paddingRight: Spacing.md}}>
            {ROLES.map(r => (
              <Chip
                key={r}
                label={r}
                selected={role === r}
                onPress={() => setRole(r)}
                style={{marginRight: Spacing.sm}}
              />
            ))}
          </ScrollView>

          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionLabel}>Category / Medium</Text>
            <Text style={styles.sectionSubtitle}>What medium is this project being produced for?</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={{paddingRight: Spacing.md}}>
            {CATEGORIES.map(c => (
              <Chip
                key={c}
                label={c}
                selected={category === c}
                onPress={() => setCategory(c)}
                style={{marginRight: Spacing.sm}}
              />
            ))}
          </ScrollView>

          {/* Section 4: Specifications */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionLabel}>Specifications</Text>
            <Text style={styles.sectionSubtitle}>Define target gender, age range, and language details</Text>
          </View>

          <Text style={styles.fieldLabel}>GENDER</Text>
          <View style={styles.toggleRow}>
            {['Male', 'Female', 'Any'].map(g => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.toggleBtn,
                  gender === g && styles.toggleBtnActive,
                ]}
                onPress={() => setGender(g)}>
                <Text
                  style={[
                    styles.toggleBtnText,
                    gender === g && styles.toggleBtnTextActive,
                  ]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>AGE RANGE</Text>
          <View style={styles.ageRow}>
            <Input
              value={ageMin}
              onChangeText={setAgeMin}
              placeholder="Min age"
              keyboardType="numeric"
              containerStyle={{flex: 1}}
            />
            <Text style={styles.ageTo}>to</Text>
            <Input
              value={ageMax}
              onChangeText={setAgeMax}
              placeholder="Max age"
              keyboardType="numeric"
              containerStyle={{flex: 1}}
            />
          </View>

          <Input
            label="Language"
            value={language}
            onChangeText={setLanguage}
            placeholder="e.g. Telugu, Hindi, Tamil"
            containerStyle={{marginBottom: Spacing.md, marginTop: Spacing.md}}
          />

          <Input
            label="Budget / Pay"
            value={budget}
            onChangeText={setBudget}
            placeholder="e.g. ₹5,000/day or Negotiable"
            containerStyle={{marginBottom: Spacing.md}}
          />

          <Input
            label="Positions Available"
            value={positions}
            onChangeText={setPositions}
            placeholder="e.g. 2 Males, 1 Female"
            containerStyle={{marginBottom: Spacing.md}}
          />

          <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7} style={{marginBottom: Spacing.md}}>
            <View pointerEvents="none">
              <Input
                label="Last Date to Apply"
                required
                value={lastDate}
                placeholder="Select deadline date..."
                editable={false}
              />
            </View>
          </TouchableOpacity>

          <Input
            label="Contact / Apply Link"
            value={contactLink}
            onChangeText={setContactLink}
            placeholder="WhatsApp / Google Form / Instagram link"
            hint="Actors will be redirected here when they tap Apply"
            containerStyle={{marginBottom: Spacing.md}}
          />

          {/* Section 5: Guidelines & Agreement */}
          <View style={styles.guidelineBox}>
            <Text style={styles.guidelineTitle}>⚠️ Posting Guidelines</Text>
            <View style={styles.guidelineList}>
              <Text style={styles.guidelineItem}>✅ Only post real, genuine auditions</Text>
              <Text style={styles.guidelineItem}>✅ Contact link must be working</Text>
              <Text style={styles.guidelineItem}>✅ Role and location must be accurate</Text>
              <Text style={styles.guidelineItem}>❌ No money collection from actors</Text>
              <Text style={styles.guidelineItem}>❌ No fake or expired auditions</Text>
            </View>
            <Text style={styles.guidelineWarning}>
              Violation results in immediate access revocation and a permanent ban.
            </Text>
          </View>

          {/* AGREEMENT */}
          <TouchableOpacity
            activeOpacity={0.8}
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
              I confirm this is a genuine audition and I agree to CineLink posting guidelines
            </Text>
          </TouchableOpacity>

          <View style={styles.submitContainer}>
            <Button
              label={editingAudition ? "Save Changes" : "Publish Audition"}
              onPress={postAudition}
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={loading || uploading || !agreedToGuidelines}
            />
          </View>
        </View>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={setLastDate}
        currentValue={lastDate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.background},
  container: {flex: 1, backgroundColor: Colors.background},
  body: {padding: Spacing.screenH},
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
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
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
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterImageContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
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
  multilineInput: {
    minHeight: 110,
    height: 110,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  chipScroll: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
  },
  fieldLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
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
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  ageTo: {
    color: Colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginHorizontal: Spacing.xs,
  },
  guidelineBox: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  guidelineTitle: {
    color: Colors.error,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  guidelineList: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  guidelineItem: {
    color: Colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  guidelineWarning: {
    color: Colors.error,
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    marginTop: Spacing.xs,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: Radius.xs,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {backgroundColor: Colors.primary},
  checkmark: {color: Colors.textInverse, fontSize: 12, fontWeight: 'bold'},
  checkboxLabel: {
    color: Colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  submitContainer: {
    marginTop: Spacing.sm,
  },
});
