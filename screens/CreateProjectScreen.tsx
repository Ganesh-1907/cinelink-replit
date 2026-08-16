import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import api from '../src/api/client';
import {useApp} from '../src/context/AppContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Input, Button, Chip, Card} from '../components/ui';
import {useTheme} from '../src/context/ThemeContext';

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

export default function CreateProjectScreen({route, navigation}: any) {
  const projectToEdit = route.params?.project;
  const isEditMode = !!projectToEdit;

  const {isDark} = useTheme();
  const {isAdmin, isApprovedDirector} = useApp();

  useEffect(() => {
    if (!isAdmin && !isApprovedDirector) {
      Alert.alert('Access Denied', 'Only approved directors and admins can create projects.', [
        {text: 'Go Back', onPress: () => navigation.goBack()},
      ]);
    }
  }, []);
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(projectToEdit?.title || '');
  const [type, setType] = useState(projectToEdit?.type || 'Short Film');
  const [language, setLanguage] = useState(projectToEdit?.language || 'Telugu');
  const [location, setLocation] = useState(projectToEdit?.location || '');
  const [description, setDescription] = useState(projectToEdit?.description || '');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    projectToEdit?.rolesNeeded?.map((r: any) => r.role) || []
  );
  const [visibility, setVisibility] = useState<'public' | 'private'>(projectToEdit?.visibility || 'public');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectToEdit) {
      setTitle(projectToEdit.title || '');
      setType(projectToEdit.type || 'Short Film');
      setLanguage(projectToEdit.language || 'Telugu');
      setLocation(projectToEdit.location || '');
      setDescription(projectToEdit.description || '');
      setSelectedRoles(projectToEdit.rolesNeeded?.map((r: any) => r.role) || []);
      setVisibility(projectToEdit.visibility || 'public');
    }
  }, [projectToEdit]);

  const {user: currentUser} = useApp();
  const directorName =
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Director';

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role],
    );
  };

  const saveProject = async () => {
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
      if (isEditMode) {
        await api.put(`/projects/${projectToEdit._id}`, {
          title: title.trim(),
          type,
          description: description.trim(),
          rolesNeeded: selectedRoles,
          location: location.trim(),
          language,
          visibility,
        });

        Alert.alert(
          '🎬 Project Updated!',
          'Your project details have been successfully updated.',
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
      } else {
        await api.post('/projects', {
          title: title.trim(),
          type,
          description: description.trim(),
          rolesNeeded: selectedRoles,
          location: location.trim(),
          language,
          visibility,
        });

        Alert.alert(
          '🎬 Project Created!',
          'Your project is now live. Crew can now apply!',
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
      }
    } catch (e: any) {
      console.log('SAVE PROJECT ERROR:', e);
      Alert.alert('Error', e.message || 'Could not save project. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: Colors.background}]}>
      <Header title={isEditMode ? "Edit Project" : "Create Project"} navigation={navigation} />
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
            <Text style={styles.label}>Room Visibility</Text>
            <View style={styles.visibilityRow}>
              <TouchableOpacity
                style={[styles.visibilityBtn, visibility === 'public' && styles.visibilityBtnActive]}
                onPress={() => setVisibility('public')}
              >
                <Text style={[styles.visibilityBtnText, visibility === 'public' && styles.visibilityBtnTextActive]}>
                  🌐 Public (Visible to all)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.visibilityBtn, visibility === 'private' && styles.visibilityBtnActive]}
                onPress={() => setVisibility('private')}
              >
                <Text style={[styles.visibilityBtnText, visibility === 'private' && styles.visibilityBtnTextActive]}>
                  🔒 Private (Invite only)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

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
            label={isEditMode ? "💾 Update Project Details" : "🎬 Create Project"}
            onPress={saveProject}
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
  visibilityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  visibilityBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.card,
  },
  visibilityBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaint,
  },
  visibilityBtnText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  visibilityBtnTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
});
