import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import api from '../src/api/client';
import {parseDeadline} from '../utils/contestUtils';
import {useApp} from '../src/context/AppContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Input, Button, Card, Chip, DatePickerModal} from '../components/ui';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadImage} from '../src/services/uploadService';

const CONTEST_TYPES = [
  'Short Film',
  'Acting',
  'Dialogue',
  'Cinematography',
  'Script',
  'Documentary',
];

export default function PostContestScreen({navigation, route}: any) {
  const insets = useSafeAreaInsets();
  const editingContest = route?.params?.contest;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prize, setPrize] = useState('');
  const [deadline, setDeadline] = useState('');
  const [rules, setRules] = useState('');
  const [type, setType] = useState('Short Film');
  const [entryFee, setEntryFee] = useState('0');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [poster, setPoster] = useState<any>(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const pendingUploadRef = useRef<any>(null);

  const {isAdmin, user} = useApp();

  React.useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only admins can create contests.', [
        {text: 'Go Back', onPress: () => navigation.goBack()}
      ]);
    }
  }, [isAdmin, navigation]);

  React.useEffect(() => {
    if (editingContest) {
      setTitle(editingContest.title || '');
      setDescription(editingContest.description || '');
      setPrize(editingContest.prize || '');
      setDeadline(editingContest.deadline || '');
      setRules(editingContest.rules || '');
      setType(editingContest.type || 'Short Film');
      setEntryFee(String(editingContest.entryFee || 0));
      setPosterUrl(editingContest.posterUrl || '');
      if (editingContest.posterUrl) {
        setPoster({uri: editingContest.posterUrl});
      }
    }
  }, [editingContest]);

  const pickPoster = () => {
    if (poster) {
      Alert.alert('🖼️ Poster Options', 'What would you like to do?', [
        {
          text: 'Remove Poster',
          style: 'destructive',
          onPress: () => {
            setPoster(null);
            setPosterUrl('');
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: openGallery,
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

  const postContest = async () => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only admins can create contests.');
      return;
    }
    if (!title.trim() || !prize.trim() || !deadline.trim()) {
      Alert.alert('Missing Info', 'Please fill Title, Prize and Deadline!');
      return;
    }
    if (!parseDeadline(deadline.trim())) {
      Alert.alert(
        'Invalid Deadline',
        'Use format YYYY-MM-DD (e.g. 2026-07-30)',
      );
      return;
    }

    setLoading(true);
    try {
      let resolvedPosterUrl = posterUrl;
      if (pendingUploadRef.current) {
        resolvedPosterUrl = await pendingUploadRef.current;
        if (!resolvedPosterUrl) {
          setLoading(false);
          return;
        }
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        prize: prize.trim(),
        deadline: deadline.trim(),
        entryFee: parseInt(entryFee) || 0,
        rules: rules.trim(),
        type: type,
        posterUrl: resolvedPosterUrl,
      };

      if (editingContest) {
        await api.put(`/contests/${editingContest._id || editingContest.id}`, payload);
        Alert.alert('Success! 🏆', 'Your contest changes have been saved!', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      } else {
        await api.post('/contests', payload);
        Alert.alert('Success! 🏆', 'Your contest is now live!', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Something went wrong. Try again!');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: Colors.background}]}>
      <Header title={editingContest ? "Edit Contest" : "Create Contest"} navigation={navigation} />
      <ScrollView 
        style={[styles.container, {backgroundColor: Colors.background}]} 
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{paddingBottom: insets.bottom + Spacing['5xl']}}>
        
        <View style={styles.body}>
          
          {/* Header Step Timeline Section */}
          <View style={styles.formHeader}>
            <View style={styles.stepIndicatorContainer}>
              <View style={styles.stepDotActive} />
              <Text style={styles.stepText}>CONTEST DETAILS</Text>
            </View>
            <Text style={styles.formTitle}>{editingContest ? "Edit Contest Event" : "Create a New Contest"}</Text>
            <Text style={styles.formSubtitle}>
              Setup the entry requirements, prizes, deadline, and voting details to launch your contest.
            </Text>
          </View>

          {/* Section 1: Contest Poster */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionLabel}>Contest Poster / Banner</Text>
            <Text style={styles.sectionSubtitle}>Add a high-quality landscape image for contest header</Text>
          </View>

          <TouchableOpacity
            style={styles.posterPicker}
            onPress={pickPoster}
            activeOpacity={0.85}>
            {poster?.uri ? (
              <>
                <Image source={{uri: poster.uri}} style={styles.posterImage} />
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
                <Text style={styles.posterEmptyText}>Upload Poster</Text>
                <Text style={styles.posterEmptySub}>
                  Recommended: 16:9 landscape aspect ratio (Max 5MB)
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Section 2: Event Info */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionLabel}>Event Info</Text>
            <Text style={styles.sectionSubtitle}>Define contest title, type, and details</Text>
          </View>

          <Input
            label="Contest Title"
            required
            placeholder="e.g. Best Drama Short 2026"
            value={title}
            onChangeText={setTitle}
            containerStyle={{marginBottom: Spacing.md}}
          />

          <Text style={styles.fieldLabel}>Contest Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={{paddingRight: Spacing.md}}>
            {CONTEST_TYPES.map(t => (
              <Chip
                key={t}
                label={t}
                selected={type === t}
                onPress={() => setType(t)}
                style={{marginRight: Spacing.sm}}
              />
            ))}
          </ScrollView>

          <Input
            label="Description"
            placeholder="What is this contest about? Who can participate?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={styles.multilineInput}
            containerStyle={{marginBottom: Spacing.md, marginTop: Spacing.md}}
          />

          {/* Section 3: Rules & Rewards */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionLabel}>Rules & Rewards</Text>
            <Text style={styles.sectionSubtitle}>Specify prize details and criteria</Text>
          </View>

          <Input
            label="Prize"
            required
            placeholder="e.g. ₹10,000 + Certificate + Trophy"
            value={prize}
            onChangeText={setPrize}
            containerStyle={{marginBottom: Spacing.md}}
          />

          <Input
            label="Rules & Guidelines"
            placeholder="Contest rules, submission format, eligibility criteria..."
            value={rules}
            onChangeText={setRules}
            multiline
            numberOfLines={4}
            style={styles.multilineInput}
            containerStyle={{marginBottom: Spacing.md}}
          />

          {/* Section 4: Timeline & Fees */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionLabel}>Timeline & Fees</Text>
            <Text style={styles.sectionSubtitle}>Set the deadline date and participation charges</Text>
          </View>

          <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7} style={{marginBottom: Spacing.md}}>
            <View pointerEvents="none">
              <Input
                label="Deadline"
                required
                placeholder="Select deadline date..."
                value={deadline}
                editable={false}
                hint={
                  deadline.length > 0 && deadline.length < 10
                    ? '⚠️ Use format YYYY-MM-DD'
                    : deadline.length === 10
                    ? `✅ Deadline: ${deadline}`
                    : undefined
                }
              />
            </View>
          </TouchableOpacity>

          <Input
            label="Entry Fee (₹) — 0 for Free"
            placeholder="0"
            value={entryFee}
            onChangeText={setEntryFee}
            keyboardType="numeric"
            containerStyle={{marginBottom: Spacing.xs}}
          />

          <View
            style={[
              styles.feeInfo,
              parseInt(entryFee) > 0 && styles.feeInfoPaid,
            ]}>
            <Text
              style={[
                styles.feeInfoText,
                parseInt(entryFee) > 0 && {color: Colors.warning},
              ]}>
              {parseInt(entryFee) === 0
                ? '✅ This is a FREE contest — maximum participation'
                : `💰 Entry fee: ₹${entryFee} per submission`}
            </Text>
          </View>

          {/* Section 5: Winner Selection */}
          <Card
            variant="elevated"
            style={styles.votingCard}>
            <Text style={styles.votingTitle}>🏆 Winner Selection Method</Text>
            <View style={styles.votingRow}>
              <View style={styles.votingItem}>
                <Text style={styles.votingPercent}>60%</Text>
                <Text style={styles.votingLabel}>Jury Score</Text>
                <Text style={styles.votingDesc}>You rate submissions</Text>
              </View>
              <Text style={styles.votingPlus}>+</Text>
              <View style={styles.votingItem}>
                <Text style={styles.votingPercent}>40%</Text>
                <Text style={styles.votingLabel}>Public Votes</Text>
                <Text style={styles.votingDesc}>Audience votes</Text>
              </View>
            </View>
          </Card>

          {/* SUBMIT BUTTON */}
          <View style={styles.submitContainer}>
            <Button
              label={editingContest ? "Save Changes" : "Create Contest"}
              onPress={postContest}
              loading={loading}
              disabled={loading}
              variant="primary"
              size="lg"
              fullWidth
            />
          </View>
        </View>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={setDeadline}
        currentValue={deadline}
      />
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
  fieldLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  posterPicker: {
    width: '100%',
    borderRadius: Radius.card,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterImage: {
    width: '100%',
    aspectRatio: 16 / 9,
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
  feeInfo: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  feeInfoPaid: {
    backgroundColor: Colors.warningFaint,
    borderColor: Colors.warningBorder,
  },
  feeInfoText: {
    ...Typography.bodySm,
    color: Colors.success,
  },
  votingCard: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.lg,
  },
  votingTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  votingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  votingItem: {alignItems: 'center'},
  votingPercent: {
    fontSize: 28,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.textPrimary,
  },
  votingLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  votingDesc: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  votingPlus: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.primary,
  },
  submitContainer: {
    marginTop: Spacing.sm,
  },
});
