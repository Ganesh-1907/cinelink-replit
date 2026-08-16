import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, Button, EmptyState, Badge, PopupModal} from '../components/ui';
import {useApp} from '../src/context/AppContext';
import {useTheme} from '../src/context/ThemeContext';

export default function MyRoomsScreen({navigation}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const {user, isAdmin, isApprovedDirector} = useApp();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Alert modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState<'success' | 'warning' | 'info' | 'confirm'>('info');
  const [confirmLabel, setConfirmLabel] = useState('OK');
  const [cancelLabel, setCancelLabel] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);

  const showAlert = (
    title: string,
    message: string,
    variant: 'success' | 'warning' | 'info' | 'confirm' = 'info',
    confLabel: string = 'OK',
    canLabel: string = '',
    onConf: (() => void) | null = null
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVariant(variant);
    setConfirmLabel(confLabel);
    setCancelLabel(canLabel);
    setOnConfirmAction(() => onConf);
    setAlertVisible(true);
  };

  useEffect(() => {
    if (!isAdmin && !isApprovedDirector) {
      showAlert(
        'Access Denied',
        'Casting Director or Admin access required.',
        'warning',
        'Go Back',
        '',
        () => navigation.goBack()
      );
    }
  }, [isAdmin, isApprovedDirector, navigation]);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get<{projects: any[]}>(`/projects?createdBy=${user?.id || user?.uid}`);
      setRooms(res.projects || []);
    } catch (e) {
      console.log('Error fetching rooms:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchRooms);
    return unsub;
  }, [navigation, fetchRooms]);

  const deleteRoom = (room: any) => {
    showAlert(
      'Delete Room',
      `Are you sure you want to delete "${room.title}"? This will notify all members and delete the room permanently.`,
      'warning',
      'Delete',
      'Cancel',
      async () => {
        try {
          await api.delete(`/projects/${room._id || room.id}`);
          fetchRooms();
        } catch (err: any) {
          showAlert('Error', err.message || 'Could not delete.', 'warning');
        }
      }
    );
  };

  const toggleVisibility = async (room: any) => {
    try {
      const newVisibility = room.visibility === 'private' ? 'public' : 'private';
      await api.put(`/projects/${room._id || room.id}`, { visibility: newVisibility });
      fetchRooms();
    } catch {
      showAlert('Error', 'Could not update visibility.', 'warning');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="My Project Rooms" navigation={navigation} />
      <ScrollView contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + 40}]} showsVerticalScrollIndicator={false}>
        <View style={styles.buttonGroup}>
          <Button
            label="➕ Create CineLink Room"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => navigation.navigate('CreateProject')}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} />
        ) : rooms.length === 0 ? (
          <EmptyState
            icon="🚪"
            title="No project rooms created yet"
            subtitle="Create your first room to manage roles and invite crew"
            actionLabel="Create Room"
            onAction={() => navigation.navigate('CreateProject')}
          />
        ) : (
          rooms.map((room: any) => (
            <TouchableOpacity
              key={room._id || room.id}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ProjectDetail', {projectId: room._id || room.id})}
            >
              <View style={styles.roomCard}>
                <View style={styles.cardRow}>
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={{fontSize: 24}}>{room.visibility === 'private' ? '🔒' : '🌐'}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{room.title}</Text>
                    {room.type ? <Text style={styles.type}>{room.type}</Text> : null}
                    <Text style={styles.meta}>📍 {room.location || 'Remote'} {room.language ? `• ${room.language}` : ''}</Text>
                    <View style={styles.statsRow}>
                      <Badge label={`${room.members?.length || 1} members`} variant="info" />
                      {room.visibility === 'private' ? (
                        <Badge label="Private" variant="error" />
                      ) : (
                        <Badge label="Public" variant="success" />
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.btnRow}>
                  <Button
                    label="View"
                    variant="outline"
                    size="sm"
                    style={{flex: 1}}
                    onPress={() => navigation.navigate('ProjectDetail', {projectId: room._id || room.id})}
                  />
                  <Button
                    label="Edit"
                    variant="outline"
                    size="sm"
                    style={{flex: 1}}
                    onPress={() => navigation.navigate('CreateProject', {project: room})}
                  />
                  <Button
                    label={room.visibility === 'private' ? "🔒 Private" : "🌐 Public"}
                    variant={room.visibility === 'private' ? "secondary" : "outline"}
                    size="sm"
                    style={{flex: 1.2}}
                    onPress={() => toggleVisibility(room)}
                  />
                  <Button
                    label="🗑"
                    variant="outline"
                    size="sm"
                    style={{flex: 0.4}}
                    onPress={() => deleteRoom(room)}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <PopupModal
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        title={alertTitle}
        message={alertMessage}
        variant={alertVariant === 'confirm' ? 'confirm' : alertVariant}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel || undefined}
        onConfirm={() => {
          setAlertVisible(false);
          if (onConfirmAction) {
            onConfirmAction();
          }
        }}
        onCancel={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.lg},
  buttonGroup: {
    marginBottom: Spacing.lg,
  },
  roomCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  cardRow: {flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md},
  thumb: {width: 80, height: 80, borderRadius: Radius.md, resizeMode: 'cover'},
  thumbPlaceholder: {backgroundColor: Colors.cardElevated, justifyContent: 'center', alignItems: 'center'},
  cardInfo: {flex: 1},
  cardTitle: {color: Colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 2},
  type: {color: Colors.primary, ...Typography.caption, marginBottom: 2},
  meta: {color: Colors.textSecondary, ...Typography.caption, marginBottom: Spacing.xs},
  statsRow: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs},
  btnRow: {flexDirection: 'row', gap: Spacing.xs},
});
