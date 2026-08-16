import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image, ActivityIndicator, Alert} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Card, EmptyState, Badge} from '../components/ui';
import {useApp} from '../src/context/AppContext';
import {useTheme} from '../src/context/ThemeContext';

export default function MyAnnouncementsScreen({navigation}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const {user, isAdmin, isApprovedDirector} = useApp();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await api.get<{posts: any[]} | any>('/feed-posts');
      const postsArray = Array.isArray(res) ? res : res.posts || [];
      // Filter posts that are announcements
      const filtered = postsArray
        .filter((p: any) => p.postType === 'announcement')
        .map((p: any) => ({...p, id: p._id || p.id}));
      setAnnouncements(filtered);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchAnnouncements);
    return unsub;
  }, [navigation, fetchAnnouncements]);

  const deleteAnnouncement = (announcement: any) => {
    Alert.alert('Delete Announcement', 'Are you sure you want to delete this announcement?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/feed-posts/${announcement.id}`);
            fetchAnnouncements();
          } catch {
            Alert.alert('Error', 'Could not delete announcement.');
          }
        },
      },
    ]);
  };

  const canManage = isAdmin || isApprovedDirector;

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Announcements" navigation={navigation} />
      <ScrollView contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + 40}]}>
        {canManage && (
          <Button
            label="➕ Create Announcement"
            variant="primary"
            size="md"
            onPress={() => navigation.navigate('PostAnnouncement')}
            style={styles.addButton}
          />
        )}

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} />
        ) : announcements.length === 0 ? (
          <EmptyState
            icon="📢"
            title="No announcements yet"
            subtitle="Official broadcast messages will appear here"
            actionLabel={canManage ? "Create Announcement" : undefined}
            onAction={canManage ? () => navigation.navigate('PostAnnouncement') : undefined}
          />
        ) : (
          announcements.map((item: any) => {
            const isOwner = item.userId === user?.uid || isAdmin;
            return (
              <Card key={item.id} variant="elevated" style={styles.card}>
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.officialBadge}>🛡️ Official Announcement</Text>
                    <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                  
                  {item.imageUrl ? (
                    <Image source={{uri: item.imageUrl}} style={styles.postImage} resizeMode="cover" />
                  ) : null}
                  
                  <Text style={[styles.bodyText, {color: Colors.textPrimary}]}>{item.text}</Text>
                  
                  {isOwner && (
                    <View style={styles.btnRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
                        onPress={() => navigation.navigate('PostAnnouncement', {announcement: item})}>
                        <Text style={styles.editBtnText}>✏️ Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => deleteAnnouncement(item)}>
                        <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.lg},
  addButton: {marginBottom: Spacing.lg},
  card: {
    marginBottom: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.card,
  },
  cardContent: {padding: Spacing.md},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  officialBadge: {
    color: Colors.primary,
    ...Typography.captionBold,
    backgroundColor: Colors.primaryFaint,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs - 2,
    borderRadius: Radius.sm,
  },
  timeText: {
    color: Colors.textSecondary,
    ...Typography.caption,
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  bodyText: {
    ...Typography.body,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: Colors.primaryFaint,
    borderColor: Colors.primary,
  },
  editBtnText: {
    color: Colors.primary,
    ...Typography.captionBold,
  },
  deleteBtn: {
    backgroundColor: Colors.errorFaint,
    borderColor: Colors.errorBorder,
  },
  deleteBtnText: {
    color: Colors.error,
    ...Typography.captionBold,
  },
});
