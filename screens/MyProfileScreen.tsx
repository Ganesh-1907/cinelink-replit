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
  Modal,
  Switch,
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
import {useTheme} from '../src/context/ThemeContext';

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
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [isPhonePublic, setIsPhonePublic] = useState<boolean>(true);
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
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [showFullAvatar, setShowFullAvatar] = useState(false);

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
  const [facebookLink, setFacebookLink] = useState<string>('');
  const [youtubeLink, setYoutubeLink] = useState<string>('');
  const [ageRange, setAgeRange] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [bodyType, setBodyType] = useState<string>('');

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'grid' | 'details'>('grid');
  const [featuredGalleryVisible, setFeaturedGalleryVisible] = useState<boolean>(false);
  const [featuredGalleryIndex, setFeaturedGalleryIndex] = useState<number>(0);
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
        setIsPhonePublic(data?.isPhonePublic !== false);
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
        setFacebookLink(data?.facebookLink || '');
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
    } finally {
      setProfileLoaded(true);
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
    const maxSelect = 5 - totalPhotos;
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
            {mediaType: 'photo', quality: 0.8, selectionLimit: maxSelect},
            (response: ImagePickerResponse) => {
              if (response.assets && response.assets.length > 0) {
                const selected = response.assets.map(asset => ({
                  uri: asset.uri || '',
                  type: asset.type,
                  name: asset.fileName,
                }));
                setNewPhotos(prev => [...prev, ...selected]);
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
        for (let i = 0; i < newPhotos.length; i++) {
          const pUrl = await uploadToCloudinary(newPhotos[i].uri);
          uploadedPhotos.push(pUrl);
        }
        setUploading(false);
      }

      const allPortfolioPhotos = [...portfolioPhotos, ...uploadedPhotos];
      const trimmedName = name.trim();

      const userOriginalRoleLower = (originalRole || '').toLowerCase();
      const roleToSend =
        userOriginalRoleLower === 'admin' ||
        userOriginalRoleLower === 'director'
          ? originalRole
          : role;

      const profileData = {
        fullName: trimmedName,
        phone,
        isPhonePublic,
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
        facebookLink,
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
    const remaining = 20 - portfolioMedia.length;
    if (remaining <= 0) {
      Alert.alert(
        'Limit Reached',
        'Portfolio gallery is limited to 20 images.',
      );
      return;
    }
    launchImageLibrary(
      {mediaType: 'photo', quality: 0.8, selectionLimit: remaining},
      async response => {
        const assets = response.assets || [];
        if (assets.length === 0) {
          return;
        }
        setMediaUploading(true);
        try {
          const uploadedUrls: string[] = [];
          let failCount = 0;
          for (let i = 0; i < assets.length; i++) {
            const asset = assets[i];
            if (asset.uri) {
              try {
                const url = await uploadToCloudinary(asset.uri);
                if (url) {
                  uploadedUrls.push(url);
                } else {
                  failCount++;
                }
              } catch (err) {
                console.log('Upload error for image:', err);
                failCount++;
              }
            }
          }
          if (uploadedUrls.length > 0) {
            const updated = [...portfolioMedia, ...uploadedUrls];
            setPortfolioMedia(updated);
            await savePortfolioMedia(updated);
          }
          if (failCount > 0) {
            Alert.alert(
              'Upload Warning',
              `Successfully uploaded ${uploadedUrls.length} images. ${failCount} images failed due to size or network issues.`,
            );
          }
        } catch {
          Alert.alert(
            'Upload Failed',
            'Could not upload one or more images. Please try again.',
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

  if (!profileLoaded) {
    return (
      <View style={[styles.container, {backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: Colors.background}]}>
      <StatusBar
        barStyle={
          Colors.background !== '#FFFFFF' ? 'light-content' : 'dark-content'
        }
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
        <Header title="My Profile" navigation={navigation} />
      )}
      <ScrollView
        ref={scrollRef}
        style={[styles.scroll, {backgroundColor: Colors.background}]}
        contentContainerStyle={
          !isEditing
            ? {
                paddingTop: 0,
                paddingBottom: insets.bottom + Spacing.xl,
              }
            : undefined
        }
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
          <View style={styles.instagramHeaderContainer}>
            {/* Top row: Avatar on left, Stats on right */}
            <View style={styles.instagramTopRow}>
              {/* Avatar with verified badge overlap */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setShowFullAvatar(true)}
                style={styles.instagramAvatarContainer}>
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
              </TouchableOpacity>

              {/* Stats column block */}
              <View style={styles.instagramStatsContainer}>
                <View style={styles.instagramStatCol}>
                  <Text style={styles.instagramStatNum}>{portfolioMedia.length}</Text>
                  <Text style={styles.instagramStatLbl}>posts</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.instagramStatCol}
                  onPress={() =>
                    navigation.navigate('Followers', {
                      userId: user?.uid,
                      displayName,
                      tab: 'followers',
                    })
                  }>
                  <Text style={styles.instagramStatNum}>{followersCount}</Text>
                  <Text style={styles.instagramStatLbl}>followers</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.instagramStatCol}
                  onPress={() =>
                    navigation.navigate('Followers', {
                      userId: user?.uid,
                      displayName,
                      tab: 'following',
                    })
                  }>
                  <Text style={styles.instagramStatNum}>{followingCount}</Text>
                  <Text style={styles.instagramStatLbl}>following</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Middle block: Name, role subtitle, location, bio */}
            <View style={styles.instagramBioContainer}>
              {name ? <Text style={styles.instagramDisplayName}>{name}</Text> : null}
              <Text style={styles.instagramRoleSubtitle}>{role || 'Actor'}</Text>
              {location ? (
                <Text style={styles.instagramLocationText}>📍 {location}</Text>
              ) : null}
              {bio && bio.trim() ? <Text style={styles.instagramBioText}>{bio}</Text> : null}
            </View>

            {/* Action Row */}
            <View style={styles.instagramActionRow}>
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                style={styles.instagramActionBtn}>
                <Text style={styles.instagramActionBtnText}>Edit profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                style={styles.instagramShareBtn}>
                <Text style={styles.instagramShareBtnText}>Share profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                style={styles.instagramIconBtn}>
                <Text style={styles.instagramIconBtnText}>⚙️</Text>
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
            {(originalRole || '').toLowerCase() === 'admin' ||
            (originalRole || '').toLowerCase() === 'director' ? (
              <View
                style={{
                  backgroundColor: Colors.card,
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: Spacing.sm,
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}>
                <Text
                  style={{color: Colors.primary, fontWeight: '600', fontSize: 14}}>
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
              onChangeText={t =>
                setPhone(t.replace(/[^0-9]/g, '').slice(0, 10))
              }
              keyboardType="phone-pad"
              containerStyle={styles.inputSpacing}
            />

            <View style={styles.toggleRow}>
              <View style={{flex: 1}}>
                <Text style={styles.toggleLabel}>Public Phone & WhatsApp</Text>
                <Text style={styles.toggleHint}>Disable to hide phone number & buttons from other users (recommended for privacy/safety)</Text>
              </View>
              <Switch
                value={isPhonePublic}
                onValueChange={setIsPhonePublic}
                trackColor={{false: '#CCCCCC', true: Colors.primary}}
                thumbColor={Colors.textPrimary}
              />
            </View>

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
              label="Facebook Profile URL"
              placeholder="https://facebook.com/yourprofile"
              value={facebookLink}
              onChangeText={setFacebookLink}
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
          <View style={styles.instagramContentContainer}>
            {/* Highlights (Portfolio Photos as circular highlights) */}
            <View style={styles.highlightsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.highlightsScroll}>
                {portfolioPhotos.map((url, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.highlightItem}
                    onPress={() => {
                      setFeaturedGalleryIndex(i);
                      setFeaturedGalleryVisible(true);
                    }}>
                    <View style={styles.highlightCircle}>
                      <Image source={{uri: url}} style={styles.highlightImg} />
                    </View>
                    <Text style={styles.highlightLabel} numberOfLines={1}>
                      Featured {i + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
                {totalPhotos < 5 && (
                  <TouchableOpacity
                    style={styles.highlightItem}
                    onPress={() => {
                      setIsEditing(true);
                      setTimeout(() => {
                        scrollRef.current?.scrollTo({y: 400, animated: true});
                      }, 200);
                    }}>
                    <View style={[styles.highlightCircle, styles.highlightCircleNew]}>
                      <Text style={styles.highlightPlusText}>+</Text>
                    </View>
                    <Text style={styles.highlightLabel}>New</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            {/* Instagram Style Tab Bar */}
            <View style={styles.instagramTabBar}>
              <TouchableOpacity
                style={[
                  styles.instagramTabItem,
                  activeTab === 'grid' && styles.instagramTabItemActive,
                ]}
                onPress={() => setActiveTab('grid')}>
                <Text
                  style={[
                    styles.instagramTabIcon,
                    activeTab === 'grid' && styles.instagramTabIconActive,
                  ]}>
                  ▦
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.instagramTabItem,
                  activeTab === 'details' && styles.instagramTabItemActive,
                ]}
                onPress={() => setActiveTab('details')}>
                <Text
                  style={[
                    styles.instagramTabIcon,
                    activeTab === 'details' && styles.instagramTabIconActive,
                  ]}>
                  👤
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Contents */}
            {activeTab === 'grid' ? (
              <View style={styles.instagramGridContainer}>
                {portfolioMedia.length > 0 ? (
                  <View style={styles.instagramMediaGrid}>
                    {portfolioMedia.map((url, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.instagramMediaCell}
                        onPress={() => {
                          setGalleryIndex(i);
                          setGalleryVisible(true);
                        }}
                        activeOpacity={0.85}>
                        <Image
                          source={{uri: url}}
                          style={styles.instagramMediaCellImg}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyGridContainer}>
                    <Text style={styles.emptyGridText}>No posts yet</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.instagramDetailsContainer}>
                {/* ── BIO SECTION ── */}
                {bio && bio.trim() ? (
                  <View style={styles.detailsCard}>
                    <Text style={styles.detailsCardTitle}>About Me</Text>
                    <Text style={styles.viewBioText}>{bio}</Text>
                  </View>
                ) : null}

                {/* ── CASTING & PHYSICAL STATS CARD ── */}
                {(ageRange || height || bodyType || availabilityStatus || lookingFor) ? (
                  <View style={styles.detailsCard}>
                    <Text style={styles.detailsCardTitle}>Casting & Physical Stats</Text>

                    {availabilityStatus ? (
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>⚡ Status</Text>
                        <Chip
                          label={`${
                            availabilityStatus === 'Available Now'
                              ? '🟢'
                              : availabilityStatus === 'Booked'
                              ? '🟡'
                              : '🔴'
                          } ${availabilityStatus}`}
                          selected={true}
                          variant={availVariant ? availVariant(availabilityStatus) : 'success'}
                        />
                      </View>
                    ) : null}

                    {ageRange ? (
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>🎂 Age Range</Text>
                        <Text style={styles.detailRowValue}>{ageRange}</Text>
                      </View>
                    ) : null}

                    {height ? (
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>📏 Height</Text>
                        <Text style={styles.detailRowValue}>{height}</Text>
                      </View>
                    ) : null}

                    {bodyType ? (
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>👤 Body Type</Text>
                        <Text style={styles.detailRowValue}>{bodyType}</Text>
                      </View>
                    ) : null}

                    {lookingFor ? (
                      <View style={[styles.detailRowItem, {flexDirection: 'column', alignItems: 'flex-start', borderBottomWidth: 0}]}>
                        <Text style={[styles.detailRowLabel, {marginBottom: 4}]}>🔍 Looking For</Text>
                        <Text style={styles.detailRowSubtext}>{lookingFor}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* ── PROFILE TAGS CARD ── */}
                {profileTags && profileTags.length > 0 ? (
                  <View style={styles.detailsCard}>
                    <Text style={styles.detailsCardTitle}>Specializations</Text>
                    <View style={styles.detailsTagGrid}>
                      {profileTags.map(tag => (
                        <Chip key={tag} label={tag} selected={true} />
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* ── CONTACT & SOCIALS CARD ── */}
                {(phone || instagramLink || facebookLink || youtubeLink) ? (
                  <View style={styles.detailsCard}>
                    <Text style={styles.detailsCardTitle}>Contact & Socials</Text>
                    
                    {phone ? (
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>📞 Phone {isPhonePublic ? '(Public)' : '(Private)'}</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs}}>
                          <TouchableOpacity 
                            onPress={() => Linking.openURL(`tel:${phone}`)}
                            style={styles.detailsPhoneAction}>
                            <Text style={styles.detailsPhoneText}>{phone}</Text>
                            <Text style={styles.detailsPhoneIcon}>📞</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => {
                              const cleanPhone = phone.replace(/[^0-9]/g, '');
                              const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                              Linking.openURL(`whatsapp://send?phone=${formattedPhone}`).catch(() => 
                                Alert.alert('WhatsApp Not Installed', 'Please install WhatsApp to chat.')
                              );
                            }}
                            style={[styles.detailsPhoneAction, {backgroundColor: '#25D36620', borderColor: '#25D366'}]}>
                            <Text style={[styles.detailsPhoneText, {color: '#25D366'}]}>WhatsApp</Text>
                            <Text style={styles.detailsPhoneIcon}>💬</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}

                    {/* Social Buttons List */}
                    {(instagramLink || facebookLink || youtubeLink) ? (
                      <View style={styles.detailsSocialGrid}>
                        {instagramLink ? (
                          <TouchableOpacity
                            onPress={() =>
                              Linking.openURL(instagramLink).catch(() =>
                                Alert.alert('Error', 'Could not open Instagram link'),
                              )
                            }
                            style={[styles.detailsSocialBtn, {borderColor: '#E1306C'}]}>
                            <Text style={[styles.detailsSocialBtnText, {color: '#E1306C'}]}>📸 Instagram</Text>
                          </TouchableOpacity>
                        ) : null}

                        {facebookLink ? (
                          <TouchableOpacity
                            onPress={() =>
                              Linking.openURL(facebookLink).catch(() =>
                                Alert.alert('Error', 'Could not open Facebook link'),
                              )
                            }
                            style={[styles.detailsSocialBtn, {borderColor: '#1877F2'}]}>
                            <Text style={[styles.detailsSocialBtnText, {color: '#1877F2'}]}>👤 Facebook</Text>
                          </TouchableOpacity>
                        ) : null}

                        {youtubeLink ? (
                          <TouchableOpacity
                            onPress={() =>
                              Linking.openURL(youtubeLink).catch(() =>
                                Alert.alert('Error', 'Could not open YouTube link'),
                              )
                            }
                            style={[styles.detailsSocialBtn, {borderColor: '#FF0000'}]}>
                            <Text style={[styles.detailsSocialBtnText, {color: '#FF0000'}]}>🎥 YouTube</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* ── VIDEO & PORTFOLIO LINKS CARD ── */}
                {(introVideoLink || portfolio1 || portfolio2 || portfolio3) ? (
                  <View style={styles.detailsCard}>
                    <Text style={styles.detailsCardTitle}>Videos & Work Links</Text>

                    {introVideoLink ? (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(introVideoLink).catch(() =>
                            Alert.alert('Error', 'Could not open video link'),
                          )
                        }
                        style={styles.detailsVideoBtn}>
                        <Text style={styles.detailsVideoBtnText}>🎬 Watch Intro Video</Text>
                      </TouchableOpacity>
                    ) : null}

                    {portfolio1 ? (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(portfolio1).catch(() =>
                            Alert.alert('Error', 'Could not open link'),
                          )
                        }
                        style={styles.detailsWorkLinkBtn}>
                        <Text style={styles.detailsWorkLinkBtnText}>🔗 Previous Work 1</Text>
                      </TouchableOpacity>
                    ) : null}

                    {portfolio2 ? (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(portfolio2).catch(() =>
                            Alert.alert('Error', 'Could not open link'),
                          )
                        }
                        style={styles.detailsWorkLinkBtn}>
                        <Text style={styles.detailsWorkLinkBtnText}>🔗 Previous Work 2</Text>
                      </TouchableOpacity>
                    ) : null}

                    {portfolio3 ? (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(portfolio3).catch(() =>
                            Alert.alert('Error', 'Could not open link'),
                          )
                        }
                        style={styles.detailsWorkLinkBtn}>
                        <Text style={styles.detailsWorkLinkBtnText}>🔗 Previous Work 3</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </View>
            )}
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
      <ImageViewing
        images={portfolioPhotos.map(url => ({uri: url}))}
        imageIndex={featuredGalleryIndex}
        visible={featuredGalleryVisible}
        onRequestClose={() => setFeaturedGalleryVisible(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        backgroundColor="black"
      />

      {/* FULL AVATAR IMAGE VIEW MODAL */}
      <Modal
        visible={showFullAvatar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullAvatar(false)}
      >
        <TouchableOpacity
          style={styles.avatarModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFullAvatar(false)}
        >
          <View style={styles.avatarModalContent}>
            {avatarUri ? (
              <Image
                source={{uri: avatarUri}}
                style={styles.avatarModalImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarModalImage, styles.avatarModalPlaceholder]}>
                <Text style={styles.avatarModalPlaceholderText}>
                  {name ? name.substring(0, 1).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},

  instagramHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  instagramTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  instagramAvatarContainer: {
    position: 'relative',
  },
  instagramStatsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    marginLeft: 20,
  },
  instagramStatCol: {
    alignItems: 'center',
  },
  instagramStatNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  instagramStatLbl: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  instagramBioContainer: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  instagramDisplayName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  instagramRoleSubtitle: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  instagramLocationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  instagramBioText: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 4,
    lineHeight: 18,
  },
  instagramActionRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
    alignItems: 'center',
  },
  instagramActionBtn: {
    flex: 1,
    height: 36,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instagramActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  instagramShareBtn: {
    flex: 1,
    height: 36,
    backgroundColor: 'transparent',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  instagramShareBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  instagramIconBtn: {
    width: 36,
    height: 36,
    backgroundColor: Colors.cardElevated,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  instagramIconBtnText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  instagramContentContainer: {
    flex: 1,
  },
  highlightsContainer: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  highlightsScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  highlightItem: {
    alignItems: 'center',
    width: 72,
  },
  highlightCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  highlightCircleNew: {
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  highlightImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  highlightLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    width: 72,
  },
  highlightPlusText: {
    color: Colors.textSecondary,
    fontSize: 24,
    fontWeight: '300',
  },
  instagramTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  instagramTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: 'transparent',
  },
  instagramTabItemActive: {
    borderBottomColor: Colors.textPrimary,
  },
  instagramTabIcon: {
    fontSize: 18,
    color: Colors.textTertiary,
  },
  instagramTabIconActive: {
    color: Colors.textPrimary,
  },
  instagramGridContainer: {
    flex: 1,
  },
  instagramMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  instagramMediaCell: {
    width: Math.floor(SCREEN_W / 3) - 1,
    height: Math.floor(SCREEN_W / 3) - 1,
  },
  instagramMediaCellImg: {
    width: '100%',
    height: '100%',
  },
  emptyGridContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyGridText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  instagramDetailsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  detailsCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  detailsCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    paddingBottom: 6,
  },
  detailRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  detailRowLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  detailRowValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  detailRowSubtext: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginTop: 4,
  },
  detailsTagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailsPhoneAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailsPhoneText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  detailsPhoneIcon: {
    fontSize: 14,
    color: Colors.primary,
  },
  detailsSocialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  detailsSocialBtn: {
    flex: 1,
    minWidth: '45%',
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardElevated,
  },
  detailsSocialBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsVideoBtn: {
    backgroundColor: Colors.primary,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsVideoBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textInverse,
  },
  detailsWorkLinkBtn: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsWorkLinkBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

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
    color: Colors.textPrimary,
  },

  // ── Portfolio Gallery ─────────────────────────────────────
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  mediaCell: {
    width: 80,
    height: 110,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
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
    color: Colors.textPrimary,
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
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModalContent: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 4,
    borderColor: Colors.card,
    backgroundColor: Colors.cardElevated,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 130,
  },
  avatarModalPlaceholder: {
    backgroundColor: Colors.primaryFaint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModalPlaceholderText: {
    color: Colors.primary,
    fontSize: 72,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toggleLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleHint: {
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
    paddingRight: Spacing.md,
  },
});
