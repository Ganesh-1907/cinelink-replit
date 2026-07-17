import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Card, Input} from '../components/ui';

type AuditionForm = {
  title: string;
  role: string;
  location: string;
  lastDate: string;
  description: string;
  requirements: string;
  contactInfo: string;
  gender: string;
  ageRange: string;
  language: string;
};

const EMPTY_FORM: AuditionForm = {
  title: '',
  role: '',
  location: '',
  lastDate: '',
  description: '',
  requirements: '',
  contactInfo: '',
  gender: '',
  ageRange: '',
  language: '',
};

const FIELDS: {key: keyof AuditionForm; label: string; multiline?: boolean}[] =
  [
    {key: 'title', label: '🎬 Film / Project Title'},
    {key: 'role', label: '🎭 Role'},
    {key: 'language', label: '🗣️ Language'},
    {key: 'location', label: '📍 Location'},
    {key: 'lastDate', label: '📅 Last Date / Audition Date'},
    {key: 'gender', label: '👤 Gender'},
    {key: 'ageRange', label: '🔢 Age Range'},
    {key: 'requirements', label: '📋 Requirements', multiline: true},
    {key: 'description', label: '📝 Description', multiline: true},
    {key: 'contactInfo', label: '📞 Contact Info'},
  ];

/* ── safe error message helper ── */
const getErrorMessage = (e: unknown): string => {
  if (e instanceof Error) {
    return e.message;
  }
  if (typeof e === 'string') {
    return e;
  }
  return 'Unknown error occurred';
};

export default function QuickPostScreen({navigation}: any) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [form, setForm] = useState<AuditionForm>(EMPTY_FORM);
  const [scanning, setScanning] = useState(false);
  const [posting, setPosting] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  const user = auth().currentUser;
  const directorName =
    user?.displayName || user?.email?.split('@')[0] || 'Admin';

  /* ── PICK IMAGE ── */
  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.8,
      });
      if (result.didCancel || !result.assets?.[0]) {
        return;
      }
      const asset = result.assets[0];
      setImageUri(asset.uri || null);
      setImageBase64(asset.base64 || null);
      setAiDone(false);
      setForm(EMPTY_FORM);
    } catch (e) {
      console.log('Image pick error:', e);
    }
  };

  /* ── SCAN WITH AI (via backend API) ── */
  const scanWithAI = async () => {
    if (!imageBase64) {
      Alert.alert('No Image', 'Please pick an audition poster first.');
      return;
    }

    setScanning(true);

    try {
      // Use backend API — the Gemini API key is on the server, not in the app
      const result = await api.post('/ai/scan-audition-poster', {
        imageBase64,
        mimeType: 'image/jpeg',
      });

      const parsed = result.form;
      setForm({
        title: String(parsed.title || ''),
        role: String(parsed.role || ''),
        location: String(parsed.location || ''),
        lastDate: String(parsed.lastDate || ''),
        description: String(parsed.description || ''),
        requirements: String(parsed.requirements || ''),
        contactInfo: String(parsed.contactInfo || ''),
        gender: String(parsed.gender || ''),
        ageRange: String(parsed.ageRange || ''),
        language: String(parsed.language || ''),
      });

      setAiDone(true);
    } catch (e: any) {
      console.log('AI Scan error:', e);
      Alert.alert(
        '❌ AI Scan Failed',
        e?.message ||
          'Could not read the poster. Try a clearer image or fill manually.',
      );
    } finally {
      setScanning(false);
    }
  };

  /* ── POST AUDITION ── */
  const postAudition = async () => {
    if (!form.title || !form.role || !form.location) {
      Alert.alert(
        'Missing Fields',
        'Please fill at least Title, Role and Location.',
      );
      return;
    }

    setPosting(true);

    try {
      await firestore()
        .collection('auditions')
        .add({
          ...form,
          directorId: user?.uid,
          directorEmail: user?.email,
          directorName,
          status: 'Open',
          posterImage: imageUri || null,
          isActive: true,
          applicants: [],
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      Alert.alert('✅ Posted!', 'Audition posted successfully!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e) {
      console.log('Post audition error:', e);
      Alert.alert(
        'Error',
        'Failed to post audition. Check your connection and try again.',
      );
    } finally {
      setPosting(false);
    }
  };

  const updateField = (key: keyof AuditionForm, value: string) =>
    setForm(prev => ({...prev, [key]: value}));

  /* ── RENDER ── */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <Header
        title="⚡ Quick Post"
        navigation={navigation}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.pageSubtitle}>
          Upload an audition poster — AI will auto-fill the form
        </Text>

        {/* IMAGE PICKER */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image
              source={{uri: imageUri}}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePickerContent}>
              <Text style={styles.imagePickerIcon}>🖼️</Text>
              <Text style={styles.imagePickerText}>
                Tap to upload audition poster
              </Text>
              <Text style={styles.imagePickerHint}>JPG, PNG supported</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* SCAN BUTTON */}
        {imageUri && !aiDone && (
          <Button
            label={scanning ? 'AI is reading the poster...' : '✨ Scan with AI'}
            onPress={scanWithAI}
            variant="primary"
            fullWidth
            loading={scanning}
            disabled={scanning}
          />
        )}

        {/* MANUAL FILL OPTION */}
        {imageUri && !aiDone && !scanning && (
          <View style={styles.manualBtnWrap}>
            <Button
              label="✏️ Fill manually instead"
              onPress={() => setAiDone(true)}
              variant="ghost"
              fullWidth
            />
          </View>
        )}

        {/* SUCCESS BANNER */}
        {aiDone && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>
              ✅ AI filled the form! Review and edit below before posting.
            </Text>
          </View>
        )}

        {/* FORM */}
        {(aiDone || imageUri) && (
          <Card variant="elevated" padding={Spacing.lg}>
            <Text style={styles.sectionTitle}>
              {aiDone ? '📋 Review & Edit' : '📋 Fill Manually'}
            </Text>

            {FIELDS.map(field => (
              <View key={field.key} style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    field.multiline && styles.multilineInput,
                  ]}
                  value={form[field.key]}
                  onChangeText={v => updateField(field.key, v)}
                  placeholder={`Enter ${field.label.replace(/.*\s/, '')}`}
                  placeholderTextColor={Colors.textSecondary}
                  multiline={field.multiline}
                  textAlignVertical={field.multiline ? 'top' : 'center'}
                />
              </View>
            ))}

            <View style={styles.postBtnWrap}>
              <Button
                label="🚀 Post Audition"
                onPress={postAudition}
                variant="primary"
                fullWidth
                loading={posting}
                disabled={posting}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.lg, paddingBottom: Spacing['4xl']},

  pageSubtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  imagePicker: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  imagePickerContent: {alignItems: 'center', gap: Spacing.sm},
  imagePickerIcon: {fontSize: 40},
  imagePickerText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  imagePickerHint: {...Typography.caption, color: Colors.textSecondary},
  previewImage: {width: '100%', height: '100%'},

  manualBtnWrap: {marginTop: Spacing.sm},

  successBanner: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  successText: {...Typography.label, color: Colors.success},

  sectionTitle: {
    ...Typography.h4,
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },

  fieldContainer: {marginBottom: Spacing.md},
  fieldLabel: {
    ...Typography.labelSm,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  fieldInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    ...Typography.body,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  multilineInput: {minHeight: 80, paddingTop: Spacing.sm},

  postBtnWrap: {marginTop: Spacing.sm},
});
