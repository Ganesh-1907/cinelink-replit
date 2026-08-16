import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  SafeAreaView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, Card, Avatar, Button, EmptyState} from '../components/ui';
import {useTheme} from '../src/context/ThemeContext';
import ImageViewing from 'react-native-image-viewing';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface MovieData {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date: string;
  overview: string;
  popularity: number;
  original_language: string;
  genres?: {id: number; name: string}[];
  runtime?: number;
  tagline?: string;
  homepage?: string;
  imdb_id?: string;
  production_companies?: {name: string}[];
  credits?: {
    cast: {name: string; character: string; profile_path: string | null}[];
    crew: {name: string; job: string}[];
  };
}

export default function MovieDetails({route, navigation}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const {movieId, movie: passedMovie} = route.params;
  const [movie, setMovie] = useState<MovieData | null>(passedMovie || null);
  const [loading, setLoading] = useState(!passedMovie);
  const [error, setError] = useState('');
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<any[]>([]);

  const openImageViewer = (imageUrl: string) => {
    setViewerImages([{ uri: imageUrl }]);
    setViewerVisible(true);
  };

  useEffect(() => {
    if (movieId && !passedMovie) {
      fetchMovieDetails();
    }
  }, [movieId]);

  const fetchMovieDetails = async () => {
    setLoading(true);
    try {
      if (movieId) {
        const result = await api.get(`/tmdb/movie/${movieId}`);
        setMovie(result.movie as MovieData);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load movie details');
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {justifyContent: 'center', alignItems: 'center'},
        ]}>
        <StatusBar
          barStyle={Colors.background !== '#FFFFFF' ? 'light-content' : 'dark-content'}
          backgroundColor={Colors.background}
        />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{color: Colors.textSecondary, marginTop: Spacing.md}}>
          Loading movie details...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          {justifyContent: 'center', alignItems: 'center', padding: Spacing.xl},
        ]}>
        <StatusBar
          barStyle={Colors.background !== '#FFFFFF' ? 'light-content' : 'dark-content'}
          backgroundColor={Colors.background}
        />
        <Text style={{fontSize: 48, marginBottom: Spacing.md}}>🎬</Text>
        <Text style={{color: Colors.error, fontSize: 16, textAlign: 'center'}}>
          {error}
        </Text>
      </View>
    );
  }

  if (!movie) {
    return (
      <View
        style={[
          styles.container,
          {justifyContent: 'center', alignItems: 'center'},
        ]}>
        <Text style={{color: Colors.textSecondary}}>
          No movie data available
        </Text>
      </View>
    );
  }

  const genreNames = movie.genres?.map(g => g.name).join(', ') || 'N/A';
  const castList = movie.credits?.cast?.slice(0, 10) || [];
  const director = movie.credits?.crew?.find(c => c.job === 'Director')?.name;
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : 'N/A';

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: Colors.background}}>
      <Header title="Movie Details" navigation={navigation} transparent />
      <ScrollView style={styles.container}>
        <StatusBar
          barStyle={Colors.background !== '#FFFFFF' ? 'light-content' : 'dark-content'}
          backgroundColor={Colors.background}
        />

        {movie.backdrop_path ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => openImageViewer(`${IMAGE_BASE_URL}${movie.backdrop_path}`)}>
            <Image
              source={{uri: `${IMAGE_BASE_URL}${movie.backdrop_path}`}}
              style={styles.backdrop}
            />
          </TouchableOpacity>
        ) : null}

        <View style={styles.headerRow}>
          {movie.poster_path ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => openImageViewer(`${IMAGE_BASE_URL}${movie.poster_path}`)}>
              <Image
                source={{uri: `${IMAGE_BASE_URL}${movie.poster_path}`}}
                style={styles.poster}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.posterPlaceholder}>
              <Text style={styles.posterPlaceholderText}>🎬</Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{movie.title}</Text>
            {movie.tagline ? (
              <Text style={styles.tagline}>{movie.tagline}</Text>
            ) : null}
            <View style={styles.row}>
              <Text style={styles.rating}>
                ⭐ {movie.vote_average?.toFixed(1) || 'N/A'}
              </Text>
              <Text style={styles.date}>
                📅 {movie.release_date?.split('-')[0] || 'N/A'}
              </Text>
            </View>
            <Text style={styles.meta}>{genreNames}</Text>
            <Text style={styles.meta}>{runtime}</Text>
            {director ? (
              <Text style={styles.meta}>Directed by {director}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.content}>
          {movie.overview ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.overview}>{movie.overview}</Text>
            </View>
          ) : null}

          {castList.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cast</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.castRow}>
                {castList.map((actor, i) => (
                  <View key={i} style={styles.castCard}>
                    {actor.profile_path ? (
                      <Image
                        source={{uri: `${IMAGE_BASE_URL}${actor.profile_path}`}}
                        style={styles.castPhoto}
                      />
                    ) : (
                      <View
                        style={[styles.castPhoto, styles.castPhotoPlaceholder]}>
                        <Text style={{fontSize: 24}}>🎭</Text>
                      </View>
                    )}
                    <Text style={styles.castName} numberOfLines={1}>
                      {actor.name}
                    </Text>
                    <Text style={styles.castRole} numberOfLines={1}>
                      {actor.character}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <Card
              variant="elevated"
              style={styles.statBox}
              padding={Spacing.md}>
              <Text style={styles.statValue}>{movie.vote_count || 0}</Text>
              <Text style={styles.statLabel}>Votes</Text>
            </Card>
            <Card
              variant="elevated"
              style={styles.statBox}
              padding={Spacing.md}>
              <Text style={styles.statValue}>
                {movie.popularity?.toFixed(0) || 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Popularity</Text>
            </Card>
            <Card
              variant="elevated"
              style={styles.statBox}
              padding={Spacing.md}>
              <Text style={styles.statValue}>
                {movie.original_language?.toUpperCase() || 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Language</Text>
            </Card>
          </View>

          {movie.homepage ? (
            <Button
              label="🌐 Visit Homepage"
              onPress={() => openLink(movie.homepage!)}
              variant="outline"
              size="md"
              fullWidth
            />
          ) : null}

          {movie.imdb_id ? (
            <Button
              label="🎬 View on IMDb"
              onPress={() =>
                openLink(`https://www.imdb.com/title/${movie.imdb_id}`)
              }
              variant="outline"
              size="md"
              fullWidth
            />
          ) : null}

          <View style={{height: insets.bottom + Spacing.xl}} />
        </View>
      </ScrollView>
      <ImageViewing
        images={viewerImages}
        imageIndex={0}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        backgroundColor="black"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  backdrop: {width: '100%', height: 200, position: 'absolute', opacity: 0.3},
  headerRow: {
    flexDirection: 'row',
    padding: Spacing.screenH,
    paddingTop: Spacing.sm,
    gap: Spacing.lg,
  },
  poster: {
    width: 130,
    height: 195,
    borderRadius: Radius.md,
    resizeMode: 'cover',
  },
  posterPlaceholder: {
    width: 130,
    height: 195,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {fontSize: 48},
  headerInfo: {flex: 1, justifyContent: 'center'},
  title: {...Typography.h2, marginBottom: Spacing.xs},
  tagline: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  row: {flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xs},
  rating: {...Typography.body, color: Colors.warning, fontWeight: '700'},
  date: {...Typography.body, color: Colors.textSecondary},
  meta: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  content: {padding: Spacing.screenH, paddingTop: 0, gap: Spacing['3xl']},
  section: {gap: Spacing.md},
  sectionTitle: {...Typography.h3, color: Colors.primary},
  overview: {...Typography.body, color: Colors.textPrimary, lineHeight: 24},
  castRow: {marginTop: Spacing.xs},
  castCard: {marginRight: Spacing.lg, alignItems: 'center', width: 90},
  castPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: Spacing.xs,
  },
  castPhotoPlaceholder: {
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  castName: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  castRole: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  statBox: {flex: 1, alignItems: 'center'},
  statValue: {...Typography.h2},
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
