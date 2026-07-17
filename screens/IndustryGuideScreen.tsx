import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, Card} from '../components/ui';

const ROLES = [
  {key: 'actor', label: 'Actor', color: Colors.primary},
  {key: 'director', label: 'Director', color: Colors.success},
  {key: 'writer', label: 'Writer', color: Colors.info},
  {key: 'crew', label: 'Crew', color: Colors.warning},
  {key: 'producer', label: 'Producer', color: '#A78BFA'},
];

const GUIDE: Record<string, any[]> = {
  actor: [
    {
      icon: '📸',
      title: 'Perfect Your Portfolio',
      tips: [
        'Use a high-quality headshot with neutral background — casting directors see 100s of photos daily, yours must stand out.',
        'Include 2-3 different looks: professional, casual, character. Show range.',
        'Your portfolio photo should match how you actually look. Never use heavily edited or filtered photos.',
        'Update your portfolio every 6 months or after a significant change in appearance.',
      ],
    },
    {
      icon: '🎭',
      title: 'What Directors Look For',
      tips: [
        'Directors want actors who take direction quickly. In auditions, when given feedback, adapt immediately — this shows professionalism.',
        'Authenticity matters more than perfection. Raw, honest emotion beats technically correct but hollow performances.',
        'Preparation shows respect. Know your lines, know the character, know the project.',
        'Directors notice energy. Walk in confident, not desperate. You are also choosing them as much as they choose you.',
        'Physical presence — posture, eye contact, and stillness are as important as dialogue delivery.',
      ],
    },
    {
      icon: '📋',
      title: 'Audition Preparation',
      tips: [
        'Read the entire script or as much as available — not just your sides. Understanding the full story changes your performance.',
        "Research the director's previous work. Mention it naturally — shows you are invested.",
        'Prepare 3 different interpretations of the scene. Directors may ask you to try different approaches.',
        'Arrive 15 minutes early. Being late to an audition is never forgiven, even once.',
        "After the audition, send a brief thank-you message. Most actors don't — it sets you apart.",
      ],
    },
    {
      icon: '🎬',
      title: 'On Set Behaviour',
      tips: [
        "Learn everyone's name on set — from the director to the production assistant. Reputation travels fast in the industry.",
        'Never be on your phone between takes unless the director is also relaxed.',
        'Be ready when called. "Almost ready" is not acceptable on a professional set.',
        'Accept direction without arguing. Save disagreements for a private, respectful conversation.',
      ],
    },
    {
      icon: '💡',
      title: 'Common Mistakes to Avoid',
      tips: [
        "Don't over-act in auditions — subtlety reads better on camera than on stage.",
        'Never bash other directors or productions in conversations — the industry is smaller than you think.',
        'Avoid paying money to get roles. Legitimate casting calls never charge actors.',
        "Don't neglect your physical fitness and voice training — these are professional tools.",
      ],
    },
    {
      icon: '🌟',
      title: 'Building Your Career',
      tips: [
        'Start with short films — they are the fastest way to build your reel and your network.',
        'Take every role seriously, even small ones. Many successful actors were spotted in minor roles.',
        'Join acting workshops and theatre groups. Continuous learning separates professionals from amateurs.',
        'Network genuinely, not transactionally. Relationships built on mutual respect last decades.',
      ],
    },
  ],
  director: [
    {
      icon: '🎯',
      title: 'What Producers Look For',
      tips: [
        'Producers want directors with a clear vision — be able to explain your film in one compelling sentence.',
        'Budget discipline is crucial. A director who can tell a great story within constraints is gold.',
        'Producers look at your previous work intensely. Your short films are your business card.',
        'Communication skills matter as much as creative vision. Can you lead a team of 30+ people?',
      ],
    },
    {
      icon: '🎭',
      title: 'Casting the Right Talent',
      tips: [
        'Cast for chemistry, not just individual talent. Two average actors with great chemistry outperform two stars without it.',
        'Give actors room to bring their own interpretation first, then adjust.',
        'In auditions, pay attention to how actors take direction — not just how well they perform unprompted.',
        'Always have actors read opposite each other in callbacks. Chemistry cannot be faked.',
      ],
    },
    {
      icon: '📝',
      title: 'Pre-Production Excellence',
      tips: [
        'Storyboard every key scene. Visual clarity in prep means fewer expensive mistakes on set.',
        'Hold a table read with the full cast before shooting. Script problems surface here, not on day 5.',
        'Walk through every location before shoot day. Surprises on set day cost time and money.',
        'Plan for 20% more time than you think you need. Every shoot has unexpected delays.',
      ],
    },
    {
      icon: '🎬',
      title: 'On Set Leadership',
      tips: [
        'Set the tone in the first hour of day one. How you handle the first problem sets the culture for the entire shoot.',
        "Protect your actors' emotional space. Great performances require psychological safety.",
        'Make decisions quickly on set. Indecision is more damaging than an imperfect decision.',
        'Praise publicly, correct privately. Embarrassing a crew member in front of others poisons the whole set.',
      ],
    },
    {
      icon: '💡',
      title: 'Storytelling Fundamentals',
      tips: [
        'Every scene must do two things: advance plot AND reveal character. If it only does one, cut or rewrite it.',
        'The best directors trust the audience. Leave space for viewers to feel and interpret.',
        "Visual storytelling is primary — if you need dialogue to explain what the audience should feel, the scene isn't working.",
        'Study films you love in detail. Pause every 10 minutes and analyze why the scene works.',
      ],
    },
  ],
  writer: [
    {
      icon: '📖',
      title: 'What Directors Want',
      tips: [
        'Directors want scripts that are visual — write what the camera sees, not what characters think.',
        'Avoid over-writing action lines. Describe only what is essential and visible.',
        'Write dialogue that sounds like how people actually talk — with interruptions, incomplete thoughts, and subtext.',
        'A great logline is not optional — it is the foundation of every pitch conversation.',
      ],
    },
    {
      icon: '✍️',
      title: 'Script Formatting',
      tips: [
        'Use industry-standard formatting: Courier 12pt, proper sluglines, action, character names centred above dialogue.',
        'One page of script equals approximately one minute of screen time. Feature films: 90-120 pages.',
        'Short films: 10-15 pages is the sweet spot for festivals and director interest.',
        'Use Final Draft, Fade In, or Celtx. Never submit a script formatted in Word.',
      ],
    },
    {
      icon: '🎯',
      title: 'Pitching Your Script',
      tips: [
        'Know your logline cold: Character + Goal + Obstacle + Stakes in one sentence.',
        'In a pitch meeting, tell the story with emotion — you are selling a feeling, not a plot summary.',
        'Have a one-page synopsis ready, a full treatment, and the script. Have all three.',
        "Be open to notes. Defensive writers don't get hired twice.",
      ],
    },
    {
      icon: '💡',
      title: 'Craft & Development',
      tips: [
        'Write your first draft fast without editing. The second draft is where writing actually happens.',
        "Read your dialogue out loud. If it's hard to say, it will be hard to act.",
        'Every character needs a clear want (external) and a need (internal). These must conflict.',
        'Study screenplays of films you love — they are freely available online.',
      ],
    },
    {
      icon: '🌟',
      title: 'Building a Writing Career',
      tips: [
        "Write short films first. Directors can't afford to risk a feature on an unproven writer.",
        'Network with directors actively. The best script-director relationships are built over coffee, not cold emails.',
        'Write consistently. One page a day is 365 pages a year — more than three feature scripts.',
      ],
    },
  ],
  crew: [
    {
      icon: '🎥',
      title: 'Breaking Into the Industry',
      tips: [
        'Start by working for free on student films and short films. Every credit matters at the start.',
        'Specialize in one department but be competent across several. Multi-skilled crew get called first.',
        'Build a reel showing your specific craft — DOP, editor, sound designer — even from student projects.',
        'Join industry groups on WhatsApp, Facebook, and LinkedIn. Most crew jobs are filled through word of mouth.',
      ],
    },
    {
      icon: '🛠️',
      title: 'On Set Professionalism',
      tips: [
        'Show up early, stay late, and never complain about hours in front of producers.',
        "Anticipate needs before being asked. The best crew members solve problems their director hasn't noticed yet.",
        'Your attitude matters as much as your skill. Directors choose crew they enjoy spending 16-hour days with.',
        'Be meticulous about equipment care. Carelessness with gear ends careers.',
      ],
    },
    {
      icon: '💡',
      title: 'Department Tips',
      tips: [
        'DOP: Study natural light. The most beautiful shots often cost nothing.',
        "Editor: Protect the story first. Every fancy cut that doesn't serve the story should be cut.",
        'Sound: Bad sound kills a good film. Directors will forgive a shaky shot but not muffled dialogue.',
        'Art Director: Research obsessively. Every object in frame should have a reason to be there.',
      ],
    },
    {
      icon: '🌟',
      title: 'Growing Your Career',
      tips: [
        'Assist department heads actively — observe, ask smart questions, and show initiative.',
        'Develop relationships with directors early in their careers. You grow together.',
        'Learn the business side — budgeting, scheduling, contracts. Technical crew who understand business get promoted.',
      ],
    },
  ],
  producer: [
    {
      icon: '💼',
      title: 'What Producers Do',
      tips: [
        "Producers are problem-solvers first, creative visionaries second. Your job is to make the director's vision possible.",
        'Financing, scheduling, casting, distribution — a producer touches every department. Know each one deeply.',
        'Build relationships with financiers, distributors, and festival programmers before you need them.',
        'Know your numbers. A producer who cannot read a budget is not a producer.',
      ],
    },
    {
      icon: '🎯',
      title: 'Finding Projects',
      tips: [
        'Look for stories that are urgent, personal, and universal. The best films feel both intimate and enormous.',
        "Develop relationships with writers early — before they're famous. Read widely and spot talent others miss.",
        "The concept must be pitchable in one sentence. If you can't explain it simply, it isn't ready.",
      ],
    },
    {
      icon: '💰',
      title: 'Financing Your Film',
      tips: [
        'Start with government grants and film development funds — NFDC in India is your first stop.',
        'Presales to streaming platforms and broadcasters can fund a significant portion of your budget.',
        'Equity investors want returns — have a realistic distribution plan before approaching them.',
        'Crowdfunding works for micro-budget films with strong community followings.',
      ],
    },
    {
      icon: '🤝',
      title: 'Working with Directors',
      tips: [
        'Choose directors whose vision you genuinely believe in — you will spend years together.',
        'Be clear about creative boundaries from day one. Ambiguity causes conflict in post-production.',
        'Support the director publicly, address concerns privately. A divided set is a failing set.',
      ],
    },
    {
      icon: '🌟',
      title: 'Distribution Strategy',
      tips: [
        'Think about distribution before you start shooting. Know who your audience is and where they watch.',
        'OTT platforms in India — Netflix, Amazon, ZEE5, SonyLIV — are actively looking for content.',
        'Social media marketing for films must start 6 months before release, not 6 weeks.',
      ],
    },
  ],
};

