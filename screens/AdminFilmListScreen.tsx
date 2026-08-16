import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Image} from 'react-native';
import api from '../src/api/client';
import {Colors, Spacing, Radius} from '../src/theme';
import {Header, EmptyState} from '../components/ui';
import {useTheme} from '../src/context/ThemeContext';

export default function AdminFilmListScreen({route, navigation}: any) {
  const {isDark} = useTheme();
  const [films, setFilms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/films').then(res => {
      let list = res.films || res.data || [];
      if (Array.isArray(res)) list = res;
      setFilms(list);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="All Films" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 40}} />
        ) : films.length === 0 ? (
          <EmptyState icon="🎬" title="No films found" />
        ) : films.map((f: any) => {
          const imgUri = f.posterUrl || f.imageUrl;
          return (
          <TouchableOpacity key={f._id || f.id} style={styles.card} activeOpacity={0.7} onPress={() => navigation.navigate('FilmDetail', {film: f})}>
            {imgUri ? <Image source={{uri: imgUri}} style={styles.thumb} /> : <View style={[styles.thumb, {backgroundColor: Colors.cardElevated, justifyContent: 'center', alignItems: 'center'}]}><Text style={{fontSize: 28}}>🎬</Text></View>}
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>{f.title || 'Untitled'}</Text>
              <Text style={styles.meta}>{f.genre || 'Drama'} · {f.duration ? `${f.duration} min` : ''}</Text>
              <Text style={styles.meta}>By {f.creatorName || f.directorName || 'Unknown'}</Text>
            </View>
          </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.md},
  card: {flexDirection: 'row', backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight, alignItems: 'center'},
  thumb: {width: 70, height: 50, borderRadius: Radius.sm},
  info: {flex: 1, marginLeft: Spacing.sm},
  title: {color: Colors.textPrimary, fontWeight: '600', fontSize: 14},
  meta: {color: Colors.textSecondary, fontSize: 11, marginTop: 2},
});
