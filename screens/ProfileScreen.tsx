import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Share,
  Dimensions,
  Linking,
  StatusBar,
  Modal,
} from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
} from 'react-native-image-picker';
import {useFocusEffect} from '@react-navigation/native';
import ProfileCompletionCard from './ProfileCompletionCard';
import {usePremiumStatus} from '../hooks/usePremiumStatus';
import PremiumBadge from '../src/components/Premium/PremiumBadge';
import api from '../src/api/client';
import {useApp} from '../src/context/AppContext';
import {uploadImage} from '../src/services/uploadService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Avatar, Header, Button, Input, Chip, Card} from '../components/ui';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {useTheme} from '../src/context/ThemeContext';

const SCREEN_W = Dimensions.get('window').width;
const GRID_GAP = 2;
const CELL_SIZE = Math.floor((SCREEN_W - 40 - GRID_GAP * 2) / 3);

interface PhotoAsset {
  uri: string;
  type?: string;
  name?: string;
}

const ROLE_TAGS = [
  'Lead',
  'Supporting',
  'Character',
  'Theatre',
  'Film',
  'OTT',
  'Web Series',
  'Ad Film',
];

const availVariant = (status: string): 'success' | 'warning' | 'default' => {
  if (status === 'Available Now') {
    return 'success';
  }
  if (status === 'Booked') {
    return 'warning';
  }
  return 'default';
};

