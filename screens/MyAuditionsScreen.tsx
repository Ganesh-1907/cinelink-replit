import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image, ActivityIndicator, Alert} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, Button, EmptyState, Badge} from '../components/ui';
import {useApp} from '../src/context/AppContext';

export default function MyAuditionsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const {user, isAdmin, isApprovedDirector} = useApp();
  const [auditions, setAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin && !isApprovedDirector) {
      Alert.alert('Access Denied', 'Casting Director or Admin access required.', [
        {text: 'Go Back', onPress: () => navigation.goBack()}
      ]);
    }
  }, [isAdmin, isApprovedDirector, navigation]);

  const fetchAuditions = useCallback(async () => {
    try {
      const res = await api.get<{auditions: any[]}>('/auditions');
      // Filter auditions posted by the current user
      const filtered = (res.auditions || []).filter(
        (a: any) => (a.postedById || a.directorId) === user?.uid
      );
      setAuditions(filtered);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAuditions();
  }, [fetchAuditions]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchAuditions);
    return unsub;
  }, [navigation, fetchAuditions]);

  const deleteAudition = (audition: any) => {
    Alert.alert('Delete Audition', `Delete "${audition.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/auditions/${audition._id || audition.id}`);
            fetchAuditions();
          } catch {
            Alert.alert('Error', 'Could not delete.');
          }
        },
      },
    ]);
  };

  const togglePrivacy = async (audition: any) => {
    try {
      const newPrivacy = !audition.isPrivate;
      await api.put(`/auditions/${audition._id || audition.id}`, { isPrivate: newPrivacy });
      fetchAuditions();
    } catch {
      Alert.alert('Error', 'Could not update visibility.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="My Auditions" navigation={navigation} />
      <ScrollView contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + 40}]} showsVerticalScrollIndicator={false}>
        <View style={styles.buttonGroup}>
          <Button
            label="➕ Post Audition"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => {
              if (!isAdmin && auditions.length >= 1) {
                Alert.alert(
                  'Limit Reached',
                  'Directors can only post one audition. Please edit your existing audition or contact admin to upgrade.'
                );
              } else {
                navigation.navigate('PostAudition');
              }
            }}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} />
        ) : auditions.length === 0 ? (
          <EmptyState
            icon="🎭"
            title="No auditions posted yet"
            subtitle="Create your first audition posting to hire talent"
            actionLabel="Post Audition"
            onAction={() => navigation.navigate('PostAudition')}
          />
        ) : (
          auditions.map((audition: any) => (
            <TouchableOpacity
              key={audition._id || audition.id}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AuditionDetail', {audition})}
            >
              <View style={styles.auditionCard}>
                <View style={styles.cardRow}>
                  {audition.posterUrl ? (
                    <Image source={{uri: audition.posterUrl}} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Text style={{fontSize: 24}}>🎭</Text>
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{audition.title}</Text>
                    {audition.category ? <Text style={styles.category}>{audition.category}</Text> : null}
                    <Text style={styles.meta}>📍 {audition.location || 'Remote'} {audition.role ? `• ${audition.role}` : ''}</Text>
                    <View style={styles.statsRow}>
                      <Badge label={`${audition.applicationsCount || 0} applications`} variant="info" />
                      {audition.isPrivate ? (
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
                    onPress={() => navigation.navigate('AuditionDetail', {audition})}
                  />
                  <Button
                    label="Edit"
                    variant="outline"
                    size="sm"
                    style={{flex: 1}}
                    onPress={() => navigation.navigate('PostAudition', {audition})}
                  />
                  <Button
                    label={audition.isPrivate ? "🔒 Private" : "🔓 Public"}
                    variant={audition.isPrivate ? "secondary" : "outline"}
                    size="sm"
                    style={{flex: 1.2}}
                    onPress={() => togglePrivacy(audition)}
                  />
                  <Button
                    label="🗑"
                    variant="outline"
                    size="sm"
                    style={{flex: 0.4}}
                    onPress={() => deleteAudition(audition)}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.lg},
  buttonGroup: {
    marginBottom: Spacing.lg,
  },
  auditionCard: {
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
  category: {color: Colors.primary, ...Typography.caption, marginBottom: 2},
  meta: {color: Colors.textSecondary, ...Typography.caption, marginBottom: Spacing.xs},
  statsRow: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs},
  btnRow: {flexDirection: 'row', gap: Spacing.xs},
});
