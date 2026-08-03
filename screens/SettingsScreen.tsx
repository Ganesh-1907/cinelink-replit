import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {useTheme} from '../src/context/ThemeContext';
import {useApp} from '../src/context/AppContext';
import {Card, Button, Header} from '../components/ui';

export default function SettingsScreen({navigation}: any) {
  const {isDark, toggleTheme} = useTheme();
  const {signOut, refreshUserData, user, isAdmin, isApprovedDirector} = useApp();
  const insets = useSafeAreaInsets();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.get<{user: any}>('/users/profile');
      const data = res.user;
      if (data) {
        if (data.notificationsEnabled !== undefined) setNotificationsEnabled(data.notificationsEnabled);
        if (data.emailNotifications !== undefined) setEmailNotifications(data.emailNotifications);
        if (data.profileVisible !== undefined) setProfileVisible(data.profileVisible);
      }
    } catch (e) {
      console.log('Failed to load settings:', e);
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = async (field: string, val: boolean) => {
    try {
      await api.put('/users/profile', {[field]: val});
      await refreshUserData();
    } catch (e) {
      console.log('Save failed:', e);
    }
  };

  const toggleNotifications = async (val: boolean) => {
    setNotificationsEnabled(val);
    await updateSetting('notificationsEnabled', val);
  };

  const toggleEmailNotifications = async (val: boolean) => {
    setEmailNotifications(val);
    await updateSetting('emailNotifications', val);
  };

  const toggleProfileVisible = async (val: boolean) => {
    setProfileVisible(val);
    await updateSetting('profileVisible', val);
  };

  const [deleting, setDeleting] = useState(false);

  const deleteAccount = () => {
    Alert.alert(
      '🗑 Delete Account',
      'This will permanently delete:\n\n• Your profile\n• Your posts\n• Your auditions\n• Your applications\n• All your data\n\nThis cannot be undone!',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete('/users/account');
              Alert.alert('✅ Done', 'Your account has been deleted.');
            } catch (e: any) {
              console.log('DELETE ERROR:', e);
              Alert.alert('Error', 'Could not delete account. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const changePassword = () => {
    if (!user?.email) return;
    Alert.alert('Reset Password', `A reset email will be sent to ${user.email}`, [
      {text: 'Send', onPress: async () => {
        await api.post('/auth/forgot-password', {email: user.email});
        Alert.alert('Done!', 'Check your email for reset link.');
      }},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Logout', style: 'destructive', onPress: () => signOut()},
    ]);
  };

  return (
    <View style={styles.safe}>
      <Header title="Settings" navigation={navigation} />
      <ScrollView style={styles.container}>
        <View style={[styles.section, {paddingBottom: insets.bottom + 40}]}>
          {(isAdmin || isApprovedDirector) && (
            <>
              <Text style={styles.sectionTitle}>Dashboard & Tools</Text>
              <View>
                {(isApprovedDirector || isAdmin) && (
                  <TouchableOpacity
                    style={styles.accountActionRow}
                    onPress={() => navigation.navigate('MyAuditions')}>
                    <Text style={styles.settingIcon}>🎭</Text>
                    <Text style={styles.settingText}>{isAdmin ? 'Auditions' : 'My Auditions'}</Text>
                    <Text style={styles.settingArrow}>›</Text>
                  </TouchableOpacity>
                )}
                {isAdmin && (
                  <>
                    <View style={styles.cardSeparator} />
                    <TouchableOpacity
                      style={styles.accountActionRow}
                      onPress={() => navigation.navigate('QuickPost')}>
                      <Text style={styles.settingIcon}>⚡</Text>
                      <Text style={styles.settingText}>Quick Post</Text>
                      <Text style={styles.settingArrow}>›</Text>
                    </TouchableOpacity>
                    <View style={styles.cardSeparator} />
                    <TouchableOpacity
                      style={styles.accountActionRow}
                      onPress={() => navigation.navigate('Announcements')}>
                      <Text style={styles.settingIcon}>📢</Text>
                      <Text style={styles.settingText}>Announcements</Text>
                      <Text style={styles.settingArrow}>›</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>Appearance</Text>
          <View>
            <TouchableOpacity style={styles.accountActionRow} onPress={toggleTheme}>
              <Text style={styles.settingIcon}>{isDark ? '🌙' : '☀️'}</Text>
              <Text style={styles.settingText}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Account</Text>
          <View>
            <View style={styles.accountInfoRow}>
              <View style={styles.accountInfoLeft}>
                <Text style={styles.settingIcon}>📧</Text>
                <View style={styles.flex1}>
                  <Text style={styles.accountInfoLabel}>Email / Phone</Text>
                  <Text style={styles.accountInfoValue} numberOfLines={1}>{user?.email || user?.phoneNumber || 'No email/phone linked'}</Text>
                </View>
              </View>
            </View>
            {user?.email ? (
              <>
                <View style={styles.cardSeparator} />
                <TouchableOpacity style={styles.accountActionRow} onPress={changePassword}>
                  <Text style={styles.settingIcon}>🔑</Text>
                  <Text style={styles.settingText}>Change Password</Text>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <View style={styles.cardSeparator} />
            <TouchableOpacity style={styles.accountActionRow} onPress={() => navigation.navigate('MyProfile')}>
              <Text style={styles.settingIcon}>👤</Text>
              <Text style={styles.settingText}>My Profile</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Notifications</Text>
          <View>
            <View style={styles.accountInfoRow}>
              <View style={styles.accountInfoLeft}>
                <Text style={styles.settingIcon}>🔔</Text>
                <View><Text style={styles.toggleText}>Push Notifications</Text></View>
              </View>
              <Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{false: Colors.borderLight, true: Colors.primary}} thumbColor={Colors.textPrimary} />
            </View>
            <View style={styles.cardSeparator} />
            <View style={styles.accountInfoRow}>
              <View style={styles.accountInfoLeft}>
                <Text style={styles.settingIcon}>📧</Text>
                <View><Text style={styles.toggleText}>Email Notifications</Text></View>
              </View>
              <Switch value={emailNotifications} onValueChange={toggleEmailNotifications} trackColor={{false: Colors.borderLight, true: Colors.primary}} thumbColor={Colors.textPrimary} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Privacy</Text>
          <View>
            <View style={styles.accountInfoRow}>
              <View style={styles.accountInfoLeft}>
                <Text style={styles.settingIcon}>👁</Text>
                <View><Text style={styles.toggleText}>Profile Visible to Others</Text></View>
              </View>
              <Switch value={profileVisible} onValueChange={toggleProfileVisible} trackColor={{false: Colors.borderLight, true: Colors.primary}} thumbColor={Colors.textPrimary} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Legal</Text>
          <View>
            <TouchableOpacity style={styles.accountActionRow} onPress={() => navigation.navigate('PrivacyPolicy')}>
              <Text style={styles.settingIcon}>🔒</Text>
              <Text style={styles.settingText}>Privacy Policy</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.cardSeparator} />
            <TouchableOpacity style={styles.accountActionRow} onPress={() => navigation.navigate('Terms')}>
              <Text style={styles.settingIcon}>📄</Text>
              <Text style={styles.settingText}>Terms & Conditions</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>About</Text>
          <View>
            <View style={styles.accountInfoRow}>
              <View style={styles.accountInfoLeft}>
                <Text style={styles.settingIcon}>📱</Text>
                <View><Text style={styles.accountInfoLabel}>App Version</Text><Text style={styles.accountInfoValue}>1.0.0</Text></View>
              </View>
            </View>
            <View style={styles.cardSeparator} />
            <View style={styles.accountInfoRow}>
              <View style={styles.accountInfoLeft}>
                <Text style={styles.settingIcon}>🎬</Text>
                <View><Text style={styles.accountInfoLabel}>CineLink</Text><Text style={styles.accountInfoValue}>India's Cinema Network</Text></View>
              </View>
            </View>
          </View>

          <View style={styles.actionGap}>
            <Button label="🚪 Logout" onPress={handleLogout} variant="outline" fullWidth />
          </View>

          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Card variant="outlined" padding={Spacing.lg}>
            <Button label={deleting ? '' : '🗑 Delete My Account & Data'} onPress={deleteAccount} variant="danger" fullWidth disabled={deleting} loading={deleting} />
            <Text style={styles.deleteNote}>As per India's DPDP Act 2023, you have the right to delete all your personal data from CineLink.{'\n'}⚠️ You may need to sign out and sign back in before deleting.</Text>
          </Card>

          <View style={styles.copyrightBox}>
            <Text style={styles.copyrightText}>© 2026 CineLink. All rights reserved.</Text>
            <Text style={styles.copyrightSubText}>India's Cinema Network</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  container: {flex: 1, backgroundColor: Colors.background},
  section: {padding: Spacing.lg, paddingBottom: Spacing['3xl']},
  sectionTitle: {...Typography.labelSm, color: Colors.primary, marginTop: Spacing.lg, marginBottom: Spacing.xs},
  dangerTitle: {...Typography.labelSm, color: Colors.error, marginTop: Spacing.lg, marginBottom: Spacing.xs},
  settingIcon: {fontSize: 20, marginRight: Spacing.md},
  settingText: {...Typography.body, color: Colors.textPrimary, flex: 1},
  settingArrow: {color: Colors.primary, fontSize: 20, fontWeight: 'bold'},
  toggleText: {...Typography.body, color: Colors.textPrimary},
  actionGap: {marginTop: Spacing.xl},
  deleteNote: {...Typography.micro, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 16},
  copyrightBox: {alignItems: 'center', marginTop: Spacing['3xl'], paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border},
  copyrightText: {...Typography.captionBold, color: Colors.textSecondary},
  copyrightSubText: {...Typography.caption, color: Colors.textTertiary, marginTop: Spacing.xs},
  cardSeparator: {height: 0},
  accountInfoRow: {paddingVertical: 12, paddingHorizontal: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  accountInfoLeft: {flexDirection: 'row', alignItems: 'center', flex: 1},
  accountInfoLabel: {...Typography.caption, color: Colors.textSecondary},
  accountInfoValue: {...Typography.body, color: Colors.textPrimary, fontWeight: '500', marginTop: 2},
  accountActionRow: {paddingVertical: 12, paddingHorizontal: 0, flexDirection: 'row', alignItems: 'center'},
  flex1: {flex: 1},
});
