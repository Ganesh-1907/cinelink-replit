import BootSplash from 'react-native-bootsplash';
import React, {useState, useEffect} from 'react';
import ImageViewerScreen from './screens/ImageViewerScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Text, View, ActivityIndicator, StatusBar, Alert} from 'react-native';
import ErrorBoundary from './components/ErrorBoundary';
import {AppProvider, useApp} from './src/context/AppContext';
import {ThemeProvider, useTheme} from './src/context/ThemeContext';
import {NavigationContainer} from '@react-navigation/native';
import {createNavigationContainerRef} from '@react-navigation/native';
import {
  setNavigator,
  registerBackgroundHandler,
} from './src/services/NotificationService';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import api from './src/api/client';
import {authService} from './src/services/AuthService';
import {initNotifications} from './src/services/NotificationService';
import {enableOfflinePersistence} from './src/services/offlineService';
import {trackScreenView} from './src/services/analyticsService';
import {connectSocket, disconnectSocket} from './src/services/socketService';
import OnboardingScreen from './screens/OnboardingScreen';
import SuggestedFollowsScreen from './screens/SuggestedFollowsScreen';
import ProfileFillScreen from './screens/ProfileFillScreen';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import MyProfileScreen from './screens/MyProfileScreen';
import MovieDetails from './screens/MovieDetails';
import PostAuditionScreen from './screens/PostAuditionScreen';
import AuditionDetailScreen from './screens/AuditionDetailScreen';
import MyApplicationsScreen from './screens/MyApplicationsScreen';
import DirectorDashboardScreen from './screens/DirectorDashboardScreen';
import BrowseAuditionsScreen from './screens/BrowseAuditionsScreen';
import UploadFilmScreen from './screens/UploadFilmScreen';
import FilmDetailScreen from './screens/FilmDetailScreen';
import MyFilmsScreen from './screens/MyFilmsScreen';
import CrewMarketplaceScreen from './screens/CrewMarketplaceScreen';
import CrewScreen from './screens/CrewScreen';
import ChatListScreen from './screens/ChatListScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import ChatScreen from './screens/ChatScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import BrowseContestsScreen from './screens/BrowseContestsScreen';
import PostContestScreen from './screens/PostContestScreen';
import ContestDetailScreen from './screens/ContestDetailScreen';
import MyContestsScreen from './screens/MyContestsScreen';
import PublicProfileScreen from './screens/PublicProfileScreen';
import PaymentScreen from './screens/PaymentScreen';
import SavedAuditionsScreen from './screens/SavedAuditionsScreen';
import MyAuditionsScreen from './screens/MyAuditionsScreen';
import SettingsScreen from './screens/SettingsScreen';
import AIAssistantScreen from './screens/AIAssistantScreen';
import MyQuickPostsScreen from './screens/MyQuickPostsScreen';
import PostQuickPostScreen from './screens/PostQuickPostScreen';
import MyAnnouncementsScreen from './screens/MyAnnouncementsScreen';
import PostAnnouncementScreen from './screens/PostAnnouncementScreen';
import AIScanAuditionScreen from './screens/AIScanAuditionScreen';
import AdminReportsScreen from './screens/AdminReportsScreen';
import CastingRequestScreen from './screens/CastingRequestScreen';
import CreateProjectScreen from './screens/CreateProjectScreen';
import BrowseProjectsScreen from './screens/BrowseProjectsScreen';
import ProjectDetailScreen from './screens/ProjectDetailScreen';
import JoinRequestsScreen from './screens/JoinRequestsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsScreen from './screens/TermsScreen';
import ReelsScreen from './screens/ReelsScreen';
import UploadReelsScreen from './screens/UploadReelsScreen';
import FollowersScreen from './screens/FollowersScreen';
import FeedbackModal from './screens/FeedbackModal';
import IndustryGuideScreen from './screens/IndustryGuideScreen';
import PhoneLoginScreen from './screens/PhoneLoginScreen';
import PremiumCineLinkScreen from './src/screens/Premium/PremiumCineLinkScreen';
import BrowseFilmsScreen from './screens/BrowseFilmsScreen';
import BrowseUpdatesScreen from './screens/BrowseUpdatesScreen';
import {LiquidNav} from './components/LiquidNav';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Colors} from './src/theme';

