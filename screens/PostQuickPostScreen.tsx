import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import api from '../src/api/client';
import {uploadImage} from '../src/services/uploadService';
import {useApp} from '../src/context/AppContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Input} from '../components/ui';
import {useTheme} from '../src/context/ThemeContext';

export default function PostQuickPostScreen({navigation, route}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const {isAdmin, isApprovedDirector} = useApp();
  const postToEdit = route.params?.post;
  const isEditing = !!postToEdit;

  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageOffset, setImageOffset] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(16 / 9);
  const [posting, setPosting] = useState(false);

  const canPost = isAdmin || isApprovedDirector;

  useEffect(() => {
    if (!canPost) {
      Alert.alert('Access Denied', 'Casting Director or Admin access required.', [
        {text: 'Go Back', onPress: () => navigation.goBack()}
      ]);
    }
  }, [canPost, navigation]);

  useEffect(() => {
    if (isEditing && postToEdit) {
      setText(postToEdit.text || '');
      setImageUrl(postToEdit.imageUrl || null);
      if (postToEdit.imageUrl) {
        setImageUri(postToEdit.imageUrl);
        Image.getSize(postToEdit.imageUrl, (w, h) => {
          if (w && h) {
            setImageAspectRatio(w / h);
          }
        }, () => {});
      }
      if (postToEdit.imageOffset) {
        setImageOffset(postToEdit.imageOffset);
      }
    }
  }, [isEditing, postToEdit]);

  const pickImage = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      setImageUrl(null);
      setUploading(true);
      Image.getSize(uri, (w, h) => {
        if (w && h) {
          setImageAspectRatio(w / h);
        }
      });
      try {
        const res = await uploadImage(uri);
        setImageUrl(res.secureUrl);
      } catch {
        Alert.alert('Error', 'Image upload failed.');
        setImageUri(null);
        setImageUrl(null);
      } finally {
        setUploading(false);
      }
    }
  };

  const handlePost = async () => {
    if (!text.trim()) {
      Alert.alert('Missing Info', 'Please write something for the post content.');
      return;
    }
    if (!imageUrl) {
      Alert.alert('Image Required', 'Please select and upload an image for your quick post.');
      return;
    }
    if (uploading) {
      Alert.alert('Please Wait', 'Image is still uploading...');
      return;
    }
    setPosting(true);
    try {
      const payload = {
        text: text.trim(),
        imageUrl,
        imageOffset: imageOffset || 0,
        postType: 'general',
      };

      if (isEditing) {
        await api.put(`/feed-posts/${postToEdit.id || postToEdit._id}`, payload);
        Alert.alert('✅ Updated!', 'Post updated successfully.', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      } else {
        await api.post('/feed-posts', payload);
        Alert.alert('✅ Posted!', 'Post created successfully.', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to post.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: Colors.background}]}>
      <Header title={isEditing ? 'Edit Quick Post' : 'Create Quick Post'} navigation={navigation} />
      <ScrollView 
        style={[styles.container, {backgroundColor: Colors.background}]} 
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{paddingBottom: insets.bottom + Spacing['5xl']}}>
        
        <View style={styles.body}>
          {!canPost ? (
            <Text style={styles.denied}>Admin or Director access required.</Text>
          ) : (
            <>
              {/* Header Step Timeline Section */}
              <View style={styles.formHeader}>
                <View style={styles.stepIndicatorContainer}>
                  <View style={styles.stepDotActive} />
                  <Text style={styles.stepText}>QUICK POST</Text>
                </View>
                <Text style={styles.formTitle}>{isEditing ? "Edit Quick Post" : "Share a Quick Update"}</Text>
                <Text style={styles.formSubtitle}>
                  Post updates, news, casting calls, or general messages to the CineLink feed.
                </Text>
              </View>

              {/* Section 1: Post Content */}
              <View style={styles.sectionHeaderContainer}>
                <Text style={styles.sectionLabel}>Post Content</Text>
                <Text style={styles.sectionSubtitle}>Type your announcement message or update details</Text>
              </View>

              <Input
                label="Message Details"
                required
                placeholder="Write a quick update..."
                value={text}
                onChangeText={setText}
                multiline
                numberOfLines={6}
                style={styles.multilineInput}
                containerStyle={{marginBottom: Spacing.md}}
              />

              {/* Section 2: Attachment */}
              <View style={styles.sectionHeaderContainer}>
                <Text style={styles.sectionLabel}>Image Attachment *</Text>
                <Text style={styles.sectionSubtitle}>Add an image to accompany your post (Required)</Text>
              </View>

              <View style={styles.imageWrapper}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.imagePicker}
                  onPress={pickImage}>
                  {imageUri ? (
                    <>
                      <View style={[styles.imagePreviewContainer, {aspectRatio: imageAspectRatio}]}>
                        <Image
                          source={{uri: imageUri}}
                          style={[
                            styles.imagePreview,
                            {
                              transform: [{ translateY: imageOffset }]
                            }
                          ]}
                        />
                      </View>
                      <View style={styles.imageOverlay}>
                        <Text style={{fontSize: 22}}>📷</Text>
                        <Text style={styles.imageOverlayText}>Change Image</Text>
                      </View>
                      {uploading && (
                        <View style={styles.overlay}>
                          <ActivityIndicator color={Colors.primary} />
                          <Text style={styles.overlayText}>Uploading image...</Text>
                        </View>
                      )}
                      {imageUrl && !uploading && (
                        <View style={styles.doneBadge}>
                          <Text style={styles.doneBadgeText}>✅ Uploaded</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.imageEmpty}>
                      <Text style={styles.imageIcon}>📤</Text>
                      <Text style={styles.imageEmptyText}>Upload Image *</Text>
                      <Text style={styles.imageEmptySub}>
                        Recommended: 16:9 landscape aspect ratio (Max 5MB)
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {imageUri ? (
                  <View style={styles.repositionContainer}>
                    <Text style={styles.repositionLabel}>Adjust Portion Display (Vertical Crop)</Text>
                    <View style={styles.repositionButtons}>
                      <TouchableOpacity onPress={() => setImageOffset(prev => Math.max(-100, prev - 5))} style={styles.repositionBtn}><Text style={styles.repositionBtnText}>▲ Shift Up</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => setImageOffset(0)} style={styles.repositionBtn}><Text style={styles.repositionBtnText}>↺ Reset</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => setImageOffset(prev => Math.min(100, prev + 5))} style={styles.repositionBtn}><Text style={styles.repositionBtnText}>▼ Shift Down</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* SUBMIT BUTTON */}
              <View style={styles.submitContainer}>
                <Button
                  label={posting ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish Post'}
                  onPress={handlePost}
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={posting}
                  disabled={posting || !text.trim() || !imageUrl}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  container: {flex: 1, backgroundColor: Colors.background},
  body: {padding: Spacing.screenH},
  denied: {...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing['3xl']},
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
  multilineInput: {
    minHeight: 130,
    height: 130,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  imagePicker: {
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
  imagePreviewContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  imageOverlayText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  imageEmpty: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  imageIcon: {
    fontSize: 28,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  imageEmptyText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  imageEmptySub: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  imageWrapper: {
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
  submitContainer: {
    marginTop: Spacing.sm,
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
});
