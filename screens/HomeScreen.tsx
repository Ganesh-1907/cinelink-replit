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
  Linking,
  Animated,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTheme} from '../src/context/ThemeContext';
import api from '../src/api/client';
import { useFocusEffect } from '@react-navigation/native';
import {launchImageLibrary} from 'react-native-image-picker';
import Svg, { Circle, Path, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

import ReportModal from './ReportModal';
import {LiquidPress} from '../components/LiquidPress';
import EngagementBar from '../components/EngagementBar';
import {RippleIcon} from '../components/RippleIcon';
import {CrownIcon} from '../components/CrownIcon';
import {CATEGORY_COLORS} from '../src/api/config';
import {uploadImage} from '../src/services/uploadService';
import {useApp} from '../src/context/AppContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {
  Avatar,
  EmptyState,
  Chip,
  SkeletonCard,
  SectionTitle,
  Badge,
} from '../components/ui';

const BookmarkIcon = ({ size = 16, color = '#FFF', fill = false }: { size?: number; color?: string; fill?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'}>
    <Path
      d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const OptionsIcon = ({ size = 16, color = '#A1A1AA' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="5" r="2" fill={color} />
    <Circle cx="12" cy="12" r="2" fill={color} />
    <Circle cx="12" cy="19" r="2" fill={color} />
  </Svg>
);

const MOCK_INFLUENCERS = [
  {
    id: 'mock-i1',
    fullName: 'Ananya Iyer',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200',
    role: 'Actor',
  },
  {
    id: 'mock-i2',
    fullName: 'Varun D.',
    photoUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=200',
    role: 'Actor',
  },
  {
    id: 'mock-i3',
    fullName: 'Siddharth',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200',
    role: 'Filmmaker',
  },
  {
    id: 'mock-i4',
    fullName: 'Kavya Shetty',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200',
    role: 'Dancer',
  },
  {
    id: 'mock-i5',
    fullName: 'Vihaan',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200',
    role: 'Content Creator',
  },
];


export default function HomeScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState('Auditions');
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [auditionPosts, setAuditionPosts] = useState<any[]>([]);
  const [generalPosts, setGeneralPosts] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [films, setFilms] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const [comments, setComments] = useState<any>({});
  const [filmsLoading, setFilmsLoading] = useState(true);
  const [contestsLoading, setContestsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const {isAdmin, isApprovedDirector, user: currentUser, signOut} = useApp();
  const {isDark, toggleTheme} = useTheme();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [suggestedLoading, setSuggestedLoading] = useState(true);

  const [carouselIndex, setCarouselIndex] = useState(0);

  const carouselItems = [
    {
      title: "CineLink for You",
      quote: "“Every great film starts with a connection.”",
      desc: "Complete your profile, showcase your portfolio, and find your next breakthrough project.",
      buttonText: "Complete Your Profile →",
      targetScreen: "MyProfile",
      imageKey: 'directors_chair'
    },
    {
      title: "Find Auditions",
      quote: "“Opportunities don't happen, you create them.”",
      desc: "Apply to vetted roles, upload your headshots and showreels, and land your dream part.",
      buttonText: "Browse Auditions →",
      targetScreen: "Auditions",
      imageKey: 'retro_camera'
    },
    {
      title: "Showcase Talent",
      quote: "“Bring your cinematic vision to life.”",
      desc: "Participate in active contests, win cash prizes, and get noticed by top industry directors.",
      buttonText: "Active Contests →",
      targetScreen: "Contests",
      imageKey: 'cinema_projector'
    },
    {
      title: "Build Your Crew",
      quote: "“Cinema is a collaborative art.”",
      desc: "Connect with screenwriters, cinematographers, editors, and producers to form your dream team.",
      buttonText: "Explore Crew →",
      targetScreen: "Crew",
      imageKey: 'film_roll'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselItems.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const getCarouselImage = (key: string) => {
    if (isDark) {
      switch (key) {
        case 'directors_chair': return require('../assets/auth/directors_chair.jpg');
        case 'retro_camera': return require('../assets/auth/retro_camera.jpg');
        case 'cinema_projector': return require('../assets/auth/cinema_projector.jpg');
        case 'film_roll': return require('../assets/auth/film_roll.jpg');
        default: return require('../assets/auth/directors_chair.jpg');
      }
    } else {
      switch (key) {
        case 'directors_chair': return require('../assets/auth/directors_chair_light.jpg');
        case 'retro_camera': return require('../assets/auth/retro_camera_light.jpg');
        case 'cinema_projector': return require('../assets/auth/cinema_projector_light.jpg');
        case 'film_roll': return require('../assets/auth/film_roll_light.jpg');
        default: return require('../assets/auth/directors_chair_light.jpg');
      }
    }
  };


  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning,';
    if (hours < 18) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const profileName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Creator';

  const toggleSaveAudition = async (item: any) => {
    if (!currentUser) return;
    try {
      await api.post('/saved-auditions', {auditionId: item._id || item.id});
      const res = await api.get<{savedAuditions?: any[]}>('/saved-auditions');
      setSavedIds((res.savedAuditions || []).map((s: any) => s.auditionId));
    } catch (e) {
      console.log(e);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'CL';
    const cleanName = name.trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2) {
      const firstInitial = parts[0][0];
      const lastInitial = parts[parts.length - 1][0];
      return (firstInitial + lastInitial).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return 'CL';
  };

  // Drawer & Welcome logic
  const [isFirstOpen, setIsFirstOpen] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-280)).current;

  useEffect(() => {
    if (currentUser?.id || currentUser?._id || currentUser?.uid) {
      const userId = currentUser.id || currentUser._id || currentUser.uid;
      AsyncStorage.getItem(`has_opened_before_${userId}`).then(val => {
        if (val === 'true') {
          setIsFirstOpen(false);
        } else {
          AsyncStorage.setItem(`has_opened_before_${userId}`, 'true');
          setIsFirstOpen(true);
        }
      });
    }
  }, [currentUser]);

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
  }, [drawerVisible]);

  const loadNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await api.get<{notifications: any[]; unreadCount: number}>('/notifications');
      setUnreadCount(res.unreadCount || 0);
    } catch (e) {}
  };

  const loadChatUnread = async () => {
    if (!currentUser) return;
    try {
      const res = await api.get<{chats: any[]}>('/chat/list');
      let total = 0;
      (res.chats || []).forEach((c: any) => {
        total += c.unreadCount?.[currentUser.uid] || 0;
      });
      setChatUnreadCount(total);
    } catch (e) {}
  };

  const loadProfilePhoto = async () => {
    try {
      const res = await api.get<{user: any}>('/users/profile');
      const data = res.user;
      if (data?.photoUrl) setProfilePhoto(data.photoUrl);
      else if (data?.photoURL) setProfilePhoto(data.photoURL);
    } catch (e) {}
  };

  useEffect(() => {
    loadNotifications();
    loadChatUnread();
    loadProfilePhoto();
    const interval = setInterval(() => { loadNotifications(); loadChatUnread(); }, 15000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfilePhoto();
    }, [])
  );

  const fetchSuggestions = useCallback(async () => {
    if (!currentUser) return;
    try {
      const uid = currentUser.uid || currentUser._id;
      const followRes = await api.get<any>(`/users/${uid}/following`);
      const followingList = followRes.following || [];
      const followedSet = new Set<string>(followingList.map((u: any) => u._id || u.id));
      setFollowingIds(followedSet);

      const searchRes = await api.get<any>('/users/search?limit=30');
      const allUsers = searchRes.users || [];
      
      const filtered = allUsers.filter((u: any) => {
        const targetId = u._id || u.id;
        return targetId !== uid && !followedSet.has(targetId);
      });
      
      setSuggestedUsers(filtered);
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
    Promise.all([
      api.get<{auditions: any[]}>('/auditions'),
    ]).then(([audRes]) => {
      const audItems = (audRes.auditions || []).filter((a: any) => a.isActive !== false).map((a: any) => ({...a, id: a._id || a.id, source: 'audition'}));
      setAuditionPosts(audItems.sort((a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      ));
      setFeedLoading(false);
    }).catch(() => setFeedLoading(false));

    api.get<{posts: any[]}>('/feed-posts').then(res => {
      setGeneralPosts((res.posts || []).filter((p: any) => p.postType === 'general' || p.postType === 'announcement').map((p: any) => ({...p, id: p._id || p.id})));
    }).catch(() => {});

    if (currentUser) {
      api.get<{savedAuditions?: any[]}>('/saved-auditions').then(res => {
        setSavedIds((res.savedAuditions || []).map((s: any) => s.auditionId));
      }).catch(() => {});
      fetchSuggestions();
    }
  }, [refreshKey, currentUser, fetchSuggestions]);

  useEffect(() => {
    setFilmsLoading(true);
    api.get<{films: any[]}>('/films').then(res => {
      setFilms((res.films || []).map((f: any) => ({...f, id: f._id || f.id})));
      setFilmsLoading(false);
    }).catch(() => setFilmsLoading(false));
  }, [refreshKey]);

  useEffect(() => {
    setContestsLoading(true);
    api.get<{contests: any[]}>('/contests').then(res => {
      setContests((res.contests || []).map((c: any) => ({...c, id: c._id || c.id})));
      setContestsLoading(false);
    }).catch(() => setContestsLoading(false));
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
      const filmMatches = films
        .filter(
          f =>
            f.title?.toLowerCase().includes(q) ||
            f.genre?.toLowerCase().includes(q),
        )
        .slice(0, 2)
        .map(f => ({id: f.id, label: f.title, type: '🎬'}));
      const contestMatches = contests
        .filter(c => c.title?.toLowerCase().includes(q))
        .slice(0, 2)
        .map(c => ({id: c.id, label: c.title, type: '🏆'}));
      setSuggestions(
        [...auditionMatches, ...filmMatches, ...contestMatches].slice(0, 5),
      );
    } else {
      setSuggestions([]);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const loadComments = async (filmId: string) => {
    try {
      const res = await api.get<any>(`/comments/film/${filmId}`);
      setComments((prev: any) => ({...prev, [filmId]: res.comments || []}));
    } catch (e) { console.log(e); }
  };

  const sendPost = async (tab: 'auditions' | 'general') => {
    if (!postText.trim() && !postImage) {
      Alert.alert('Empty Post', 'Please write something or attach an image.');
      return;
    }
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only admin can post.');
      return;
    }
    setPosting(true);
    try {
      let imageUrl = '';
      if (postImage) {
        const result = await uploadImage(postImage);
        imageUrl = result.secureUrl;
      }
      await api.post('/feed-posts', {
        text: postText.trim(),
        imageUrl: imageUrl,
        postType: tab,
      });

      setPostText('');
      setPostImage(null);
      Alert.alert('✅ Posted!', 'Your post is now live.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not post. Try again.');
    } finally {
      setPosting(false);
    }
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets && result.assets[0]?.uri) {
      setPostImage(result.assets[0].uri);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await api.delete(`/feed-posts/${postId}`);
    } catch (error: any) {
      Alert.alert('Delete Error', error?.message || 'Could not delete post.');
    }
  };

  const handleLike = async (filmId: string, likedBy: string[] = []) => {
    if (!currentUser) return;
    try {
      await api.post(`/films/${filmId}/like`);
      setRefreshKey(k => k + 1);
    } catch (e) { console.log(e); }
  };

  const deleteFilm = (filmId: string) => {
    Alert.alert('Delete Film', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/films/${filmId}`);
            setRefreshKey(k => k + 1);
          } catch (e) {
            console.log(e);
          }
        },
      },
    ]);
  };

  const openReport = (id: string, type: string, title: string) => {
    setReportTarget({id, type, title});
    setReportModalVisible(true);
  };

  const filteredFilms = films.filter(item => {
    const text = searchText.toLowerCase();
    return (
      item.title?.toLowerCase().includes(text) ||
      item.genre?.toLowerCase().includes(text)
    );
  });

  const filteredContests = contests.filter(item => {
    const text = searchText.toLowerCase();
    return (
      item.title?.toLowerCase().includes(text) ||
      item.category?.toLowerCase().includes(text)
    );
  });

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

  return (
    <>
      <View style={[styles.container, {paddingTop: insets.top, backgroundColor: Colors.background}]}>
        {/* ── TOP HEADER ── */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={openDrawer} style={styles.topHeaderMenuBtn}>
            <Text style={[styles.topHeaderMenuIcon, { color: Colors.textPrimary }]}>☰</Text>
          </TouchableOpacity>
          
          <View style={styles.topHeaderLogoContainer}>
            <Text style={[styles.topHeaderLogoText, { color: Colors.primary }]}>CineLink</Text>
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
          animationType="fade"
        >
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
                  transform: [{ translateX: slideAnim }],
                  backgroundColor: Colors.background,
                  borderRightColor: Colors.border,
                },
              ]}
            >
              <SafeAreaView style={{flex: 1}}>
                <View style={styles.drawerHeader}>
                  <View style={styles.drawerUserInfo}>
                    <View style={styles.drawerAvatarContainer}>
                      {profilePhoto ? (
                        <Image source={{uri: profilePhoto}} style={styles.drawerAvatar} />
                      ) : (
                        <View style={styles.drawerAvatarFallback}>
                          <Text style={styles.drawerAvatarLetter}>
                            {currentUser?.displayName?.charAt(0)?.toUpperCase() ||
                              currentUser?.email?.charAt(0)?.toUpperCase() ||
                              'C'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.drawerNameContainer}>
                      <Text style={styles.drawerName} numberOfLines={1}>
                        {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Creator'}
                      </Text>
                      <Text style={styles.drawerEmail} numberOfLines={1}>
                        {currentUser?.email || 'No email linked'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={closeDrawer} style={styles.drawerCloseBtn}>
                    <Text style={styles.drawerCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
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
                            onPress: () => navigation.navigate('SavedAuditions'),
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
                        Alert.alert('Logout', 'Are you sure you want to logout?', [
                          {text: 'Cancel', style: 'cancel'},
                          {
                            text: 'Logout',
                            style: 'destructive',
                            onPress: async () => await signOut(),
                          },
                        ]);
                      },
                    },
                  ].map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.drawerItem}
                      onPress={() => {
                        closeDrawer();
                        item.onPress();
                      }}
                    >
                      <Text style={styles.drawerItemIcon}>{item.icon}</Text>
                      <Text style={styles.drawerItemText}>{item.label}</Text>
                      <Text style={styles.drawerItemArrow}>›</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={[styles.drawerFooter, {borderTopColor: Colors.border}]}>
                  <TouchableOpacity style={styles.drawerThemeToggle} onPress={toggleTheme}>
                    <Text style={styles.drawerThemeIcon}>{isDark ? '🌙' : '☀️'}</Text>
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
                <View style={[styles.profileSectionAvatarContainer, { borderColor: Colors.primaryLight, borderWidth: 1.5 }]}>
                  {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.profileSectionAvatar} />
                  ) : (
                    <View style={styles.profileSectionAvatarFallback}>
                      <Text style={styles.profileSectionAvatarFallbackText}>
                        {currentUser?.displayName?.charAt(0)?.toUpperCase() || 'C'}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.profileGreetingContainer}>
                <Text style={styles.profileGreetingText}>{getGreeting()}</Text>
                <Text style={[styles.profileNameText, { color: Colors.textPrimary }]}>
                  {profileName} 👋
                </Text>
              </View>
            </View>

          </View>

          {/* ── SEARCH BAR ── */}
          <View style={[styles.newSearchContainer, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
            <Text style={styles.newSearchIcon}>🔍</Text>
            <TextInput
              style={[styles.newSearchInput, { color: Colors.textPrimary }]}
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
            <View style={[styles.suggestionsBox, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
              {suggestions.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestionItem,
                    index < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
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
                  <Text style={[styles.suggestionText, { color: Colors.textPrimary }]}>
                    {item.type} {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── QUICK ACCESS ── */}
          {renderSectionHeader('Quick Access', () => navigation.navigate('BrowseAuditions'))}
          <View style={styles.quickAccessContainer}>
            {[
              { id: 'auditions', icon: '🎭', title: 'Auditions', subtitle: '120+ Live', screen: 'BrowseAuditions' },
              { id: 'contests', icon: '🏆', title: 'Contests', subtitle: '25+ Ongoing', screen: 'Contests' },
              { id: 'casting', icon: '🎬', title: 'Casting Calls', subtitle: '85+ New', screen: 'BrowseAuditions' },
              { id: 'jobs', icon: '💼', title: 'Jobs', subtitle: '40+ Open', screen: 'BrowseAuditions' },
              { id: 'more', icon: '⚡', title: 'More', subtitle: 'Explore', screen: 'Discover' },
            ].map((item, index) => {
              const isFirst = index === 0;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.quickAccessCard,
                    { backgroundColor: Colors.card, borderColor: isFirst ? Colors.primary : Colors.border }
                  ]}
                  onPress={() => navigation.navigate(item.screen)}
                >
                  <View style={[styles.quickAccessIconContainer, isFirst && { backgroundColor: Colors.primaryFaint }]}>
                    <Text style={styles.quickAccessIcon}>{item.icon}</Text>
                  </View>
                  <Text style={[styles.quickAccessTitle, { color: Colors.textPrimary }]}>{item.title}</Text>
                  <Text style={styles.quickAccessSubtitle}>{item.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── FEATURED AUDITION ── */}
          {false && (
            <View style={styles.featuredSection}>
              <View style={[styles.featuredCard, { backgroundColor: isDark ? '#121214' : '#EBEBEB' }]}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600' }} 
                  style={StyleSheet.absoluteFillObject} 
                />
                <View style={[styles.featuredCardOverlay, { backgroundColor: isDark ? 'rgba(9,9,11,0.75)' : 'rgba(248,248,246,0.85)' }]} />
                
                <View style={styles.featuredCardContent}>
                  <View style={[styles.featuredTag, { backgroundColor: Colors.primaryFaint, borderColor: Colors.primary }]}>
                    <Text style={[styles.featuredTagText, { color: Colors.primary }]}>FEATURED AUDITION</Text>
                  </View>
                  <Text style={[styles.featuredTitle, { color: Colors.textPrimary }]}>
                    {auditionPosts[0]?.title || 'Hero Friend Role'}
                  </Text>
                  <Text style={styles.featuredSubtitle}>
                    {auditionPosts[0]?.category || 'Telugu Feature Film'}
                  </Text>
                  <Text style={styles.featuredLocation}>
                    📍 {auditionPosts[0]?.location || 'Hyderabad, Telangana'}
                  </Text>
                  
                  <TouchableOpacity 
                    style={[styles.featuredBtn, { backgroundColor: Colors.primary }]}
                    onPress={() => {
                      if (auditionPosts.length > 0) {
                        navigation.navigate('AuditionDetail', { audition: auditionPosts[0] });
                      } else {
                        navigation.navigate('BrowseAuditions');
                      }
                    }}
                  >
                    <Text style={[styles.featuredBtnText, { color: isDark ? '#09090B' : '#FFFFFF' }]}>View Details</Text>
                  </TouchableOpacity>
                </View>

                {/* Indicator dots */}
                <View style={styles.featuredIndicators}>
                  <View style={[styles.indicatorDot, styles.indicatorActive, { backgroundColor: Colors.primary }]} />
                  <View style={styles.indicatorDot} />
                  <View style={styles.indicatorDot} />
                </View>
              </View>
            </View>
          )}

          {/* ── TRENDING NOW (VERTICAL RECT CARDS) ── */}
          {renderSectionHeader('Trending Now', () => navigation.navigate('BrowseAuditions'))}
          {feedLoading ? (
            <ActivityIndicator color={Colors.primary} style={{marginVertical: Spacing.lg}} />
          ) : auditionPosts.length === 0 ? (
            <EmptyState icon="🎭" title="No auditions found" subtitle="Trending auditions will show up here" />
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.trendingScroll}>
              {auditionPosts.slice(0, 5).map((item, index) => {
                const isSaved = savedIds.includes(item.id);
                const trendingImages = [
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300',
                  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=300',
                  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300',
                  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=300',
                  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=300'
                ];
                const placeholderImage = trendingImages[index % trendingImages.length];
                const imageSource = item.imageUrl || item.posterUrl || placeholderImage;
                
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.trendingCard, { backgroundColor: Colors.card }]}
                    onPress={() => navigation.navigate('AuditionDetail', { audition: item })}
                    activeOpacity={0.9}
                  >
                    <Image source={{ uri: imageSource }} style={styles.trendingCardImg} />
                    
                    <View style={styles.trendingCardTopRow}>
                      <View style={[styles.trendingFeaturedBadge, { backgroundColor: Colors.primary }]}>
                        <Text style={styles.trendingFeaturedBadgeText}>Featured</Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.trendingBookmarkBtn, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
                        onPress={() => toggleSaveAudition(item)}
                      >
                        <Text style={styles.trendingBookmarkText}>{isSaved ? '❤️' : '🤍'}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.trendingCardBottomContent, { backgroundColor: Colors.card }]}>
                      <Text style={[styles.trendingCardTitle, { color: Colors.textPrimary }]} numberOfLines={1}>{item.title || 'Audition Call'}</Text>
                      <Text style={[styles.trendingCardMeta, { color: Colors.textSecondary }]} numberOfLines={1}>{item.category || 'Feature Film'}</Text>
                      <Text style={[styles.trendingCardLoc, { color: Colors.textSecondary }]} numberOfLines={1}>📍 {item.location || 'Hyderabad'}</Text>
                      <View style={styles.trendingCardPriceRow}>
                        <Text style={[styles.trendingCardPrice, { color: Colors.primaryLight }]}>
                          ₹ {item.budget || '30,000'}/day
                        </Text>
                        <Text style={styles.trendingCardBottomBookmark}>🔖</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* ── ACTIVE CONTESTS ── */}
          {renderSectionHeader('Active Contests', () => navigation.navigate('Contests'))}
          {contestsLoading ? (
            <ActivityIndicator color={Colors.primary} style={{marginVertical: Spacing.lg}} />
          ) : (
            (() => {
              const getDaysLeft = (deadline: string) => {
                if (!deadline) return '5 Days Left';
                const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
                if (diff < 0) return 'Ended';
                if (diff === 0) return 'Last Day';
                return `${diff} Days Left`;
              };

              const mainContest = contests[0] || {
                id: 'mock1',
                title: 'Acting Challenge 2025',
                deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
                prizePool: '1,00,000',
                participantsCount: '1250',
              };
              const subContest1 = contests[1] || {
                id: 'mock2',
                title: 'Dance Battle 2025',
                deadline: new Date(Date.now() + 8 * 86400000).toISOString(),
                prizePool: '75,000',
                participantsCount: '850',
              };
              const subContest2 = contests[2] || {
                id: 'mock3',
                title: 'Short Film Challenge',
                deadline: new Date(Date.now() + 12 * 86400000).toISOString(),
                prizePool: '50,000',
                participantsCount: '650',
              };

              return (
                <View style={styles.activeContestsSectionContainer}>
                  {/* Main Featured Contest Card */}
                  <TouchableOpacity
                    style={[styles.mainContestCard, { backgroundColor: Colors.card, borderColor: Colors.border }]}
                    onPress={() => navigation.navigate('ContestDetail', { contest: mainContest })}
                    activeOpacity={0.9}
                  >
                    <View style={[styles.mainContestLeft, { backgroundColor: Colors.cardElevated }]}>
                      <Text style={{ fontSize: 36 }}>🏆</Text>
                    </View>
                    <View style={styles.mainContestRight}>
                      <View style={styles.mainContestHeaderRow}>
                        <View style={{ flex: 1, marginRight: 6 }}>
                          <Text style={[styles.mainContestTitle, { color: Colors.textPrimary }]} numberOfLines={1}>
                            {mainContest.title}
                          </Text>
                          <Text style={styles.mainContestSubtitle} numberOfLines={1}>
                            Show Your Talent & Win Big!
                          </Text>
                        </View>
                        <View style={[styles.daysBadgeCompact, { backgroundColor: 'rgba(230,57,70,0.1)', borderColor: Colors.error }]}>
                          <Text style={[styles.daysBadgeTextCompact, { color: Colors.error }]}>
                            {getDaysLeft(mainContest.deadline)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.mainContestFooter}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.prizePoolLabel}>Prize Pool</Text>
                          <Text style={[styles.prizePoolValue, { color: Colors.primary }]}>
                            ₹ {mainContest.prizePool || '1,00,000'}
                          </Text>
                        </View>

                        <View style={styles.mainContestParticipants}>
                          <View style={styles.stackedAvatarsRow}>
                            <Image source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=60' }} style={styles.stackedAvatar} />
                            <Image source={{ uri: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=60' }} style={[styles.stackedAvatar, { marginLeft: -6 }]} />
                            <Image source={{ uri: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=60' }} style={[styles.stackedAvatar, { marginLeft: -6 }]} />
                          </View>
                          <Text style={styles.participantsTextCompact}>
                            {mainContest.participantsCount || '1250'} Participants
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Side-by-side Sub Contests */}
                  <View style={styles.subContestsRow}>
                    {[subContest1, subContest2].map((sub, idx) => (
                      <TouchableOpacity
                        key={sub.id || idx}
                        style={[styles.subContestCard, { backgroundColor: Colors.card, borderColor: Colors.border }]}
                        onPress={() => navigation.navigate('ContestDetail', { contest: sub })}
                        activeOpacity={0.9}
                      >
                        <View style={styles.subContestHeader}>
                          <Text style={[styles.subContestTitle, { color: Colors.textPrimary }]} numberOfLines={1}>
                            {sub.title}
                          </Text>
                          <View style={[styles.daysBadgeCompact, { backgroundColor: 'rgba(230,57,70,0.1)', borderColor: Colors.error }]}>
                            <Text style={[styles.daysBadgeTextCompact, { color: Colors.error }]}>
                              {getDaysLeft(sub.deadline)}
                            </Text>
                          </View>
                        </View>

                        <View style={{ marginTop: 6 }}>
                          <Text style={styles.prizePoolLabel}>Prize Pool</Text>
                          <Text style={[styles.prizePoolValueSmall, { color: Colors.primary }]}>
                            ₹ {sub.prizePool}
                          </Text>
                        </View>

                        <Text style={styles.participantsTextSub}>
                          {sub.participantsCount} Participants
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })()
          )}

          {/* ── FROM DIRECTORS YOU FOLLOW ── */}
          {renderSectionHeader('From Directors You Follow', () => navigation.navigate('Discover'))}
          {suggestedLoading ? (
            <ActivityIndicator color={Colors.primary} style={{marginVertical: Spacing.lg}} />
          ) : (
            (() => {
              const displayDirectors = generalPosts.length > 0 ? generalPosts.slice(0, 3).map((item, index) => {
                const directorNames = ['Arjun Verma', 'Meera Joshi', 'Rohit Sawant'];
                const directorPhotos = [
                  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200',
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200',
                  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=200'
                ];
                const directorRoles = ['Director · Hyderabad', 'Director · Mumbai', 'Director · Chennai'];
                const name = item.authorName || directorNames[index % directorNames.length];
                const photo = item.authorPhotoUrl || directorPhotos[index % directorPhotos.length];
                const role = item.authorRole || directorRoles[index % directorRoles.length];
                return { id: item.id || `director-${index}`, name, photo, role, activity: 'New Casting Call', time: '2h ago' };
              }) : [
                {
                  id: 'd1',
                  name: 'Arjun Verma',
                  photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200',
                  role: 'Director · Hyderabad',
                  activity: 'New Casting Call',
                  time: '2h ago',
                },
                {
                  id: 'd2',
                  name: 'Meera Joshi',
                  photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200',
                  role: 'Director · Mumbai',
                  activity: 'New Casting Call',
                  time: '5h ago',
                },
                {
                  id: 'd3',
                  name: 'Rohit Sawant',
                  photo: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=200',
                  role: 'Director · Chennai',
                  activity: 'New Casting Call',
                  time: '1d ago',
                },
              ];

              return (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.directorsScroll}>
                  {displayDirectors.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.directorCardCompact, { backgroundColor: Colors.card, borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)' }]}
                      onPress={() => navigation.navigate('Discover')}
                      activeOpacity={0.9}
                    >
                      <View style={styles.directorHeaderRow}>
                        <View style={styles.directorAvatarWrapper}>
                          <Image source={{ uri: item.photo }} style={styles.directorAvatar} />
                          <View style={styles.directorVerifiedBadge}>
                            <Text style={styles.directorVerifiedText}>✓</Text>
                          </View>
                        </View>
                        <View style={styles.directorNameMeta}>
                          <Text style={[styles.directorNameText, { color: Colors.textPrimary }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.directorRoleText} numberOfLines={1}>
                            {item.role}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.directorActivityRow}>
                        <Text style={styles.directorActivityText} numberOfLines={1}>{item.activity}</Text>
                        <Text style={styles.directorTimeText}>{item.time}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              );
            })()
          )}


          {/* ── UPCOMING DEADLINES ── */}
          {renderSectionHeader('Upcoming Deadlines', () => navigation.navigate('Contests'))}
          <View style={[styles.deadlinesVerticalContainer, { backgroundColor: Colors.card, borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)' }]}>
            {[
              { title: 'Acting Challenge 2025', sub: 'Registration Ends', time: '5 Days Left', icon: '🏆', color: '#E63946' },
              { title: 'Short Film Challenge', sub: 'Submission Ends', time: '12 Days Left', icon: '🎬', color: '#E63946' },
              { title: 'Reel Star Contest', sub: 'Submission Ends', time: '18 Days Left', icon: '⚡', color: '#E63946' },
              { title: 'Dance Battle 2025', sub: 'Registration Ends', time: '25 Days Left', icon: '🏆', color: '#22C55E' },
            ].map((item, idx, arr) => (
              <View key={idx} style={styles.deadlineRow}>
                {/* Timeline Circle with Icon */}
                <View style={styles.timelineContainer}>
                  <View style={[styles.timelineIconCircle, { borderColor: Colors.border, backgroundColor: Colors.cardElevated }]}>
                    <Text style={styles.timelineIconEmoji}>{item.icon}</Text>
                  </View>
                  {idx < arr.length - 1 && (
                    <View style={[styles.timelineConnectorLine, { backgroundColor: Colors.border }]} />
                  )}
                </View>

                {/* Info */}
                <View style={styles.deadlineMiddle}>
                  <Text style={[styles.deadlineTitle, { color: Colors.textPrimary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.deadlineSubtitle}>
                    {item.sub}
                  </Text>
                </View>

                {/* Days Left badge */}
                <View style={[styles.deadlineDaysBadge, { backgroundColor: item.color + '12', borderColor: item.color }]}>
                  <Text style={[styles.deadlineDaysBadgeText, { color: item.color }]}>
                    {item.time}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── TOP INFLUENCERS TO FOLLOW ── */}
          {renderSectionHeader('Top Influencers to Follow', () => navigation.navigate('Discover'))}
          {suggestedLoading ? (
            <ActivityIndicator color={Colors.primary} style={{marginVertical: Spacing.lg}} />
          ) : (
            (() => {
              const realUsers = suggestedUsers.map(u => ({
                id: u._id || u.id,
                fullName: u.fullName || u.displayName || u.name || 'User',
                photoUrl: u.photoUrl,
                role: u.role || 'Actor',
              }));
              const filteredMock = MOCK_INFLUENCERS.filter(
                m => !realUsers.some(r => r.fullName.toLowerCase() === m.fullName.toLowerCase())
              );
              const displayInfluencers = [...realUsers, ...filteredMock];

              return (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.influencersScroll}>
                  {displayInfluencers.map((item, index) => {
                    const uid = item.id;
                    const isFollowed = followingIds.has(uid);
                    return (
                      <TouchableOpacity
                        key={uid}
                        style={[
                          styles.influencerCardCompact, 
                          { 
                            backgroundColor: Colors.card, 
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)' 
                          }
                        ]}
                        onPress={() => navigation.navigate('Discover')}
                        activeOpacity={0.9}
                      >
                        <View style={styles.influencerAvatarWrapper}>
                          <Avatar 
                            name={item.fullName} 
                            size={44} 
                            uri={item.photoUrl} 
                            ring={true}
                            ringColor="rgba(245, 196, 81, 0.4)"
                          />
                          <View style={[styles.influencerRankBadge, { backgroundColor: '#FBBF24' }]}>
                            <Text style={styles.influencerRankText}>★</Text>
                          </View>
                        </View>
                        <Text style={[styles.influencerNameText, { color: Colors.textPrimary }]} numberOfLines={1}>
                          {item.fullName}
                        </Text>
                        <Text style={styles.influencerRoleText} numberOfLines={1}>
                          {item.role}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.influencerFollowBtnCompact,
                            { borderColor: Colors.primary },
                            isFollowed && { backgroundColor: 'rgba(212, 175, 55, 0.1)' }
                          ]}
                          onPress={() => toggleFollowUser(uid)}
                        >
                          <Text style={[styles.influencerFollowTextCompact, { color: Colors.primary }]}>
                            {isFollowed ? 'Following' : 'Follow'}
                          </Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              );
            })()
          )}

          {/* ── CINELINK FOR YOU (CAROUSEL) ── */}
          <View style={styles.forYouSection}>
            <View style={[styles.forYouCard, { backgroundColor: Colors.card, borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)' }]}>
              {/* Background Image with Svg Linear Gradient fade overlay */}
              <View style={styles.forYouImageContainer}>
                <Image 
                  source={getCarouselImage(carouselItems[carouselIndex].imageKey)} 
                  style={styles.forYouImage} 
                />
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                  <Defs>
                    <SvgLinearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor={Colors.card} stopOpacity={1} />
                      <Stop offset={isDark ? 0.45 : 0.22} stopColor={Colors.card} stopOpacity={isDark ? 0.85 : 0.45} />
                      <Stop offset={isDark ? 1 : 0.6} stopColor={Colors.card} stopOpacity="0" />
                    </SvgLinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#fade)" />
                </Svg>
              </View>

              <View style={styles.forYouLeft}>
                <Text style={styles.forYouCarouselLabel}>{carouselItems[carouselIndex].title}</Text>
                <Text style={[styles.forYouTitle, { color: Colors.primary, fontSize: 13, fontStyle: 'italic', marginTop: 3, marginBottom: 5 }]}>
                  {carouselItems[carouselIndex].quote}
                </Text>
                <Text style={styles.forYouDesc}>
                  {carouselItems[carouselIndex].desc}
                </Text>
                
                <TouchableOpacity 
                  style={styles.forYouLink}
                  onPress={() => navigation.navigate(carouselItems[carouselIndex].targetScreen as any)}
                >
                  <Text style={styles.forYouLinkText}>
                    {carouselItems[carouselIndex].buttonText}
                  </Text>
                </TouchableOpacity>

                {/* Dots indicator */}
                <View style={styles.carouselDotsRow}>
                  {carouselItems.map((_, dotIdx) => (
                    <View 
                      key={dotIdx} 
                      style={[
                        styles.carouselDot, 
                        { 
                          backgroundColor: dotIdx === carouselIndex ? Colors.primary : Colors.textSecondary,
                          width: dotIdx === carouselIndex ? 12 : 5,
                          height: 5,
                          borderRadius: 2.5,
                          marginHorizontal: 1,
                        }
                      ]} 
                    />
                  ))}
                </View>
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

const FilmReelIcon = ({ size = 26, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.2" />
    <Circle cx="12" cy="12" r="2.8" stroke={color} strokeWidth="1.5" fill={color} />
    <Circle cx="12" cy="6.2" r="1.8" fill={color} />
    <Circle cx="17.5" cy="10.2" r="1.8" fill={color} />
    <Circle cx="15.4" cy="16.7" r="1.8" fill={color} />
    <Circle cx="8.6" cy="16.7" r="1.8" fill={color} />
    <Circle cx="6.5" cy="10.2" r="1.8" fill={color} />
    <Path d="M12,9.2 L12,8 M12,14.8 L12,16 M9.2,12 L8,12 M14.8,12 L16,12" stroke={color} strokeWidth="1" />
  </Svg>
);

const SliderIcon = ({ size = 20, color = Colors.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3M2 14H6M10 8H14M18 16H22" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  
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
    backgroundColor: '#E63946',
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
    shadowOffset: { width: 4, height: 0 },
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
  profileSubtitleText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  profileRoleDropdown: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  profileRoleDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
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

  // Featured Audition Card
  featuredSection: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  featuredCard: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.cardElevated,
  },
  featuredCardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredCardContent: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: Spacing.xl,
    paddingRight: Spacing.md,
  },
  featuredTag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
  },
  featuredTagText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  featuredSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  featuredLocation: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  featuredBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: Spacing.md,
  },
  featuredBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  featuredIndicators: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.lg,
    flexDirection: 'row',
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  indicatorActive: {
    width: 14,
    backgroundColor: Colors.primary,
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
  quickAccessSubtitle: {
    fontSize: 7,
    color: Colors.textTertiary,
    marginTop: 1,
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
  trendingCardOverlay: {
    ...StyleSheet.absoluteFillObject,
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
  stackedAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  stackedAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#000',
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

  // From Directors You Follow Row
  directorsScroll: {
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  directorCardCompact: {
    width: 180,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  directorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  directorAvatarWrapper: {
    position: 'relative',
  },
  directorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  directorVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  directorVerifiedText: {
    color: '#FFF',
    fontSize: 7,
    fontWeight: 'bold',
  },
  directorNameMeta: {
    flex: 1,
  },
  directorNameText: {
    fontSize: 12,
    fontWeight: '700',
  },
  directorRoleText: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  directorActivityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  directorActivityText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  directorTimeText: {
    color: Colors.textSecondary,
    fontSize: 9,
    marginLeft: 4,
  },

  // Upcoming Deadlines List
  deadlinesVerticalContainer: {
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  timelineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    marginRight: 12,
    position: 'relative',
  },
  timelineIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineIconEmoji: {
    fontSize: 14,
  },
  timelineConnectorLine: {
    position: 'absolute',
    top: 32,
    width: 1,
    height: 32,
    zIndex: 1,
  },
  deadlineMiddle: {
    flex: 1,
  },
  deadlineTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  deadlineSubtitle: {
    fontSize: 10.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deadlineDaysBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deadlineDaysBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },

  // Top Influencers
  influencersCardContainer: {
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
  },
  influencersScroll: {
    paddingHorizontal: 12,
    gap: 16,
  },
  influencerItem: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  influencerAvatarWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  influencerRankBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  influencerRankText: {
    fontSize: 9,
    color: '#000',
    fontWeight: 'bold',
  },
  influencerNameText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  influencerRoleText: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 1,
    textAlign: 'center',
    width: '100%',
    marginBottom: 6,
  },
  influencerFollowBtnCompact: {
    width: '100%',
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  influencerFollowTextCompact: {
    fontSize: 9.5,
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

  // Report Modal / fallback
  updateLocationText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});
