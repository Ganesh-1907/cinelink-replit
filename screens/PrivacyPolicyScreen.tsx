import React from 'react';
import {View, Text, StyleSheet, ScrollView, SafeAreaView} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Card} from '../components/ui';

export default function PrivacyPolicyScreen({navigation}: any) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Privacy Policy" navigation={navigation} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.content,
            {paddingBottom: insets.bottom + Spacing.xxl},
          ]}>
          <Text style={styles.lastUpdated}>Last updated: June 2026</Text>

          <Card variant="flat" padding={Spacing.lg} style={styles.introCard}>
            <Text style={styles.intro}>
              Welcome to CineLink — India's Cinema Network. We are committed to
              protecting your personal information and your right to privacy.
              This Privacy Policy explains how we collect, use, and share your
              information when you use our app.
            </Text>
          </Card>

          <Section
            num="1"
            title="Information We Collect"
            text="We collect information you provide directly to us, including:"
            bullets={[
              'Name and email address when you register',
              'Profile information such as role, bio, location, and profile photo',
              'Portfolio photos and work links you upload',
              'Messages you send to other users',
              'Audition applications and contest entries you submit',
              'Payment information processed securely through Razorpay',
              'Device information and usage data for app improvement',
            ]}
          />

          <Section
            num="2"
            title="How We Use Your Information"
            text="We use the information we collect to:"
            bullets={[
              'Create and manage your CineLink account',
              'Connect you with directors, actors, and other film professionals',
              'Send notifications about auditions, messages, and updates',
              'Process payments for contest entries and film uploads',
              'Improve our app features and user experience',
              'Prevent fraud, spam, and abuse on the platform',
              'Comply with legal obligations',
            ]}
          />

          <Section
            num="3"
            title="Information Sharing"
            text="We do not sell your personal information to third parties. We may share your information only in the following circumstances:"
            bullets={[
              'With other users as part of the networking features (name, role, profile photo)',
              'With Razorpay for secure payment processing',
              'With Firebase/Google for app infrastructure and authentication',
              'With Cloudinary for secure media storage',
              'When required by law or legal process',
            ]}
          />

          <Section
            num="4"
            title="Data Storage & Security"
            text="Your data is stored securely on Google Firebase servers. We implement industry-standard security measures including encrypted data transmission (HTTPS), Firebase Authentication for secure login, Firestore Security Rules to protect your data, and Cloudinary secure media storage."
          />

          <Section
            num="5"
            title="Your Rights"
            text="You have the right to:"
            bullets={[
              'Access and update your personal information via your Profile',
              'Delete your account and associated data by contacting us',
              'Opt out of notifications in your device settings',
              'Request a copy of your data',
            ]}
          />

          <Section
            num="6"
            title="Children's Privacy"
            text="CineLink is intended for users aged 18 and above. We do not knowingly collect personal information from children under 18. If we discover that a child under 18 has provided us with personal information, we will delete it immediately."
          />

          <Section
            num="7"
            title="Third-Party Services"
            text="CineLink uses the following third-party services, each with their own privacy policies:"
            bullets={[
              'Google Firebase — Authentication and database',
              'Cloudinary — Media storage and delivery',
              'Razorpay — Payment processing',
              'Google Sign In — Optional social login',
            ]}
          />

          <Section
            num="8"
            title="Cookies & Tracking"
            text="Our mobile app does not use cookies. We may collect anonymous usage analytics to improve the app experience. This data cannot be used to identify you personally."
          />

          <Section
            num="9"
            title="Changes to This Policy"
            text="We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy in the app. Your continued use of CineLink after changes are made constitutes your acceptance of the new policy."
          />

          <Section
            num="10"
            title="Contact Us"
            text="If you have any questions about this Privacy Policy or our data practices, please contact us at:"
          />
          <Card variant="elevated" padding={Spacing.lg}>
            <Text style={styles.contactText}>📧 cinelink011@gmail.com</Text>
            <Text style={styles.contactText}>
              🎬 CineLink — India's Cinema Network
            </Text>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2026 CineLink. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  num,
  title,
  text,
  bullets,
}: {
  num: string;
  title: string;
  text?: string;
  bullets?: string[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {num}. {title}
      </Text>
      {text ? <Text style={styles.sectionText}>{text}</Text> : null}
      {bullets?.map((b, i) => (
        <Text key={i} style={styles.bullet}>
          • {b}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},
  content: {padding: Spacing.screenH},
  lastUpdated: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.lg,
    fontStyle: 'italic',
  },
  introCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  intro: {...Typography.body, color: Colors.textSecondary},
  section: {marginTop: Spacing.xl},
  sectionTitle: {
    ...Typography.h4,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  sectionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  bullet: {
    ...Typography.body,
    color: Colors.textSecondary,
    paddingLeft: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  contactText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  footer: {marginTop: Spacing['4xl'], alignItems: 'center'},
  footerText: {...Typography.caption, color: Colors.textTertiary},
});
