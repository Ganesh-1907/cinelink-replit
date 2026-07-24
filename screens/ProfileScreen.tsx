import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Share,
  Dimensions,
  Linking,
} from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
} from 'react-native-image-picker';
import {useFocusEffect} from '@react-navigation/native';
import ProfileCompletionCard from './ProfileCompletionCard';
import {usePremiumStatus} from '../hooks/usePremiumStatus';
import PremiumBadge from '../src/components/Premium/PremiumBadge';
import api from '../src/api/client';
import {useApp} from '../src/context/AppContext';
import {uploadImage} from '../src/services/uploadService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Avatar, Header, Button, Input, Chip, Card} from '../components/ui';
import {Colors, Typography, Spacing, Radius} from '../src/theme';

const SCREEN_W = Dimensions.get('window').width;
const GRID_GAP = 2;
const CELL_SIZE = Math.floor((SCREEN_W - 40 - GRID_GAP * 2) / 3);

interface PhotoAsset {
  uri: string;
  type?: string;
  name?: string;
}

const ROLE_TAGS = [
  'Lead',
  'Supporting',
  'Character',
  'Theatre',
  'Film',
  'OTT',
  'Web Series',
  'Ad Film',
];

const availVariant = (status: string): 'success' | 'warning' | 'default' => {
  if (status === 'Available Now') {
    return 'success';
  }
  if (status === 'Booked') {
    return 'warning';
  }
  return 'default';
};

