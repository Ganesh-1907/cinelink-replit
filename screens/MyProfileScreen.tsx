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
  StatusBar,
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

export default function MyProfileScreen({navigation, route}: any) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [role, setRole] = useState<string>('Actor');
  const [originalRole, setOriginalRole] = useState<string>('Actor');
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
  const [applicationsCount, setApplicationsCount] = useState(0);

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

  const loadProfile = React.useCallback(async () => {
    try {
      const res = await api.get<any>('/users/profile');
      if (res?.user) {
        const data = res.user;
        setName(data?.fullName || data?.displayName || data?.name || '');
        setPhone(data?.phone || '');
        setEmail(data?.email || '');
        setBio(data?.bio || '');
        setRole(data?.role || 'Actor');
        setOriginalRole(data?.role || 'Actor');
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
        setFollowersCount(data?.followerCount || 0);
        setFollowingCount(data?.followingCount || 0);
        setApplicationsCount(data?.applicationsCount || 0);
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => loadProfile(), 300);
      return () => clearTimeout(timer);
    }, [loadProfile]),
  );

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
    if (phone && phone.trim() && phone.trim().length !== 10) {
      Alert.alert('Invalid Phone', 'Phone number must be exactly 10 digits.');
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

      const userOriginalRoleLower = (originalRole || '').toLowerCase();
      const roleToSend = (userOriginalRoleLower === 'admin' || userOriginalRoleLower === 'director')
        ? originalRole
        : role;

      const profileData = {
        fullName: trimmedName,
        phone,
        bio,
        role: roleToSend,
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
      setRole(roleToSend);
      setOriginalRole(roleToSend);
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
      <StatusBar
        barStyle={Colors.background !== '#FFFFFF' ? 'light-content' : 'dark-content'}
        backgroundColor={Colors.background}
      />
      {isEditing ? (
        <Header
          title="Edit Profile"
          left={
            <TouchableOpacity
              onPress={() => setIsEditing(false)}
              style={styles.headerBtn}>
              <Text style={styles.headerBtnTextCancel}>✕</Text>
            </TouchableOpacity>
          }
          right={
            <TouchableOpacity onPress={saveProfile} style={styles.headerBtn}>
              <Text style={styles.headerBtnTextSave}>✓</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <Header
          title="My Profile"
          navigation={navigation}
        />
      )}
      <ScrollView
        ref={scrollRef}
        style={[styles.scroll, {backgroundColor: Colors.background}]}
        contentContainerStyle={!isEditing ? {paddingTop: Spacing.sm, paddingBottom: insets.bottom + Spacing.xl} : undefined}
        showsVerticalScrollIndicator={false}>
        {/* ── PROFILE HEADER (AVATAR & INFO CENTERED) ── */}
        {isEditing ? (
          <View style={styles.avatarSection}>
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
        ) : (
          <View style={styles.centeredHeader}>
            {/* Centered Avatar with overlapping Verified Badge */}
            <View style={styles.centeredAvatarContainer}>
              <Avatar
                uri={avatarUri}
                name={name || user?.email}
                size="xl"
                ring
              />
              {verificationStatus === 'verified' && (
                <View style={styles.verifiedBadgeOverlap}>
                  <Text style={styles.verifiedBadgeOverlapText}>✓</Text>
                </View>
              )}
            </View>

            {/* Display Name */}
            <View style={styles.centeredNameRow}>
              <Text style={styles.centeredName}>{name || 'Anonymous User'}</Text>
            </View>

            {/* Role */}
            <Text style={styles.centeredRole}>{role || 'Actor'}</Text>

            {/* Location */}
            {location ? (
              <View style={styles.centeredLocationRow}>
                <Text style={styles.centeredLocationIcon}>📍</Text>
                <Text style={styles.centeredLocationText}>{location}</Text>
              </View>
            ) : null}

            {/* Action Row */}
            <View style={styles.profileActionRow}>
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                style={styles.profileEditBtn}>
                <Text style={styles.profileEditBtnText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                style={styles.profileIconBtn}>
                <Text style={styles.profileIconBtnText}>✈️</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                style={styles.profileIconBtn}>
                <Text style={styles.profileIconBtnText}>⚙️</Text>
              </TouchableOpacity>
            </View>

            {/* Flat Stats Row (Applications, Followers, Following) */}
            <View style={styles.centeredStatsRow}>
              <View style={styles.centeredStatItem}>
                <Text style={styles.centeredStatNum}>{applicationsCount}</Text>
                <Text style={styles.centeredStatLbl}>Applications</Text>
              </View>
              <TouchableOpacity
                style={styles.centeredStatItem}
                onPress={() =>
                  navigation.navigate('Followers', {
                    userId: user?.uid,
                    displayName,
                    tab: 'followers',
                  })
                }>
                <Text style={styles.centeredStatNum}>{followersCount}</Text>
                <Text style={styles.centeredStatLbl}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.centeredStatItem}
                onPress={() =>
                  navigation.navigate('Followers', {
                    userId: user?.uid,
                    displayName,
                    tab: 'following',
                  })
                }>
                <Text style={styles.centeredStatNum}>{followingCount}</Text>
                <Text style={styles.centeredStatLbl}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ✅ PROFILE COMPLETION CARD
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
        */}

        {isEditing ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Info</Text>

            <Text style={styles.label}>I am a:</Text>
            {((originalRole || '').toLowerCase() === 'admin' || (originalRole || '').toLowerCase() === 'director') ? (
              <View style={{ backgroundColor: '#1E1E24', padding: 12, borderRadius: 8, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#2E2E32' }}>
                <Text style={{ color: '#F5C451', fontWeight: '600', fontSize: 14 }}>
                  {originalRole} (System Managed Role)
                </Text>
              </View>
            ) : (
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
            )}

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
              onChangeText={t => setPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
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
              <View style={styles.viewSectionContainer}>
                <Text style={styles.viewSectionTitle}>About Me</Text>
                <Text style={styles.viewBioText}>{bio}</Text>
              </View>
            ) : null}

            {/* ── BASIC DETAILS ── */}
            {phone ? (
              <View style={styles.viewSectionContainer}>
                <Text style={styles.viewSectionTitle}>Basic Details</Text>
                <View style={styles.detailItemRow}>
                  <Text style={styles.detailLabel}>📱 Phone</Text>
                  <Text style={styles.detailValue}>{phone}</Text>
                </View>
              </View>
            ) : null}

            {/* ── CASTING PROFILE ── */}
            {availabilityStatus ||
            lookingFor ||
            profileTags.length > 0 ||
            instagramLink ||
            youtubeLink ||
            ageRange ||
            height ||
            bodyType ? (
              <View style={styles.viewSectionContainer}>
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
              </View>
            ) : null}

            {/* ── PORTFOLIO PHOTOS ── */}
            {portfolioPhotos.length > 0 ? (
              <View style={styles.viewSectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.viewSectionTitle}>Featured Photos</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (portfolioPhotos.length > 0) {
                        setGalleryIndex(0);
                        setGalleryVisible(true);
                      }
                    }}>
                    <Text style={styles.viewAllText}>View all</Text>
                  </TouchableOpacity>
                </View>
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
              </View>
            ) : null}

            {/* ── PORTFOLIO GALLERY ── */}
            {portfolioMedia.length > 0 ? (
              <View style={styles.viewSectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.viewSectionTitle}>Portfolio Gallery</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setGalleryIndex(0);
                      setGalleryVisible(true);
                    }}>
                    <Text style={styles.viewAllText}>View all</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.photoRow}>
                  {portfolioMedia.map((url, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.photoBox}
                      onPress={() => {
                        setGalleryIndex(i);
                        setGalleryVisible(true);
                      }}
                      activeOpacity={0.85}>
                      <Image
                        source={{uri: url}}
                        style={styles.portfolioPhoto}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* ── VIDEO & LINKS ── */}
            {introVideoLink || portfolio1 || portfolio2 || portfolio3 ? (
              <View style={styles.viewSectionContainer}>
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
              </View>
            ) : null}

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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
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
    paddingVertical: Spacing.md + 2,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
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
  portfolioPhoto: {width: 80, height: 110, borderRadius: Radius.md},
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
    width: 80,
    height: 110,
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

  profileHeaderCard: {
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.md,
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.md,
  },
  profileHeaderCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  profileHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  profileHeaderName: {
    ...Typography.label,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  profileHeaderSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  profileHeaderEditBtn: {
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderEditIcon: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    color: Colors.textPrimary,
    fontSize: 16,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    marginHorizontal: Spacing.screenH,
  },
  menuSection: {marginTop: Spacing.md, marginBottom: 30},
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: Spacing.screenH,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryFaint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuEmoji: {
    fontSize: 20,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuLabel: {
    ...Typography.label,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  menuDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  menuArrow: {
    color: Colors.textTertiary,
    fontSize: 18,
  },
  logoutBtn: {
    backgroundColor: Colors.error,
    borderRadius: Radius.button,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.screenH,
  },
  logoutBtnText: {
    ...Typography.label,
    fontSize: 16,
    color: '#FAFAFA',
  },

  // ── Portfolio Gallery ─────────────────────────────────────
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  mediaCell: {width: 80, height: 110, borderRadius: Radius.md, overflow: 'hidden'},
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
    marginTop: Spacing.md + 4,
    padding: Spacing.md + 4,
  },
  viewSectionContainer: {
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.md + 4,
    paddingVertical: Spacing.md,
  },
  centeredHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.screenH,
  },
  centeredAvatarContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  verifiedBadgeOverlap: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.success,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadgeOverlapText: {
    color: '#FAFAFA',
    fontSize: 11,
    fontWeight: 'bold',
  },
  centeredNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  centeredName: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  centeredRole: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  centeredLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.md,
  },
  centeredLocationIcon: {
    fontSize: 14,
  },
  centeredLocationText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  centeredStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  centeredStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  centeredStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.borderLight,
  },
  centeredStatNum: {
    ...Typography.h3,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  centeredStatLbl: {
    ...Typography.micro,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  viewAllText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  viewSectionTitle: {
    ...Typography.label,
    color: Colors.primary,
    fontSize: 16,
    marginBottom: Spacing.sm,
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
    height: 0,
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
  profileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  profileEditBtn: {
    flex: 1,
    height: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardElevated,
  },
  profileEditBtnText: {
    ...Typography.bodySm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  profileIconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardElevated,
  },
  profileIconBtnText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
});
