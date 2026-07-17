import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  FlatList,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {ADMIN_EMAIL} from '../src/api/config';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, HitSlop} from '../src/theme';
import {Avatar, Button, Chip, EmptyState, Header} from '../components/ui';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) {
    return 'Creator';
  }
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function CrewScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searched, setSearched] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    [key: string]: 'connected' | 'pending' | 'none';
  }>({});
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const currentUser = auth().currentUser;
  const searchTimeout = React.useRef<any>(null);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
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

  useEffect(() => {
    results.forEach(u => checkConnectionStatus(u.id));
  }, [results]);

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

  const checkConnectionStatus = async (otherUserId: string) => {
    if (connectionStatus[otherUserId]) {
      return;
    }
    try {
      const [reqSnap, connSnap] = await Promise.all([
        firestore()
          .collection('connectionRequests')
          .where('fromUserId', '==', currentUser?.uid)
          .where('toUserId', '==', otherUserId)
          .get(),
        firestore()
          .collection('connections')
          .where('users', 'array-contains', currentUser?.uid)
          .get(),
      ]);
      const isConnected = connSnap.docs.some(d =>
        d.data().users?.includes(otherUserId),
      );
      const isPending = !reqSnap.empty;
      setConnectionStatus(prev => ({
        ...prev,
        [otherUserId]: isConnected
          ? 'connected'
          : isPending
          ? 'pending'
          : 'none',
      }));
    } catch (e) {}
  };

  const searchUsers = (text: string) => {
    setSearchText(text);
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => doSearch(text), 400);
  };

  const doSearch = async (text: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const snap = await firestore().collection('users').get();
      const q = text.toLowerCase();
      const filtered = snap.docs
        .map(doc => ({id: doc.id, ...doc.data()}))
        .filter((u: any) => {
          if (u.id === currentUser?.uid) {
            return false;
          }
          if (u.email === ADMIN_EMAIL) {
            return false;
          }
          const name = cleanName(
            u.displayName || u.fullName || u.name || u.email,
          ).toLowerCase();
          const role = (u.role || '').toLowerCase();
          const bio = (u.bio || '').toLowerCase();
          return name.includes(q) || role.includes(q) || bio.includes(q);
        });
      setResults(filtered);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const sendConnectRequest = async (otherUser: any) => {
    if (!currentUser) {
      return;
    }
    try {
      const currentUserName =
        currentUser.displayName || currentUser.email?.split('@')[0] || 'User';

      const existing = await firestore()
        .collection('connectionRequests')
        .where('fromUserId', '==', currentUser.uid)
        .where('toUserId', '==', otherUser.id)
        .get();
      if (!existing.empty) {
        Alert.alert(
          'Already Sent',
          'You already sent a connect request to this person.',
        );
        return;
      }

      const connected = await firestore()
        .collection('connections')
        .where('users', 'array-contains', currentUser.uid)
        .get();
      const isConnected = connected.docs.some((doc: any) =>
        doc.data().users?.includes(otherUser.id),
      );
      if (isConnected) {
        Alert.alert(
          'Already Connected',
          'You are already connected with this person.',
        );
        return;
      }

      await firestore()
        .collection('connectionRequests')
        .add({
          fromUserId: currentUser.uid,
          fromUserName: currentUserName,
          fromUserEmail: currentUser.email,
          toUserId: otherUser.id,
          toUserName: cleanName(
            otherUser.displayName ||
              otherUser.fullName ||
              otherUser.name ||
              otherUser.email,
          ),
          status: 'pending',
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      await firestore()
        .collection('notifications')
        .add({
          userId: otherUser.id,
          type: 'connect_request',
          title: '🤝 Connection Request',
          message: `${currentUserName} wants to connect with you`,
          senderId: currentUser.uid,
          senderName: currentUserName,
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      setConnectionStatus(prev => ({...prev, [otherUser.id]: 'pending'}));
      Alert.alert(
        'Request Sent! 🤝',
        `Connection request sent to ${cleanName(
          otherUser.displayName || otherUser.name || otherUser.email,
        )}`,
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not send request.');
    }
  };

  const renderUser = ({item}: any) => {
    const displayName = cleanName(
      item.displayName || item.fullName || item.name || item.email,
    );
    const avatarUrl = item.photoUrl || item.photoURL || null;
    const status = connectionStatus[item.id] || 'none';
    const isFollowing = followingIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.userCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('PublicProfile', {userId: item.id})}>
        <Avatar
          uri={avatarUrl}
          name={displayName}
          size="md"
          ring={item.verificationStatus === 'verified'}
        />

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
            {item.verificationStatus === 'verified' && (
              <Text style={styles.verifiedIcon}>✅</Text>
            )}
          </View>
          <Text style={styles.userRole}>🎭 {item.role || 'Creator'}</Text>
          {item.bio ? (
            <Text style={styles.userBio} numberOfLines={1}>
              {item.bio}
            </Text>
          ) : null}
          {item.location ? (
            <Text style={styles.userLocation}>📍 {item.location}</Text>
          ) : null}
        </View>

        <View style={styles.actionCol}>
          <Button
            label={isFollowing ? '✓ Following' : '+ Follow'}
            onPress={() => toggleFollow(item.id)}
            variant={isFollowing ? 'outline' : 'primary'}
            size="sm"
          />
          {status === 'connected' ? (
            <View style={[styles.connectBtn, {borderColor: Colors.success}]}>
              <Text style={styles.connectText}>✅</Text>
            </View>
          ) : status === 'pending' ? (
            <View style={[styles.connectBtn, {borderColor: Colors.warning}]}>
              <Text style={styles.connectText}>⏳</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={e => {
                e.stopPropagation?.();
                sendConnectRequest(item);
              }}
              hitSlop={HitSlop.sm}>
              <Text style={styles.connectText}>🤝</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const TIPS = [
    'Actor',
    'Director',
    'Mumbai',
    'Telugu',
    'Editor',
    'Writer',
    'DOP',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header title="🎥 Find Creators" navigation={navigation} noBorder />
      <Text style={styles.subtitle}>
        Search to discover cinema professionals
      </Text>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, role, bio..."
          placeholderTextColor={Colors.textTertiary}
          value={searchText}
          onChangeText={searchUsers}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchText('');
              setResults([]);
              setSearched(false);
            }}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.roomsBanner}
        onPress={() => navigation.navigate('BrowseProjects')}
        activeOpacity={0.85}>
        <View style={{flex: 1}}>
          <Text style={styles.roomsTitle}>🎬 CineLink Rooms</Text>
          <Text style={styles.roomsSub}>
            Find projects · Join film teams · Collaborate
          </Text>
        </View>
        <Text style={styles.roomsArrow}>→</Text>
      </TouchableOpacity>

      {!searched ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Search for Creators</Text>
          <Text style={styles.emptySubtitle}>
            Type a name, role or location to find{'\n'}actors, directors and
            crew members
          </Text>
          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>Try searching for:</Text>
            <View style={styles.tipsChipsRow}>
              {TIPS.map(tip => (
                <Chip
                  key={tip}
                  label={`🔎 ${tip}`}
                  onPress={() => searchUsers(tip)}
                />
              ))}
            </View>
          </View>
        </View>
      ) : loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={{marginTop: 60}}
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon="😔"
          title="No results found"
          subtitle="Try a different name or role"
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          contentContainerStyle={{
            paddingHorizontal: Spacing.screenH,
            paddingBottom: insets.bottom + 80,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {results.length} result{results.length > 1 ? 's' : ''} for "
              {searchText}"
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.screenH,
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    height: 50,
    gap: Spacing.sm,
  },
  searchIcon: {fontSize: 16},
  searchInput: {flex: 1, ...Typography.body, color: Colors.textPrimary},
  clearText: {
    color: Colors.textTertiary,
    fontSize: 18,
    fontWeight: 'bold',
    padding: 4,
  },
  roomsBanner: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  roomsTitle: {...Typography.h4},
  roomsSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  roomsArrow: {...Typography.h2, color: Colors.primary},
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing['4xl'],
    paddingHorizontal: Spacing.xxl,
  },
  emptyEmoji: {fontSize: 60, marginBottom: Spacing.md},
  emptyTitle: {...Typography.h2, textAlign: 'center'},
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  tipsBox: {marginTop: Spacing['3xl'], alignItems: 'center', width: '100%'},
  tipsTitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  tipsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  resultsCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  userCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  userInfo: {flex: 1, gap: 2},
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  userName: {...Typography.body, fontWeight: '700', flex: 1},
  verifiedIcon: {fontSize: 14},
  userRole: {...Typography.caption, color: Colors.primary},
  userBio: {...Typography.caption, color: Colors.textSecondary},
  userLocation: {...Typography.caption, color: Colors.textTertiary},
  connectBtn: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  connectText: {fontSize: 20},
  actionCol: {alignItems: 'center', gap: Spacing.xs, marginLeft: Spacing.sm},
});