export default function ProfileScreen({navigation, route}: any) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [role, setRole] = useState<string>('Actor');
  const [photo, setPhoto] = useState<PhotoAsset | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [introVideoLink, setIntroVideoLink] = useState<string>('');
  const [portfolio1, setPortfolio1] = useState<string>('');
  const [portfolio2, setPortfolio2] = useState<string>('');
  const [portfolio3, setPortfolio3] = useState<string>('');
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<PhotoAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Gallery
  const [portfolioMedia, setPortfolioMedia] = useState<string[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Portfolio v2
  const [availabilityStatus, setAvailabilityStatus] = useState<string>('');
  const [lookingFor, setLookingFor] = useState<string>('');
  const [profileTags, setProfileTags] = useState<string[]>([]);
  const [instagramLink, setInstagramLink] = useState<string>('');
  const [youtubeLink, setYoutubeLink] = useState<string>('');
  const [ageRange, setAgeRange] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [bodyType, setBodyType] = useState<string>('');

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const {isAdmin, isApprovedDirector, user, signOut} = useApp();

  const scrollRef = useRef<ScrollView>(null);
  const {tier: premiumTier, isVerified: premiumVerifiedReal} =
    usePremiumStatus();

  useEffect(() => {
    if (route?.params?.edit) {
      setIsEditing(true);
      navigation.setParams({edit: undefined});
    }
  }, [route?.params?.edit, navigation]);

  const toggleTag = (tag: string) =>
    setProfileTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    );

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => loadProfile(), 300);
      return () => clearTimeout(timer);
    }, [loadProfile]),
  );

  // ── Real-time followers/following counts ──
  useEffect(() => {
    if (!user?.uid) {
      return;
    }
    Promise.all([
      api.get<any>(`/users/${user.uid}/followers?limit=1`),
      api.get<any>(`/users/${user.uid}/following?limit=1`),
    ])
      .then(([fRes, fgRes]) => {
        setFollowersCount(fRes?.total || 0);
        setFollowingCount(fgRes?.total || 0);
      })
      .catch(() => {});
  }, [user?.uid]);

  const loadProfile = React.useCallback(async () => {
    try {
      if (!user?.uid) {
        return;
      }
      const res = await api.get<any>('/users/profile');
      if (res?.user) {
        const data = res.user;
        setName(data?.fullName || data?.displayName || data?.name || '');
        setPhone(data?.phone || '');
        setEmail(data?.email || '');
        setBio(data?.bio || '');
        setRole(data?.role || 'Actor');
        setPhotoUrl(data?.photoUrl || data?.photoURL || '');
        setIntroVideoLink(data?.introVideoLink || '');
        setPortfolio1(data?.portfolio1 || '');
        setPortfolio2(data?.portfolio2 || '');
        setPortfolio3(data?.portfolio3 || '');
        setPortfolioPhotos(data?.portfolioPhotos || []);
        setVerificationStatus(data?.verificationStatus || '');
        setLocation(data?.location || '');
        setAvailabilityStatus(data?.availabilityStatus || '');
        setLookingFor(data?.lookingFor || '');
        setProfileTags(data?.profileTags || []);
        setInstagramLink(data?.instagramLink || '');
        setYoutubeLink(data?.youtubeLink || '');
        setAgeRange(data?.ageRange || '');
        setHeight(data?.height || '');
        setBodyType(data?.bodyType || '');
        setPortfolioMedia(data?.portfolioMedia || []);
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    }
  }, [user?.uid]);

  const pickProfilePhoto = () => {
    Alert.alert('Choose Photo', 'Select source', [
      {
        text: '📷 Camera',
        onPress: () =>
          launchCamera(
            {mediaType: 'photo', quality: 0.8, saveToPhotos: false},
            (response: ImagePickerResponse) => {
              if (response.assets?.[0]) {
                const asset = response.assets[0];
                setPhoto({
                  uri: asset.uri || '',
                  type: asset.type,
                  name: asset.fileName,
                });
              }
            },
          ),
      },
      {
        text: '🖼 Gallery',
        onPress: () =>
          launchImageLibrary(
            {mediaType: 'photo', quality: 0.8},
            (response: ImagePickerResponse) => {
              if (response.assets?.[0]) {
                const asset = response.assets[0];
                setPhoto({
                  uri: asset.uri || '',
                  type: asset.type,
                  name: asset.fileName,
                });
              }
            },
          ),
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const pickPortfolioPhoto = () => {
    const totalPhotos = portfolioPhotos.length + newPhotos.length;
    if (totalPhotos >= 5) {
      Alert.alert('Limit Reached', 'You can only add up to 5 photos!');
      return;
    }
    Alert.alert('Add Photo', 'Select source', [
      {
        text: '📷 Camera',
        onPress: () =>
          launchCamera(
            {mediaType: 'photo', quality: 0.8, saveToPhotos: false},
            (response: ImagePickerResponse) => {
              if (response.assets?.[0]) {
                const asset = response.assets[0];
                setNewPhotos(prev => [
                  ...prev,
                  {
                    uri: asset.uri || '',
                    type: asset.type,
                    name: asset.fileName,
                  },
                ]);
              }
            },
          ),
      },
      {
        text: '🖼 Gallery',
        onPress: () =>
          launchImageLibrary(
            {mediaType: 'photo', quality: 0.8},
            (response: ImagePickerResponse) => {
              if (response.assets?.[0]) {
                const asset = response.assets[0];
                setNewPhotos(prev => [
                  ...prev,
                  {
                    uri: asset.uri || '',
                    type: asset.type,
                    name: asset.fileName,
                  },
                ]);
              }
            },
          ),
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos(newPhotos.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (index: number) => {
    setPortfolioPhotos(portfolioPhotos.filter((_, i) => i !== index));
  };

  const uploadToCloudinary = async (imageUri: string): Promise<string> => {
    const result = await uploadImage(imageUri);
    return result.secureUrl;
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter your full name!');
      return;
    }
    setLoading(true);
    try {
      let finalPhotoUrl = photoUrl;
      if (photo) {
        setUploading(true);
        finalPhotoUrl = await uploadToCloudinary(photo.uri);
        setUploading(false);
      }

      let uploadedPhotos: string[] = [];
      if (newPhotos.length > 0) {
        setUploading(true);
        uploadedPhotos = await Promise.all(
          newPhotos.map(p => uploadToCloudinary(p.uri)),
        );
        setUploading(false);
      }

      const allPortfolioPhotos = [...portfolioPhotos, ...uploadedPhotos];
      const trimmedName = name.trim();

      const profileData = {
        fullName: trimmedName,
        phone,
        bio,
        role,
        location,
        photoUrl: finalPhotoUrl,
        photoURL: finalPhotoUrl,
        introVideoLink,
        portfolio1,
        portfolio2,
        portfolio3,
        portfolioPhotos: allPortfolioPhotos,
        verificationStatus,
        availabilityStatus,
        lookingFor,
        profileTags,
        instagramLink,
        youtubeLink,
        ageRange,
        height,
        bodyType,
      };

      await api.put('/users/profile', profileData);

      setName(trimmedName);
      setPhotoUrl(finalPhotoUrl);
      setPortfolioPhotos(allPortfolioPhotos);
      setNewPhotos([]);
      setPhoto(null);
      setSaved(true);

      Alert.alert('✅ Success', 'Profile saved successfully!');
      setIsEditing(false);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('Error saving profile:', e);
      Alert.alert('Error', 'Failed to save profile!');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const applyForVerification = async () => {
    if (verificationStatus === 'verified') {
      Alert.alert('✅ Already Verified!', 'Your profile is already verified.');
      return;
    }
    if (verificationStatus === 'pending') {
      Alert.alert('⏳ Already Applied!', 'Your verification is under review.');
      return;
    }
    if (!name || !bio || !phone) {
      Alert.alert(
        'Incomplete Profile',
        'Please fill your name, phone and bio first!',
      );
      return;
    }
    try {
      await api.post('/verification', {fullName: name});
      setVerificationStatus('pending');
      Alert.alert(
        'Applied! 🎉',
        'Your verification request has been submitted!',
      );
    } catch (e) {
      console.error(e);
    }
  };

  // ── Gallery helpers ──────────────────────────────────────
  const savePortfolioMedia = async (media: string[]) => {
    try {
      await api.put('/users/profile', {portfolioMedia: media});
    } catch (e) {
      console.log(e);
    }
  };

  const pickPortfolioMedia = () => {
    if (portfolioMedia.length >= 20) {
      Alert.alert(
        'Limit Reached',
        'Portfolio gallery is limited to 20 images.',
      );
      return;
    }
    launchImageLibrary(
      {mediaType: 'photo', quality: 0.8, selectionLimit: 1},
      async response => {
        if (!response.assets?.[0]?.uri) {
          return;
        }
        setMediaUploading(true);
        try {
          const url = await uploadToCloudinary(response.assets[0].uri);
          const updated = [...portfolioMedia, url];
          setPortfolioMedia(updated);
          await savePortfolioMedia(updated);
        } catch {
          Alert.alert(
            'Upload Failed',
            'Could not upload image. Please try again.',
          );
        } finally {
          setMediaUploading(false);
        }
      },
    );
  };

  const removeMediaItem = (index: number) => {
    Alert.alert('Remove Photo', 'Remove this photo from your gallery?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = portfolioMedia.filter((_, i) => i !== index);
          setPortfolioMedia(updated);
          await savePortfolioMedia(updated);
        },
      },
    ]);
  };

  const handleShare = async () => {
    const shareName = name || user?.email?.split('@')[0] || 'my profile';
    try {
      await Share.share({
        message:
          `Check out ${shareName} on CineLink!\n\n` +
          `They're a ${role} on CineLink — India's casting & film collaboration platform.\n\n` +
          'Download CineLink to view their full profile and connect! 🎬',
      });
    } catch (_) {}
  };

  const handleItemPress = () => {
    setIsEditing(true);
    setTimeout(() => {
      scrollRef.current?.scrollTo({y: 120, animated: true});
    }, 100);
  };

  const totalPhotos = portfolioPhotos.length + newPhotos.length;
  const displayName = name || user?.email?.split('@')[0] || 'Me';
  const avatarUri = photo ? photo.uri : photoUrl || null;

  return (
    <View style={[styles.container, {backgroundColor: Colors.background}]}>
      <Header
        title={isEditing ? 'Edit Profile' : 'My Profile'}
        left={
          isEditing ? (
            <TouchableOpacity
              onPress={() => setIsEditing(false)}
              style={styles.headerBtn}>
              <Text style={styles.headerBtnTextCancel}>✕</Text>
            </TouchableOpacity>
          ) : undefined
        }
        right={
          isEditing ? (
            <TouchableOpacity onPress={saveProfile} style={styles.headerBtn}>
              <Text style={styles.headerBtnTextSave}>✓</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleShare}
              style={styles.shareHeaderBtn}>
              <Text
                style={[
                  styles.shareHeaderIcon,
                  {
                    color:
                      Colors.background !== '#FFFFFF'
                        ? Colors.primary
                        : Colors.primaryDark,
                  },
                ]}>
                ↗
              </Text>
            </TouchableOpacity>
          )
        }
      />
      <ScrollView
        ref={scrollRef}
        style={[styles.scroll, {backgroundColor: Colors.background}]}
        showsVerticalScrollIndicator={false}>
        {/* ── AVATAR ── */}
        <View style={styles.avatarSection}>
          {isEditing ? (
            <TouchableOpacity
              onPress={pickProfilePhoto}
              style={styles.avatarWrapper}>
              <Avatar
                uri={avatarUri}
                name={name || user?.email}
                size="xl"
                ring
              />
              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>Edit</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.avatarWrapper}>
              <Avatar
                uri={avatarUri}
                name={name || user?.email}
                size="xl"
                ring
              />
            </View>
          )}

          {uploading && (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}

          {verificationStatus === 'verified' && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✅ Verified</Text>
            </View>
          )}

          {name ? (
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{name}</Text>
              <PremiumBadge
                tier={premiumTier}
                verifiedReal={premiumVerifiedReal}
                size="large"
              />
            </View>
          ) : null}
          <Text style={styles.email}>
            {email || user?.email || user?.phoneNumber || ''}
          </Text>
        </View>

        {/* ── FOLLOWERS / FOLLOWING STATS ── */}
        <Card variant="elevated" padding={0}>
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() =>
                navigation.navigate('Followers', {
                  userId: user?.uid,
                  displayName,
                  tab: 'followers',
                })
              }>
              <Text style={styles.statNum}>{followersCount}</Text>
              <Text style={styles.statLbl}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statItem}
              onPress={() =>
                navigation.navigate('Followers', {
                  userId: user?.uid,
                  displayName,
                  tab: 'following',
                })
              }>
              <Text style={styles.statNum}>{followingCount}</Text>
              <Text style={styles.statLbl}>Following</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ✅ PROFILE COMPLETION CARD */}
        <View style={styles.completionWrapper}>
          <ProfileCompletionCard
            name={name}
            phone={phone}
            bio={bio}
            photoUrl={photoUrl}
            role={role}
            portfolioPhotos={portfolioPhotos}
            introVideoLink={introVideoLink}
            portfolio1={portfolio1}
            onItemPress={handleItemPress}
          />
        </View>

        {/* Edit Profile button when not editing */}
        {!isEditing && (
          <View style={styles.actionBtnWrapper}>
            <Button
              label="Edit Profile"
              variant="outline"
              size="md"
              onPress={() => setIsEditing(true)}
              style={styles.editProfileBtn}
              fullWidth
            />
          </View>
        )}

        {isEditing ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Info</Text>

            <Text style={styles.label}>I am a:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.roleRow}
              contentContainerStyle={{
                gap: Spacing.sm,
                paddingRight: Spacing.sm,
              }}>
              {[
                'Actor',
                'Director',
                'Writer',
                'Editor',
                'DOP',
                'Producer',
                'Creator',
              ].map(r => (
                <Chip
                  key={r}
                  label={r}
                  selected={role === r}
                  onPress={() => setRole(r)}
                />
              ))}
            </ScrollView>

            <Input
              label="Location"
              placeholder="e.g. Mumbai, Delhi, Hyderabad"
              value={location}
              onChangeText={setLocation}
              containerStyle={styles.inputSpacing}
            />

            <Input
              label="Full Name"
              placeholder="Your full name"
              value={name}
              onChangeText={setName}
              containerStyle={styles.inputSpacing}
            />

            <Input
              label="Phone Number"
              placeholder="Your phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              containerStyle={styles.inputSpacing}
            />

            <Input
              label="Bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              style={styles.bioInput}
              containerStyle={styles.inputSpacing}
            />

            <Text style={styles.sectionTitle}>Portfolio Photos</Text>
            <Text style={styles.hint}>
              Add up to 5 photos ({totalPhotos}/5)
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoRow}>
              {portfolioPhotos.map((url, index) => (
                <View key={index} style={styles.photoBox}>
                  <Image source={{uri: url}} style={styles.portfolioPhoto} />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeExistingPhoto(index)}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {newPhotos.map((p, index) => (
                <View key={`new-${index}`} style={styles.photoBox}>
                  <Image source={{uri: p.uri}} style={styles.portfolioPhoto} />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeNewPhoto(index)}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {totalPhotos < 5 && (
                <TouchableOpacity
                  style={styles.addPhotoBtn}
                  onPress={pickPortfolioPhoto}>
                  <Text style={styles.addPhotoBtnIcon}>+</Text>
                  <Text style={styles.addPhotoBtnText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* ── PORTFOLIO GALLERY ── */}
            <Text style={styles.sectionTitle}>Portfolio Gallery</Text>
            <Text style={styles.hint}>
              {portfolioMedia.length}/20 · Tap to view · Long-press to remove
            </Text>
            <View style={styles.mediaGrid}>
              {portfolioMedia.map((url, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.mediaCell}
                  onPress={() => {
                    setGalleryIndex(i);
                    setGalleryVisible(true);
                  }}
                  onLongPress={() => removeMediaItem(i)}
                  activeOpacity={0.85}>
                  <Image
                    source={{uri: url}}
                    style={styles.mediaCellImg}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
              {portfolioMedia.length < 20 && (
                <TouchableOpacity
                  style={[styles.mediaCell, styles.mediaCellAdd]}
                  onPress={pickPortfolioMedia}
                  disabled={mediaUploading}
                  activeOpacity={0.7}>
                  {mediaUploading ? (
                    <ActivityIndicator color={Colors.primary} size="small" />
                  ) : (
                    <>
                      <Text style={styles.mediaCellPlus}>+</Text>
                      <Text style={styles.mediaCellAddText}>Add</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <Input
              label="Intro Video"
              placeholder="Paste intro video link"
              value={introVideoLink}
              onChangeText={setIntroVideoLink}
              containerStyle={styles.inputSpacing}
            />

            <Text style={styles.sectionTitle}>Portfolio / Previous Works</Text>
            <Input
              placeholder="Work 1 link"
              value={portfolio1}
              onChangeText={setPortfolio1}
              containerStyle={styles.inputSpacing}
            />
            <Input
              placeholder="Work 2 link"
              value={portfolio2}
              onChangeText={setPortfolio2}
              containerStyle={styles.inputSpacing}
            />
            <Input
              placeholder="Work 3 link"
              value={portfolio3}
              onChangeText={setPortfolio3}
              containerStyle={styles.inputSpacing}
            />

            {/* ── CASTING PROFILE ── */}
            <Text style={styles.sectionTitle}>Casting Profile</Text>

            <Text style={styles.label}>Availability</Text>
            <View style={styles.chipRow}>
              {(['Available Now', 'Booked', 'Not Looking'] as const).map(
                status => (
                  <Chip
                    key={status}
                    label={`${
                      status === 'Available Now'
                        ? '🟢'
                        : status === 'Booked'
                        ? '🟡'
                        : '🔴'
                    } ${status}`}
                    selected={availabilityStatus === status}
                    variant={availVariant(status)}
                    onPress={() =>
                      setAvailabilityStatus(prev =>
                        prev === status ? '' : status,
                      )
                    }
                  />
                ),
              )}
            </View>

            <Input
              label="Looking For"
              placeholder="e.g. Lead roles in short films, OTT projects"
              value={lookingFor}
              onChangeText={setLookingFor}
              containerStyle={styles.inputSpacing}
            />

            <Text style={styles.label}>Profile Type Tags</Text>
            <View style={styles.tagGrid}>
              {ROLE_TAGS.map(tag => (
                <Chip
                  key={tag}
                  label={tag}
                  selected={profileTags.includes(tag)}
                  onPress={() => toggleTag(tag)}
                />
              ))}
            </View>

            <Input
              label="Instagram Profile URL"
              placeholder="https://instagram.com/yourhandle"
              value={instagramLink}
              onChangeText={setInstagramLink}
              autoCapitalize="none"
              keyboardType="url"
              containerStyle={styles.inputSpacing}
            />

            <Input
              label="YouTube Channel URL"
              placeholder="https://youtube.com/@yourchannel"
              value={youtubeLink}
              onChangeText={setYoutubeLink}
              autoCapitalize="none"
              keyboardType="url"
              containerStyle={styles.inputSpacing}
            />

            <Input
              label="Age Range"
              placeholder="e.g. 22–28"
              value={ageRange}
              onChangeText={setAgeRange}
              containerStyle={styles.inputSpacing}
            />

            <Input
              label="Height"
              placeholder={'e.g. 5\'10" / 178 cm'}
              value={height}
              onChangeText={setHeight}
              containerStyle={styles.inputSpacing}
            />

            <Input
              label="Body Type"
              placeholder="e.g. Athletic, Slim, Average"
              value={bodyType}
              onChangeText={setBodyType}
              containerStyle={styles.inputSpacing}
            />

            <TouchableOpacity
              style={[
                styles.verifyBtn,
                verificationStatus === 'verified' && styles.verifyBtnDone,
                verificationStatus === 'pending' && styles.verifyBtnPending,
              ]}
              onPress={applyForVerification}>
              <Text style={styles.verifyBtnText}>
                {verificationStatus === 'pending'
                  ? '⏳ Verification Pending'
                  : verificationStatus === 'verified'
                  ? '✅ Verified'
                  : '🔰 Apply for Verification'}
              </Text>
            </TouchableOpacity>

            <Button
              label={saved ? '✅ Profile Saved!' : 'Save Profile'}
              onPress={saveProfile}
              loading={loading}
              fullWidth
              size="lg"
              variant="primary"
              style={styles.saveBtn}
            />

            <Button
              label="Cancel"
              onPress={() => setIsEditing(false)}
              fullWidth
              size="lg"
              variant="outline"
              style={styles.cancelBtn}
            />
          </View>
        ) : (
          <View style={styles.section}>
            {/* ── BIO SECTION ── */}
            {bio && bio.trim() ? (
              <Card variant="default" style={styles.viewSectionCard}>
                <Text style={styles.viewSectionTitle}>About Me</Text>
                <Text style={styles.viewBioText}>{bio}</Text>
              </Card>
            ) : null}

            {/* ── BASIC DETAILS ── */}
            <Card variant="outlined" style={styles.viewSectionCard}>
              <Text style={styles.viewSectionTitle}>Basic Details</Text>
              <View style={styles.detailItemRow}>
                <Text style={styles.detailLabel}>🎭 Role</Text>
                <Text style={styles.detailValue}>{role}</Text>
              </View>
              <View style={styles.detailDivider} />
              {location ? (
                <>
                  <View style={styles.detailItemRow}>
                    <Text style={styles.detailLabel}>📍 Location</Text>
                    <Text style={styles.detailValue}>{location}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                </>
              ) : null}
              {phone ? (
                <View style={styles.detailItemRow}>
                  <Text style={styles.detailLabel}>📱 Phone</Text>
                  <Text style={styles.detailValue}>{phone}</Text>
                </View>
              ) : null}
            </Card>

            {/* ── CASTING PROFILE ── */}
            {availabilityStatus ||
            lookingFor ||
            profileTags.length > 0 ||
            instagramLink ||
            youtubeLink ||
            ageRange ||
            height ||
            bodyType ? (
              <Card variant="default" style={styles.viewSectionCard}>
                <Text style={styles.viewSectionTitle}>
                  Casting & Physical Stats
                </Text>

                {availabilityStatus ? (
                  <View style={styles.availabilityViewRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Chip
                      label={`${
                        availabilityStatus === 'Available Now'
                          ? '🟢'
                          : availabilityStatus === 'Booked'
                          ? '🟡'
                          : '🔴'
                      } ${availabilityStatus}`}
                      selected={true}
                      variant={availVariant(availabilityStatus)}
                    />
                  </View>
                ) : null}

                {lookingFor ? (
                  <View style={styles.lookingForBox}>
                    <Text style={styles.detailLabel}>Looking For</Text>
                    <Text style={styles.lookingForText}>{lookingFor}</Text>
                  </View>
                ) : null}

                {/* Physical stats grid */}
                {ageRange || height || bodyType ? (
                  <View style={styles.statsGrid}>
                    {ageRange ? (
                      <View style={styles.gridCell}>
                        <Text style={styles.gridCellTitle}>Age Range</Text>
                        <Text style={styles.gridCellValue}>{ageRange}</Text>
                      </View>
                    ) : null}
                    {height ? (
                      <View style={styles.gridCell}>
                        <Text style={styles.gridCellTitle}>Height</Text>
                        <Text style={styles.gridCellValue}>{height}</Text>
                      </View>
                    ) : null}
                    {bodyType ? (
                      <View style={styles.gridCell}>
                        <Text style={styles.gridCellTitle}>Body Type</Text>
                        <Text style={styles.gridCellValue}>{bodyType}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Profile Type Tags */}
                {profileTags.length > 0 ? (
                  <View style={styles.tagsViewSection}>
                    <Text style={styles.detailLabel}>Profile Tags</Text>
                    <View style={styles.tagGrid}>
                      {profileTags.map(tag => (
                        <Chip key={tag} label={tag} selected={true} />
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* Social links */}
                {instagramLink || youtubeLink ? (
                  <View style={styles.socialRow}>
                    {instagramLink ? (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(instagramLink).catch(() =>
                            Alert.alert(
                              'Error',
                              'Could not open Instagram link',
                            ),
                          )
                        }
                        style={styles.socialBtn}>
                        <Text style={styles.socialBtnText}>📸 Instagram</Text>
                      </TouchableOpacity>
                    ) : null}
                    {youtubeLink ? (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(youtubeLink).catch(() =>
                            Alert.alert('Error', 'Could not open YouTube link'),
                          )
                        }
                        style={styles.socialBtn}>
                        <Text style={styles.socialBtnText}>🎥 YouTube</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            ) : null}

            {/* ── PORTFOLIO PHOTOS ── */}
            {portfolioPhotos.length > 0 ? (
              <Card variant="outlined" style={styles.viewSectionCard}>
                <Text style={styles.viewSectionTitle}>Featured Photos</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.photoRow}>
                  {portfolioPhotos.map((url, index) => (
                    <View key={index} style={styles.photoBox}>
                      <Image
                        source={{uri: url}}
                        style={styles.portfolioPhoto}
                      />
                    </View>
                  ))}
                </ScrollView>
              </Card>
            ) : null}

            {/* ── PORTFOLIO GALLERY ── */}
            {portfolioMedia.length > 0 ? (
              <Card variant="default" style={styles.viewSectionCard}>
                <Text style={styles.viewSectionTitle}>Portfolio Gallery</Text>
                <View style={styles.mediaGrid}>
                  {portfolioMedia.map((url, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.mediaCell}
                      onPress={() => {
                        setGalleryIndex(i);
                        setGalleryVisible(true);
                      }}
                      activeOpacity={0.85}>
                      <Image
                        source={{uri: url}}
                        style={styles.mediaCellImg}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            ) : null}

            {/* ── VIDEO & LINKS ── */}
            {introVideoLink || portfolio1 || portfolio2 || portfolio3 ? (
              <Card variant="outlined" style={styles.viewSectionCard}>
                <Text style={styles.viewSectionTitle}>Videos & Work Links</Text>

                {introVideoLink ? (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(introVideoLink).catch(() =>
                        Alert.alert('Error', 'Could not open video link'),
                      )
                    }
                    style={styles.videoLinkBtn}>
                    <Text style={styles.videoLinkBtnText}>
                      🎬 Watch Intro Video
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {portfolio1 ? (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(portfolio1).catch(() =>
                        Alert.alert('Error', 'Could not open link'),
                      )
                    }
                    style={styles.workLinkBtn}>
                    <Text style={styles.workLinkBtnText}>
                      🔗 Previous Work 1
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {portfolio2 ? (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(portfolio2).catch(() =>
                        Alert.alert('Error', 'Could not open link'),
                      )
                    }
                    style={styles.workLinkBtn}>
                    <Text style={styles.workLinkBtnText}>
                      🔗 Previous Work 2
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {portfolio3 ? (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(portfolio3).catch(() =>
                        Alert.alert('Error', 'Could not open link'),
                      )
                    }
                    style={styles.workLinkBtn}>
                    <Text style={styles.workLinkBtnText}>
                      🔗 Previous Work 3
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </Card>
            ) : null}

            {/* ── MENU ── */}
            <View
              style={[styles.menuSection, {marginBottom: insets.bottom + 60}]}>
              {[
                {
                  icon: '🎬',
                  label: 'My Applications',
                  screen: 'MyApplications',
                },
                ...(isApprovedDirector || isAdmin
                  ? [
                      {
                        icon: '📋',
                        label: 'Post Audition',
                        screen: 'PostAudition',
                      },
                      {
                        icon: '📊',
                        label: 'Dashboard',
                        screen: 'DirectorDashboard',
                      },
                    ]
                  : []),
                ...(isAdmin
                  ? [
                      {
                        icon: '📢',
                        label: 'Announcements',
                        screen: 'Announcements',
                      },
                      {
                        icon: '🏆',
                        label: 'Post Contest',
                        screen: 'PostContest',
                      },
                    ]
                  : []),
                {icon: '🎥', label: 'My Films', screen: 'MyFilms'},
                {icon: '🏆', label: 'My Contests', screen: 'MyContests'},
                {
                  icon: '💾',
                  label: 'Saved Auditions',
                  screen: 'SavedAuditions',
                },
                {icon: '🎓', label: 'Industry Guide', screen: 'IndustryGuide'},
                {icon: '⚙️', label: 'Settings', screen: 'Settings'},
              ].map(item => (
                <TouchableOpacity
                  key={item.screen}
                  style={styles.menuCard}
                  onPress={() => navigation.navigate(item.screen as any)}>
                  <Text style={styles.menuEmoji}>{item.icon}</Text>
                  <Text style={styles.menuText}>{item.label}</Text>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
              ))}

              {!isApprovedDirector && (
                <TouchableOpacity
                  style={styles.directorCard}
                  onPress={() => navigation.navigate('CastingRequest')}>
                  <Text style={styles.menuEmoji}>🎬</Text>
                  <Text style={styles.directorMenuText}>
                    Become a Casting Director →
                  </Text>
                </TouchableOpacity>
              )}

              {isAdmin && (
                <TouchableOpacity
                  style={styles.adminCard}
                  onPress={() => navigation.navigate('AdminReports')}>
                  <Text style={styles.menuEmoji}>🛡️</Text>
                  <Text style={styles.adminCardText}>Admin Dashboard</Text>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.logoutCard}
                onPress={() => {
                  Alert.alert('Logout', 'Are you sure you want to logout?', [
                    {text: 'Cancel', style: 'cancel'},
                    {
                      text: 'Logout',
                      style: 'destructive',
                      onPress: async () => await signOut(),
                    },
                  ]);
                }}>
                <Text style={styles.logoutText}>🚪 Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
      <ImageViewing
        images={portfolioMedia.map(url => ({uri: url}))}
        imageIndex={galleryIndex}
        visible={galleryVisible}
        onRequestClose={() => setGalleryVisible(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        backgroundColor="black"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},

  shareHeaderBtn: {padding: Spacing.xs},
  shareHeaderIcon: {color: Colors.primary, fontSize: 20, fontWeight: '600'},

  avatarSection: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  avatarWrapper: {position: 'relative', marginBottom: Spacing.md},
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  editBadgeText: {...Typography.micro, color: Colors.textInverse},
  verifiedBadge: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  verifiedBadgeText: {...Typography.label, color: Colors.success},
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  uploadingText: {...Typography.caption, color: Colors.primary},
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  profileName: {...Typography.h3, color: Colors.textPrimary},
  email: {...Typography.caption, color: Colors.textSecondary, marginTop: 2},

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  statItem: {alignItems: 'center', flex: 1},
  statDivider: {width: 1, height: 36, backgroundColor: Colors.border},
  statNum: {...Typography.h2, color: Colors.textPrimary},
  statLbl: {...Typography.caption, color: Colors.textSecondary, marginTop: 3},

  completionWrapper: {marginHorizontal: Spacing.screenH, marginTop: Spacing.md},

  section: {paddingHorizontal: Spacing.screenH, paddingBottom: Spacing['4xl']},
  sectionTitle: {
    ...Typography.label,
    color: Colors.primary,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.sm,
  },
  hint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  roleRow: {flexDirection: 'row', marginBottom: Spacing.sm},
  inputSpacing: {marginBottom: Spacing.md},
  bioInput: {height: 100, textAlignVertical: 'top'},

  photoRow: {flexDirection: 'row', marginBottom: Spacing.sm},
  photoBox: {marginRight: Spacing.md, position: 'relative'},
  portfolioPhoto: {width: 100, height: 100, borderRadius: Radius.md},
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.error,
    borderRadius: Radius.md,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {...Typography.captionBold, color: '#FFFFFF'},
  addPhotoBtn: {
    width: 100,
    height: 100,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBtnIcon: {color: Colors.primary, fontSize: 28, fontWeight: 'bold'},
  addPhotoBtnText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  verifyBtn: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  verifyBtnDone: {
    backgroundColor: Colors.successFaint,
    borderColor: Colors.successBorder,
  },
  verifyBtnPending: {
    backgroundColor: Colors.warningFaint,
    borderColor: Colors.warningBorder,
  },
  verifyBtnText: {...Typography.btn, color: Colors.primary},
  saveBtn: {marginTop: Spacing.lg},

  menuSection: {marginTop: Spacing['3xl'], marginBottom: 60},
  menuCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuEmoji: {fontSize: 22, marginRight: Spacing.lg},
  menuText: {...Typography.bodyLg, color: Colors.textPrimary, flex: 1},
  menuArrow: {color: Colors.primary, fontSize: 22, fontWeight: 'bold'},
  logoutCard: {
    backgroundColor: Colors.errorFaint,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  logoutText: {...Typography.bodyLg, color: Colors.error, fontWeight: 'bold'},
  directorCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  directorMenuText: {
    ...Typography.bodyLg,
    color: Colors.primary,
    fontWeight: 'bold',
    flex: 1,
  },
  adminCard: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  adminCardText: {
    ...Typography.bodyLg,
    color: Colors.primary,
    fontWeight: 'bold',
    flex: 1,
  },

  // ── Portfolio Gallery ─────────────────────────────────────
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  mediaCell: {width: CELL_SIZE, height: CELL_SIZE},
  mediaCellImg: {width: '100%', height: '100%'},
  mediaCellAdd: {
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mediaCellPlus: {
    color: Colors.primary,
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  mediaCellAddText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // ── Casting Profile ──────────────────────────────────────
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },

  // ── Refactored View Profile Styles ──
  headerBtn: {
    padding: Spacing.xs,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnTextCancel: {
    fontSize: 22,
    fontWeight: '300',
    color: Colors.error,
  },
  headerBtnTextSave: {
    fontSize: 22,
    fontWeight: '400',
    color: Colors.success,
  },
  actionBtnWrapper: {
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  editProfileBtn: {
    borderColor: Colors.primary,
  },
  cancelBtn: {
    marginTop: Spacing.md,
    borderColor: Colors.border,
  },
  viewSectionCard: {
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
  },
  viewSectionTitle: {
    ...Typography.label,
    color: Colors.primary,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  viewBioText: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  detailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  detailValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs,
  },
  availabilityViewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  lookingForBox: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  lookingForText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  gridCell: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  gridCellTitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  gridCellValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tagsViewSection: {
    marginBottom: Spacing.md,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  socialBtnText: {
    ...Typography.bodySm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  videoLinkBtn: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  videoLinkBtnText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  workLinkBtn: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  workLinkBtnText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
});
