import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import api from '../src/api/client';
import {useApp} from '../src/context/AppContext';
import {uploadImage} from '../src/services/uploadService';
import {Avatar, Input, Chip} from '../components/ui';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {useTheme} from '../src/context/ThemeContext';

export default function ProfileFillScreen({onComplete}: {onComplete: () => void}) {
  const insets = useSafeAreaInsets();
  const {user: contextUser, userData, refreshUserData} = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Actor');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const u = userData || contextUser || {};
    setName(
      u.fullName || u.displayName || u.name || contextUser?.displayName || contextUser?.name || '',
    );
    setPhone(u.phone || '');
    setRole(u.role || 'Actor');
    setLocation(u.location || '');
    setBio(u.bio || '');
    setPhotoUrl(u.photoUrl || u.photoURL || contextUser?.photoURL || '');
  }, [contextUser, userData]);

  const handlePickPhoto = () => {
    Alert.alert('Profile Photo', 'Choose photo source', [
      {
        text: '📷 Camera',
        onPress: () =>
          launchCamera(
            {mediaType: 'photo', quality: 0.8, saveToPhotos: false},
            async (response: ImagePickerResponse) => {
              if (response.assets?.[0]?.uri) {
                await handleUploadPhoto(response.assets[0].uri);
              }
            },
          ),
      },
      {
        text: '🖼 Gallery',
        onPress: () =>
          launchImageLibrary(
            {mediaType: 'photo', quality: 0.8},
            async (response: ImagePickerResponse) => {
              if (response.assets?.[0]?.uri) {
                await handleUploadPhoto(response.assets[0].uri);
              }
            },
          ),
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleUploadPhoto = async (uri: string) => {
    setUploading(true);
    try {
      const {secureUrl} = await uploadImage(uri);
      setPhotoUrl(secureUrl);
    } catch (e) {
      Alert.alert('Upload Failed', 'Could not upload profile photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Field', 'Please enter your name.');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return;
    }
    if (!role) {
      Alert.alert('Missing Field', 'Please select your role.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Missing Field', 'Please enter your location.');
      return;
    }
    if (!bio.trim()) {
      Alert.alert('Missing Field', 'Please enter a short bio.');
      return;
    }

    setLoading(true);
    try {
      await api.put('/users/profile', {
        name: name.trim(),
        phone: phone.trim(),
        role,
        location: location.trim(),
        bio: bio.trim(),
        photoUrl,
      });

      await AsyncStorage.setItem('profile_fill_done', 'true');
      await refreshUserData();
      onComplete();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || e.message || 'Could not save profile details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 30,
            paddingBottom: insets.bottom + 30,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={styles.title}>Complete your Profile</Text>
          <Text style={styles.subtitle}>Help others in the CineLink network find and connect with you</Text>
        </View>

        {/* Avatar Picker */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickPhoto} disabled={uploading}>
            {uploading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : (
              <Avatar
                size="lg"
                uri={photoUrl}
                name={name || 'User'}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickPhoto} disabled={uploading}>
            <Text style={styles.changePhotoText}>
              {photoUrl ? 'Change Profile Photo' : 'Add Profile Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input Fields */}
        <View style={styles.formFields}>
          <Input
            label="Full Name"
            placeholder="Your full name"
            value={name}
            onChangeText={setName}
            containerStyle={styles.inputSpacing}
          />

          <Input
            label="Phone Number"
            placeholder="Your 10-digit phone number"
            value={phone}
            onChangeText={t => setPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            containerStyle={styles.inputSpacing}
          />

          <Text style={styles.label}>Your Role / Profession</Text>
          <View style={styles.roleContainer}>
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
          </View>

          <Input
            label="Location"
            placeholder="e.g. Mumbai, Delhi, Hyderabad"
            value={location}
            onChangeText={setLocation}
            containerStyle={styles.inputSpacing}
          />

          <Input
            label="Bio"
            placeholder="Tell the CineLink community about yourself..."
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            style={styles.bioInput}
            containerStyle={styles.inputSpacing}
          />
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveProfile}
          disabled={loading || uploading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <Text style={styles.saveBtnText}>Save & Continue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoBtn: {
    marginTop: Spacing.sm,
  },
  changePhotoText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  formFields: {
    marginBottom: Spacing.xl,
  },
  label: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },
  inputSpacing: {
    marginBottom: Spacing.lg,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnText: {
    ...Typography.label,
    color: Colors.textInverse,
    fontWeight: 'bold',
  },
});