export default function ProfileScreen({navigation, route}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<string>('Actor');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [showFullAvatar, setShowFullAvatar] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);

  const {isAdmin, isApprovedDirector, user, signOut} = useApp();
  const scrollRef = useRef<ScrollView>(null);

  const loadProfile = React.useCallback(async () => {
    try {
      const res = await api.get<any>('/users/profile');
      if (res?.user) {
        const data = res.user;
        setName(data?.fullName || data?.displayName || data?.name || '');
        setRole(data?.role || 'Actor');
        setPhotoUrl(data?.photoUrl || data?.photoURL || '');
        setVerificationStatus(data?.verificationStatus || '');
        setLocation(data?.location || '');
        setFollowersCount(data?.followerCount || 0);
        setFollowingCount(data?.followingCount || 0);
        setApplicationsCount(data?.applicationsCount || 0);
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => loadProfile(), 300);
      return () => clearTimeout(timer);
    }, [loadProfile]),
  );

  const handleShare = async () => {
    const shareName = name || user?.email?.split('@')[0] || 'my profile';
    try {
      await Share.share({
        message:
          `Check out ${shareName} on CineLink!\n\n` +
          `They're a ${role} on CineLink — India's casting & film collaboration platform.\n\n` +
          'Download CineLink to view their full profile and connect! 🎬',
      });
    } catch (_) {}
  };

  const displayName = name || user?.email?.split('@')[0] || 'Me';
  const avatarUri = photoUrl || null;

  if (!profileLoaded) {
    return (
      <View style={[styles.container, {backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: Colors.background}]}>
      <StatusBar
        barStyle={
          Colors.background !== '#FFFFFF' ? 'light-content' : 'dark-content'
        }
        backgroundColor={Colors.background}
      />

      <Header title="Profile" navigation={navigation} />

      <ScrollView
        ref={scrollRef}
        style={[styles.scroll, {backgroundColor: Colors.background}]}
        contentContainerStyle={{paddingTop: 0}}
        showsVerticalScrollIndicator={false}>
        {/* ── PROFILE HEADER (AVATAR ON LEFT, STATS ON RIGHT) ── */}
        <View style={styles.centeredHeader}>
          <View style={styles.profileHeaderTopRow}>
            {/* Touchable Avatar for full image circle view */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowFullAvatar(true)}
              style={styles.centeredAvatarContainer}
            >
              <Avatar uri={avatarUri} name={name || user?.email} size="lg" ring />
              {verificationStatus === 'verified' && (
                <View style={styles.verifiedBadgeOverlap}>
                  <Text style={styles.verifiedBadgeOverlapText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Stats Row beside avatar */}
            <View style={styles.centeredStatsRow}>
              <TouchableOpacity
                style={styles.centeredStatItem}
                onPress={() => navigation.navigate('MyApplications')}>
                <Text style={styles.centeredStatNum}>{applicationsCount}</Text>
                <Text style={styles.centeredStatLbl}>Applications</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.centeredStatItem}
                onPress={() =>
                  navigation.navigate('Followers', {
                    userId: user?.uid,
                    displayName,
                    tab: 'followers',
                  })
                }>
                <Text style={styles.centeredStatNum}>{followersCount}</Text>
                <Text style={styles.centeredStatLbl}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.centeredStatItem}
                onPress={() =>
                  navigation.navigate('Followers', {
                    userId: user?.uid,
                    displayName,
                    tab: 'following',
                  })
                }>
                <Text style={styles.centeredStatNum}>{followingCount}</Text>
                <Text style={styles.centeredStatLbl}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* User Info below avatar/stats */}
          <View style={styles.profileMetaInfo}>
            {name ? <Text style={styles.centeredName}>{name}</Text> : null}
            <Text style={styles.centeredRole}>{role || 'Actor'}</Text>
            {location ? (
              <View style={styles.centeredLocationRow}>
                <Text style={styles.centeredLocationIcon}>📍</Text>
                <Text style={styles.centeredLocationText}>{location}</Text>
              </View>
            ) : null}
          </View>

          {/* Action Row */}
          <View style={styles.profileActionRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Chats')}
              style={styles.profileEditBtn}>
              <Text style={styles.profileEditBtnText}>Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              style={styles.profileIconBtn}>
              <Text style={styles.profileIconBtnText}>✈️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={styles.profileIconBtn}>
              <Text style={styles.profileIconBtnText}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.menuSection, {marginBottom: insets.bottom + 60}]}>
          {/* App Settings Section */}
          <Text style={styles.sectionHeader}>App Settings</Text>
          {[
            {
              icon: '👤',
              label: 'My Profile',
              desc: 'View and edit your professional profile',
              screen: 'MyProfile',
            },
            ...(!isAdmin
              ? [
                  {
                    icon: '🎬',
                    label: 'My Applications',
                    desc: 'Track your audition and job applications',
                    screen: 'MyApplications',
                  },
                ]
              : []),
            ...(isApprovedDirector || isAdmin
              ? [
                  {
                    icon: '🎥',
                    label: isAdmin ? 'Films' : 'My Films',
                    desc: isAdmin
                      ? 'Manage uploaded short films'
                      : 'Manage your uploaded short films',
                    screen: 'MyFilms',
                  },
                  {
                    icon: '🏆',
                    label: isAdmin ? 'Contests' : 'My Contests',
                    desc: isAdmin
                      ? 'Manage all contests'
                      : 'View your contest participations',
                    screen: 'MyContests',
                  },
                ]
              : []),
            ...(!isAdmin
              ? [
                  {
                    icon: '💾',
                    label: 'Saved Auditions',
                    desc: 'Your bookmarked casting calls',
                    screen: 'SavedAuditions',
                  },
                ]
              : []),
            ...(isApprovedDirector || isAdmin
              ? [
                  {
                    icon: '🎭',
                    label: isAdmin ? 'Auditions' : 'My Auditions',
                    desc: isAdmin
                      ? 'Manage all auditions'
                      : 'Manage your posted auditions',
                    screen: 'MyAuditions',
                  },
                  {
                    icon: '🚪',
                    label: isAdmin ? 'Project Rooms' : 'My Project Rooms',
                    desc: isAdmin
                      ? 'Manage all project rooms'
                      : 'Manage your created project rooms',
                    screen: 'MyRooms',
                  },
                ]
              : []),
            ...(isAdmin
              ? [
                  {
                    icon: '⚡',
                    label: 'Quick Post',
                    desc: 'Publish a quick text or media update',
                    screen: 'QuickPost',
                  },
                  {
                    icon: '📢',
                    label: 'Announcements',
                    desc: 'Publish system announcements',
                    screen: 'Announcements',
                  },
                ]
              : []),
            {
              icon: '⚙️',
              label: 'Settings',
              desc: 'Preferences, theme, and security',
              screen: 'Settings',
            },
          ].map(item => (
            <TouchableOpacity
              key={item.screen}
              style={styles.menuRow}
              onPress={() => navigation.navigate(item.screen as any)}>
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuEmoji}>{item.icon}</Text>
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}

          {/* Creator & Admin Panel Section */}
          {(isAdmin || isApprovedDirector || !isApprovedDirector) && (
            <>
              <Text style={[styles.sectionHeader, {marginTop: Spacing.xl}]}>
                Account & Support
              </Text>

              {/* Become Casting Director */}
              {!isApprovedDirector && !isAdmin && (
                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={() => navigation.navigate('CastingRequest')}>
                  <View style={styles.menuIconContainer}>
                    <Text style={styles.menuEmoji}>💼</Text>
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuLabel}>
                      Become a Casting Director
                    </Text>
                    <Text style={styles.menuDesc}>
                      Apply to post casting calls
                    </Text>
                  </View>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
              )}

              {/* Industry Guide */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => navigation.navigate('IndustryGuide')}>
                <View style={styles.menuIconContainer}>
                  <Text style={styles.menuEmoji}>📚</Text>
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuLabel}>Industry Guide</Text>
                  <Text style={styles.menuDesc}>
                    Learn how to grow in the industry
                  </Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>

              {/* AI Assistant */}
              {isAdmin && (
                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={() => navigation.navigate('AIAssistant')}>
                  <View style={styles.menuIconContainer}>
                    <Text style={styles.menuEmoji}>🤖</Text>
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuLabel}>AI Assistant</Text>
                    <Text style={styles.menuDesc}>
                      Chat with the CineLink AI assistant
                    </Text>
                  </View>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
              )}

              {/* Admin Dashboard */}
              {isAdmin && (
                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={() => navigation.navigate('AdminReports')}>
                  <View style={styles.menuIconContainer}>
                    <Text style={styles.menuEmoji}>🛡️</Text>
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuLabel}>Admin Dashboard</Text>
                    <Text style={styles.menuDesc}>
                      System administration controls
                    </Text>
                  </View>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              Alert.alert('Logout', 'Are you sure you want to logout?', [
                {text: 'Cancel', style: 'cancel'},
                {
                  text: 'Logout',
                  style: 'destructive',
                  onPress: async () => await signOut(),
                },
              ]);
            }}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
            {avatarUri ? (
              <Image
                source={{uri: avatarUri}}
                style={styles.avatarModalImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarModalImage, styles.avatarModalPlaceholder]}>
                <Text style={styles.avatarModalPlaceholderText}>
                  {name ? name.substring(0, 1).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},

  shareHeaderBtn: {padding: Spacing.xs},
  shareHeaderIcon: {color: Colors.primary, fontSize: 20, fontWeight: '600'},

  avatarSection: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  avatarWrapper: {position: 'relative', marginBottom: Spacing.md},
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  editBadgeText: {...Typography.micro, color: Colors.textInverse},
  verifiedBadge: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  verifiedBadgeText: {...Typography.label, color: Colors.success},
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  uploadingText: {...Typography.caption, color: Colors.primary},
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  profileName: {...Typography.h3, color: Colors.textPrimary},
  email: {...Typography.caption, color: Colors.textSecondary, marginTop: 2},

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statItem: {alignItems: 'center', flex: 1},
  statDivider: {width: 1, height: 36, backgroundColor: Colors.border},
  statNum: {...Typography.h2, color: Colors.textPrimary},
  statLbl: {...Typography.caption, color: Colors.textSecondary, marginTop: 3},

  completionWrapper: {marginHorizontal: Spacing.screenH, marginTop: Spacing.md},

  section: {paddingHorizontal: Spacing.screenH, paddingBottom: Spacing['4xl']},
  sectionTitle: {
    ...Typography.label,
    color: Colors.primary,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.sm,
  },
  hint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  roleRow: {flexDirection: 'row', marginBottom: Spacing.sm},
  inputSpacing: {marginBottom: Spacing.md},
  bioInput: {height: 100, textAlignVertical: 'top'},

  photoRow: {flexDirection: 'row', marginBottom: Spacing.sm},
  photoBox: {marginRight: Spacing.md, position: 'relative'},
  portfolioPhoto: {width: 80, height: 110, borderRadius: Radius.md},
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.error,
    borderRadius: Radius.md,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {...Typography.captionBold, color: '#FFFFFF'},
  addPhotoBtn: {
    width: 80,
    height: 110,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBtnIcon: {color: Colors.primary, fontSize: 28, fontWeight: 'bold'},
  addPhotoBtnText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  verifyBtn: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  verifyBtnDone: {
    backgroundColor: Colors.successFaint,
    borderColor: Colors.successBorder,
  },
  verifyBtnPending: {
    backgroundColor: Colors.warningFaint,
    borderColor: Colors.warningBorder,
  },
  verifyBtnText: {...Typography.btn, color: Colors.primary},
  saveBtn: {marginTop: Spacing.lg},

  profileHeaderCard: {
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.md,
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.md,
  },
  profileHeaderCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  profileHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  profileHeaderName: {
    ...Typography.label,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  profileHeaderSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  profileHeaderEditBtn: {
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderEditIcon: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    color: Colors.textPrimary,
    fontSize: 15,
    marginTop: Spacing.md,
    marginBottom: 4,
    marginHorizontal: Spacing.screenH,
  },
  menuSection: {marginTop: Spacing.xs, marginBottom: 20},
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: Spacing.screenH,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryFaint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuEmoji: {
    fontSize: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuLabel: {
    ...Typography.label,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  menuDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  menuArrow: {
    color: Colors.textTertiary,
    fontSize: 16,
  },
  logoutBtn: {
    backgroundColor: Colors.error,
    borderRadius: Radius.button,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.screenH,
  },
  logoutBtnText: {
    ...Typography.label,
    fontSize: 16,
    color: '#FAFAFA',
  },

  // ── Portfolio Gallery ─────────────────────────────────────
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  mediaCell: {
    width: 80,
    height: 110,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  mediaCellImg: {width: '100%', height: '100%'},
  mediaCellAdd: {
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mediaCellPlus: {
    color: Colors.primary,
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  mediaCellAddText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // ── Casting Profile ──────────────────────────────────────
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },

  // ── Refactored View Profile Styles ──
  headerBtn: {
    padding: Spacing.xs,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnTextCancel: {
    fontSize: 22,
    fontWeight: '300',
    color: Colors.error,
  },
  headerBtnTextSave: {
    fontSize: 22,
    fontWeight: '400',
    color: Colors.success,
  },
  actionBtnWrapper: {
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  editProfileBtn: {
    borderColor: Colors.primary,
  },
  cancelBtn: {
    marginTop: Spacing.md,
    borderColor: Colors.border,
  },
  viewSectionCard: {
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.md + 4,
    padding: Spacing.md + 4,
  },
  viewSectionContainer: {
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.md + 4,
    paddingVertical: Spacing.md,
  },
  centeredHeader: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: Spacing.xs,
    paddingHorizontal: Spacing.screenH,
  },
  centeredAvatarContainer: {
    position: 'relative',
    marginBottom: Spacing.xs,
  },
  verifiedBadgeOverlap: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadgeOverlapText: {
    color: '#FAFAFA',
    fontSize: 10,
    fontWeight: 'bold',
  },
  centeredNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  centeredName: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  centeredRole: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  centeredLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  centeredLocationIcon: {
    fontSize: 13,
  },
  centeredLocationText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  profileHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.xs,
  },
  profileMetaInfo: {
    width: '100%',
    alignItems: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: 4,
  },
  centeredStatsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: Spacing.xs,
  },
  centeredStatItem: {
    alignItems: 'center',
  },
  centeredStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.borderLight,
  },
  centeredStatNum: {
    ...Typography.h3,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  centeredStatLbl: {
    ...Typography.micro,
    color: Colors.textSecondary,
    marginTop: 2,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  viewAllText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  viewSectionTitle: {
    ...Typography.label,
    color: Colors.primary,
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  viewBioText: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  detailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  detailValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  detailDivider: {
    height: 0,
    marginVertical: Spacing.xs,
  },
  availabilityViewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  lookingForBox: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  lookingForText: {
    ...Typography.body,
    color: Colors.textPrimary,
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
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  gridCellValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tagsViewSection: {
    marginBottom: Spacing.md,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  socialBtnText: {
    ...Typography.bodySm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  videoLinkBtn: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  videoLinkBtnText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  workLinkBtn: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  workLinkBtnText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  profileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    marginTop: 4,
    marginBottom: Spacing.xs,
  },
  profileEditBtn: {
    flex: 1,
    height: 34,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardElevated,
  },
  profileEditBtnText: {
    ...Typography.bodySm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  profileIconBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardElevated,
  },
  profileIconBtnText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
});
