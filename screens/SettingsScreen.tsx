import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {useTheme} from '../src/context/ThemeContext';
import {useApp} from '../src/context/AppContext';
import {Card, Button, Header, PopupModal} from '../components/ui';

export default function SettingsScreen({navigation}: any) {
  const {isDark, toggleTheme} = useTheme();
  const {signOut, refreshUserData, user, isAdmin, isApprovedDirector} = useApp();
  const insets = useSafeAreaInsets();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{field: string; newVal: boolean; label: string} | null>(null);
  const [confirmInput, setConfirmInput] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.get<{user: any}>('/users/profile');
      const data = res.user;
      if (data) {
        if (data.notificationsEnabled !== undefined) setNotificationsEnabled(data.notificationsEnabled);
        if (data.profileVisible !== undefined) setProfileVisible(data.profileVisible);
      }
    } catch (e) {
      console.log('Failed to load settings:', e);
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const updateSetting = async (field: string, val: boolean) => {
    try {
      await api.put('/users/profile', {[field]: val});
      await refreshUserData();
    } catch (e) {
      console.log('Save failed:', e);
    }
  };

  const openConfirm = (field: string, newVal: boolean, label: string) => {
    setConfirmAction({field, newVal, label});
    setConfirmInput('');
    setConfirmModal(true);
  };

  const executeConfirm = async () => {
    if (!confirmAction) return;
    const {field, newVal} = confirmAction;
    if (field === 'notificationsEnabled') {
      setNotificationsEnabled(newVal);
    } else if (field === 'profileVisible') {
      setProfileVisible(newVal);
    }
    await updateSetting(field, newVal);
    setConfirmModal(false);
    setConfirmAction(null);
  };

  const [deleting, setDeleting] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const openDeleteConfirm = () => {
    setDeleteConfirm('');
    setDeleteModal(true);
  };

  const executeDelete = async () => {
    setDeleting(true);
    try {
      await api.delete('/users/account');
      setDeleteModal(false);
    } catch (e: any) {
      console.log('DELETE ERROR:', e);
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    openConfirm('logout', false, 'Logout');
  };

  const getConfirmWord = () => {
    if (!confirmAction) return '';
    switch (confirmAction.field) {
      case 'notificationsEnabled': return confirmAction.newVal ? 'OFF' : 'ON';
      case 'profileVisible': return confirmAction.newVal ? 'PRIVATE' : 'PUBLIC';
      case 'logout': return 'LOGOUT';
      default: return '';
    }
  };

  const getConfirmTitle = () => {
    if (!confirmAction) return '';
    switch (confirmAction.field) {
      case 'notificationsEnabled':
        return confirmAction.newVal ? 'Turn Off Notifications?' : 'Turn On Notifications?';
      case 'profileVisible':
        return confirmAction.newVal ? 'Make Profile Private?' : 'Make Profile Public?';
      case 'logout': return 'Logout?';
      default: return '';
    }
  };

  const getConfirmMessage = () => {
    if (!confirmAction) return '';
    switch (confirmAction.field) {
      case 'notificationsEnabled':
        return confirmAction.newVal
          ? 'You will stop receiving push notifications. Type OFF to confirm.'
          : 'You will start receiving push notifications again. Type ON to confirm.';
      case 'profileVisible':
        return confirmAction.newVal
          ? 'Your profile will be hidden from Discover and search. Type PRIVATE to confirm.'
          : 'Your profile will be visible to everyone in Discover and search. Type PUBLIC to confirm.';
      case 'logout':
        return 'Are you sure you want to logout? Type LOGOUT to confirm.';
      default: return '';
    }
  };

  const handleActionConfirm = () => {
    if (confirmAction?.field === 'logout') {
      setConfirmModal(false);
      setConfirmAction(null);
      signOut();
      return;
    }
    executeConfirm();
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
                <TouchableOpacity style={styles.accountActionRow} onPress={() => navigation.navigate('ForgotPassword')}>
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
              <Switch value={notificationsEnabled} onValueChange={() => openConfirm('notificationsEnabled', !notificationsEnabled, 'Push Notifications')} trackColor={{false: Colors.borderLight, true: Colors.primary}} thumbColor={Colors.textPrimary} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Privacy</Text>
          <View>
            <View style={styles.accountInfoRow}>
              <View style={styles.accountInfoLeft}>
                <Text style={styles.settingIcon}>👁</Text>
                <View><Text style={styles.toggleText}>Profile Visible to Others</Text></View>
              </View>
              <Switch value={profileVisible} onValueChange={() => openConfirm('profileVisible', !profileVisible, 'Profile Visibility')} trackColor={{false: Colors.borderLight, true: Colors.primary}} thumbColor={Colors.textPrimary} />
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
            <Button label={deleting ? '' : '🗑 Delete My Account & Data'} onPress={openDeleteConfirm} variant="danger" fullWidth disabled={deleting} loading={deleting} />
            <Text style={styles.deleteNote}>As per India's DPDP Act 2023, you have the right to delete all your personal data from CineLink.{'\n'}⚠️ You may need to sign out and sign back in before deleting.</Text>
          </Card>

          <View style={styles.copyrightBox}>
            <Text style={styles.copyrightText}>© 2026 CineLink. All rights reserved.</Text>
            <Text style={styles.copyrightSubText}>India's Cinema Network</Text>
          </View>
        </View>
      </ScrollView>

      <PopupModal
        visible={confirmModal}
        onClose={() => { setConfirmModal(false); setConfirmAction(null); }}
        title={getConfirmTitle()}
        message={getConfirmMessage()}
        variant={confirmAction?.field === 'logout' ? 'warning' : 'confirm'}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        confirmDisabled={confirmInput !== getConfirmWord()}
        onConfirm={handleActionConfirm}
        onCancel={() => { setConfirmModal(false); setConfirmAction(null); }}>
        <TextInput
          style={styles.popupInput}
          placeholder={`Type "${getConfirmWord()}" to confirm`}
          placeholderTextColor={Colors.textTertiary}
          value={confirmInput}
          onChangeText={setConfirmInput}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </PopupModal>

      <PopupModal
        visible={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Account?"
        message="This is permanent. Type DELETE to confirm."
        variant="ban"
        confirmLabel="Delete Forever"
        cancelLabel="Cancel"
        confirmDisabled={deleteConfirm !== 'DELETE'}
        confirmVariant="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteModal(false)}>
        <TextInput
          style={styles.popupInput}
          placeholder='Type "DELETE" to confirm'
          placeholderTextColor={Colors.textTertiary}
          value={deleteConfirm}
          onChangeText={setDeleteConfirm}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </PopupModal>
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
  popupInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
  },
});
