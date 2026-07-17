import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Avatar, Header, EmptyState} from '../components/ui';
import {Colors, Typography, Spacing, Radius} from '../src/theme';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) {
    return 'Creator';
  }
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function FollowersScreen({route, navigation}: any) {
  const insets = useSafeAreaInsets();
  const {userId, displayName, tab = 'followers'} = route.params;
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(tab);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const currentUser = auth().currentUser;

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('following')
      .get()
      .then(snap => setFollowingIds(new Set(snap.docs.map(d => d.id))))
      .catch(e => console.log(e));
  }, []);

  const toggleFollow = async (targetId: string) => {
    if (!currentUser) {
      return;
    }
    const isF = followingIds.has(targetId);
    const currentUserName =
      currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    try {
      const followerRef = firestore()
        .collection('users')
        .doc(targetId)
        .collection('followers')
        .doc(currentUser.uid);
      const followingRef = firestore()
        .collection('users')
        .doc(currentUser.uid)
        .collection('following')
        .doc(targetId);
      if (isF) {
        await followerRef.delete();
        await followingRef.delete();
        setFollowingIds(prev => {
          const s = new Set(prev);
          s.delete(targetId);
          return s;
        });
      } else {
        await followerRef.set({
          userId: currentUser.uid,
          userName: currentUserName,
          email: currentUser.email,
          followedAt: firestore.FieldValue.serverTimestamp(),
        });
        await followingRef.set({
          userId: targetId,
          followedAt: firestore.FieldValue.serverTimestamp(),
        });
        setFollowingIds(prev => new Set([...prev, targetId]));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const followersSnap = await firestore()
        .collection('users')
        .doc(userId)
        .collection('followers')
        .get();
      const followerIds = followersSnap.docs.map(d => d.id);

      const followingSnap = await firestore()
        .collection('users')
        .doc(userId)
        .collection('following')
        .get();
      const followingIds = followingSnap.docs.map(d => {
        const data = d.data();
        return data.userId || data.followingId || data.id || d.id;
      });

      const fetchUsers = async (ids: string[]) => {
        const docs = await Promise.all(
          ids.filter(Boolean).map(async id => {
            try {
              const doc = await firestore().collection('users').doc(id).get();
              return doc.exists
                ? {id: doc.id, ...doc.data()}
                : {id, displayName: id, role: 'Creator'};
            } catch (e) {
              console.log('fetchUsers error for', id, e);
              return null;
            }
          }),
        );
        return docs.filter(Boolean);
      };

      const [followerUsers, followingUsers] = await Promise.all([
        fetchUsers(followerIds),
        fetchUsers(followingIds),
      ]);

      setFollowers(followerUsers);
      setFollowing(followingUsers);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({item}: any) => {
    const rawName =
      item.displayName || item.fullName || item.name || item.email || '';
    const looksLikeUID =
      rawName.length > 20 && !rawName.includes(' ') && !rawName.includes('@');
    const name = looksLikeUID ? 'Creator' : cleanName(rawName);
    const avatarUrl = item.photoUrl || item.photoURL || null;
    const isCurrentUser = item.id === currentUser?.uid;
    const isFollowed = followingIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.userRow}
        onPress={() => {
          if (isCurrentUser) {
            navigation.navigate('Profile');
          } else {
            navigation.navigate('PublicProfile', {userId: item.id});
          }
        }}>
        <Avatar uri={avatarUrl} name={name} size="md" ring />

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userRole}>🎭 {item.role || 'Creator'}</Text>
          {item.bio ? (
            <Text style={styles.userBio} numberOfLines={1}>
              {item.bio}
            </Text>
          ) : null}
        </View>

        {!isCurrentUser && (
          <View style={styles.actionCol}>
            <TouchableOpacity
              style={[styles.followPill, isFollowed && styles.followingPill]}
              onPress={e => {
                e.stopPropagation?.();
                toggleFollow(item.id);
              }}>
              <Text
                style={[
                  styles.followPillText,
                  isFollowed && styles.followingPillText,
                ]}>
                {isFollowed ? '✓ Following' : '+ Follow'}
              </Text>
            </TouchableOpacity>
            <View style={styles.viewBtn}>
              <Text style={styles.viewBtnText}>View →</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const data = activeTab === 'followers' ? followers : following;

  return (
    <View style={styles.container}>
      <Header title={displayName} navigation={navigation} />

      {/* TABS */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.tabActive]}
          onPress={() => setActiveTab('followers')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'followers' && styles.tabTextActive,
            ]}>
            Followers ({followers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.tabActive]}
          onPress={() => setActiveTab('following')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'following' && styles.tabTextActive,
            ]}>
            Following ({following.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.loader}
        />
      ) : data.length === 0 ? (
        <EmptyState
          icon={activeTab === 'followers' ? '👥' : '🔍'}
          title={
            activeTab === 'followers'
              ? 'No followers yet'
              : 'Not following anyone yet'
          }
          subtitle={
            activeTab === 'followers'
              ? 'When someone follows this creator, they appear here'
              : 'When this creator follows someone, they appear here'
          }
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          contentContainerStyle={{
            padding: Spacing.lg,
            paddingBottom: insets.bottom + 80,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  loader: {marginTop: 60},

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {borderBottomColor: Colors.primary},
  tabText: {...Typography.label, color: Colors.textSecondary},
  tabTextActive: {...Typography.label, color: Colors.primary},

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },

  userInfo: {flex: 1},
  userName: {...Typography.label, color: Colors.textPrimary, fontSize: 15},
  userRole: {...Typography.caption, color: Colors.primary, marginTop: 2},
  userBio: {...Typography.caption, color: Colors.textSecondary, marginTop: 2},

  actionCol: {alignItems: 'center', gap: Spacing.xs, marginLeft: Spacing.xs},
  followPill: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  followingPill: {
    backgroundColor: Colors.borderLight,
    borderColor: Colors.primary,
  },
  followPillText: {...Typography.captionBold, color: Colors.textInverse},
  followingPillText: {color: Colors.primary},

  viewBtn: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  viewBtnText: {...Typography.captionBold, color: Colors.primary},
});
