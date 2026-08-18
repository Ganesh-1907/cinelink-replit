import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import api from '../src/api/client';
import {Colors, Spacing, Radius} from '../src/theme';
import {Header, Avatar, Chip, EmptyState} from '../components/ui';
import {useApp} from '../src/context/AppContext';
import ImageViewing from 'react-native-image-viewing';
import {useTheme} from '../src/context/ThemeContext';

const SCREEN_W = Dimensions.get('window').width;

export default function PublicProfileScreen({route, navigation}: any) {
  const {isDark} = useTheme();
  const {userId: paramUserId} = route.params;
  const userId = paramUserId?._id || paramUserId?.id || paramUserId || '';
  const [profile, setProfile] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'grid' | 'details'>('grid');
  const [galleryIndex, setGalleryIndex] = useState<number>(0);
  const [galleryVisible, setGalleryVisible] = useState<boolean>(false);
  const [featuredGalleryVisible, setFeaturedGalleryVisible] = useState<boolean>(false);
  const [featuredGalleryIndex, setFeaturedGalleryIndex] = useState<number>(0);
  const [showFullAvatar, setShowFullAvatar] = useState(false);
  const {user: currentUser} = useApp();
  const isOwn = userId === currentUser?.uid;

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get<any>(`/users/${userId}`);
      setProfile(res?.user || null);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const checkFollowStatus = useCallback(async () => {
    try {
      const res = await api.get<any>(`/users/${userId}/follow-status`);
      setIsFollowing(res?.following || false);
    } catch (e) {}
  }, [userId]);

  useEffect(() => {
    Promise.all([loadProfile(), checkFollowStatus()]);
  }, [loadProfile, checkFollowStatus]);

  const toggleFollow = async () => {
    const prev = isFollowing;
    setIsFollowing(!isFollowing);
    try {
      await api.post('/users/follow', {targetUserId: userId});
    } catch {
      setIsFollowing(prev);
    }
  };

  const startChat = async () => {
    try {
      const res = await api.post<any>('/chat/start', {otherUserId: userId});
      if (res.chat) {
        navigation.navigate('ChatScreen', {chat: res.chat});
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not start chat.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Profile" navigation={navigation} />
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.loaderMarginTop}
        />
      </SafeAreaView>
    );
  }
  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Profile" navigation={navigation} />
        <EmptyState icon="👤" title="User not found" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Profile" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.instagramHeaderContainer}>
          {/* Top row: Avatar on left, Stats on right */}
          <View style={styles.instagramTopRow}>
            {/* Avatar with verified badge overlap */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowFullAvatar(true)}
              style={styles.instagramAvatarContainer}>
              <Avatar
                uri={profile.photoUrl}
                name={profile.fullName || profile.displayName || 'User'}
                size="xl"
                ring
              />
              {profile.verificationStatus === 'verified' && (
                <View style={styles.verifiedBadgeOverlap}>
                  <Text style={styles.verifiedBadgeOverlapText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Stats column block */}
            <View style={styles.instagramStatsContainer}>
              <View style={styles.instagramStatCol}>
                <Text style={styles.instagramStatNum}>{profile.portfolioMedia?.length || 0}</Text>
                <Text style={styles.instagramStatLbl}>posts</Text>
              </View>
              
              <TouchableOpacity
                style={styles.instagramStatCol}
                onPress={() =>
                  navigation.navigate('Followers', {
                    userId,
                    displayName: profile.fullName || profile.displayName,
                    tab: 'followers',
                  })
                }>
                <Text style={styles.instagramStatNum}>{profile.followerCount || 0}</Text>
                <Text style={styles.instagramStatLbl}>followers</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.instagramStatCol}
                onPress={() =>
                  navigation.navigate('Followers', {
                    userId,
                    displayName: profile.fullName || profile.displayName,
                    tab: 'following',
                  })
                }>
                <Text style={styles.instagramStatNum}>{profile.followingCount || 0}</Text>
                <Text style={styles.instagramStatLbl}>following</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Middle block: Name, role subtitle, location, bio */}
          <View style={styles.instagramBioContainer}>
            <Text style={styles.instagramDisplayName}>
              {profile.fullName || profile.displayName || 'User'}
            </Text>
            <Text style={styles.instagramRoleSubtitle}>{profile.role || 'Actor'}</Text>
            {profile.location ? (
              <Text style={styles.instagramLocationText}>📍 {profile.location}</Text>
            ) : null}
            {profile.bio && profile.bio.trim() ? (
              <Text style={styles.instagramBioText}>{profile.bio}</Text>
            ) : null}
          </View>

          {/* Action Row */}
          {!isOwn && (
            <View style={styles.instagramActionRow}>
              <TouchableOpacity
                style={[
                  styles.instagramActionBtn,
                  isFollowing && styles.instagramActionBtnFollowing,
                ]}
                onPress={toggleFollow}>
                <Text
                  style={[
                    styles.instagramActionBtnText,
                    isFollowing && styles.instagramActionBtnFollowingText,
                  ]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.instagramMessageBtn}
                onPress={startChat}>
                <Text style={styles.instagramMessageBtnText}>Message</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.instagramContentContainer}>
          {/* Highlights (Portfolio Photos as circular highlights) */}
          {profile.portfolioPhotos && profile.portfolioPhotos.length > 0 && (
            <View style={styles.highlightsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.highlightsScroll}>
                {profile.portfolioPhotos.filter((url: string) => url).map((url: string, i: number) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.highlightItem}
                    onPress={() => {
                      setFeaturedGalleryIndex(i);
                      setFeaturedGalleryVisible(true);
                    }}>
                    <View style={styles.highlightCircle}>
                      <Image source={{uri: url}} style={styles.highlightImg} />
                    </View>
                    <Text style={styles.highlightLabel} numberOfLines={1}>
                      Featured {i + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Instagram Style Tab Bar */}
          <View style={styles.instagramTabBar}>
            <TouchableOpacity
              style={[
                styles.instagramTabItem,
                activeTab === 'grid' && styles.instagramTabItemActive,
              ]}
              onPress={() => setActiveTab('grid')}>
              <Text
                style={[
                  styles.instagramTabIcon,
                  activeTab === 'grid' && styles.instagramTabIconActive,
                ]}>
                ▦
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.instagramTabItem,
                activeTab === 'details' && styles.instagramTabItemActive,
              ]}
              onPress={() => setActiveTab('details')}>
              <Text
                style={[
                  styles.instagramTabIcon,
                  activeTab === 'details' && styles.instagramTabIconActive,
                ]}>
                👤
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Contents */}
          {activeTab === 'grid' ? (
            <View style={styles.instagramGridContainer}>
              {profile.portfolioMedia && profile.portfolioMedia.filter((url: string) => url).length > 0 ? (
                <View style={styles.instagramMediaGrid}>
                  {profile.portfolioMedia.filter((url: string) => url).map((url: string, i: number) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.instagramMediaCell}
                      onPress={() => {
                        setGalleryIndex(i);
                        setGalleryVisible(true);
                      }}
                      activeOpacity={0.85}>
                      <Image
                        source={{uri: url}}
                        style={styles.instagramMediaCellImg}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyGridContainer}>
                  <Text style={styles.emptyGridText}>No posts yet</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.instagramDetailsContainer}>
              {/* ── BIO SECTION ── */}
              {profile.bio && profile.bio.trim() ? (
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsCardTitle}>About Me</Text>
                  <Text style={styles.viewBioText}>{profile.bio}</Text>
                </View>
              ) : null}

              {/* ── CASTING & PHYSICAL STATS CARD ── */}
              {(profile.ageRange || profile.height || profile.bodyType || profile.availabilityStatus || profile.lookingFor) ? (
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsCardTitle}>Casting & Physical Stats</Text>

                  {profile.availabilityStatus ? (
                    <View style={styles.detailRowItem}>
                      <Text style={styles.detailRowLabel}>⚡ Status</Text>
                      <Chip
                        label={`${
                          profile.availabilityStatus === 'Available Now'
                            ? '🟢'
                            : profile.availabilityStatus === 'Booked'
                            ? '🟡'
                            : '🔴'
                        } ${profile.availabilityStatus}`}
                        selected={true}
                      />
                    </View>
                  ) : null}

                  {profile.ageRange ? (
                    <View style={styles.detailRowItem}>
                      <Text style={styles.detailRowLabel}>🎂 Age Range</Text>
                      <Text style={styles.detailRowValue}>{profile.ageRange}</Text>
                    </View>
                  ) : null}

                  {profile.height ? (
                    <View style={styles.detailRowItem}>
                      <Text style={styles.detailRowLabel}>📏 Height</Text>
                      <Text style={styles.detailRowValue}>{profile.height}</Text>
                    </View>
                  ) : null}

                  {profile.bodyType ? (
                    <View style={styles.detailRowItem}>
                      <Text style={styles.detailRowLabel}>👤 Body Type</Text>
                      <Text style={styles.detailRowValue}>{profile.bodyType}</Text>
                    </View>
                  ) : null}

                  {profile.lookingFor ? (
                    <View style={[styles.detailRowItem, {flexDirection: 'column', alignItems: 'flex-start', borderBottomWidth: 0}]}>
                      <Text style={[styles.detailRowLabel, {marginBottom: 4}]}>🔍 Looking For</Text>
                      <Text style={styles.detailRowSubtext}>{profile.lookingFor}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* ── PROFILE TAGS CARD ── */}
              {profile.profileTags && profile.profileTags.length > 0 ? (
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsCardTitle}>Specializations</Text>
                  <View style={styles.detailsTagGrid}>
                    {profile.profileTags.map((tag: string) => (
                      <Chip key={tag} label={tag} selected={true} />
                    ))}
                  </View>
                </View>
              ) : null}

              {/* ── CONTACT & SOCIALS CARD ── */}
              {(profile.phone || profile.instagramLink || profile.facebookLink || profile.youtubeLink) ? (
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsCardTitle}>Contact & Socials</Text>
                  
                  {profile.phone ? (
                    <View style={styles.detailRowItem}>
                      <Text style={styles.detailRowLabel}>📞 Phone</Text>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs}}>
                        <TouchableOpacity 
                          onPress={() => Linking.openURL(`tel:${profile.phone}`)}
                          style={styles.detailsPhoneAction}>
                          <Text style={styles.detailsPhoneText}>{profile.phone}</Text>
                          <Text style={styles.detailsPhoneIcon}>📞</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => {
                            const cleanPhone = profile.phone.replace(/[^0-9]/g, '');
                            const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                            Linking.openURL(`whatsapp://send?phone=${formattedPhone}`).catch(() => 
                              Alert.alert('WhatsApp Not Installed', 'Please install WhatsApp to chat.')
                            );
                          }}
                          style={[styles.detailsPhoneAction, {backgroundColor: '#25D36620', borderColor: '#25D366'}]}>
                          <Text style={[styles.detailsPhoneText, {color: '#25D366'}]}>WhatsApp</Text>
                          <Text style={styles.detailsPhoneIcon}>💬</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}

                  {/* Social Buttons List */}
                  {(profile.instagramLink || profile.facebookLink || profile.youtubeLink) ? (
                    <View style={styles.detailsSocialGrid}>
                      {profile.instagramLink ? (
                        <TouchableOpacity
                          onPress={() =>
                            Linking.openURL(profile.instagramLink).catch(() =>
                              Alert.alert('Error', 'Could not open Instagram link'),
                            )
                          }
                          style={[styles.detailsSocialBtn, {borderColor: '#E1306C'}]}>
                          <Text style={[styles.detailsSocialBtnText, {color: '#E1306C'}]}>📸 Instagram</Text>
                        </TouchableOpacity>
                      ) : null}

                      {profile.facebookLink ? (
                        <TouchableOpacity
                          onPress={() =>
                            Linking.openURL(profile.facebookLink).catch(() =>
                              Alert.alert('Error', 'Could not open Facebook link'),
                            )
                          }
                          style={[styles.detailsSocialBtn, {borderColor: '#1877F2'}]}>
                          <Text style={[styles.detailsSocialBtnText, {color: '#1877F2'}]}>👤 Facebook</Text>
                        </TouchableOpacity>
                      ) : null}

                      {profile.youtubeLink ? (
                        <TouchableOpacity
                          onPress={() =>
                            Linking.openURL(profile.youtubeLink).catch(() =>
                              Alert.alert('Error', 'Could not open YouTube link'),
                            )
                          }
                          style={[styles.detailsSocialBtn, {borderColor: '#FF0000'}]}>
                          <Text style={[styles.detailsSocialBtnText, {color: '#FF0000'}]}>🎥 YouTube</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* ── VIDEO & PORTFOLIO LINKS CARD ── */}
              {(profile.introVideoLink || profile.portfolio1 || profile.portfolio2 || profile.portfolio3) ? (
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsCardTitle}>Videos & Work Links</Text>

                  {profile.introVideoLink ? (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(profile.introVideoLink).catch(() =>
                          Alert.alert('Error', 'Could not open video link'),
                        )
                      }
                      style={styles.detailsVideoBtn}>
                      <Text style={styles.detailsVideoBtnText}>🎬 Watch Intro Video</Text>
                    </TouchableOpacity>
                  ) : null}

                  {profile.portfolio1 ? (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(profile.portfolio1).catch(() =>
                          Alert.alert('Error', 'Could not open link'),
                        )
                      }
                      style={styles.detailsWorkLinkBtn}>
                      <Text style={styles.detailsWorkLinkBtnText}>🔗 Previous Work 1</Text>
                    </TouchableOpacity>
                  ) : null}

                  {profile.portfolio2 ? (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(profile.portfolio2).catch(() =>
                          Alert.alert('Error', 'Could not open link'),
                        )
                      }
                      style={styles.detailsWorkLinkBtn}>
                      <Text style={styles.detailsWorkLinkBtnText}>🔗 Previous Work 2</Text>
                    </TouchableOpacity>
                  ) : null}

                  {profile.portfolio3 ? (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(profile.portfolio3).catch(() =>
                          Alert.alert('Error', 'Could not open link'),
                        )
                      }
                      style={styles.detailsWorkLinkBtn}>
                      <Text style={styles.detailsWorkLinkBtnText}>🔗 Previous Work 3</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
      {profile.portfolioMedia && profile.portfolioMedia.filter((url: string) => url).length > 0 && (
        <ImageViewing
          images={profile.portfolioMedia.filter((url: string) => url).map((url: string) => ({uri: url}))}
          imageIndex={galleryIndex}
          visible={galleryVisible}
          onRequestClose={() => setGalleryVisible(false)}
          swipeToCloseEnabled
          doubleTapToZoomEnabled
          backgroundColor="black"
        />
      )}
      {profile.portfolioPhotos && profile.portfolioPhotos.filter((url: string) => url).length > 0 && (
        <ImageViewing
          images={profile.portfolioPhotos.filter((url: string) => url).map((url: string) => ({uri: url}))}
          imageIndex={featuredGalleryIndex}
          visible={featuredGalleryVisible}
          onRequestClose={() => setFeaturedGalleryVisible(false)}
          swipeToCloseEnabled
          doubleTapToZoomEnabled
          backgroundColor="black"
        />
      )}

      {/* FULL AVATAR IMAGE VIEW MODAL */}
      <Modal
        visible={showFullAvatar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullAvatar(false)}
      >
        <TouchableOpacity
          style={styles.avatarModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFullAvatar(false)}
        >
          <View style={styles.avatarModalContent}>
            {profile.photoUrl ? (
              <Image
                source={{uri: profile.photoUrl}}
                style={styles.avatarModalImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarModalImage, styles.avatarModalPlaceholder]}>
                <Text style={styles.avatarModalPlaceholderText}>
                  {profile.fullName ? profile.fullName.substring(0, 1).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},

  instagramHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  instagramTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  instagramAvatarContainer: {
    position: 'relative',
  },
  instagramStatsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    marginLeft: 20,
  },
  instagramStatCol: {
    alignItems: 'center',
  },
  instagramStatNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  instagramStatLbl: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  instagramBioContainer: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  instagramDisplayName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  instagramRoleSubtitle: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  instagramLocationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  instagramBioText: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 4,
    lineHeight: 18,
  },
  instagramActionRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
    alignItems: 'center',
  },
  instagramActionBtn: {
    flex: 1,
    height: 36,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instagramActionBtnFollowing: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  instagramActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  instagramActionBtnFollowingText: {
    color: Colors.textSecondary,
  },
  instagramMessageBtn: {
    flex: 1,
    height: 36,
    backgroundColor: 'transparent',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  instagramMessageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  instagramContentContainer: {
    flex: 1,
  },
  highlightsContainer: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  highlightsScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  highlightItem: {
    alignItems: 'center',
    width: 72,
  },
  highlightCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  highlightImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  highlightLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    width: 72,
  },
  instagramTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  instagramTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: 'transparent',
  },
  instagramTabItemActive: {
    borderBottomColor: Colors.textPrimary,
  },
  instagramTabIcon: {
    fontSize: 18,
    color: Colors.textTertiary,
  },
  instagramTabIconActive: {
    color: Colors.textPrimary,
  },
  instagramGridContainer: {
    flex: 1,
  },
  instagramMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  instagramMediaCell: {
    width: Math.floor(SCREEN_W / 3) - 1,
    height: Math.floor(SCREEN_W / 3) - 1,
  },
  instagramMediaCellImg: {
    width: '100%',
    height: '100%',
  },
  emptyGridContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyGridText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  instagramDetailsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  detailsCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  detailsCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    paddingBottom: 6,
  },
  detailRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  detailRowLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  detailRowValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  detailRowSubtext: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginTop: 4,
  },
  detailsTagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailsPhoneAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailsPhoneText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  detailsPhoneIcon: {
    fontSize: 14,
    color: Colors.primary,
  },
  detailsSocialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  detailsSocialBtn: {
    flex: 1,
    minWidth: '45%',
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardElevated,
  },
  detailsSocialBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsVideoBtn: {
    backgroundColor: Colors.primary,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsVideoBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textInverse,
  },
  detailsWorkLinkBtn: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsWorkLinkBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  section: {gap: Spacing.sm},
  sectionTitle: {color: Colors.primary, fontWeight: 'bold', fontSize: 16},
  portfolioGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm},
  portfolioItem: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  portfolioImage: {width: '100%', height: '100%', resizeMode: 'cover'},
  portfolioEmoji: {fontSize: 28},
  viewSectionContainer: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  viewSectionTitle: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  availabilityViewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  detailLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  lookingForBox: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  lookingForText: {
    color: Colors.textPrimary,
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  gridCell: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  gridCellTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  gridCellValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  tagsViewSection: {
    marginBottom: Spacing.md,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  socialBtn: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  socialBtnText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  videoLinkBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  videoLinkBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  workLinkBtn: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  workLinkBtnText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  loaderMarginTop: {
    marginTop: 60,
  },
  flex1: {
    flex: 1,
  },
  centeredHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  centeredAvatarContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  verifiedBadgeOverlap: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.success,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadgeOverlapText: {
    color: '#FAFAFA',
    fontSize: 11,
    fontWeight: 'bold',
  },
  centeredNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  centeredName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  centeredRole: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  centeredLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.md,
  },
  centeredLocationIcon: {
    fontSize: 14,
  },
  centeredLocationText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  profileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  profileEditBtn: {
    flex: 1,
    height: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  profileFollowingBtn: {
    backgroundColor: Colors.cardElevated,
    borderColor: Colors.border,
  },
  profileEditBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  profileFollowingBtnText: {
    color: Colors.textPrimary,
  },
  profileMessageBtn: {
    flex: 1,
    height: 38,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  profileMessageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  centeredStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  centeredStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  centeredStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.borderLight,
  },
  centeredStatNum: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  centeredStatLbl: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  viewBioText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModalContent: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: Colors.cardElevated,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 130,
  },
  avatarModalPlaceholder: {
    backgroundColor: Colors.primaryFaint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModalPlaceholderText: {
    color: Colors.primary,
    fontSize: 72,
    fontWeight: '700',
  },
});
