import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Image, Dimensions,
} from 'react-native';
import {Colors, Spacing, Radius} from '../src/theme';
import {Header, Avatar} from '../components/ui';
import {useTheme} from '../src/context/ThemeContext';

const SCREEN_W = Dimensions.get('window').width;

export default function PostDetailScreen({route, navigation}: any) {
  const {isDark} = useTheme();
  const post = route?.params?.post;
  if (!post) { navigation.goBack(); return null; }

  const imgUri = post.imageUrl || post.mediaUrl;
  const isAnnouncement = post.postType === 'announcement';

  return (
    <SafeAreaView style={styles.safe}>
      <Header title={isAnnouncement ? 'Announcement' : 'Post'} navigation={navigation} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.header}>
            {isAnnouncement ? (
              <View style={styles.announceBadge}><Text style={{fontSize: 22}}>📢</Text></View>
            ) : (
              <Avatar name={post.creatorName || 'U'} uri={post.creatorPhotoUrl} size="lg" />
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{isAnnouncement ? 'Announcement' : (post.creatorName || 'Community')}</Text>
              <Text style={styles.meta}>
                {post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-IN', {year: 'numeric', month: 'long', day: 'numeric'}) : ''}
                {post.creatorRole && !isAnnouncement ? ` · ${post.creatorRole}` : ''}
              </Text>
            </View>
          </View>

          {imgUri ? (
            <Image source={{uri: imgUri}} style={styles.image} resizeMode="contain" />
          ) : null}

          {post.text ? (
            <Text style={styles.text}>{post.text}</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},
  card: {padding: Spacing.lg},
  header: {flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg},
  headerInfo: {flex: 1, marginLeft: Spacing.sm},
  name: {color: Colors.textPrimary, fontSize: 16, fontWeight: '700'},
  meta: {color: Colors.textTertiary, fontSize: 12, marginTop: 2},
  image: {width: SCREEN_W - Spacing.lg * 2, height: SCREEN_W - Spacing.lg * 2, borderRadius: Radius.md, marginBottom: Spacing.lg, backgroundColor: Colors.card},
  text: {color: Colors.textPrimary, fontSize: 15, lineHeight: 24},
  announceBadge: {width: 48, height: 48, borderRadius: Radius.sm, backgroundColor: Colors.errorFaint, alignItems: 'center', justifyContent: 'center'},
});
