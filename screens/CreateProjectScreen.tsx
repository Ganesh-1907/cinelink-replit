import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Input, Button, Chip, Card} from '../components/ui';

const PROJECT_TYPES = [
  'Short Film',
  'Feature Film',
  'Web Series',
  'Ad Film',
  'Music Video',
  'Documentary',
];

const ALL_ROLES = [
  'Hero',
  'Heroine',
  'Villain',
  'Supporting Actor',
  'Child Artist',
  'DOP',
  'Editor',
  'Music Director',
  'Sound Designer',
  'Writer',
  'Makeup Artist',
  'Costume Designer',
  'Art Director',
  'Stunt Coordinator',
  'Producer',
];

const LANGUAGES = [
  'Telugu',
  'Hindi',
  'Tamil',
  'Malayalam',
  'Kannada',
  'English',
  'Other',
];

export default function CreateProjectScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Short Film');
  const [language, setLanguage] = useState('Telugu');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const currentUser = auth().currentUser;
  const directorName =
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Director';

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role],
    );
  };

  const createProject = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Info', 'Please enter a project title.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Missing Info', 'Please enter a location.');
      return;
    }
    if (selectedRoles.length === 0) {
      Alert.alert('Missing Info', 'Please select at least one role needed.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/projects', {
        title: title.trim(),
        type,
        description: description.trim(),
        rolesNeeded: selectedRoles,
      });

      Alert.alert(
        '🎬 Project Created!',
        'Your project is now live. Crew can now apply!',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (e: any) {
      console.log('CREATE PROJECT ERROR:', e);
      Alert.alert('Error', e.message || 'Could not create project. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: Colors.background}]}>
      <Header title="Create Project" navigation={navigation} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: insets.bottom + Spacing['3xl']}}>
        <View style={styles.section}>
          <Input
            label="Project Title *"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Telugu Action Short Film"
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Project Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {PROJECT_TYPES.map(t => (
                  <Chip
                    key={t}
                    label={t}
                    selected={type === t}
                    onPress={() => setType(t)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Language</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {LANGUAGES.map(l => (
                  <Chip
                    key={l}
                    label={l}
                    selected={language === l}
                    onPress={() => setLanguage(l)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <Input
            label="Location *"
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Hyderabad, Telangana"
          />

          <Input
            label="Project Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Tell crew about your project, story, timeline..."
            multiline
            numberOfLines={4}
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Roles Needed * (tap to select)</Text>
            <View style={styles.rolesGrid}>
              {ALL_ROLES.map(role => (
                <Chip
                  key={role}
                  label={role}
                  selected={selectedRoles.includes(role)}
                  onPress={() => toggleRole(role)}
                  icon={selectedRoles.includes(role) ? '✓' : undefined}
                  variant={
                    selectedRoles.includes(role)
                      ? 'success'
                      : ('neutral' as any)
                  }
                />
              ))}
            </View>
          </View>

          {selectedRoles.length > 0 && (
            <Card
              variant="flat"
              padding={Spacing.md}
              style={styles.selectedInfo}>
              <Text style={styles.selectedInfoText}>
                ✅ {selectedRoles.length} role
                {selectedRoles.length > 1 ? 's' : ''} selected
              </Text>
            </Card>
          )}

          <Button
            label="🎬 Create Project"
            onPress={createProject}
            size="lg"
            loading={loading}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  section: {padding: Spacing.screenH, gap: Spacing.xl},
  fieldGroup: {gap: Spacing.xs},
  label: {...Typography.labelSm, color: Colors.primary},
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  selectedInfo: {
    borderColor: Colors.successBorder,
    borderWidth: 1,
  },
  selectedInfoText: {...Typography.btn, color: Colors.success},
});
