import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Card, Chip, Badge, Avatar, EmptyState, LoadingView} from '../components/ui';
import {useApp} from '../src/context/AppContext';

export default function ProjectDetailScreen({route, navigation}: any) {
  const {project: paramProject, projectId: paramProjectId} = route.params;
  const projectId = paramProjectId || paramProject?._id || paramProject?.id || '';
  const [project, setProject] = useState<any>(paramProject || {});
  const [loading, setLoading] = useState(false);
  const {user} = useApp();

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await api.get<any>(`/projects/${projectId}`);
      if (res?.project) setProject(res.project);
    } catch (e) { console.log(e); }
  }, [projectId]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  const joinProject = async () => {
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/join`);
      Alert.alert('✅ Joined!', 'You have joined this project.');
      fetchProject();
    } catch (e: any) { Alert.alert('Error', e.message || 'Could not join.'); }
    finally { setLoading(false); }
  };

  const isMember = project.members?.includes(user?.uid);
  const isOwner = project.createdBy === user?.uid;

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="📂 Project" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card variant="elevated" padding={Spacing.lg} style={styles.mainCard}>
          <Text style={styles.title}>{project.title}</Text>
          <View style={styles.metaRow}>
            {project.type ? <Chip label={project.type} static /> : null}
            <Badge label={project.status || 'Open'} variant="success" />
          </View>
          {project.description ? <Text style={styles.desc}>{project.description}</Text> : null}
          <Text style={styles.membersCount}>👥 {project.members?.length || 1} member{(project.members?.length || 1) > 1 ? 's' : ''}</Text>
        </Card>
        {!isMember && !isOwner && <Button label="🤝 Join Project" variant="primary" size="lg" fullWidth onPress={joinProject} loading={loading} disabled={loading} />}
        {project.rolesNeeded?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Roles Needed</Text>
            <View style={styles.rolesRow}>{project.rolesNeeded.map((r: string, i: number) => <Chip key={i} label={r} static />)}</View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.lg, gap: Spacing.lg},
  mainCard: {},
  title: {fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary},
  metaRow: {flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm},
  desc: {color: Colors.textSecondary, lineHeight: 22},
  membersCount: {color: Colors.primary, fontWeight: '600', marginTop: Spacing.sm},
  section: {},
  sectionTitle: {color: Colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: Spacing.sm},
  rolesRow: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm},
});
