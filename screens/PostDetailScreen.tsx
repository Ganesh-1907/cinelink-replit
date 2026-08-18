import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Image, Dimensions,
  Linking, TouchableOpacity, Alert
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

          {post.creatorPhone ? (
            <View style={styles.postContactRow}>
              <Text style={[styles.postContactNumber, {color: Colors.textSecondary}]} numberOfLines={1}>
                📱 {post.creatorPhone}
              </Text>
              <TouchableOpacity
                style={[styles.postContactIconBtn, {backgroundColor: Colors.primary + '15'}]}
                activeOpacity={0.7}
                onPress={() => {
                  const cleanPhone = post.creatorPhone.replace(/[^0-9]/g, '');
                  Linking.openURL(`tel:${cleanPhone}`).catch(() => 
                    Alert.alert('Error', 'Could not open dialer.')
                  );
                }}>
                <Text style={{fontSize: 12}}>📞</Text>
                <Text style={[styles.postContactIconText, {color: Colors.primary}]}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.postContactIconBtn, {backgroundColor: '#25D36620'}]}
                activeOpacity={0.7}
                onPress={() => {
                  const cleanPhone = post.creatorPhone.replace(/[^0-9]/g, '');
                  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                  Linking.openURL(`whatsapp://send?phone=${formattedPhone}`).catch(() => 
                    Alert.alert('WhatsApp Not Installed', 'Please install WhatsApp to chat.')
                  );
                }}>
                <Text style={{fontSize: 12}}>💬</Text>
                <Text style={[styles.postContactIconText, {color: '#25D366'}]}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
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
  postContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xs,
    gap: Spacing.sm,
  },
  postContactNumber: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  postContactIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    gap: 4,
  },
  postContactIconText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
