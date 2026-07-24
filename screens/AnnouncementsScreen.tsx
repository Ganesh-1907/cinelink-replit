import React, {useState} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import api from '../src/api/client';
import {uploadImage} from '../src/services/uploadService';
import {useApp} from '../src/context/AppContext';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button} from '../components/ui';

export default function AnnouncementsScreen({navigation}: any) {
  const {isAdmin, isApprovedDirector} = useApp();
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const canPost = isAdmin || isApprovedDirector;

  const pickImage = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets?.[0]) setImage(result.assets[0].uri || null);
  };

  const handlePost = async () => {
    if (!text.trim() && !image) {
      Alert.alert('Empty Post', 'Please write something or attach an image.');
      return;
    }
    setPosting(true);
    try {
      let imageUrl = '';
      if (image) {
        const result = await uploadImage(image);
        imageUrl = result.secureUrl;
      }
      await api.post('/feed-posts', {
        text: text.trim(),
        imageUrl,
      });
      setText('');
      setImage(null);
      Alert.alert('✅ Posted!', 'Announcement posted successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to post.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="📢 Announcements" navigation={navigation} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        {!canPost ? (
          <Text style={styles.denied}>Admin or Director access required.</Text>
        ) : (
          <>
            {image && (
              <View style={styles.previewRow}>
                <Image source={{uri: image}} style={styles.preview} />
                <TouchableOpacity onPress={() => setImage(null)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.composer}>
              <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
                <Text style={styles.attachIcon}>📎</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Write an announcement..."
                placeholderTextColor={Colors.textTertiary}
                value={text}
                onChangeText={setText}
                multiline
              />
            </View>
            <Button
              label={posting ? 'Posting...' : 'Post Announcement'}
              onPress={handlePost}
              variant="primary"
              size="lg"
              fullWidth
              loading={posting}
              disabled={posting || (!text.trim() && !image)}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  container: {flex: 1},
  scroll: {padding: Spacing.lg},
  denied: {...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing['3xl']},
  previewRow: {flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md},
  preview: {width: 80, height: 80, borderRadius: Radius.md},
  removeBtn: {marginLeft: Spacing.md, padding: Spacing.sm},
  removeText: {color: Colors.error, fontSize: 18},
  composer: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.cardElevated, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  attachBtn: {padding: Spacing.sm, marginRight: Spacing.sm},
  attachIcon: {fontSize: 22},
  input: {
    flex: 1, color: Colors.textPrimary, fontSize: 15,
    minHeight: 80, textAlignVertical: 'top',
  },
});
