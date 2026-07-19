import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {useTheme} from '../src/context/ThemeContext';
import {Card, Button, Header} from '../components/ui';

export default function SettingsScreen({navigation}: any) {
  const {isDark, toggleTheme} = useTheme();
  const insets = useSafeAreaInsets();
  const user = auth().currentUser;

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);

  const toggleNotifications = async (val: boolean) => {
    setNotificationsEnabled(val);
    try {
      await firestore()
        .collection('users')
        .doc(user?.uid)
        .update({notificationsEnabled: val});
    } catch (e) {}
  };

  const toggleEmailNotifications = async (val: boolean) => {
    setEmailNotifications(val);
    try {
      await firestore()
        .collection('users')
        .doc(user?.uid)
        .update({emailNotifications: val});
    } catch (e) {}
  };

  const toggleProfileVisible = async (val: boolean) => {
    setProfileVisible(val);
    try {
      await firestore()
        .collection('users')
        .doc(user?.uid)
        .update({profileVisible: val});
    } catch (e) {}
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
              const uid = user?.uid;
              if (!uid) {
                return;
              }

              // Delete user document
              await firestore().collection('users').doc(uid).delete();

              // Delete user's posts
              const posts = await firestore()
                .collection('feedPosts')
                .where('userId', '==', uid)
                .get();
              for (const doc of posts.docs) {
                await doc.ref.delete();
              }

              // Delete user's auditions
              const auditions = await firestore()
                .collection('auditions')
                .where('directorId', '==', uid)
                .get();
              for (const doc of auditions.docs) {
                await doc.ref.delete();
              }

              // Delete user's applications
              const applications = await firestore()
                .collection('applications')
                .where('applicantId', '==', uid)
                .get();
              for (const doc of applications.docs) {
                await doc.ref.delete();
              }

              // Delete saved auditions
              const saved = await firestore()
                .collection('savedAuditions')
                .where('userId', '==', uid)
                .get();
              for (const doc of saved.docs) {
                await doc.ref.delete();
              }

              // Delete notifications
              const notifications = await firestore()
                .collection('notifications')
                .where('userId', '==', uid)
                .get();
              for (const doc of notifications.docs) {
                await doc.ref.delete();
              }

              // Finally delete auth account
              await auth().currentUser?.delete();

              Alert.alert('✅ Done', 'Your account has been deleted.');
            } catch (e: any) {
              console.log('DELETE ERROR:', e);
              if (e?.code === 'auth/requires-recent-login') {
                Alert.alert(
                  'Sign In Required',
                  'For security, please sign out and sign back in before deleting your account.',
                  [
                    {
                      text: 'Sign Out Now',
                      style: 'destructive',
                      onPress: () => auth().signOut(),
                    },
                    {text: 'Cancel', style: 'cancel'},
                  ],
                );
              } else {
                Alert.alert(
                  'Error',
                  'Could not delete account. Please try again.',
                );
              }
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const changePassword = () => {
    if (!user?.email) {
      return;
    }
    Alert.alert(
      'Reset Password',
      `A reset email will be sent to ${user.email}`,
      [
        {
          text: 'Send',
          onPress: async () => {
            await auth().sendPasswordResetEmail(user.email!);
            Alert.alert('Done!', 'Check your email for reset link.');
          },
        },
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Logout', style: 'destructive', onPress: () => auth().signOut()},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Settings" navigation={navigation} />
      <ScrollView style={styles.container}>
        <View style={[styles.section, {paddingBottom: insets.bottom + 40}]}>
          {/* APPEARANCE */}
          <Text style={styles.sectionTitle}>Appearance</Text>

          <TouchableOpacity style={styles.settingRow} onPress={toggleTheme}>
            <Text style={styles.settingIcon}>{isDark ? '🌙' : '☀️'}</Text>
            <Text style={styles.settingText}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          {/* ACCOUNT */}
          <Text style={styles.sectionTitle}>Account</Text>

          <Card variant="elevated" padding={Spacing.lg}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </Card>

          <TouchableOpacity style={styles.settingRow} onPress={changePassword}>
            <Text style={styles.settingIcon}>🔑</Text>
            <Text style={styles.settingText}>Change Password</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.settingIcon}>👤</Text>
            <Text style={styles.settingText}>Edit Profile</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          {/* NOTIFICATIONS */}
          <Text style={styles.sectionTitle}>Notifications</Text>

          <Card variant="elevated" padding={Spacing.lg}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>🔔</Text>
                <Text style={styles.toggleText}>Push Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{false: Colors.borderLight, true: Colors.primary}}
                thumbColor={Colors.textPrimary}
              />
            </View>
          </Card>

          <Card variant="elevated" padding={Spacing.lg}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>📧</Text>
                <Text style={styles.toggleText}>Email Notifications</Text>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={toggleEmailNotifications}
                trackColor={{false: Colors.borderLight, true: Colors.primary}}
                thumbColor={Colors.textPrimary}
              />
            </View>
          </Card>

          {/* PRIVACY */}
          <Text style={styles.sectionTitle}>Privacy</Text>

          <Card variant="elevated" padding={Spacing.lg}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>👁</Text>
                <Text style={styles.toggleText}>Profile Visible to Others</Text>
              </View>
              <Switch
                value={profileVisible}
                onValueChange={toggleProfileVisible}
                trackColor={{false: Colors.borderLight, true: Colors.primary}}
                thumbColor={Colors.textPrimary}
              />
            </View>
          </Card>

          {/* LEGAL */}
          <Text style={styles.sectionTitle}>Legal</Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.settingIcon}>🔒</Text>
            <Text style={styles.settingText}>Privacy Policy</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Terms')}>
            <Text style={styles.settingIcon}>📄</Text>
            <Text style={styles.settingText}>Terms & Conditions</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          {/* ABOUT */}
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingIcon}>📱</Text>
            <Text style={styles.settingText}>App Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingIcon}>🎬</Text>
            <Text style={styles.settingText}>CineLink</Text>
            <Text style={styles.settingValue}>India's Cinema Network</Text>
          </View>

          {/* LOGOUT */}
          <View style={styles.actionGap}>
            <Button
              label="🚪 Logout"
              onPress={handleLogout}
              variant="outline"
              fullWidth
            />
          </View>

          {/* DANGER ZONE — DELETE ACCOUNT */}
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Card variant="outlined" padding={Spacing.lg}>
            <Button
              label={deleting ? '' : '🗑 Delete My Account & Data'}
              onPress={deleteAccount}
              variant="danger"
              fullWidth
              disabled={deleting}
              loading={deleting}
            />
            <Text style={styles.deleteNote}>
              As per India's DPDP Act 2023, you have the right to delete all
              your personal data from CineLink.
              {'\n'}⚠️ You may need to sign out and sign back in before
              deleting.
            </Text>
          </Card>

          {/* COPYRIGHT */}
          <View style={styles.copyrightBox}>
            <Text style={styles.copyrightText}>
              © 2026 CineLink. All rights reserved.
            </Text>
            <Text style={styles.copyrightSubText}>India's Cinema Network</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  container: {flex: 1, backgroundColor: Colors.background},
  section: {padding: Spacing.lg, paddingBottom: Spacing['3xl']},

  sectionTitle: {
    ...Typography.labelSm,
    color: Colors.primary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  dangerTitle: {
    ...Typography.labelSm,
    color: Colors.error,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },

  infoLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  infoValue: {...Typography.body, color: Colors.textPrimary, fontWeight: '500'},

  settingRow: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {fontSize: 20, marginRight: Spacing.md},
  settingText: {...Typography.body, color: Colors.textPrimary, flex: 1},
  settingArrow: {color: Colors.primary, fontSize: 20, fontWeight: 'bold'},
  settingValue: {...Typography.bodySm, color: Colors.textSecondary},

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {flexDirection: 'row', alignItems: 'center'},
  toggleIcon: {fontSize: 20, marginRight: Spacing.md},
  toggleText: {...Typography.body, color: Colors.textPrimary},

  actionGap: {marginTop: Spacing.xl},
  deleteNote: {
    ...Typography.micro,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
  copyrightBox: {
    alignItems: 'center',
    marginTop: Spacing['3xl'],
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  copyrightText: {...Typography.captionBold, color: Colors.textSecondary},
  copyrightSubText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
});
