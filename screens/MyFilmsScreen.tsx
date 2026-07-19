import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image, ActivityIndicator, Alert} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Card, EmptyState, Chip} from '../components/ui';

export default function MyFilmsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [films, setFilms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFilms = useCallback(async () => {
    try {
      const res = await api.get<{films: any[]}>('/films');
      setFilms(res.films || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFilms(); }, [fetchFilms]);
  useEffect(() => { const unsub = navigation.addListener('focus', fetchFilms); return unsub; }, [navigation, fetchFilms]);

  const deleteFilm = (film: any) => {
    Alert.alert('Delete Film', `Delete "${film.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/films/${film._id || film.id}`); fetchFilms(); }
        catch { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="My Films" navigation={navigation} />
      <ScrollView contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + 40}]}>
        {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} /> : films.length === 0 ? (
          <EmptyState icon="🎬" title="No films yet" subtitle="Upload your first short film" actionLabel="Upload Film" onAction={() => navigation.navigate('UploadFilm')} />
        ) : films.map((film: any) => (
          <TouchableOpacity key={film._id || film.id} onPress={() => navigation.navigate('FilmDetail', {filmId: film._id || film.id, film})}>
            <Card variant="elevated" padding={Spacing.md} style={styles.card}>
              <View style={styles.cardRow}>
                {film.posterUrl ? <Image source={{uri: film.posterUrl}} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbPlaceholder]}><Text style={{fontSize: 24}}>🎬</Text></View>}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{film.title}</Text>
                  <Text style={styles.genre}>{film.genre || 'No genre'}</Text>
                  <Text style={styles.meta}>🎥 {film.duration || '?'} min</Text>
                  <View style={styles.statsRow}>
                    <Text style={styles.stat}>❤️ {film.likes || 0}</Text>
                    <Text style={styles.stat}>💬 {film.commentsCount || 0}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.btnRow}>
                <Button label="View" variant="outline" size="sm" style={{flex: 1}} onPress={() => navigation.navigate('FilmDetail', {filmId: film._id || film.id, film})} />
                <Button label="Delete" variant="danger" size="sm" style={{flex: 0.4}} onPress={() => deleteFilm(film)} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.lg},
  card: {marginBottom: Spacing.md},
  cardRow: {flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md},
  thumb: {width: 80, height: 80, borderRadius: Radius.md},
  thumbPlaceholder: {backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center'},
  cardInfo: {flex: 1},
  cardTitle: {color: Colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 2},
  genre: {color: Colors.primary, ...Typography.caption, marginBottom: 2},
  meta: {color: Colors.textSecondary, ...Typography.caption, marginBottom: Spacing.xs},
  statsRow: {flexDirection: 'row', gap: Spacing.md},
  stat: {color: Colors.textSecondary, ...Typography.micro},
  btnRow: {flexDirection: 'row', gap: Spacing.sm},
});
