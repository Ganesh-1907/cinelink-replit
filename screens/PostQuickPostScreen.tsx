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
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import api from '../src/api/client';
import {uploadImage} from '../src/services/uploadService';
import {useApp} from '../src/context/AppContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Input} from '../components/ui';

export default function PostQuickPostScreen({navigation, route}: any) {
  const insets = useSafeAreaInsets();
  const {isAdmin, isApprovedDirector} = useApp();
  const postToEdit = route.params?.post;
  const isEditing = !!postToEdit;

  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
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
      setImage(postToEdit.imageUrl || null);
    }
  }, [isEditing, postToEdit]);

  const pickImage = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets?.[0]) {
      setImage(result.assets[0].uri || null);
    }
  };

  const handlePost = async () => {
    if (!text.trim() && !image) {
      Alert.alert('Empty Post', 'Please write something or attach an image.');
      return;
    }
    setPosting(true);
    try {
      let imageUrl = image || '';
      if (image && image.startsWith('file://')) {
        const result = await uploadImage(image);
        imageUrl = result.secureUrl;
      }
      
      const payload = {
        text: text.trim(),
        imageUrl,
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
                <Text style={styles.sectionLabel}>Image Attachment</Text>
                <Text style={styles.sectionSubtitle}>Add an image to accompany your post (optional)</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.imagePicker}
                onPress={pickImage}>
                {image ? (
                  <>
                    <Image source={{uri: image}} style={styles.imagePreview} />
                    <View style={styles.imageOverlay}>
                      <Text style={{fontSize: 22}}>📷</Text>
                      <Text style={styles.imageOverlayText}>Change Image</Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setImage(null);
                      }}
                      style={styles.removeBadge}>
                      <Text style={styles.removeBadgeText}>🗑️ Remove</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.imageEmpty}>
                    <Text style={styles.imageIcon}>📤</Text>
                    <Text style={styles.imageEmptyText}>Upload Image</Text>
                    <Text style={styles.imageEmptySub}>
                      Select a photo from gallery (Max 5MB)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* SUBMIT BUTTON */}
              <View style={styles.submitContainer}>
                <Button
                  label={posting ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish Post'}
                  onPress={handlePost}
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={posting}
                  disabled={posting || (!text.trim() && !image)}
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
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 4 / 3,
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
  removeBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(230,57,70,0.85)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  removeBadgeText: {color: '#FFFFFF', fontSize: 12, fontWeight: 'bold'},
  submitContainer: {
    marginTop: Spacing.sm,
  },
});
