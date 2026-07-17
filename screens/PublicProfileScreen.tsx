import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
  Animated,
  Share,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ImageViewing from 'react-native-image-viewing';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {LiquidPress} from '../components/LiquidPress';
import {RippleIcon} from '../components/RippleIcon';
import PremiumBadge from '../src/components/Premium/PremiumBadge';
import {ADMIN_EMAIL, ADMIN_UID} from '../src/api/config';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {
  Avatar,
  Button,
  Card,
  Badge,
  Header,
  Chip,
  EmptyState,
} from '../components/ui';

const SCREEN_W = Dimensions.get('window').width;
const GRID_GAP = 2;
const CELL_SIZE = Math.floor((SCREEN_W - GRID_GAP * 2) / 3);

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) {
    return 'Creator';
  }
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

const PublicProfileScreen = ({route, navigation}: any) => {
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId;
  const currentUser = auth().currentUser;
  const isAdmin =
    currentUser?.email === ADMIN_EMAIL || currentUser?.uid === ADMIN_UID;

  useEffect(() => {
    if (!userId) {
      navigation.goBack();
    }
  }, []);

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [connectRequestSent, setConnectRequestSent] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState<{uri: string}[]>([]);

  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const showToast = () => {
    setToastVisible(true);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => setToastVisible(false));
  };

  const isOwnProfile = currentUser?.uid === userId;

  useEffect(() => {
    setLoading(true);
    setUserData(null);
    setIsFollowing(false);
    setIsConnected(false);
    setConnectRequestSent(false);
    loadUser();
    checkFollowing();
    if (!isOwnProfile) {
      checkConnectionStatus();
    }
  }, [userId]);

  const loadUser = async () => {
    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        setUserData(data);
        setIsBanned(data?.isBanned || false);
      }
      setLoading(false);
    } catch (e) {
      console.log(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubF = firestore()
      .collection('users')
      .doc(userId)
      .collection('followers')
      .onSnapshot(
        snap => setFollowersCount(snap.size),
        e => console.log(e),
      );
    const unsubFi = firestore()
      .collection('users')
      .doc(userId)
      .collection('following')
      .onSnapshot(
        snap => setFollowingCount(snap.size),
        e => console.log(e),
      );
    return () => {
      unsubF();
      unsubFi();
    };
  }, [userId]);

  const checkFollowing = async () => {
    if (!currentUser) {
      return;
    }
    try {
      const doc = await firestore()
        .collection('users')
        .doc(userId)
        .collection('followers')
        .doc(currentUser.uid)
        .get();
      setIsFollowing(doc.exists);
    } catch (e) {
      console.log(e);
    }
  };

  const checkConnectionStatus = async () => {
    if (!currentUser) {
      return;
    }
    try {
      const connected = await firestore()
        .collection('connections')
        .where('users', 'array-contains', currentUser.uid)
        .get();
      const found = connected.docs.some(doc =>
        doc.data().users?.includes(userId),
      );
      setIsConnected(found);

      if (!found) {
        const sent = await firestore()
          .collection('connectionRequests')
          .where('fromUserId', '==', currentUser.uid)
          .where('toUserId', '==', userId)
          .get();
        setConnectRequestSent(!sent.empty);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      return;
    }
    setFollowLoading(true);
    try {
      const followRef = firestore()
        .collection('users')
        .doc(userId)
        .collection('followers')
        .doc(currentUser.uid);
      const followDoc = await followRef.get();
      const currentUserName =
        currentUser.displayName || currentUser.email?.split('@')[0] || 'User';

      if (followDoc.exists) {
        await followRef.delete();
        await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .collection('following')
          .doc(userId)
          .delete();
        setIsFollowing(false);
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
          .doc(userId)
          .set({
            userId,
            followedAt: firestore.FieldValue.serverTimestamp(),
          });
        const existingNotif = await firestore()
          .collection('notifications')
          .where('userId', '==', userId)
          .where('senderId', '==', currentUser.uid)
          .where('type', '==', 'new_follower')
          .get();
        if (existingNotif.empty) {
          await firestore()
            .collection('notifications')
            .add({
              userId,
              type: 'new_follower',
              title: '🎉 New Follower!',
              message: `${currentUserName} started following you`,
              senderId: currentUser.uid,
              read: false,
              createdAt: firestore.FieldValue.serverTimestamp(),
            });
        }
        setIsFollowing(true);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setFollowLoading(false);
    }
  };

  const sendConnectRequest = async () => {
    if (!currentUser || connectLoading) {
      return;
    }
    setConnectLoading(true);
    setConnectRequestSent(true);
    try {
      const currentUserName =
        currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      const otherUserName = cleanName(
        userData?.displayName ||
          userData?.fullName ||
          userData?.name ||
          userData?.email,
      );

      await firestore().collection('connectionRequests').add({
        fromUserId: currentUser.uid,
        fromUserName: currentUserName,
        fromUserEmail: currentUser.email,
        toUserId: userId,
        toUserName: otherUserName,
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await firestore()
        .collection('notifications')
        .add({
          userId,
          type: 'connect_request',
          title: '🤝 Connection Request',
          message: `${currentUserName} wants to connect with you`,
          senderId: currentUser.uid,
          senderName: currentUserName,
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      showToast();
    } catch (e: any) {
      setConnectRequestSent(false);
      Alert.alert('Error', e?.message || 'Could not send request.');
    } finally {
      setConnectLoading(false);
    }
  };

  const startChat = async () => {
    if (!currentUser || isOwnProfile) {
      return;
    }
    if (!isConnected && !isAdmin) {
      Alert.alert(
        'Not Connected',
        'Send a connect request first. Once they accept, you can message them.',
      );
      return;
    }
    try {
      const chatId = [currentUser.uid, userId].sort().join('_');
      const chatRef = firestore().collection('chats').doc(chatId);
      const currentUserName =
        currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      const otherUserName = cleanName(
        userData?.displayName ||
          userData?.fullName ||
          userData?.name ||
          userData?.email,
      );

      await chatRef.set(
        {
          id: chatId,
          participants: [currentUser.uid, userId],
          participantNames: [currentUserName, otherUserName],
          participantEmails: [currentUser.email || '', userData?.email || ''],
          lastMessage: '',
          lastMessageTime: null,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        {merge: true},
      );

      const chatDoc = await chatRef.get();
      if (!chatDoc.data()?.createdAt) {
        await chatRef.update({
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      navigation.navigate('ChatScreen', {
        chat: {
          id: chatId,
          participants: [currentUser.uid, userId],
          participantNames: [currentUserName, otherUserName],
          participantEmails: [currentUser.email || '', userData?.email || ''],
          lastMessage: '',
        },
      });
    } catch (e: any) {
      console.log('CHAT ERROR:', JSON.stringify(e));
      Alert.alert('Error', e?.message || 'Could not start chat. Try again.');
    }
  };

  const openViewer = (startIndex: number, images: {uri: string}[]) => {
    setViewerImages(images);
    setViewerIndex(startIndex);
    setViewerVisible(true);
  };

  const buildViewerImages = (data: any): {uri: string}[] => {
    const imgs: {uri: string}[] = [];
    const avatar = data?.photoUrl || data?.photoURL;
    if (avatar) {
      imgs.push({uri: avatar});
    }
    if (Array.isArray(data?.portfolioPhotos)) {
      data.portfolioPhotos.forEach((url: string) => {
        if (url) {
          imgs.push({uri: url});
        }
      });
    }
    return imgs;
  };

  const handleBan = () => {
    Alert.alert(
      isBanned ? '✅ Unban User' : '🚫 Ban User',
      isBanned
        ? `Remove ban for "${displayName}"? They can use CineLink again.`
        : `Ban "${displayName}"? They will be blocked from CineLink.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: isBanned ? 'Unban' : 'Ban',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isBanned) {
                await firestore()
                  .collection('users')
                  .doc(userId)
                  .update({isBanned: false});
                await firestore()
                  .collection('bannedUsers')
                  .doc(userId)
                  .delete();
                setIsBanned(false);
                Alert.alert(
                  '✅ Unbanned',
                  `${displayName} can now use CineLink.`,
                );
              } else {
                await firestore().collection('users').doc(userId).update({
                  isBanned: true,
                  bannedAt: firestore.FieldValue.serverTimestamp(),
                  bannedBy: currentUser?.email,
                });
                await firestore().collection('bannedUsers').doc(userId).set({
                  userId,
                  userEmail: userData?.email,
                  userName: displayName,
                  bannedAt: firestore.FieldValue.serverTimestamp(),
                  bannedBy: currentUser?.email,
                });
                setIsBanned(true);
                Alert.alert(
                  '🚫 Banned',
                  `${displayName} has been banned from CineLink.`,
                );
              }
            } catch (e) {
              Alert.alert('Error', 'Could not update ban status.');
            }
          },
        },
      ],
    );
  };

  const handleRemove = () => {
    Alert.alert(
      '🗑️ Remove User',
      `Permanently delete all data for "${displayName}"?\n\nCannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              const batch = firestore().batch();
              batch.delete(firestore().collection('users').doc(userId));
              const auditions = await firestore()
                .collection('auditions')
                .where('directorId', '==', userId)
                .get();
              const applications = await firestore()
                .collection('applications')
                .where('applicantId', '==', userId)
                .get();
              const films = await firestore()
                .collection('films')
                .where('directorId', '==', userId)
                .get();
              auditions.docs.forEach(doc => batch.delete(doc.ref));
              applications.docs.forEach(doc => batch.delete(doc.ref));
              films.docs.forEach(doc => batch.delete(doc.ref));
              await batch.commit();
              Alert.alert(
                '✅ Removed',
                `All data for "${displayName}" has been deleted.`,
              );
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', 'Could not remove user. Try again.');
            }
          },
        },
      ],
    );
  };

  const handleShare = async () => {
    const shareName = cleanName(
      userData?.displayName ||
        userData?.fullName ||
        userData?.name ||
        userData?.email,
    );
    const shareRole = userData?.role || 'Creator';
    try {
      await Share.share({
        message:
          `Check out ${shareName}'s profile on CineLink!\n\n` +
          `They're a ${shareRole} on CineLink — India's casting & film collaboration platform.\n\n` +
          'Download CineLink to view their full profile and connect! 🎬',
      });
    } catch (_) {}
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={Colors.background}
        />
        <Animated.View
          style={[styles.skeletonAvatar, {opacity: skeletonOpacity}]}
        />
        <View style={{marginTop: 20, width: '70%', gap: 12}}>
          <Animated.View
            style={[
              styles.skeletonLine,
              {width: '60%', height: 20},
              {opacity: skeletonOpacity},
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonLine,
              {width: '40%', height: 14},
              {opacity: skeletonOpacity},
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonLine,
              {width: '80%', height: 14},
              {opacity: skeletonOpacity},
            ]}
          />
        </View>
        <View style={{flexDirection: 'row', gap: 16, marginTop: 24}}>
          <Animated.View
            style={[styles.skeletonStatBox, {opacity: skeletonOpacity}]}
          />
          <Animated.View
            style={[styles.skeletonStatBox, {opacity: skeletonOpacity}]}
          />
        </View>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Profile not found</Text>
      </View>
    );
  }

  const displayName = cleanName(
    userData?.displayName ||
      userData?.fullName ||
      userData?.name ||
      userData?.email,
  );
  const avatarUrl = userData?.photoUrl || userData?.photoURL || null;
  const isVerified = userData?.verificationStatus === 'verified';
  const allImages = buildViewerImages(userData);
  const portfolioOffset = avatarUrl ? 1 : 0;
  const canMessage = isConnected || isAdmin;

  const getAvailabilityColors = (s: string) => {
    if (s === 'Available Now') {
      return {
        color: Colors.success,
        bg: Colors.successFaint,
        border: Colors.successBorder,
        dot: '🟢',
      };
    }
    if (s === 'Booked') {
      return {
        color: Colors.warning,
        bg: Colors.warningFaint,
        border: Colors.warningBorder,
        dot: '🟡',
      };
    }
    return {
      color: Colors.textSecondary,
      bg: Colors.cardElevated,
      border: Colors.border,
      dot: '🔴',
    };
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: Colors.background}}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <Header title="Profile" navigation={navigation} transparent noBorder />

      {toastVisible && (
        <Animated.View style={[styles.toastBanner, {opacity: toastOpacity}]}>
          <Text style={styles.toastText}>
            Request sent! ✅ You'll be notified when they accept
          </Text>
        </Animated.View>
      )}

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          {isBanned && (
            <View style={styles.bannedBanner}>
              <Text style={styles.bannedText}>🚫 This user is banned</Text>
            </View>
          )}

          {avatarUrl ? (
            <RippleIcon
              size={110}
              color={Colors.primary}
              onPress={() => openViewer(0, allImages)}>
              <Image source={{uri: avatarUrl}} style={styles.avatarImage} />
            </RippleIcon>
          ) : (
            <View style={styles.avatar}>
              <Avatar name={displayName} size="xl" />
            </View>
          )}

          {isVerified && <Badge label="✅ Verified" variant="success" />}

          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayName}</Text>
            <PremiumBadge
              tier={userData?.premiumTier || 'none'}
              verifiedReal={userData?.verifiedReal === true}
              size="large"
            />
          </View>

          <Chip
            label={`🎭 ${userData?.role || 'Creator'}`}
            variant="outline"
            static
            style={styles.roleChip}
          />

          <Button
            label="↗ Share Profile"
            onPress={handleShare}
            variant="ghost"
            size="sm"
            style={styles.shareBtn}
          />

          {userData?.bio ? (
            <Text style={styles.bio}>{userData.bio}</Text>
          ) : (
            <Text style={styles.bioEmpty}>No bio added yet</Text>
          )}

          <View style={styles.statsContainer}>
            <TouchableOpacity
              style={styles.statBox}
              onPress={() =>
                navigation.navigate('Followers', {
                  userId,
                  displayName,
                  tab: 'followers',
                })
              }>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statBox}
              onPress={() =>
                navigation.navigate('Followers', {
                  userId,
                  displayName,
                  tab: 'following',
                })
              }>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>

          {!isOwnProfile && (
            <View style={styles.actionRow}>
              <LiquidPress
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton,
                ]}
                onPress={handleFollow}
                disabled={followLoading}>
                {followLoading ? (
                  <ActivityIndicator color={Colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.followButtonText}>
                    {isFollowing ? '✓ Following' : '+ Follow'}
                  </Text>
                )}
              </LiquidPress>

              {canMessage ? (
                <LiquidPress style={styles.messageButton} onPress={startChat}>
                  <Text style={styles.messageButtonText}>💬 Message</Text>
                </LiquidPress>
              ) : connectRequestSent ? (
                <View style={[styles.messageButton, styles.pendingButton]}>
                  <Text
                    style={[
                      styles.messageButtonText,
                      {color: Colors.textTertiary},
                    ]}>
                    ⏳ Pending
                  </Text>
                </View>
              ) : (
                <LiquidPress
                  style={[styles.messageButton, styles.connectButton]}
                  onPress={sendConnectRequest}
                  disabled={connectLoading}>
                  {connectLoading ? (
                    <ActivityIndicator color={Colors.primary} size="small" />
                  ) : (
                    <Text style={styles.messageButtonText}>🤝 Connect</Text>
                  )}
                </LiquidPress>
              )}
            </View>
          )}

          {!isOwnProfile && !canMessage && !connectRequestSent && (
            <Text style={styles.connectHint}>
              Send a connect request to message this creator
            </Text>
          )}
          {!isOwnProfile && !isConnected && connectRequestSent && !isAdmin && (
            <Text style={styles.connectHint}>
              Waiting for {displayName} to accept your request
            </Text>
          )}
          {!isOwnProfile && isConnected && (
            <Text style={[styles.connectHint, {color: Colors.success}]}>
              ✅ You are connected with {displayName}
            </Text>
          )}

          {isOwnProfile && (
            <Button
              label="✏️ Edit Profile"
              onPress={() => navigation.navigate('Profile')}
              variant="outline"
              size="md"
              style={styles.editProfileBtn}
            />
          )}

          <Badge label="🎬 Open for Collaboration" variant="success" />

          {isAdmin && !isOwnProfile && (
            <View style={styles.adminSection}>
              <Text style={styles.adminLabel}>🛡️ Admin Actions</Text>
              <View style={styles.adminRow}>
                <Button
                  label={isBanned ? '✅ Unban User' : '🚫 Ban User'}
                  onPress={handleBan}
                  variant={isBanned ? 'success' : 'danger'}
                  size="sm"
                  fullWidth
                />
                <Button
                  label="🗑️ Remove"
                  onPress={handleRemove}
                  variant="secondary"
                  size="sm"
                  fullWidth
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Photos</Text>
          {userData?.portfolioPhotos?.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoScroll}>
              {(userData.portfolioPhotos as string[]).map(
                (url: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.85}
                    onPress={() =>
                      openViewer(portfolioOffset + index, allImages)
                    }>
                    <Image source={{uri: url}} style={styles.portfolioPhoto} />
                  </TouchableOpacity>
                ),
              )}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>No portfolio photos added yet</Text>
          )}
        </View>

        {userData?.portfolioMedia?.length > 0 && (
          <View style={styles.gallerySection}>
            <Text style={styles.gallerySectionTitle}>Portfolio Gallery</Text>
            <View style={styles.mediaGrid}>
              {(userData.portfolioMedia as string[]).map(
                (url: string, i: number) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.mediaCell}
                    activeOpacity={0.85}
                    onPress={() =>
                      openViewer(
                        i,
                        (userData.portfolioMedia as string[]).map(
                          (u: string) => ({uri: u}),
                        ),
                      )
                    }>
                    <Image
                      source={{uri: url}}
                      style={styles.mediaCellImg}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ),
              )}
            </View>
          </View>
        )}

        {userData?.introVideoLink ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Intro Video</Text>
            <TouchableOpacity
              style={styles.linkCard}
              onPress={() => Linking.openURL(userData.introVideoLink)}>
              <Text style={styles.linkCardIcon}>🎥</Text>
              <View style={styles.linkCardContent}>
                <Text style={styles.linkCardTitle}>Watch Intro Reel</Text>
                <Text style={styles.linkCardUrl} numberOfLines={1}>
                  {userData.introVideoLink}
                </Text>
              </View>
              <Text style={styles.linkCardArrow}>→</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Previous Works</Text>
          {userData?.portfolio1 ||
          userData?.portfolio2 ||
          userData?.portfolio3 ? (
            [userData.portfolio1, userData.portfolio2, userData.portfolio3]
              .filter(Boolean)
              .map((link: string, i: number) => (
                <TouchableOpacity
                  key={i}
                  style={styles.linkCard}
                  onPress={() => Linking.openURL(link)}>
                  <Text style={styles.linkCardIcon}>🔗</Text>
                  <View style={styles.linkCardContent}>
                    <Text style={styles.linkCardTitle}>Work {i + 1}</Text>
                    <Text style={styles.linkCardUrl} numberOfLines={1}>
                      {link}
                    </Text>
                  </View>
                  <Text style={styles.linkCardArrow}>→</Text>
                </TouchableOpacity>
              ))
          ) : (
            <Text style={styles.emptyText}>No previous works added yet</Text>
          )}
        </View>

        {(userData?.availabilityStatus ||
          userData?.lookingFor ||
          userData?.profileTags?.length > 0 ||
          userData?.ageRange ||
          userData?.height ||
          userData?.bodyType) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Casting Profile</Text>

            {userData?.availabilityStatus
              ? (() => {
                  const avail = getAvailabilityColors(
                    userData.availabilityStatus,
                  );
                  return (
                    <View
                      style={[
                        styles.availBadge,
                        {backgroundColor: avail.bg, borderColor: avail.border},
                      ]}>
                      <Text
                        style={[styles.availBadgeText, {color: avail.color}]}>
                        {avail.dot} {userData.availabilityStatus}
                      </Text>
                    </View>
                  );
                })()
              : null}

            {userData?.lookingFor ? (
              <View style={styles.castingBlock}>
                <Text style={styles.castingLabel}>Looking For</Text>
                <Text style={styles.castingValue}>{userData.lookingFor}</Text>
              </View>
            ) : null}

            {userData?.profileTags?.length > 0 && (
              <View style={styles.castingTagRow}>
                {(userData.profileTags as string[]).map((tag: string) => (
                  <Chip key={tag} label={tag} variant="outline" static />
                ))}
              </View>
            )}

            {(userData?.ageRange || userData?.height || userData?.bodyType) && (
              <View style={styles.physicalRow}>
                {userData?.ageRange ? (
                  <Chip
                    label={`🎂 ${userData.ageRange} yrs`}
                    static
                    variant="neutral"
                  />
                ) : null}
                {userData?.height ? (
                  <Chip
                    label={`📏 ${userData.height}`}
                    static
                    variant="neutral"
                  />
                ) : null}
                {userData?.bodyType ? (
                  <Chip
                    label={`💪 ${userData.bodyType}`}
                    static
                    variant="neutral"
                  />
                ) : null}
              </View>
            )}
          </View>
        )}

        {(userData?.instagramLink || userData?.youtubeLink) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social</Text>
            {userData?.instagramLink ? (
              <TouchableOpacity
                style={[styles.socialCard, styles.socialCardIG]}
                onPress={() => Linking.openURL(userData.instagramLink)}>
                <Text style={styles.socialCardIcon}>📸</Text>
                <View style={styles.socialCardContent}>
                  <Text style={styles.socialCardPlatform}>Instagram</Text>
                  <Text style={styles.socialCardUrl} numberOfLines={1}>
                    {userData.instagramLink.replace(/^https?:\/\/(www\.)?/, '')}
                  </Text>
                </View>
                <Text style={styles.socialCardArrow}>→</Text>
              </TouchableOpacity>
            ) : null}
            {userData?.youtubeLink ? (
              <TouchableOpacity
                style={[styles.socialCard, styles.socialCardYT]}
                onPress={() => Linking.openURL(userData.youtubeLink)}>
                <Text style={styles.socialCardIcon}>▶️</Text>
                <View style={styles.socialCardContent}>
                  <Text style={styles.socialCardPlatform}>YouTube</Text>
                  <Text style={styles.socialCardUrl} numberOfLines={1}>
                    {userData.youtubeLink.replace(/^https?:\/\/(www\.)?/, '')}
                  </Text>
                </View>
                <Text style={styles.socialCardArrow}>→</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {isOwnProfile && userData?.phone ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📱</Text>
              <Text style={styles.infoText}>{userData.phone}</Text>
            </View>
          </View>
        ) : null}

        <View style={{height: insets.bottom + Spacing.xl}} />
      </ScrollView>

      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        backgroundColor="black"
      />
    </SafeAreaView>
  );
};

