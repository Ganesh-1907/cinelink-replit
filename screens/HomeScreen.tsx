import React, {useEffect, useState, useCallback, useRef} from 'react';

import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Modal,
} from 'react-native';
import {useTheme} from '../src/context/ThemeContext';
import api from '../src/api/client';
import {useFocusEffect} from '@react-navigation/native';
import Svg, {
  Path,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';

import ReportModal from './ReportModal';
import {useApp} from '../src/context/AppContext';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Avatar, EmptyState} from '../components/ui';

export default function HomeScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [auditionPosts, setAuditionPosts] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [contests, setContests] = useState<any[]>([]);
  const [contestsLoading, setContestsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const {isAdmin, isApprovedDirector, user: currentUser, signOut} = useApp();
  const {isDark, toggleTheme} = useTheme();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const openReport = (id: string, type: string, title: string) => {
    setReportTarget({id, type, title});
    setReportModalVisible(true);
  };
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [films, setFilms] = useState<any[]>([]);
  const [filmsLoading, setFilmsLoading] = useState(true);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [feedPostsLoading, setFeedPostsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'auditions' | 'films' | 'contests' | 'quick_posts' | 'announcements'>('auditions');

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const carouselRef = useRef<ScrollView>(null);
  const timerRef = useRef<any>(null);

  const carouselItems = [
    {
      title: 'CineLink for You',
      quote: '“Every great film starts with a connection.”',
      desc: 'Complete your portfolio, showcase your portfolio, and find your next breakthrough project.',
      buttonText: 'Complete Your Profile →',
      targetScreen: 'MyProfile',
      imageKey: 'directors_chair',
    },
    {
      title: 'Find Auditions',
      quote: "“Opportunities don't happen, you create them.”",
      desc: 'Apply to vetted roles, upload your headshots and showreels, and land your dream part.',
      buttonText: 'Browse Auditions →',
      targetScreen: 'BrowseAuditions',
      imageKey: 'retro_camera',
    },
    {
      title: 'Showcase Talent',
      quote: '“Bring your cinematic vision to life.”',
      desc: 'Participate in active contests, win cash prizes, and get noticed by top industry directors.',
      buttonText: 'Active Contests →',
      targetScreen: 'Contests',
      imageKey: 'cinema_projector',
    },
    {
      title: 'Build Your Crew',
      quote: '“Cinema is a collaborative art.”',
      desc: 'Connect with screenwriters, cinematographers, editors, and producers to form your dream team.',
      buttonText: 'Explore Crew →',
      targetScreen: 'Crew',
      imageKey: 'film_roll',
    },
  ];

  const stopAutoScroll = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();
    timerRef.current = setInterval(() => {
      if (cardWidth > 0) {
        setCarouselIndex(prev => {
          const next = (prev + 1) % carouselItems.length;
          carouselRef.current?.scrollTo({ x: next * cardWidth, animated: true });
          return next;
        });
      }
    }, 4500);
  }, [cardWidth, carouselItems.length, stopAutoScroll]);

  const handleDotPress = (dotIdx: number) => {
    stopAutoScroll();
    setCarouselIndex(dotIdx);
    if (cardWidth > 0) {
      carouselRef.current?.scrollTo({ x: dotIdx * cardWidth, animated: true });
    }
    startAutoScroll();
  };

  const onCardLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setCardWidth(width);
  };

  useEffect(() => {
    if (cardWidth > 0) {
      startAutoScroll();
    }
    return () => stopAutoScroll();
  }, [cardWidth, startAutoScroll, stopAutoScroll]);

  const getCarouselImage = (key: string) => {
    if (isDark) {
      switch (key) {
        case 'directors_chair':
          return require('../assets/auth/directors_chair.jpg');
        case 'retro_camera':
          return require('../assets/auth/retro_camera.jpg');
        case 'cinema_projector':
          return require('../assets/auth/cinema_projector.jpg');
        case 'film_roll':
          return require('../assets/auth/film_roll.jpg');
        default:
          return require('../assets/auth/directors_chair.jpg');
      }
    } else {
      switch (key) {
        case 'directors_chair':
          return require('../assets/auth/directors_chair_light.jpg');
        case 'retro_camera':
          return require('../assets/auth/retro_camera_light.jpg');
        case 'cinema_projector':
          return require('../assets/auth/cinema_projector_light.jpg');
        case 'film_roll':
          return require('../assets/auth/film_roll_light.jpg');
        default:
          return require('../assets/auth/directors_chair_light.jpg');
      }
    }
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) {
      return 'Good Morning,';
    }
    if (hours < 18) {
      return 'Good Afternoon,';
    }
    return 'Good Evening,';
  };

  const profileName =
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Creator';

  const toggleSaveAudition = async (item: any) => {
    if (!currentUser) {
      return;
    }
    try {
      await api.post('/saved-auditions', {auditionId: item._id || item.id});
      const res = await api.get<{savedAuditions?: any[]}>('/saved-auditions');
      setSavedIds((res.savedAuditions || []).map((s: any) => s.auditionId));
    } catch (e) {
      console.log(e);
    }
  };

  // Drawer & Welcome logic
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-280)).current;

  const openDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: -280,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setDrawerVisible(false);
    });
  };

  useEffect(() => {
    if (drawerVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [drawerVisible, slideAnim]);

  const loadNotifications = useCallback(async () => {
    if (!currentUser) {
      return;
    }
    try {
      const res = await api.get<{notifications: any[]; unreadCount: number}>(
        '/notifications',
      );
      setUnreadCount(res.unreadCount || 0);
    } catch (e) {}
  }, [currentUser]);

  const loadProfilePhoto = useCallback(async () => {
    try {
      const res = await api.get<{user: any}>('/users/profile');
      const data = res.user;
      if (data?.photoUrl) {
        setProfilePhoto(data.photoUrl);
      } else if (data?.photoURL) {
        setProfilePhoto(data.photoURL);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadNotifications();
    loadProfilePhoto();
    const interval = setInterval(() => {
      loadNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadNotifications, loadProfilePhoto]);

  useFocusEffect(
    useCallback(() => {
      loadProfilePhoto();
    }, [loadProfilePhoto]),
  );

  const fetchSuggestions = useCallback(async () => {
    if (!currentUser) {
      return;
    }
    try {
      const uid = currentUser.uid || currentUser._id;
      const followRes = await api.get<any>(`/users/${uid}/following`);
      const followingList = followRes.following || [];
      const followedSet = new Set<string>(
        followingList.map((u: any) => u._id || u.id),
      );
      setFollowingIds(followedSet);

      const searchRes = await api.get<any>('/users/search?limit=30');
      const allUsers = searchRes.users || [];

      const otherUsers = allUsers.filter((u: any) => {
        const targetId = u._id || u.id;
        return targetId !== uid;
      });

      const sorted = [...otherUsers].sort((a, b) => {
        const aId = a._id || a.id;
        const bId = b._id || b.id;
        const aFollowed = followedSet.has(aId) ? 1 : 0;
        const bFollowed = followedSet.has(bId) ? 1 : 0;
        return aFollowed - bFollowed;
      });

      setSuggestedUsers(sorted);
    } catch (e) {
      console.log('Error fetching suggestions:', e);
    } finally {
      setSuggestedLoading(false);
    }
  }, [currentUser]);

  const toggleFollowUser = async (targetId: string) => {
    const isCurrentlyFollowing = followingIds.has(targetId);

    setFollowingIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyFollowing) {
        next.delete(targetId);
      } else {
        next.add(targetId);
      }
      return next;
    });

    try {
      await api.post('/users/follow', {targetUserId: targetId});
    } catch (e) {
      setFollowingIds(prev => {
        const next = new Set(prev);
        if (isCurrentlyFollowing) {
          next.add(targetId);
        } else {
          next.delete(targetId);
        }
        return next;
      });
      Alert.alert('Error', 'Could not update follow status.');
    }
  };

  // ── Load feed posts + auditions ──
  useEffect(() => {
    setFeedLoading(true);
    api
      .get<{auditions: any[]}>('/auditions')
      .then(audRes => {
        const audItems = (audRes.auditions || [])
          .filter((a: any) => a.isActive !== false)
          .map((a: any) => ({...a, id: a._id || a.id, source: 'audition'}));
        setAuditionPosts(
          audItems.sort(
            (a: any, b: any) =>
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime(),
          ),
        );
        setFeedLoading(false);
      })
      .catch(() => setFeedLoading(false));

    if (currentUser) {
      api
        .get<{savedAuditions?: any[]}>('/saved-auditions')
        .then(res => {
          setSavedIds((res.savedAuditions || []).map((s: any) => s.auditionId));
        })
        .catch(() => {});
      fetchSuggestions();
    }
  }, [refreshKey, currentUser, fetchSuggestions]);

  useEffect(() => {
    setContestsLoading(true);
    api
      .get<{contests: any[]}>('/contests')
      .then(res => {
        setContests(
          (res.contests || []).map((c: any) => ({...c, id: c._id || c.id})),
        );
        setContestsLoading(false);
      })
      .catch(() => setContestsLoading(false));
  }, [refreshKey]);

  useEffect(() => {
    setFilmsLoading(true);
    api
      .get<{films: any[]}>('/films')
      .then(res => {
        setFilms((res.films || []).map((f: any) => ({...f, id: f._id || f.id})));
        setFilmsLoading(false);
      })
      .catch(() => setFilmsLoading(false));
  }, [refreshKey]);

  useEffect(() => {
    setFeedPostsLoading(true);
    api
      .get<{posts: any[]} | any>('/feed-posts')
      .then(res => {
        const postsArray = Array.isArray(res) ? res : res.posts || [];
        setFeedPosts(postsArray.map((p: any) => ({...p, id: p._id || p.id})));
        setFeedPostsLoading(false);
      })
      .catch(() => setFeedPostsLoading(false));
  }, [refreshKey]);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (text.trim().length > 1) {
      const q = text.toLowerCase();
      const auditionMatches = auditionPosts
        .filter(p => (p.text || p.title)?.toLowerCase().includes(q))
        .slice(0, 3)
        .map(p => ({
          id: p.id,
          label: (p.title || p.text)?.substring(0, 60),
          type: '🎭',
        }));
      const contestMatches = contests
        .filter(c => c.title?.toLowerCase().includes(q))
        .slice(0, 2)
        .map(c => ({id: c.id, label: c.title, type: '🏆'}));
      setSuggestions([...auditionMatches, ...contestMatches].slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const renderSectionHeader = (title: string, onViewAll: () => void) => {
    return (
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        <TouchableOpacity onPress={onViewAll} style={styles.viewAllTouch}>
          <Text style={styles.sectionHeaderViewAll}>View all</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderInfluencersSection = (title: string) => {
    if (suggestedLoading) {
      return (
        <ActivityIndicator
          color={Colors.primary}
          style={{ marginVertical: Spacing.lg }}
        />
      );
    }
    if (suggestedUsers.length === 0) {
      return null;
    }

    const displayedUsers = suggestedUsers.slice(0, 7);

    return (
      <View style={{ marginVertical: Spacing.md }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>{title}</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10 }}
          contentContainerStyle={styles.influencersScroll}>
          {displayedUsers.map(item => {
            const uid = item._id || item.id;
            const isFollowed = followingIds.has(uid);
            return (
              <TouchableOpacity
                key={uid}
                style={[
                  styles.influencerCardCompact,
                  isDark ? styles.borderDark : styles.borderLight,
                ]}
                onPress={() =>
                  navigation.navigate('PublicProfile', { userId: uid })
                }
                activeOpacity={0.9}>
                <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', width: '100%' }}>
                  <View style={styles.influencerAvatarWrapper}>
                    <Avatar
                      name={
                        item.fullName ||
                        item.displayName ||
                        item.name ||
                        'User'
                      }
                      size={68}
                      uri={item.photoUrl}
                      ring={true}
                      ringColor="rgba(245, 196, 81, 0.4)"
                    />
                  </View>
                  <Text
                    style={[
                      styles.influencerNameText,
                      { color: Colors.textPrimary },
                    ]}
                    numberOfLines={1}>
                    {item.fullName || item.displayName || item.name || 'User'}
                  </Text>
                  <Text style={styles.influencerRoleText} numberOfLines={1}>
                    {item.role || 'Actor'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.influencerFollowBtnCompact,
                    styles.influencerFollowBtnBorder,
                    isFollowed && styles.influencerFollowingBtnBg,
                  ]}
                  onPress={() => toggleFollowUser(uid)}>
                  <Text
                    style={[
                      styles.influencerFollowTextCompact,
                      { color: Colors.primary },
                    ]}>
                    {isFollowed ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[
              styles.influencerCardCompact,
              isDark ? styles.borderDark : styles.borderLight,
            ]}
            onPress={() => navigation.navigate('SuggestedFollows')}
            activeOpacity={0.8}
          >
            <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', width: '100%' }}>
              <View style={[styles.influencerAvatarWrapper, { width: 68, height: 68, borderRadius: 34, backgroundColor: isDark ? 'rgba(245, 196, 81, 0.1)' : 'rgba(245, 196, 81, 0.05)', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 26 }}>👥</Text>
              </View>
              <Text style={[styles.influencerNameText, { color: Colors.textPrimary }]} numberOfLines={1}>
                View All
              </Text>
              <Text style={[styles.influencerRoleText, { color: Colors.textSecondary }]} numberOfLines={1}>
                More Creators
              </Text>
            </View>
            <View style={[styles.influencerFollowBtnCompact, { borderColor: Colors.primary, marginTop: 4 }]}>
              <Text style={[styles.influencerFollowTextCompact, { color: Colors.primary }]}>
                See All
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {paddingTop: insets.top, backgroundColor: Colors.background},
        ]}>
        {/* ── TOP HEADER ── */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={openDrawer}
            style={styles.topHeaderMenuBtn}>
            <Text
              style={[styles.topHeaderMenuIcon, {color: Colors.textPrimary}]}>
              ☰
            </Text>
          </TouchableOpacity>

          <View style={styles.topHeaderLogoContainer}>
            <Text style={[styles.topHeaderLogoText, {color: Colors.primary}]}>
              CineLink
            </Text>
          </View>

          <View style={styles.topHeaderRight}>
            <TouchableOpacity
              style={styles.topHeaderNotifBtn}
              onPress={() => navigation.navigate('Notifications')}>
              <Text style={styles.topHeaderNotifIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.topHeaderNotifBadge}>
                  <Text style={styles.topHeaderNotifBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── PROFILE SIDE DRAWER MODAL ── */}
        <Modal
          transparent
          visible={drawerVisible}
          onRequestClose={closeDrawer}
          animationType="fade">
          <View style={styles.drawerOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeDrawer}
            />

            <Animated.View
              style={[
                styles.drawerContent,
                {
                  transform: [{translateX: slideAnim}],
                  backgroundColor: Colors.background,
                  borderRightColor: Colors.border,
                },
              ]}>
              <SafeAreaView style={styles.flex1}>
                <View style={styles.drawerHeader}>
                  <View style={styles.drawerUserInfo}>
                    <View style={styles.drawerAvatarContainer}>
                      {profilePhoto ? (
                        <Image
                          source={{uri: profilePhoto}}
                          style={styles.drawerAvatar}
                        />
                      ) : (
                        <View style={styles.drawerAvatarFallback}>
                          <Text style={styles.drawerAvatarLetter}>
                            {currentUser?.displayName
                              ?.charAt(0)
                              ?.toUpperCase() ||
                              currentUser?.email?.charAt(0)?.toUpperCase() ||
                              'C'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.drawerNameContainer}>
                      <Text style={styles.drawerName} numberOfLines={1}>
                        {currentUser?.displayName ||
                          currentUser?.email?.split('@')[0] ||
                          'Creator'}
                      </Text>
                      <Text style={styles.drawerEmail} numberOfLines={1}>
                        {currentUser?.email || 'No email linked'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={closeDrawer}
                    style={styles.drawerCloseBtn}>
                    <Text style={styles.drawerCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.drawerScroll}
                  showsVerticalScrollIndicator={false}>
                  {[
                    {
                      icon: '👤',
                      label: 'My Profile',
                      onPress: () => navigation.navigate('Profile'),
                    },
                    {
                      icon: '✏️',
                      label: 'Edit Profile',
                      onPress: () => navigation.navigate('MyProfile'),
                    },
                    ...(!isAdmin
                      ? [
                          {
                            icon: '💾',
                            label: 'Saved Auditions',
                            onPress: () =>
                              navigation.navigate('SavedAuditions'),
                          },
                        ]
                      : []),
                    ...(isApprovedDirector || isAdmin
                      ? [
                          {
                            icon: '🎥',
                            label: isAdmin ? 'Films' : 'My Films',
                            onPress: () => navigation.navigate('MyFilms'),
                          },
                          {
                            icon: '🏆',
                            label: isAdmin ? 'Contests' : 'My Contests',
                            onPress: () => navigation.navigate('MyContests'),
                          },
                          {
                            icon: '🎭',
                            label: isAdmin ? 'Auditions' : 'My Auditions',
                            onPress: () => navigation.navigate('MyAuditions'),
                          },
                        ]
                      : []),
                    ...(isAdmin
                      ? [
                          {
                            icon: '📢',
                            label: 'Announcements',
                            onPress: () => navigation.navigate('Announcements'),
                          },
                          {
                            icon: '🛡️',
                            label: 'Admin Reports',
                            onPress: () => navigation.navigate('AdminReports'),
                          },
                        ]
                      : []),
                    {
                      icon: '⚙️',
                      label: 'Settings',
                      onPress: () => navigation.navigate('Settings'),
                    },
                    {
                      icon: '🚪',
                      label: 'Logout',
                      onPress: () => {
                        Alert.alert(
                          'Logout',
                          'Are you sure you want to logout?',
                          [
                            {text: 'Cancel', style: 'cancel'},
                            {
                              text: 'Logout',
                              style: 'destructive',
                              onPress: async () => await signOut(),
                            },
                          ],
                        );
                      },
                    },
                  ].map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.drawerItem}
                      onPress={() => {
                        closeDrawer();
                        item.onPress();
                      }}>
                      <Text style={styles.drawerItemIcon}>{item.icon}</Text>
                      <Text style={styles.drawerItemText}>{item.label}</Text>
                      <Text style={styles.drawerItemArrow}>›</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View
                  style={[
                    styles.drawerFooter,
                    {borderTopColor: Colors.border},
                  ]}>
                  <TouchableOpacity
                    style={styles.drawerThemeToggle}
                    onPress={toggleTheme}>
                    <Text style={styles.drawerThemeIcon}>
                      {isDark ? '🌙' : '☀️'}
                    </Text>
                    <Text style={styles.drawerThemeText}>
                      {isDark ? 'Dark Mode' : 'Light Mode'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
              progressBackgroundColor={Colors.card}
            />
          }>
          {/* ── PROFILE GREETING SECTION ── */}
          <View style={styles.profileSection}>
            <View style={styles.profileSectionLeft}>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                <View
                  style={[
                    styles.profileSectionAvatarContainer,
                    styles.profileSectionAvatarContainerBorder,
                  ]}>
                  {profilePhoto ? (
                    <Image
                      source={{uri: profilePhoto}}
                      style={styles.profileSectionAvatar}
                    />
                  ) : (
                    <View style={styles.profileSectionAvatarFallback}>
                      <Text style={styles.profileSectionAvatarFallbackText}>
                        {currentUser?.displayName?.charAt(0)?.toUpperCase() ||
                          'C'}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.profileGreetingContainer}>
                <Text style={styles.profileGreetingText}>{getGreeting()}</Text>
                <Text
                  style={[styles.profileNameText, {color: Colors.textPrimary}]}>
                  {profileName} 👋
                </Text>
              </View>
            </View>
          </View>

          {/* ── SEARCH BAR ── */}
          <View
            style={[
              styles.newSearchContainer,
              {backgroundColor: Colors.card, borderColor: Colors.border},
            ]}>
            <Text style={styles.newSearchIcon}>🔍</Text>
            <TextInput
              style={[styles.newSearchInput, {color: Colors.textPrimary}]}
              placeholder="Search auditions, contests, people..."
              placeholderTextColor={Colors.textTertiary}
              value={searchText}
              onChangeText={handleSearchChange}
            />
            <TouchableOpacity
              style={styles.newSearchFilterBtn}
              onPress={() => navigation.navigate('BrowseAuditions')}>
              <SliderIcon color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Suggestions dropdown */}
          {suggestions.length > 0 && (
            <View
              style={[
                styles.suggestionsBox,
                {backgroundColor: Colors.card, borderColor: Colors.border},
              ]}>
              {suggestions.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestionItem,
                    index < suggestions.length - 1 &&
                      styles.suggestionItemBorder,
                  ]}
                  onPress={() => {
                    setSuggestions([]);
                    if (item.type === '🎭') {
                      navigation.navigate('BrowseAuditions');
                    } else if (item.type === '🎬') {
                      navigation.navigate('BrowseFilms');
                    } else if (item.type === '🏆') {
                      navigation.navigate('Contests');
                    }
                  }}>
                  <Text
                    style={[
                      styles.suggestionText,
                      {color: Colors.textPrimary},
                    ]}>
                    {item.type} {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── QUICK ACCESS TABS ── */}
          <View style={styles.tabBarContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBarScroll}>
               {[
                 {key: 'auditions', icon: '🎭', label: 'Auditions'},
                 {key: 'films', icon: '🎬', label: 'Films'},
                 {key: 'contests', icon: '🏆', label: 'Contests'},
                 {key: 'quick_posts', icon: '⚡', label: 'Posts'},
                 {key: 'announcements', icon: '📢', label: 'Announcements'},
               ].map(tab => {
                  const isActive = selectedTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.tabItem,
                        {
                          backgroundColor: isActive ? Colors.cardElevated : Colors.card,
                          borderColor: isActive ? Colors.primary : Colors.border,
                        },
                      ]}
                      onPress={() => setSelectedTab(tab.key as any)}
                      activeOpacity={0.85}>
                      <Text style={styles.tabIcon}>{tab.icon}</Text>
                      <Text
                        style={[
                          styles.tabItemText,
                          {
                            color: isActive ? Colors.primary : Colors.textSecondary,
                            fontWeight: isActive ? '700' : '600',
                          },
                        ]}
                        numberOfLines={1}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
               })}
            </ScrollView>
          </View>

          {/* ── DYNAMIC DASHBOARD FEED ── */}
          {(() => {
            const getDaysLeft = (deadline: string) => {
              if (!deadline) return '';
              const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
              if (diff < 0) return 'Ended';
              if (diff === 0) return 'Last Day';
              return `${diff} Days Left`;
            };

            switch (selectedTab) {
              case 'auditions':
                const sq = searchText.toLowerCase().trim();
                const filteredAuditions = sq
                  ? auditionPosts.filter((item: any) =>
                      (item.title || '').toLowerCase().includes(sq) ||
                      (item.description || '').toLowerCase().includes(sq) ||
                      (item.location || '').toLowerCase().includes(sq) ||
                      (item.directorName || '').toLowerCase().includes(sq) ||
                      (item.category || '').toLowerCase().includes(sq) ||
                      (item.roles || '').toLowerCase().includes(sq)
                    )
                  : auditionPosts;
                return (
                  <View style={styles.listContainer}>
                    {feedLoading ? (
                      <ActivityIndicator color={Colors.primary} style={styles.loader} />
                    ) : filteredAuditions.length === 0 ? (
                      <>
                        <EmptyState
                          icon="🎭"
                          title={sq ? 'No matching auditions' : 'No auditions found'}
                          subtitle={sq ? 'Try a different search' : 'Check back later for new auditions'}
                        />
                        {!sq && renderInfluencersSection('People You May Know')}
                      </>
                    ) : (
                      filteredAuditions.map((item, index) => {
                        const isSaved = savedIds.includes(item.id);
                        const imgUri = item.imageUrl || item.posterUrl;
                        return (
                          <React.Fragment key={item.id}>
                            <TouchableOpacity
                              style={[
                                styles.horizontalCard,
                                {backgroundColor: Colors.card},
                              ]}
                              onPress={() => navigation.navigate('AuditionDetail', {audition: item})}
                              activeOpacity={0.95}>
                              {imgUri ? (
                                <Image source={{uri: imgUri}} style={styles.horizontalCardImage} />
                              ) : (
                                <View style={[styles.horizontalCardPlaceholder, {backgroundColor: Colors.cardElevated}]}>
                                  <Text style={{fontSize: 36}}>🎭</Text>
                                </View>
                              )}
                              <View style={styles.horizontalCardBody}>
                                <View style={styles.horizontalCardHeaderRow}>
                                  <Text style={[styles.horizontalCardTitle, {color: Colors.textPrimary}]} numberOfLines={1}>
                                    {item.title}
                                  </Text>
                                  <TouchableOpacity
                                    style={styles.horizontalCardHeart}
                                    onPress={() => toggleSaveAudition(item)}>
                                    <Text style={{fontSize: 14}}>{isSaved ? '❤️' : '🤍'}</Text>
                                  </TouchableOpacity>
                                </View>

                                <Text style={[styles.horizontalCardSub1, {color: Colors.primary}]} numberOfLines={1}>
                                  💰 {item.budget ? `₹ ${item.budget}/day` : 'Paid'} · {item.category || 'Acting'}
                                </Text>

                                <Text style={[styles.horizontalCardDesc, {color: Colors.textSecondary}]} numberOfLines={2}>
                                  {item.description || item.roles || 'No details provided.'}
                                </Text>

                                <Text style={[styles.horizontalCardSub2, {color: Colors.textTertiary}]} numberOfLines={1}>
                                  📍 {item.location || 'Remote'} · {item.directorName || 'Casting Director'}
                                </Text>
                              </View>
                            </TouchableOpacity>
                            {index > 0 && index % 7 === 0 && renderInfluencersSection('People You May Know')}
                          </React.Fragment>
                        );
                      })
                    )}
                  </View>
                );

              case 'films':
                const fq = searchText.toLowerCase().trim();
                const filteredFilms = fq
                  ? films.filter((item: any) =>
                      (item.title || '').toLowerCase().includes(fq) ||
                      (item.description || '').toLowerCase().includes(fq) ||
                      (item.genre || '').toLowerCase().includes(fq) ||
                      (item.creatorName || '').toLowerCase().includes(fq) ||
                      (item.directorName || '').toLowerCase().includes(fq)
                    )
                  : films;
                return (
                  <View style={styles.listContainer}>
                    {filmsLoading ? (
                      <ActivityIndicator color={Colors.primary} style={styles.loader} />
                    ) : filteredFilms.length === 0 ? (
                      <>
                        <EmptyState
                          icon="🎬"
                          title={fq ? 'No matching films' : 'No short films found'}
                          subtitle={fq ? 'Try a different search' : 'Be the first to upload a short film!'}
                        />
                        {!fq && renderInfluencersSection('People You May Know')}
                      </>
                    ) : (
                      filteredFilms.map((item, index) => {
                        const imgUri = typeof item.posterUrl === 'string' && item.posterUrl.trim().startsWith('http')
                          ? item.posterUrl.trim()
                          : (typeof item.imageUrl === 'string' && item.imageUrl.trim().startsWith('http')
                              ? item.imageUrl.trim()
                              : null);
                        return (
                          <React.Fragment key={item.id}>
                            <TouchableOpacity
                              style={[
                                styles.horizontalCard,
                                {backgroundColor: Colors.card},
                              ]}
                              onPress={() => navigation.navigate('FilmDetail', {film: item})}
                              activeOpacity={0.95}>
                              {imgUri ? (
                                <Image source={{uri: imgUri}} style={styles.horizontalCardImage} />
                              ) : (
                                <View style={[styles.horizontalCardPlaceholder, {backgroundColor: Colors.cardElevated}]}>
                                  <Text style={{fontSize: 36}}>🎬</Text>
                                </View>
                              )}
                              <View style={styles.horizontalCardBody}>
                                <View style={styles.horizontalCardHeaderRow}>
                                  <Text style={[styles.horizontalCardTitle, {color: Colors.textPrimary}]} numberOfLines={1}>
                                    {item.title || 'Untitled Film'}
                                  </Text>
                                </View>

                                <Text style={[styles.horizontalCardSub1, {color: Colors.primary}]} numberOfLines={1}>
                                  🎭 {item.genre || 'Drama'} {item.duration ? `· ⏱️ ${item.duration} mins` : ''}
                                </Text>

                                <Text style={[styles.horizontalCardDesc, {color: Colors.textSecondary}]} numberOfLines={2}>
                                  {item.description || 'Watch this amazing short film on CineLink.'}
                                </Text>

                                <Text style={[styles.horizontalCardSub2, {color: Colors.textTertiary}]} numberOfLines={1}>
                                  By {item.creatorName || item.directorName || 'Director'}
                                </Text>
                              </View>
                            </TouchableOpacity>
                            {index > 0 && index % 7 === 0 && renderInfluencersSection('People You May Know')}
                          </React.Fragment>
                        );
                      })
                    )}
                  </View>
                );

              case 'contests':
                const cq = searchText.toLowerCase().trim();
                const filteredContests = cq
                  ? contests.filter((item: any) =>
                      (item.title || '').toLowerCase().includes(cq) ||
                      (item.description || '').toLowerCase().includes(cq)
                    )
                  : contests;
                return (
                  <View style={styles.listContainer}>
                    {contestsLoading ? (
                      <ActivityIndicator color={Colors.primary} style={styles.loader} />
                    ) : filteredContests.length === 0 ? (
                      <>
                        <EmptyState
                          icon="🏆"
                          title={cq ? 'No matching contests' : 'No contests found'}
                          subtitle={cq ? 'Try a different search' : 'Active contests will show up here'}
                        />
                        {!cq && renderInfluencersSection('People You May Know')}
                      </>
                    ) : (
                      filteredContests.map((item, index) => {
                        const imgUri = item.imageUrl || item.posterUrl || item.bannerUrl;
                        return (
                          <React.Fragment key={item.id}>
                            <TouchableOpacity
                              style={[
                                styles.horizontalCard,
                                {backgroundColor: Colors.card},
                              ]}
                              onPress={() => navigation.navigate('ContestDetail', { contestId: item.id })}
                              activeOpacity={0.95}>
                              {imgUri ? (
                                <Image source={{uri: imgUri}} style={styles.horizontalCardImage} />
                              ) : (
                                <View style={[styles.horizontalCardPlaceholder, {backgroundColor: Colors.cardElevated}]}>
                                  <Text style={{fontSize: 36}}>🏆</Text>
                                </View>
                              )}
                              <View style={styles.horizontalCardBody}>
                                <View style={styles.horizontalCardHeaderRow}>
                                  <Text style={[styles.horizontalCardTitle, {color: Colors.textPrimary}]} numberOfLines={1}>
                                    {item.title}
                                  </Text>
                                </View>

                                <Text style={[styles.horizontalCardSub1, {color: Colors.primary}]} numberOfLines={1}>
                                  🏆 Prize: ₹ {item.prizePool || 'TBD'}
                                </Text>

                                <Text style={[styles.horizontalCardDesc, {color: Colors.textSecondary}]} numberOfLines={2}>
                                  {item.description || 'Join this contest and showcase your creative skills.'}
                                </Text>

                                <Text style={[styles.horizontalCardSub2, {color: Colors.error}]} numberOfLines={1}>
                                  ⏳ {getDaysLeft(item.deadline || item.endDate)}
                                </Text>
                              </View>
                            </TouchableOpacity>
                            {index > 0 && index % 7 === 0 && renderInfluencersSection('People You May Know')}
                          </React.Fragment>
                        );
                      })
                    )}
                  </View>
                );

              case 'quick_posts':
                const quickPosts = feedPosts.filter((p: any) => p.postType === 'general');
                const gq = searchText.toLowerCase().trim();
                const filteredQP = gq
                  ? quickPosts.filter((item: any) =>
                      (item.text || '').toLowerCase().includes(gq) ||
                      (item.creatorName || '').toLowerCase().includes(gq)
                    )
                  : quickPosts;
                return (
                  <View style={styles.listContainer}>
                    {feedPostsLoading ? (
                      <ActivityIndicator color={Colors.primary} style={styles.loader} />
                    ) : filteredQP.length === 0 ? (
                      <>
                        <EmptyState
                          icon="⚡"
                          title={gq ? 'No matching posts' : 'No quick posts yet'}
                          subtitle={gq ? 'Try a different search' : 'Publish updates to the community feed!'}
                        />
                        {!gq && renderInfluencersSection('People You May Know')}
                      </>
                    ) : (
                       filteredQP.map((item, index) => {
                         const imgUri = item.imageUrl || item.mediaUrl;
                         return (
                           <React.Fragment key={item.id}>
                             <TouchableOpacity
                               style={[styles.postCard, {backgroundColor: Colors.card}]}
                               activeOpacity={0.8}
                               onPress={() => navigation.navigate('PostDetail', {post: item})}>
                               <View style={styles.postHeader}>
                                 <TouchableOpacity
                                   activeOpacity={0.7}
                                   onPress={() => navigation.navigate('PublicProfile', {userId: item.userId})}>
                                   <Avatar name={item.creatorName || 'D'} uri={item.creatorPhotoUrl} size="md" ring />
                                 </TouchableOpacity>
                                 <View style={{flex: 1, marginLeft: Spacing.sm}}>
                                   <Text style={[styles.postName, {color: Colors.textPrimary}]} numberOfLines={1}>{item.creatorName || 'Community Member'}</Text>
                                   <Text style={styles.postMeta}>{item.creatorRole || 'Creator'} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</Text>
                                 </View>
                                 {item.userId !== currentUser?.uid && (
                                   <TouchableOpacity style={[styles.followBtn, followingIds.has(item.userId) && styles.followingBtn]} onPress={() => toggleFollowUser(item.userId)}>
                                     <Text style={[styles.followBtnText, followingIds.has(item.userId) && styles.followingBtnText]}>{followingIds.has(item.userId) ? '✓ Following' : '+ Follow'}</Text>
                                   </TouchableOpacity>
                                 )}
                               </View>

                               {imgUri ? (
                                 <Image source={{uri: imgUri}} style={styles.postImage} />
                               ) : null}

                               {item.text ? (
                                 <Text style={styles.postText} numberOfLines={3}>{item.text}</Text>
                               ) : null}
                             </TouchableOpacity>
                             {index > 0 && index % 7 === 0 && renderInfluencersSection('People You May Know')}
                           </React.Fragment>
                         );
                       })
                    )}
                  </View>
                );

              case 'announcements':
                const announcements = feedPosts.filter((p: any) => p.postType === 'announcement');
                const aq = searchText.toLowerCase().trim();
                const filteredAnn = aq
                  ? announcements.filter((item: any) =>
                      (item.text || '').toLowerCase().includes(aq)
                    )
                  : announcements;
                return (
                  <View style={styles.listContainer}>
                    {feedPostsLoading ? (
                      <ActivityIndicator color={Colors.primary} style={styles.loader} />
                    ) : filteredAnn.length === 0 ? (
                      <>
                        <EmptyState
                          icon="📢"
                          title={aq ? 'No matching announcements' : 'No announcements yet'}
                          subtitle={aq ? 'Try a different search' : 'Stay tuned for official updates!'}
                        />
                        {!aq && renderInfluencersSection('People You May Know')}
                      </>
                    ) : (
                       filteredAnn.map((item, index) => {
                         const imgUri = item.imageUrl || item.mediaUrl;
                         return (
                           <React.Fragment key={item.id}>
                             <TouchableOpacity
                               style={[styles.postCard, {backgroundColor: Colors.card}]}
                               activeOpacity={0.8}
                               onPress={() => navigation.navigate('PostDetail', {post: item})}>
                               <View style={styles.postHeader}>
                                  <View
                                    style={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: Radius.sm,
                                      backgroundColor: Colors.errorFaint,
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}>
                                   <Text style={{fontSize: 18}}>📢</Text>
                                 </View>
                                 <View style={{flex: 1, marginLeft: Spacing.sm}}>
                                   <Text style={[styles.postName, {color: Colors.textPrimary}]} numberOfLines={1}>
                                     Announcement
                                   </Text>
                                   <Text style={styles.postMeta}>
                                     {new Date(item.createdAt).toLocaleDateString()}
                                   </Text>
                                 </View>
                               </View>

                               {imgUri ? (
                                 <Image source={{uri: imgUri}} style={styles.postImage} />
                               ) : null}

                               {item.text ? (
                                 <Text style={styles.postText} numberOfLines={3}>{item.text}</Text>
                               ) : null}
                             </TouchableOpacity>
                             {index > 0 && index % 7 === 0 && renderInfluencersSection('People You May Know')}
                           </React.Fragment>
                         );
                       })
                    )}
                  </View>
                );
            }
          })()}



          {/* ── CINELINK FOR YOU (CAROUSEL) ── */}
          <View style={styles.forYouSection}>
            <View
              onLayout={onCardLayout}
              style={[
                styles.forYouCard,
                isDark ? styles.borderDark : styles.borderLight,
              ]}>
              <ScrollView
                ref={carouselRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScrollBeginDrag={stopAutoScroll}
                onMomentumScrollEnd={(e) => {
                  const contentOffset = e.nativeEvent.contentOffset.x;
                  if (cardWidth > 0) {
                    const newIndex = Math.round(contentOffset / cardWidth);
                    setCarouselIndex(newIndex);
                  }
                  startAutoScroll();
                }}
              >
                {carouselItems.map((item, index) => (
                  <View key={index} style={{ width: cardWidth || 300, height: '100%', position: 'relative' }}>
                    {/* Background Image with Svg Linear Gradient fade overlay */}
                    <View style={styles.forYouImageContainer}>
                      <Image
                        source={getCarouselImage(item.imageKey)}
                        style={styles.forYouImage}
                      />
                      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                        <Defs>
                          <SvgLinearGradient id={`fade-${index}`} x1="0" y1="0" x2="1" y2="0">
                            <Stop
                              offset="0"
                              stopColor={Colors.card}
                              stopOpacity={1}
                            />
                            <Stop
                              offset={isDark ? 0.45 : 0.22}
                              stopColor={Colors.card}
                              stopOpacity={isDark ? 0.85 : 0.45}
                            />
                            <Stop
                              offset={isDark ? 1 : 0.6}
                              stopColor={Colors.card}
                              stopOpacity="0"
                            />
                          </SvgLinearGradient>
                        </Defs>
                        <Rect width="100%" height="100%" fill={`url(#fade-${index})`} />
                      </Svg>
                    </View>

                    <View style={[styles.forYouLeft, { justifyContent: 'flex-start', paddingTop: 20 }]}>
                      <Text style={styles.forYouCarouselLabel}>
                        {item.title}
                      </Text>
                      <Text style={[styles.forYouTitle, styles.forYouQuote]}>
                        {item.quote}
                      </Text>
                      <Text style={styles.forYouDesc}>
                        {item.desc}
                      </Text>

                      <TouchableOpacity
                        style={styles.forYouLink}
                        onPress={() =>
                          navigation.navigate(item.targetScreen as any)
                        }>
                        <Text style={styles.forYouLinkText}>
                          {item.buttonText}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Dots indicator overlay */}
              <View style={{
                position: 'absolute',
                bottom: 12,
                left: 16,
                flexDirection: 'row',
                alignItems: 'center',
                zIndex: 10,
              }}>
                {carouselItems.map((_, dotIdx) => (
                  <TouchableOpacity
                    key={dotIdx}
                    onPress={() => handleDotPress(dotIdx)}
                    activeOpacity={0.8}
                    style={{ paddingVertical: 4, paddingHorizontal: 2 }}
                  >
                    <View
                      style={[
                        styles.carouselDot,
                        dotIdx === carouselIndex
                          ? styles.carouselDotActive
                          : styles.carouselDotInactive,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      <ReportModal
        visible={reportModalVisible}
        onClose={() => {
          setReportModalVisible(false);
          setReportTarget(null);
        }}
        contentId={reportTarget?.id || ''}
        contentType={reportTarget?.type || 'audition'}
        contentTitle={reportTarget?.title || ''}
      />
    </>
  );
}

const SliderIcon = ({
  size = 20,
  color = Colors.textSecondary,
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3M2 14H6M10 8H14M18 16H22"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},

  tabBarContainer: {
    marginVertical: Spacing.md,
  },
  tabBarScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  tabItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 66,
    height: 66,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 3,
  },
  tabItemText: {
    fontSize: 11,
    letterSpacing: 0.1,
    fontWeight: '600',
    textAlign: 'center',
  },

  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 40,
  },
  tabAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  tabAddButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  premiumCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  premiumCardImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
  },
  premiumCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  premiumCardImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumCardPlaceholderIcon: {
    fontSize: 40,
  },
  premiumCardBody: {
    padding: Spacing.md,
  },
  premiumCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  premiumCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: Spacing.sm,
  },
  premiumBookmarkBtn: {
    padding: Spacing.xs,
  },
  premiumCardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  premiumTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  premiumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  loader: {
    marginVertical: Spacing.xl,
  },

  // Header
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
  },
  topHeaderMenuBtn: {
    padding: Spacing.xs,
  },
  topHeaderMenuIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  topHeaderLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topHeaderLogoText: {
    fontSize: 23,
    fontWeight: '600',
    letterSpacing: -0.3,
    fontFamily: 'Poppins-SemiBold',
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  topHeaderNotifBtn: {
    position: 'relative',
    padding: Spacing.xs,
  },
  topHeaderNotifIcon: {
    fontSize: 18,
  },
  topHeaderNotifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.error,
    borderRadius: Radius.pill,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  topHeaderNotifBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  topHeaderAvatarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  topHeaderAvatar: {
    width: '100%',
    height: '100%',
  },
  topHeaderAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeaderAvatarFallbackText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Drawer modal
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flexDirection: 'row',
  },
  drawerContent: {
    width: 280,
    height: '100%',
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 4, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  drawerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm + 2,
  },
  drawerAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  drawerAvatar: {
    width: '100%',
    height: '100%',
  },
  drawerAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerAvatarLetter: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  drawerNameContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  drawerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  drawerEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  drawerCloseText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  drawerScroll: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  drawerItemIcon: {
    fontSize: 18,
    marginRight: Spacing.md,
    width: 24,
    textAlign: 'center',
  },
  drawerItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  drawerItemArrow: {
    fontSize: 18,
    color: Colors.textTertiary,
    fontWeight: 'bold',
  },
  drawerFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: Spacing.lg,
  },
  drawerThemeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  drawerThemeIcon: {
    fontSize: 18,
    marginRight: Spacing.md,
    width: 24,
    textAlign: 'center',
  },
  drawerThemeText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Profile Greeting Section
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 4,
    paddingBottom: 4,
  },
  profileSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  profileSectionAvatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    overflow: 'hidden',
  },
  profileSectionAvatar: {
    width: '100%',
    height: '100%',
  },
  profileSectionAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSectionAvatarFallbackText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileGreetingContainer: {
    justifyContent: 'center',
  },
  profileGreetingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  profileNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 1,
  },

  // Search Bar
  newSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: Radius.search,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  newSearchIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
    color: Colors.textSecondary,
  },
  newSearchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  newSearchFilterBtn: {
    padding: Spacing.xs,
  },

  // Search suggestions dropdown
  suggestionsBox: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    backgroundColor: Colors.card,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  suggestionText: {
    fontSize: 13,
    color: Colors.textPrimary,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: 12,
    marginBottom: 6,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  viewAllTouch: {
    paddingVertical: Spacing.xs,
  },
  sectionHeaderViewAll: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },

  quickAccessContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
  },
  quickAccessCard: {
    width: 64,
    height: 76,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAccessIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  quickAccessIcon: {
    fontSize: 13,
  },
  quickAccessTitle: {
    fontSize: 9,
    lineHeight: 10,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  // Trending Now Vertical Rect Cards
  trendingScroll: {
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    gap: Spacing.md,
  },
  trendingCard: {
    width: 150,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.cardElevated,
  },
  trendingCardImg: {
    width: '100%',
    height: 110,
  },
  trendingCardTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    zIndex: 2,
  },
  trendingFeaturedBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  trendingFeaturedBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
  },
  trendingBookmarkBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingBookmarkText: {
    fontSize: 12,
  },
  trendingCardBottomContent: {
    padding: Spacing.sm,
    flex: 1,
    justifyContent: 'space-between',
  },
  trendingCardTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  trendingCardMeta: {
    fontSize: 10,
    marginTop: 1,
  },
  trendingCardLoc: {
    fontSize: 10,
    marginTop: 1,
  },
  trendingCardPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  trendingCardPrice: {
    fontSize: 11,
    fontWeight: '800',
  },
  trendingCardBottomBookmark: {
    fontSize: 12,
  },
  // Active Contests High-Density Layout
  activeContestsSectionContainer: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
  },
  mainContestCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
    height: 120,
    alignItems: 'center',
  },
  mainContestLeft: {
    width: 60,
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  mainContestRight: {
    flex: 1,
    height: '100%',
    justifyContent: 'space-between',
  },
  mainContestHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  mainContestTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  mainContestSubtitle: {
    fontSize: 10.5,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  daysBadgeCompact: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  daysBadgeTextCompact: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  mainContestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  prizePoolLabel: {
    fontSize: 9.5,
    color: Colors.textSecondary,
  },
  prizePoolValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  mainContestParticipants: {
    alignItems: 'flex-end',
  },
  participantsTextCompact: {
    fontSize: 9,
    color: Colors.textSecondary,
  },
  subContestsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  subContestCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.md,
    height: 105,
    justifyContent: 'space-between',
  },
  subContestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subContestTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
    marginRight: 4,
  },
  prizePoolValueSmall: {
    fontSize: 12,
    fontWeight: '800',
  },
  participantsTextSub: {
    fontSize: 9,
    color: Colors.textSecondary,
  },

  // Top Influencers
  influencersScroll: {
    paddingHorizontal: 12,
    gap: 16,
  },
  influencerCardCompact: {
    width: 135,
    height: 195,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  influencerAvatarWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  influencerNameText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  influencerRoleText: {
    fontSize: 9.5,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
    marginBottom: 2,
  },
  influencerFollowBtnCompact: {
    width: '100%',
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  influencerFollowTextCompact: {
    fontSize: 10,
    fontWeight: '700',
  },

  // CineLink for You
  forYouSection: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
  },
  forYouCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    overflow: 'hidden',
    position: 'relative',
    height: 230,
  },
  forYouLeft: {
    width: '60%',
    height: '100%',
    padding: Spacing.md,
    justifyContent: 'center',
    zIndex: 2,
  },
  forYouCarouselLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  forYouTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  forYouDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 15,
  },
  forYouLink: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    paddingVertical: 4,
  },
  forYouLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  carouselDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  carouselDot: {
    height: 4,
    borderRadius: 2,
    marginRight: 4,
  },
  forYouImageContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '60%',
    height: '100%',
  },
  forYouImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  flex1: {
    flex: 1,
  },
  profileSectionAvatarContainerBorder: {
    borderColor: Colors.primaryLight,
    borderWidth: 1.5,
  },
  suggestionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  trendingCardImgPlaceholder: {
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingCardEmoji: {
    fontSize: 32,
  },
  bookmarkBtnBg: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  mainContestEmoji: {
    fontSize: 36,
  },
  mainContestInfo: {
    flex: 1,
    marginRight: 6,
  },
  daysBadgeCompactStyle: {
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
    borderColor: Colors.error,
  },
  marginTop6: {
    marginTop: 6,
  },
  borderDark: {
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  borderLight: {
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  influencerFollowBtnBorder: {
    borderColor: Colors.primary,
  },
  influencerFollowingBtnBg: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  forYouQuote: {
    color: Colors.primary,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 3,
    marginBottom: 5,
  },
  carouselDotActive: {
    backgroundColor: Colors.primary,
    width: 12,
    height: 5,
    borderRadius: 2.5,
    marginHorizontal: 1,
  },
  carouselDotInactive: {
    backgroundColor: Colors.textSecondary,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginHorizontal: 1,
  },
  quickAccessScroll: {
    flexDirection: 'row',
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  filmsHorizontalScroll: {
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  filmCardCompact: {
    width: 140,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  filmPosterCompact: {
    width: '100%',
    height: 100,
  },
  filmPosterFallback: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filmPosterFallbackIcon: {
    fontSize: 28,
  },
  filmMetaCompact: {
    padding: Spacing.sm,
  },
  filmTitleCompact: {
    fontSize: 12,
    fontWeight: '700',
  },
  filmGenreCompact: {
    fontSize: 10,
    marginTop: 1,
  },
  filmDirectorCompact: {
    fontSize: 9,
    marginTop: 2,
  },
  announcementCardCompact: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  announcementHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  announcementBadgeCompact: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  announcementBadgeTextCompact: {
    fontSize: 10,
    fontWeight: '700',
  },
  announcementTimeCompact: {
    fontSize: 10,
  },
  announcementBodyCompact: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: Spacing.xs,
  },
  announcementLocationCompact: {
    fontSize: 10,
  },
  creatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  creatorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  creatorInfo: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  creatorName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  creatorRole: {
    ...Typography.micro,
    color: Colors.textSecondary,
  },
  followBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xs,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
    ...Shadows.sm,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  followBtnText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 11,
    ...Typography.bodyBold,
  },
  followingBtnText: {
    color: Colors.primary,
  },
  horizontalCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 12,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  horizontalCardImage: {
    width: 130,
    height: 140,
    borderRadius: Radius.md,
    resizeMode: 'cover',
  },
  horizontalCardPlaceholder: {
    width: 130,
    height: 140,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalCardBody: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  horizontalCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  horizontalCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  horizontalCardHeart: {
    paddingLeft: Spacing.xs,
  },
  horizontalCardSub1: {
    fontSize: 13,
    fontWeight: '600',
  },
  horizontalCardSub2: {
    fontSize: 12,
  },
  horizontalCardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  horizontalPostImage: {
    width: '100%',
    height: 140,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
    resizeMode: 'cover',
  },

  postCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postName: {
    fontSize: 14,
    fontWeight: '700',
  },
  postMeta: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  postText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
    resizeMode: 'cover',
  },
});