export const navigationRef = createNavigationContainerRef();
registerBackgroundHandler();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => (
        <LiquidNav
          navigation={props.navigation}
          activeTab={props.state.index}
        />
      )}
      screenOptions={{
        headerStyle: {backgroundColor: Colors.background},
        headerTintColor: Colors.textPrimary,
        headerShadowVisible: false,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({color}) => (
            <View
              style={{
                width: 28,
                height: 28,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text style={{fontSize: 20, color}}>🏠</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Auditions"
        component={BrowseAuditionsScreen}
        options={{
          title: 'Auditions',
          headerShown: false,
          tabBarIcon: ({color}) => (
            <Text style={{fontSize: 20, color}}>🎭</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Crew"
        component={CrewScreen}
        options={{
          title: 'Crew',
          headerShown: false,
          tabBarIcon: ({color}) => (
            <Text style={{fontSize: 20, color}}>🎥</Text>
          ),
        }}
      />

      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          title: 'Discover',
          headerShown: false,
          tabBarIcon: ({color}) => (
            <Text style={{fontSize: 20, color}}>✨</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={ChatListScreen}
        options={{
          title: 'Chats',
          headerShown: false,
          tabBarIcon: ({color}) => (
            <Text style={{fontSize: 20, color}}>💬</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({color}) => (
            <Text style={{fontSize: 20, color}}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: {backgroundColor: Colors.background},
        headerTintColor: Colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: {backgroundColor: Colors.background},
        animation: 'slide_from_right',
        animationDuration: 280,
        gestureEnabled: true,
      }}>
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="SuggestedFollows"
        component={SuggestedFollowsScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Contests"
        component={BrowseContestsScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="CrewMarketplace"
        component={CrewMarketplaceScreen}
        options={{title: 'Crew Marketplace'}}
      />
      <Stack.Screen
        name="MovieDetails"
        component={MovieDetails}
        options={{title: 'Movie Details'}}
      />
      <Stack.Screen
        name="PostAudition"
        component={PostAuditionScreen}
        options={{title: 'Post Audition'}}
      />
      <Stack.Screen
        name="AuditionDetail"
        component={AuditionDetailScreen}
        options={{title: 'Audition Details'}}
      />
      <Stack.Screen
        name="BrowseAuditions"
        component={BrowseAuditionsScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="MyApplications"
        component={MyApplicationsScreen}
        options={{title: 'My Applications'}}
      />
      <Stack.Screen
        name="DirectorDashboard"
        component={DirectorDashboardScreen}
        options={{title: 'Director Dashboard'}}
      />
      <Stack.Screen
        name="UploadFilm"
        component={UploadFilmScreen}
        options={{title: 'Upload Short Film', headerShown: false}}
      />
      <Stack.Screen
        name="FilmDetail"
        component={FilmDetailScreen}
        options={{title: 'Film Details'}}
      />
      <Stack.Screen
        name="MyFilms"
        component={MyFilmsScreen}
        options={{title: 'My Films'}}
      />
      <Stack.Screen
        name="Chats"
        component={ChatListScreen}
        options={{title: 'Messages', headerShown: false}}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{title: 'Chat', headerShown: false}}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: 'Notifications'}}
      />
      <Stack.Screen
        name="PostContest"
        component={PostContestScreen}
        options={{title: 'Create Contest'}}
      />
      <Stack.Screen
        name="ContestDetail"
        component={ContestDetailScreen}
        options={{title: 'Contest Details'}}
      />
      <Stack.Screen
        name="MyContests"
        component={MyContestsScreen}
        options={{title: 'My Contests'}}
      />
      <Stack.Screen
        name="PublicProfile"
        component={PublicProfileScreen}
        options={{title: 'Public Profile'}}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{title: 'Payment'}}
      />
      <Stack.Screen
        name="SavedAuditions"
        component={SavedAuditionsScreen}
        options={{title: 'Saved Auditions'}}
      />
      <Stack.Screen
        name="MyAuditions"
        component={MyAuditionsScreen}
        options={{title: 'My Auditions'}}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: 'Settings'}}
      />
      <Stack.Screen
        name="MyProfile"
        component={MyProfileScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{title: '🤖 AI Assistant'}}
      />
      <Stack.Screen
        name="QuickPost"
        component={MyQuickPostsScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="PostQuickPost"
        component={PostQuickPostScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Announcements"
        component={MyAnnouncementsScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="PostAnnouncement"
        component={PostAnnouncementScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="AIScanAudition"
        component={AIScanAuditionScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="AdminReports"
        component={AdminReportsScreen}
        options={{title: '🛡️ Admin Dashboard'}}
      />
      <Stack.Screen
        name="ImageViewer"
        component={ImageViewerScreen}
        options={{headerShown: false, animation: 'fade'}}
      />
      <Stack.Screen
        name="BrowseFilms"
        component={BrowseFilmsScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="BrowseUpdates"
        component={BrowseUpdatesScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="CastingRequest"
        component={CastingRequestScreen}
        options={{title: 'Request to Post Auditions'}}
      />
      <Stack.Screen name="CreateProject" component={CreateProjectScreen} />
      <Stack.Screen
        name="BrowseProjects"
        component={BrowseProjectsScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="JoinRequests"
        component={JoinRequestsScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Followers"
        component={FollowersScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="IndustryGuide"
        component={IndustryGuideScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="PremiumCineLink"
        component={PremiumCineLinkScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ReelsScreen"
        component={ReelsScreen}
        options={{headerShown: false, animation: 'fade'}}
      />
      <Stack.Screen
        name="UploadReels"
        component={UploadReelsScreen}
        options={{title: 'Upload Reel'}}
      />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
    </Stack.Navigator>
  );
}

function AppContent(): JSX.Element {
  const {isDark} = useTheme();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [showProfileFill, setShowProfileFill] = useState(false);
  const [showSuggestedFollows, setShowSuggestedFollows] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // ── Onboarding check ──────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then(val => {
      setShowOnboarding(val !== 'true');
    });
  }, []);


  // ── Offline persistence ──────────────────────────────────
  useEffect(() => {
    enableOfflinePersistence();
  }, []);

  // ── Auth state via AppContext ─────────────────────────────
  const {user: contextUser, loading: authLoading} = useApp();
  useEffect(() => {
    if (contextUser) {
      connectSocket().catch(() => {});
      return () => { disconnectSocket(); };
    }
  }, [contextUser]);
  useEffect(() => {
    if (contextUser) {
      (async () => {
        const firstTimeFlow = await AsyncStorage.getItem('first_time_flow');
        if (firstTimeFlow === 'true') {
          const profileDone = await AsyncStorage.getItem('profile_fill_done');
          if (profileDone !== 'true') {
            setShowProfileFill(true);
            setShowSuggestedFollows(false);
          } else {
            setShowProfileFill(false);
            const followsDone = await AsyncStorage.getItem('suggested_follows_done');
            setShowSuggestedFollows(followsDone !== 'true');
          }
        } else {
          setShowProfileFill(false);
          setShowSuggestedFollows(false);
        }
      })();
    } else {
      setShowProfileFill(false);
      setShowSuggestedFollows(false);
    }
  }, [contextUser]);

  // ── Notifications ─────────────────────────────────────────
  useEffect(() => {
    if (contextUser) {
      initNotifications();
    }
  }, [contextUser]);

  // ── Ban check ─────────────────────────────────────────────
  useEffect(() => {
    if (!contextUser?.email) {
      return;
    }
    const checkBan = async () => {
      try {
        const res = await api.get<{banned: boolean}>('/users/check-ban');
        if (res.banned) {
          await authService.logout();
          Alert.alert(
            '🚫 Account Banned',
            'Your account has been banned from CineLink.',
          );
        }
      } catch (e) {
        /* ignore */
      }
    };
    checkBan();
  }, [contextUser?.email]);

  // ── Presence ──────────────────────────────────────────────
  useEffect(() => {
    if (!contextUser?.email) {
      return;
    }
    const setPresence = async (isOnline: boolean) => {
      try {
        await api.put('/users/profile', {
          isOnline,
          lastSeen: new Date().toISOString(),
        });
      } catch (e) {
        /* ignore */
      }
    };
    setPresence(true);
    return () => {
      setPresence(false);
    };
  }, [contextUser?.email]);

  // ── Feedback popup — shows once after 1 hour ──────────────
  useEffect(() => {
    if (!contextUser) {
      return;
    }
    const checkFeedback = async () => {
      try {
        const done = await AsyncStorage.getItem('feedback_done');
        if (done === 'true') {
          return;
        }
        let firstOpen = await AsyncStorage.getItem('first_open_time');
        if (!firstOpen) {
          await AsyncStorage.setItem('first_open_time', Date.now().toString());
          return;
        }
        const elapsed = Date.now() - parseInt(firstOpen, 10);
        if (elapsed >= 3600000) {
          setShowFeedback(true);
          await AsyncStorage.setItem('feedback_done', 'true');
        }
      } catch (e) {
        console.log(e);
      }
    };
    const timer = setTimeout(checkFeedback, 5000);
    return () => clearTimeout(timer);
  }, [contextUser]);

  // ── BootSplash ────────────────────────────────────────────
  useEffect(() => {
    BootSplash.hide({fade: true});
  }, []);

  // ── Loading ───────────────────────────────────────────────
  if (authLoading || showOnboarding === null) {
    return (
      <ErrorBoundary>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: Colors.background,
          }}>
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor={Colors.background}
          />
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ErrorBoundary>
    );
  }

  // ── Onboarding ────────────────────────────────────────────
  if (showOnboarding) {
    return (
      <ErrorBoundary>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={Colors.background}
        />
        <OnboardingScreen onDone={() => setShowOnboarding(false)} />
      </ErrorBoundary>
    );
  }

  // ── Profile Fill ──────────────────────────────────────────
  if (contextUser && showProfileFill) {
    return (
      <ErrorBoundary>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={Colors.background}
        />
        <ProfileFillScreen
          onComplete={async () => {
            await AsyncStorage.setItem('profile_fill_done', 'true');
            setShowProfileFill(false);
            const followsDone = await AsyncStorage.getItem('suggested_follows_done');
            setShowSuggestedFollows(followsDone !== 'true');
          }}
        />
      </ErrorBoundary>
    );
  }

  // ── Suggested Follows ─────────────────────────────────────
  if (contextUser && showSuggestedFollows) {
    return (
      <ErrorBoundary>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={Colors.background}
        />
        <SuggestedFollowsScreen
          navigation={{
            replace: async () => {
              await AsyncStorage.setItem('suggested_follows_done', 'true');
              await AsyncStorage.setItem('first_time_flow', 'false');
              setShowSuggestedFollows(false);
            },
            goBack: async () => {
              await AsyncStorage.setItem('suggested_follows_done', 'true');
              await AsyncStorage.setItem('first_time_flow', 'false');
              setShowSuggestedFollows(false);
            },
          }}
          route={{params: {}}}
        />
      </ErrorBoundary>
    );
  }

  // ── Main App ──────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => setNavigator(navigationRef)}
        onStateChange={() => {
          const route = navigationRef.current?.getCurrentRoute();
          if (route?.name) {
            trackScreenView(route.name);
          }
        }}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={Colors.background}
        />
        {contextUser ? <MainStack /> : <AuthStack />}

        <FeedbackModal
          visible={showFeedback}
          onClose={() => setShowFeedback(false)}
        />
      </NavigationContainer>
    </ErrorBoundary>
  );
}

function App(): JSX.Element {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </AppProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