export default PublicProfileScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {color: Colors.textSecondary, fontSize: 16},

  profileSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: Spacing.screenH,
  },

  bannedBanner: {
    backgroundColor: Colors.errorFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    width: '100%',
    alignItems: 'center',
  },
  bannedText: {color: Colors.error, fontSize: 13, fontWeight: 'bold'},

  avatar: {marginBottom: Spacing.lg},
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: Spacing.lg,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {color: Colors.textInverse, fontSize: 44, fontWeight: 'bold'},

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  roleChip: {marginBottom: Spacing.md},
  shareBtn: {marginTop: Spacing.xs, marginBottom: Spacing.sm},

  bio: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  bioEmpty: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    fontStyle: 'italic',
  },

  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  statBox: {alignItems: 'center', paddingHorizontal: Spacing.xl},
  statDivider: {width: 1, height: 40, backgroundColor: Colors.border},
  statNumber: {color: Colors.textPrimary, fontSize: 28, fontWeight: 'bold'},
  statLabel: {color: Colors.textSecondary, fontSize: 13, marginTop: Spacing.xs},

  actionRow: {flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm},
  followButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    ...Shadows.sm,
  },
  followingButton: {
    backgroundColor: Colors.cardElevated,
    borderColor: Colors.primary,
  },
  followButtonText: {
    color: Colors.textInverse,
    fontWeight: 'bold',
    fontSize: 15,
  },

  messageButton: {
    backgroundColor: Colors.primaryFaint,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    alignItems: 'center',
    minWidth: 120,
    ...Shadows.sm,
  },
  messageButtonText: {color: Colors.primary, fontWeight: 'bold', fontSize: 15},
  pendingButton: {borderColor: Colors.border, opacity: 0.7},
  connectButton: {
    backgroundColor: Colors.primaryFaint,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    ...Shadows.sm,
  },

  connectHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },

  editProfileBtn: {marginBottom: Spacing.md},

  adminSection: {marginTop: Spacing.lg, width: '100%'},
  adminLabel: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  adminRow: {flexDirection: 'row', gap: Spacing.sm},

  section: {paddingHorizontal: Spacing.screenH, marginBottom: Spacing.xxl},
  sectionTitle: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {color: Colors.textSecondary, fontSize: 14, fontStyle: 'italic'},
  photoScroll: {flexDirection: 'row'},
  portfolioPhoto: {
    width: 110,
    height: 110,
    borderRadius: Radius.md,
    marginRight: Spacing.sm,
  },

  linkCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  linkCardIcon: {fontSize: 24, marginRight: Spacing.md},
  linkCardContent: {flex: 1},
  linkCardTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  linkCardUrl: {color: Colors.textSecondary, fontSize: 12},
  linkCardArrow: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: Spacing.sm,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  infoIcon: {fontSize: 20},
  infoText: {color: Colors.textPrimary, fontSize: 15},

  skeletonAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.card,
  },
  skeletonLine: {backgroundColor: Colors.card, borderRadius: Radius.sm},
  skeletonStatBox: {
    width: 80,
    height: 60,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
  },

  toastBanner: {
    position: 'absolute',
    top: 60,
    left: Spacing.screenH,
    right: Spacing.screenH,
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    zIndex: 100,
  },
  toastText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  gallerySection: {marginBottom: Spacing.xxl},
  gallerySectionTitle: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.screenH,
  },
  mediaGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP},
  mediaCell: {width: CELL_SIZE, height: CELL_SIZE},
  mediaCellImg: {width: '100%', height: '100%'},

  availBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  availBadgeText: {fontSize: 13, fontWeight: '700'},

  castingBlock: {marginBottom: Spacing.md},
  castingLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  castingValue: {color: Colors.textPrimary, fontSize: 14, lineHeight: 20},

  castingTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  physicalRow: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm},

  socialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  socialCardIG: {
    backgroundColor: 'rgba(193,53,132,0.08)',
    borderColor: 'rgba(193,53,132,0.3)',
  },
  socialCardYT: {
    backgroundColor: 'rgba(255,0,0,0.06)',
    borderColor: 'rgba(255,0,0,0.25)',
  },
  socialCardIcon: {fontSize: 22, marginRight: Spacing.md},
  socialCardContent: {flex: 1},
  socialCardPlatform: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  socialCardUrl: {color: Colors.textSecondary, fontSize: 12},
  socialCardArrow: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
});