export default function IndustryGuideScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [activeRole, setActiveRole] = useState('actor');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const guide = GUIDE[activeRole] || [];
  const activeRoleData = ROLES.find(r => r.key === activeRole);

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="🎬 Industry Guide"
        navigation={navigation}
        noBorder
        right={<Text style={styles.headerSub}>Insights</Text>}
      />

      {/* ROLE TABS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabContent}>
        {ROLES.map(role => {
          const active = activeRole === role.key;
          return (
            <TouchableOpacity
              key={role.key}
              style={[
                styles.roleTab,
                active && {
                  backgroundColor: role.color + '22',
                  borderColor: role.color,
                },
              ]}
              onPress={() => {
                setActiveRole(role.key);
                setExpandedIndex(0);
              }}>
              <Text
                allowFontScaling={false}
                style={[styles.roleTabText, active && {color: role.color}]}>
                {role.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {paddingBottom: insets.bottom + Spacing.xxl},
        ]}>
        {/* ROLE BANNER */}
        <Card
          variant="elevated"
          padding={Spacing.lg}
          style={[
            styles.roleBanner,
            {borderColor: `${activeRoleData?.color || Colors.primary}44`},
          ]}>
          <Text style={styles.roleBannerTitle}>
            Guide for {activeRoleData?.label}
          </Text>
          <Text style={styles.roleBannerSub}>
            {guide.length} topics ·{' '}
            {guide.reduce((a, b) => a + b.tips.length, 0)} professional tips
          </Text>
        </Card>

        {/* ACCORDION CARDS */}
        {guide.map((section, index) => (
          <Card
            key={index}
            variant="default"
            padding={false}
            style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
              activeOpacity={0.8}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardIcon}>{section.icon}</Text>
                <Text style={styles.cardTitle}>{section.title}</Text>
              </View>
              <Text
                style={[
                  styles.expandIcon,
                  {color: activeRoleData?.color || Colors.primary},
                ]}>
                {expandedIndex === index ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {expandedIndex === index && (
              <View style={styles.tipsContainer}>
                {section.tips.map((tip: string, tipIndex: number) => (
                  <View key={tipIndex} style={styles.tipRow}>
                    <View
                      style={[
                        styles.tipDot,
                        {
                          backgroundColor:
                            activeRoleData?.color || Colors.primary,
                        },
                      ]}
                    />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        ))}

        <Card variant="outlined" padding={Spacing.lg} style={styles.bottomNote}>
          <Text style={styles.bottomNoteText}>
            💡 These insights are curated from industry professionals and film
            veterans across India's cinema industry.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  headerSub: {...Typography.caption, color: Colors.primary},
  tabContent: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    flexDirection: 'row',
  },
  roleTab: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  roleTabText: {
    ...Typography.btnSm,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  content: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  roleBanner: {
    borderWidth: 1,
  },
  roleBannerTitle: {...Typography.h3},
  roleBannerSub: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  card: {
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  cardIcon: {fontSize: 22},
  cardTitle: {...Typography.h4, flex: 1},
  expandIcon: {...Typography.captionBold, fontSize: 12},
  tipsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  tipRow: {flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start'},
  tipDot: {width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0},
  tipText: {...Typography.body, color: Colors.textSecondary, flex: 1},
  bottomNote: {marginTop: Spacing.sm},
  bottomNoteText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
