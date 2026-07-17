import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Avatar, Button, EmptyState, Header} from '../components/ui';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) {
    return 'Creator';
  }
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function SuggestedFollowsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const currentUser = auth().currentUser;
  const currentUserName =
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  useEffect(() => {
    loadSuggestedUsers();
  }, []);

  const loadSuggestedUsers = async () => {
    try {
      const snap = await firestore().collection('users').limit(20).get();
      const data = snap.docs
        .map(doc => ({id: doc.id, ...doc.data()}))
        .filter(
          (u: any) =>
            u.id !== currentUser?.uid &&
            u.email !== 'anilkumardevarakonda03@gmail.com',
        );
      setUsers(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (user: any) => {
    if (!currentUser) {
      return;
    }
    try {
      const followRef = firestore()
        .collection('users')
        .doc(user.id)
        .collection('followers')
        .doc(currentUser.uid);

      if (following.has(user.id)) {
        await followRef.delete();
        await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .collection('following')
          .doc(user.id)
          .delete();
        setFollowing(prev => {
          const s = new Set(prev);
          s.delete(user.id);
          return s;
        });
      } else {
        await followRef.set({
          userId: currentUser.uid,
          userName: currentUserName,
          email: currentUser.email,
          followedAt: firestore.FieldValue.serverTimestamp(),
        });
        await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .collection('following')
          .doc(user.id)
          .set({
            userId: user.id,
            followedAt: firestore.FieldValue.serverTimestamp(),
          });
        await firestore()
          .collection('notifications')
          .add({
            userId: user.id,
            type: 'new_follower',
            title: '🎉 New Follower!',
            message: `${currentUserName} started following you`,
            senderId: currentUser.uid,
            read: false,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
        setFollowing(prev => new Set(prev).add(user.id));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleDone = async () => {
    await AsyncStorage.setItem('suggested_follows_done', 'true');
    navigation.replace('Main');
  };

  const renderUser = ({item}: any) => {
    const displayName = cleanName(
      item.displayName || item.fullName || item.name || item.email,
    );
    const avatarUrl = item.photoUrl || item.photoURL || null;
    const isFollowing = following.has(item.id);

    return (
      <View style={styles.userCard}>
        <TouchableOpacity
          style={styles.userLeft}
          onPress={() =>
            navigation.navigate('PublicProfile', {userId: item.id})
          }>
          <Avatar uri={avatarUrl} name={displayName} size="md" />
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.userRole}>🎭 {item.role || 'Creator'}</Text>
            {item.bio ? (
              <Text style={styles.userBio} numberOfLines={1}>
                {item.bio}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>

        <Button
          label={isFollowing ? '✓ Following' : '+ Follow'}
          onPress={() => handleFollow(item)}
          variant={isFollowing ? 'outline' : 'primary'}
          size="sm"
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="People You May Know" navigation={navigation} noBorder />

      {/* HEADER SUBTITLE */}
      <Text style={styles.headerSubtitle}>
        Follow creators to build your cinema network
      </Text>

      {/* FOLLOW COUNT */}
      {following.size > 0 && (
        <View style={styles.followingBanner}>
          <Text style={styles.followingBannerText}>
            ✅ Following {following.size} creator{following.size > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.loader}
        />
      ) : users.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No Suggestions Yet"
          subtitle="Check back later to find people to follow"
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          contentContainerStyle={[
            styles.listContent,
            {paddingBottom: insets.bottom + 100},
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* BOTTOM BUTTONS */}
      <View
        style={[styles.bottomRow, {paddingBottom: insets.bottom + Spacing.lg}]}>
        <Button
          label="Skip for now"
          onPress={handleDone}
          variant="secondary"
          size="lg"
        />
        <View style={styles.doneWrapper}>
          <Button
            label={
              following.size > 0
                ? `Done (${following.size} followed)`
                : 'Continue →'
            }
            onPress={handleDone}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  loader: {marginTop: 60},
  listContent: {padding: Spacing.lg},

  followingBanner: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.sm,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    alignItems: 'center',
  },
  followingBannerText: {...Typography.btn, color: Colors.success},

  userCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userLeft: {flexDirection: 'row', alignItems: 'center', flex: 1},
  userInfo: {flex: 1, marginLeft: Spacing.md},
  userName: {...Typography.label, color: Colors.textPrimary, fontSize: 15},
  userRole: {...Typography.caption, color: Colors.primary, marginTop: 2},
  userBio: {...Typography.caption, color: Colors.textSecondary, marginTop: 2},

  bottomRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  doneWrapper: {flex: 2},
});
