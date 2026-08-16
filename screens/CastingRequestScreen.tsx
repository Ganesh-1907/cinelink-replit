import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import api from '../src/api/client';
import {uploadImage} from '../src/services/uploadService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Input, Card} from '../components/ui';
import {useApp} from '../src/context/AppContext';
import {useTheme} from '../src/context/ThemeContext';

const STEPS = ['Basic Info', 'ID Proof', 'Phone Verify', 'Submit'];

export default function CastingRequestScreen({navigation}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);

  const [message, setMessage] = useState('');
  const [experience, setExperience] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [yearsExp, setYearsExp] = useState('');

  const [idType, setIdType] = useState('Aadhaar');
  const [idPhoto, setIdPhoto] = useState<any>(null);
  const [idPhotoUrl, setIdPhotoUrl] = useState('');
  const [companyPhoto, setCompanyPhoto] = useState<any>(null);
  const [companyPhotoUrl, setCompanyPhotoUrl] = useState('');
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingCompany, setUploadingCompany] = useState(false);

  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const {user} = useApp();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    checkExistingRequest();
  }, []);

  const checkExistingRequest = async () => {
    try {
      const res = await api.get<{status: string | null}>('/users/casting-request-status');
      if (res.status) {
        setRequestStatus(res.status);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setCheckingStatus(false);
    }
  };

  const uploadToCloudinary = async (uri: string): Promise<string> => {
    const result = await uploadImage(uri);
    return result.secureUrl;
  };

  const pickIdPhoto = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets?.[0]) {
      const asset = result.assets[0];
      setIdPhoto(asset);
      setUploadingId(true);
      try {
        const url = await uploadToCloudinary(asset.uri!);
        setIdPhotoUrl(url);
      } catch (e) {
        Alert.alert('Upload failed', 'Could not upload ID photo. Try again.');
      } finally {
        setUploadingId(false);
      }
    }
  };

  const pickCompanyPhoto = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets?.[0]) {
      const asset = result.assets[0];
      setCompanyPhoto(asset);
      setUploadingCompany(true);
      try {
        const url = await uploadToCloudinary(asset.uri!);
        setCompanyPhotoUrl(url);
      } catch (e) {
        Alert.alert('Upload failed', 'Could not upload document. Try again.');
      } finally {
        setUploadingCompany(false);
      }
    }
  };

  const handlePhoneVerify = () => {
    if (!phone.trim() || phone.length < 10) {
      Alert.alert('Invalid', 'Please enter a valid 10-digit phone number.');
      return;
    }
    setPhoneVerified(true);
    Alert.alert(
      '📱 Phone Registered!',
      `Your number +91${phone} has been recorded. Admin will WhatsApp or call you to verify before approving your request.`,
    );
  };

  const validateStep = (): boolean => {
    if (currentStep === 0) {
      if (!message.trim()) {
        Alert.alert('Required', 'Please tell us about yourself.');
        return false;
      }
      if (!companyName.trim()) {
        Alert.alert(
          'Required',
          'Please enter your company/production house name.',
        );
        return false;
      }
      if (!yearsExp.trim()) {
        Alert.alert('Required', 'Please enter your years of experience.');
        return false;
      }
      return true;
    }
    if (currentStep === 1) {
      if (!idPhotoUrl) {
        Alert.alert('Required', 'Please upload your ID proof photo.');
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      if (!phoneVerified) {
        Alert.alert(
          'Required',
          'Please register and verify your phone number.',
        );
        return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const submitRequest = async () => {
    setLoading(true);
    try {
      await api.post('/users/casting-request', {
        companyName: companyName.trim(),
        yearsExperience: yearsExp.trim(),
        message: message.trim(),
        experience: experience.trim(),
        portfolio: portfolio.trim(),
        idType,
        idProofUrl: idPhotoUrl,
        companyDocUrl: companyPhotoUrl,
        phone: `+91${phone}`,
        phoneVerified,
      });

      setRequestStatus('pending');
      Alert.alert(
        '✅ Request Submitted!',
        'Your application with ID proof has been sent to admin. They will WhatsApp you on +91' +
          phone +
          ' for verification within 24-48 hours.',
      );
    } catch (e: any) {
      console.log('SUBMIT ERROR:', e);
      Alert.alert(
        'Error',
        e?.message || 'Could not submit request. Try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: Colors.background}]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (requestStatus === 'pending') {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: Colors.background}]}>
        <Header
          title="Application Status"
          navigation={navigation}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.statusPage}>
          <Text style={styles.statusBigIcon}>⏳</Text>
          <Text style={styles.statusBigTitle}>Application Under Review</Text>
          <Text style={styles.statusBigText}>
            Your casting director application with ID proof is being reviewed by
            admin. They will WhatsApp you for phone verification within 24-48
            hours.
          </Text>
          <Card variant="outlined" padding={Spacing.lg}>
            <Text style={styles.statusStepItem}>✅ Application submitted</Text>
            <Text style={styles.statusStepItem}>✅ ID proof uploaded</Text>
            <Text style={styles.statusStepItem}>✅ Phone registered</Text>
            <Text style={styles.statusStepPending}>
              ⏳ Admin review in progress
            </Text>
            <Text style={styles.statusStepPending}>
              ⏳ Phone call verification
            </Text>
            <Text style={styles.statusStepPending}>⏳ Final approval</Text>
          </Card>
          <Button
            label="← Go Back"
            onPress={() => navigation.goBack()}
            variant="outline"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (requestStatus === 'approved') {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: Colors.background}]}>
        <Header
          title="Application Status"
          navigation={navigation}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.statusPage}>
          <Text style={styles.statusBigIcon}>🎬</Text>
          <Text style={styles.statusBigTitle}>
            You are an Approved Casting Director!
          </Text>
          <Text style={styles.statusBigText}>
            Congratulations! You can now post auditions on CineLink. Go to Home
            and tap Post Audition.
          </Text>
          <Button
            label="🎭 Post an Audition Now →"
            onPress={() => navigation.navigate('PostAudition')}
            variant="primary"
            size="lg"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: Colors.background}]}>
      <Header
        title="🎭 Casting Director Application"
        navigation={navigation}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {paddingBottom: insets.bottom + 40},
        ]}
        style={{backgroundColor: Colors.background}}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.headerSubtitle}>
          Complete all steps to get verified and post auditions on CineLink
        </Text>

        {/* STEP INDICATOR */}
        <View style={styles.stepRow}>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  i <= currentStep && styles.stepCircleActive,
                  i < currentStep && styles.stepCircleDone,
                ]}>
                <Text style={styles.stepCircleText}>
                  {i < currentStep ? '✓' : i + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  i === currentStep && styles.stepLabelActive,
                ]}>
                {step}
              </Text>
            </View>
          ))}
        </View>

        {/* SECURITY BANNER */}
        <View style={styles.securityBanner}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            5-layer verification: Profile → ID Proof → Phone → Admin Review →
            Approval
          </Text>
        </View>

        {/* ── STEP 0: BASIC INFO ── */}
        {currentStep === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 1: Tell us about yourself</Text>
            <Input
              label="Company / Production House Name *"
              placeholder="e.g. Star Films Production"
              value={companyName}
              onChangeText={setCompanyName}
            />
            <Input
              label="Years of Experience *"
              placeholder="e.g. 5 years"
              value={yearsExp}
              onChangeText={setYearsExp}
            />
            <Input
              label="Why do you want to post auditions? *"
              placeholder="Tell admin about yourself, your films, your casting needs..."
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <Text style={styles.charCount}>{message.length}/500</Text>
            <Input
              label="Previous Film / Ad Credits (optional)"
              placeholder="e.g. Directed 3 Telugu short films, 2 ads for..."
              value={experience}
              onChangeText={setExperience}
            />
            <Input
              label="Portfolio / IMDB / YouTube Link (optional)"
              placeholder="https://..."
              value={portfolio}
              onChangeText={setPortfolio}
            />
          </View>
        )}

        {/* ── STEP 1: ID PROOF ── */}
        {currentStep === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 2: Upload ID Proof</Text>
            <Text style={styles.stepDesc}>
              This is required to verify your identity and protect actors on our
              platform. Your ID is only visible to CineLink admin.
            </Text>

            <Text style={styles.fieldLabel}>Select ID Type *</Text>
            <View style={styles.idTypeRow}>
              {['Aadhaar', 'PAN', 'Passport', 'Driving License'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.idTypeBtn,
                    idType === type && styles.idTypeBtnActive,
                  ]}
                  onPress={() => setIdType(type)}>
                  <Text
                    style={[
                      styles.idTypeBtnText,
                      idType === type && styles.idTypeBtnTextActive,
                    ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Upload {idType} Card Photo *</Text>
            <TouchableOpacity style={styles.uploadBox} onPress={pickIdPhoto}>
              {idPhoto ? (
                <View style={styles.uploadedBox}>
                  <Image
                    source={{uri: idPhoto.uri}}
                    style={styles.uploadedImage}
                  />
                  {uploadingId && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  )}
                  {idPhotoUrl && !uploadingId && (
                    <View style={styles.uploadedBadge}>
                      <Text style={styles.uploadedBadgeText}>✅ Uploaded</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.uploadIcon}>📷</Text>
                  <Text style={styles.uploadText}>
                    Tap to upload {idType} photo
                  </Text>
                  <Text style={styles.uploadHint}>
                    Clear photo, all corners visible
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>
              Company/Production Proof (optional but recommended)
            </Text>
            <Text style={styles.hint}>
              GST Certificate, Company Registration, or Letterhead
            </Text>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={pickCompanyPhoto}>
              {companyPhoto ? (
                <View style={styles.uploadedBox}>
                  <Image
                    source={{uri: companyPhoto.uri}}
                    style={styles.uploadedImage}
                  />
                  {uploadingCompany && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  )}
                  {companyPhotoUrl && !uploadingCompany && (
                    <View style={styles.uploadedBadge}>
                      <Text style={styles.uploadedBadgeText}>✅ Uploaded</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.uploadIcon}>🏢</Text>
                  <Text style={styles.uploadText}>
                    Tap to upload company document
                  </Text>
                  <Text style={styles.uploadHint}>
                    Optional but increases approval chances
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.privacyNote}>
              <Text style={styles.privacyNoteText}>
                🔒 Your ID is stored securely and only visible to CineLink
                admin. It will never be shared publicly.
              </Text>
            </View>
          </View>
        )}

        {/* ── STEP 2: PHONE VERIFY ── */}
        {currentStep === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 3: Phone Verification</Text>
            <Text style={styles.stepDesc}>
              Admin will call or WhatsApp you on this number to verify your
              identity before approving your request.
            </Text>

            <Text style={styles.fieldLabel}>Your WhatsApp Number *</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
              </View>
              <Input
                placeholder="10-digit mobile number"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            {!phoneVerified ? (
              <Button
                label="📱 Register Phone Number"
                onPress={handlePhoneVerify}
                variant="primary"
              />
            ) : (
              <View style={styles.phoneVerifiedBox}>
                <Text style={styles.phoneVerifiedText}>
                  ✅ +91{phone} registered successfully!
                </Text>
                <Text style={styles.phoneVerifiedHint}>
                  Admin will WhatsApp you on this number
                </Text>
              </View>
            )}

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>📞 What happens next:</Text>
              <Text style={styles.infoBoxItem}>
                1. Admin receives your application
              </Text>
              <Text style={styles.infoBoxItem}>
                2. Admin reviews your ID proof
              </Text>
              <Text style={styles.infoBoxItem}>
                3. Admin calls/WhatsApps you on +91{phone || 'XXXXXXXXXX'}
              </Text>
              <Text style={styles.infoBoxItem}>
                4. After verification → you get approved!
              </Text>
              <Text style={styles.infoBoxItem}>
                5. You can post auditions on CineLink 🎬
              </Text>
            </View>
          </View>
        )}

        {/* ── STEP 3: REVIEW & SUBMIT ── */}
        {currentStep === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 4: Review & Submit</Text>

            <Card variant="outlined" padding={Spacing.lg}>
              <Text style={styles.reviewSectionTitle}>
                📋 Application Summary
              </Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Company:</Text>
                <Text style={styles.reviewValue}>{companyName}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Experience:</Text>
                <Text style={styles.reviewValue}>{yearsExp} years</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>ID Type:</Text>
                <Text style={styles.reviewValue}>{idType}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>ID Proof:</Text>
                <Text
                  style={[
                    styles.reviewValue,
                    {color: idPhotoUrl ? Colors.success : Colors.error},
                  ]}>
                  {idPhotoUrl ? '✅ Uploaded' : '❌ Missing'}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Company Doc:</Text>
                <Text
                  style={[
                    styles.reviewValue,
                    {
                      color: companyPhotoUrl
                        ? Colors.success
                        : Colors.textSecondary,
                    },
                  ]}>
                  {companyPhotoUrl
                    ? '✅ Uploaded'
                    : '⚠️ Not uploaded (optional)'}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Phone:</Text>
                <Text style={[styles.reviewValue, {color: Colors.success}]}>
                  ✅ +91{phone}
                </Text>
              </View>
            </Card>

            <View style={styles.securityChecklist}>
              <Text style={styles.checklistTitle}>
                🔒 Security Layers Applied:
              </Text>
              <Text style={styles.checklistItem}>
                ✅ Profile review by admin
              </Text>
              <Text style={styles.checklistItem}>✅ ID proof uploaded</Text>
              <Text style={styles.checklistItem}>
                ✅ Company details verified
              </Text>
              <Text style={styles.checklistItem}>
                ✅ Phone number registered
              </Text>
              <Text style={styles.checklistItem}>
                ⏳ Phone call verification (by admin)
              </Text>
              <Text style={styles.checklistItem}>
                ⏳ Final approval (by admin)
              </Text>
            </View>

            <Button
              label="📤 Submit Application"
              onPress={submitRequest}
              loading={loading}
              variant="primary"
              size="lg"
              fullWidth
            />
            <Text style={styles.submitNote}>
              By submitting, you confirm that all information provided is
              accurate and genuine.
            </Text>
          </View>
        )}

        {requestStatus === null || requestStatus === 'rejected' ? (
          <View style={styles.navRow}>
            {currentStep > 0 && (
              <Button
                label="← Back"
                onPress={() => setCurrentStep(prev => prev - 1)}
                variant="outline"
              />
            )}
            {currentStep < STEPS.length - 1 && (
              <Button label="Next →" onPress={goNext} variant="primary" />
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {padding: Spacing.xl},

  headerSubtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },

  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  stepItem: {alignItems: 'center', flex: 1},
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepCircleDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  stepCircleText: {...Typography.captionBold, color: Colors.textPrimary},
  stepLabel: {
    ...Typography.micro,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  stepLabelActive: {color: Colors.primary, fontWeight: 'bold'},

  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: Spacing.sm,
  },
  securityIcon: {fontSize: 18},
  securityText: {
    ...Typography.micro,
    color: Colors.primary,
    flex: 1,
    lineHeight: 16,
  },

  stepContent: {marginBottom: Spacing.sm},
  stepTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  stepDesc: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  fieldLabel: {
    ...Typography.labelSm,
    color: Colors.primary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  hint: {
    ...Typography.micro,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: -Spacing.sm,
  },
  charCount: {
    ...Typography.micro,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },

  idTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  idTypeBtn: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  idTypeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  idTypeBtnText: {...Typography.bodySm, color: Colors.textSecondary},
  idTypeBtnTextActive: {color: Colors.textInverse, fontWeight: 'bold'},

  uploadBox: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
    overflow: 'hidden',
    height: 140,
    marginBottom: Spacing.sm,
  },
  uploadedBox: {flex: 1, position: 'relative'},
  uploadedImage: {width: '100%', height: '100%', resizeMode: 'cover'},
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  uploadIcon: {fontSize: 32},
  uploadText: {...Typography.label, color: Colors.textSecondary},
  uploadHint: {...Typography.micro, color: Colors.textTertiary},
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {...Typography.caption, color: '#fff', marginTop: 4},
  uploadedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  uploadedBadgeText: {...Typography.captionBold, color: Colors.success},

  privacyNote: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  privacyNoteText: {
    ...Typography.caption,
    color: Colors.success,
    lineHeight: 18,
  },

  phoneRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  countryCode: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
  },
  countryCodeText: {...Typography.label, color: Colors.textPrimary},
  phoneVerifiedBox: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.success,
    marginTop: Spacing.sm,
  },
  phoneVerifiedText: {...Typography.btn, color: Colors.success},
  phoneVerifiedHint: {...Typography.micro, color: Colors.success, marginTop: 4},

  infoBox: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  infoBoxTitle: {
    ...Typography.label,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  infoBoxItem: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    lineHeight: 24,
  },

  reviewSectionTitle: {
    ...Typography.btn,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.sm,
  },
  reviewLabel: {...Typography.bodySm, color: Colors.textSecondary},
  reviewValue: {
    ...Typography.label,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },

  securityChecklist: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  checklistTitle: {
    ...Typography.label,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  checklistItem: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    lineHeight: 26,
  },

  submitNote: {
    ...Typography.micro,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: Spacing.sm,
  },

  navRow: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm},

  statusPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
  },
  statusBigIcon: {fontSize: 64, marginBottom: Spacing.xl},
  statusBigTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  statusBigText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  statusStepItem: {...Typography.bodySm, color: Colors.success, lineHeight: 28},
  statusStepPending: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    lineHeight: 28,
  },
});
