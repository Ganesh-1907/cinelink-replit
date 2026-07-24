import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, SafeAreaView, ActivityIndicator, Image} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Avatar, Button, Card, Chip, Badge, EmptyState} from '../components/ui';
import {useApp} from '../src/context/AppContext';

export default function PublicProfileScreen({route, navigation}: any) {
  const {userId: paramUserId} = route.params;
  const userId = paramUserId?._id || paramUserId?.id || paramUserId || '';
  const [profile, setProfile] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const {user: currentUser} = useApp();
  const isOwn = userId === currentUser?.uid;

  useEffect(() => {
    Promise.all([loadProfile(), checkFollowStatus()]);
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get<any>(`/users/${userId}`);
      setProfile(res?.user || null);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  const checkFollowStatus = async () => {
    try {
      const res = await api.get<any>(`/users/${userId}/follow-status`);
      setIsFollowing(res?.following || false);
    } catch (e) {}
  };

  const toggleFollow = async () => {
    const prev = isFollowing;
    setIsFollowing(!isFollowing);
    try { await api.post('/users/follow', {targetUserId: userId}); }
    catch { setIsFollowing(prev); }
  };

  if (loading) return <SafeAreaView style={styles.safe}><Header title="Profile" navigation={navigation} /><ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} /></SafeAreaView>;
  if (!profile) return <SafeAreaView style={styles.safe}><Header title="Profile" navigation={navigation} /><EmptyState icon="👤" title="User not found" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Profile" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileHeader}>
          <Avatar name={profile.fullName || profile.displayName || 'User'} size="xl" uri={profile.photoUrl} />
          <Text style={styles.name}>{profile.fullName || profile.displayName || 'User'}</Text>
          {profile.role ? <Chip label={profile.role} static /> : null}
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          {profile.location ? <Text style={styles.meta}>📍 {profile.location}</Text> : null}
        </View>
        {!isOwn && <Button label={isFollowing ? '✓ Following' : '+ Follow'} variant={isFollowing ? 'secondary' : 'primary'} size="lg" fullWidth onPress={toggleFollow} />}
        {profile.portfolioPhotos?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <View style={styles.portfolioGrid}>{profile.portfolioPhotos.map((url: string, i: number) => (
              <TouchableOpacity key={i} style={styles.portfolioItem} onPress={() => navigation.navigate('ImageViewer', {imageUrl: url})}>
                <Image source={{uri: url}} style={styles.portfolioImage} />
              </TouchableOpacity>
            ))}</View>
          </View>
        )}
        <View style={styles.statsRow}>
          <Card variant="elevated" padding={Spacing.md} style={styles.statCard}><Text style={styles.statNumber}>{profile.filmCount || 0}</Text><Text style={styles.statLabel}>Films</Text></Card>
          <Card variant="elevated" padding={Spacing.md} style={styles.statCard}><Text style={styles.statNumber}>{profile.auditionCount || 0}</Text><Text style={styles.statLabel}>Auditions</Text></Card>
          <TouchableOpacity style={[styles.statCard, styles.statTouchable]} onPress={() => navigation.navigate('Followers', {userId, tab: 'followers'})}><Text style={styles.statNumber}>{profile.followerCount || 0}</Text><Text style={styles.statLabel}>Followers</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.lg, gap: Spacing.lg},
  profileHeader: {alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl},
  name: {fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary},
  bio: {color: Colors.textSecondary, textAlign: 'center', lineHeight: 20},
  meta: {color: Colors.textSecondary, fontSize: 13},
  section: {gap: Spacing.sm},
  sectionTitle: {color: Colors.primary, fontWeight: 'bold', fontSize: 16},
  portfolioGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm},
  portfolioItem: {width: '30%', aspectRatio: 1, backgroundColor: Colors.card, borderRadius: Radius.md, overflow: 'hidden'},
  portfolioImage: {width: '100%', height: '100%', resizeMode: 'cover'},
  portfolioEmoji: {fontSize: 28},
  statsRow: {flexDirection: 'row', gap: Spacing.sm},
  statCard: {flex: 1, alignItems: 'center'},
  statTouchable: {backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md},
  statNumber: {fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary},
  statLabel: {color: Colors.textSecondary, fontSize: 12, marginTop: 2},
});
