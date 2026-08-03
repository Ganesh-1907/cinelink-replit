import React, {useEffect, useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, SafeAreaView, Modal, ActivityIndicator
} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Card, Chip, Badge, Avatar, Input} from '../components/ui';
import {useApp} from '../src/context/AppContext';

export default function ProjectDetailScreen({route, navigation}: any) {
  const {project: paramProject, projectId: paramProjectId} = route.params;
  const projectId = paramProjectId || paramProject?._id || paramProject?.id || '';
  
  const [project, setProject] = useState<any>(paramProject || {});
  const [loading, setLoading] = useState(true);
  const [myRequest, setMyRequest] = useState<any>(null);
  
  // Apply Modal state
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [applyNote, setApplyNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {user} = useApp();
  const currentUserId = user?._id || user?.uid;

  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) return;
    try {
      const [projRes, reqRes] = await Promise.all([
        api.get<any>(`/projects/${projectId}`),
        api.get<any>(`/projects/${projectId}/my-request`)
      ]);
      
      if (projRes?.project) {
        setProject(projRes.project);
      }
      if (reqRes?.request) {
        setMyRequest(reqRes.request);
      } else {
        setMyRequest(null);
      }
    } catch (e) {
      console.log('Error loading project details:', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectDetails();
    const unsub = navigation.addListener('focus', fetchProjectDetails);
    return unsub;
  }, [navigation, fetchProjectDetails]);

  const handleOpenChat = async () => {
    try {
      const res = await api.post<any>(`/chat/project-chat/${projectId}`);
      if (res.chat) {
        navigation.navigate('ChatScreen', { chat: res.chat });
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not access the project chat room.');
    }
  };

  const handleApplyPress = (role: string) => {
    setSelectedRole(role);
    setApplyNote('');
    setApplyModalVisible(true);
  };

  const submitApplication = async () => {
    if (!selectedRole) return;
    setSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/apply`, {
        role: selectedRole,
        note: applyNote.trim()
      });
      Alert.alert('Applied! 📁', `Your application for ${selectedRole} has been sent to the director.`);
      setApplyModalVisible(false);
      fetchProjectDetails();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const isMember = project.members?.includes(currentUserId);
  const isOwner = project.createdBy === currentUserId;

  if (loading && !project.title) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="📂 Project Room" navigation={navigation} />
        <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="📂 Project Room" navigation={navigation} />
      
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Main Details Card */}
        <Card variant="elevated" padding={Spacing.lg} style={styles.mainCard}>
          <Text style={styles.title}>{project.title}</Text>
          
          <View style={styles.metaRow}>
            {project.type ? <Chip label={project.type} static /> : null}
            {project.language ? <Chip label={`🗣️ ${project.language}`} static /> : null}
            {project.location ? <Chip label={`📍 ${project.location}`} static /> : null}
          </View>
          
          <View style={styles.statusRow}>
            <Badge label={project.status?.toUpperCase() || 'OPEN'} variant="success" />
            <Text style={styles.membersCount}>👥 {project.members?.length || 1} member{(project.members?.length || 1) > 1 ? 's' : ''}</Text>
          </View>

          {project.description ? (
            <Text style={styles.desc}>{project.description}</Text>
          ) : null}
        </Card>

        {/* Chat Room Access for members/owner */}
        {(isMember || isOwner) && (
          <TouchableOpacity style={styles.chatBanner} onPress={handleOpenChat}>
            <View style={styles.chatTextCol}>
              <Text style={styles.chatTitle}>💬 Project Chat Room</Text>
              <Text style={styles.chatSub}>Talk with the director and production crew</Text>
            </View>
            <Text style={styles.chatArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Director Management Button */}
        {isOwner && (
          <Button
            label="💼 Manage Join Requests"
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => navigation.navigate('JoinRequestsScreen', {projectId, projectTitle: project.title})}
          />
        )}

        {/* Pending Request Status Badge */}
        {myRequest && myRequest.status === 'Pending' && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingText}>
              ⏳ Your application for <Text style={{fontWeight: 'bold'}}>{myRequest.role}</Text> is pending approval.
            </Text>
          </View>
        )}

        {/* Creator Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎬 Project Creator / Director</Text>
          <TouchableOpacity
            style={styles.creatorCard}
            onPress={() => navigation.navigate('PublicProfile', {userId: project.createdBy})}>
            <Avatar name={project.creator?.fullName || 'Director'} size="sm" uri={project.creator?.photoUrl} />
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorName}>{project.creator?.fullName || project.creator?.displayName || 'Director'}</Text>
              <Text style={styles.creatorRole}>{project.creator?.role || 'Director'}</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Roles Needed */}
        {project.rolesNeeded?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Crew Positions</Text>
            {project.rolesNeeded.map((r: any, i: number) => {
              const isRoleFilled = r.filled;
              const hasApplied = myRequest?.role === r.role && myRequest?.status === 'Pending';
              
              return (
                <View key={i} style={styles.roleRow}>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleName}>{r.role}</Text>
                    {isRoleFilled ? (
                      <Text style={styles.roleStatusFilled}>✓ Filled by {r.memberName}</Text>
                    ) : (
                      <Text style={styles.roleStatusOpen}>⚡ Position Open</Text>
                    )}
                  </View>
                  
                  {!isRoleFilled && !isMember && !isOwner && (
                    <TouchableOpacity
                      style={[styles.applyButton, hasApplied && styles.appliedButton]}
                      disabled={hasApplied}
                      onPress={() => handleApplyPress(r.role)}>
                      <Text style={styles.applyButtonText}>
                        {hasApplied ? 'Pending' : 'Apply'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Members List */}
        {project.membersList?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Production Team ({project.membersList.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersScroll}>
              {project.membersList.map((m: any) => (
                <TouchableOpacity
                  key={m._id}
                  style={styles.memberAvatarCol}
                  onPress={() => navigation.navigate('PublicProfile', {userId: m._id})}>
                  <Avatar name={m.fullName || 'Member'} size="md" uri={m.photoUrl} />
                  <Text style={styles.memberNameText} numberOfLines={1}>
                    {m.fullName?.split(' ')[0] || m.displayName?.split(' ')[0] || 'Member'}
                  </Text>
                  <Text style={styles.memberRoleText} numberOfLines={1}>
                    {m.role || 'Crew'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>

      {/* Apply Note Modal */}
      <Modal
        visible={applyModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setApplyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Apply as {selectedRole}</Text>
            <Text style={styles.modalSub}>Add a message to the director highlighting your experience:</Text>
            
            <Input
              placeholder="e.g. I have 2 years of experience as a DOP and would love to work on this project..."
              value={applyNote}
              onChangeText={setApplyNote}
              multiline
              numberOfLines={4}
              style={styles.textArea}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setApplyModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={submitApplication}
                disabled={submitting}>
                <Text style={styles.modalBtnSubmitText}>
                  {submitting ? 'Sending...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.lg, gap: Spacing.lg},
  mainCard: {borderWidth: 1, borderColor: Colors.border},
  title: {fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: Spacing.sm, textAlign: 'left'},
  metaRow: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md},
  statusRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md},
  membersCount: {color: Colors.textSecondary, fontSize: 13},
  desc: {...Typography.body, color: Colors.textSecondary, lineHeight: 22, textAlign: 'left'},
  
  chatBanner: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.success,
  },
  chatTextCol: {flex: 1, alignItems: 'flex-start'},
  chatTitle: {...Typography.label, color: Colors.textPrimary},
  chatSub: {...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.xs},
  chatArrow: {color: Colors.success, fontSize: 22, fontWeight: 'bold'},

  pendingBanner: {
    backgroundColor: Colors.warningFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  pendingText: {color: Colors.warning, fontSize: 13, textAlign: 'left'},

  section: {alignItems: 'stretch'},
  sectionTitle: {...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.sm, textAlign: 'left'},
  
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  creatorInfo: {flex: 1, marginLeft: Spacing.md, alignItems: 'flex-start'},
  creatorName: {color: Colors.textPrimary, fontWeight: 'bold', fontSize: 14},
  creatorRole: {color: Colors.textSecondary, fontSize: 12, marginTop: 2},
  arrowIcon: {fontSize: 18, color: Colors.textTertiary},

  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleInfo: {alignItems: 'flex-start'},
  roleName: {color: Colors.textPrimary, fontWeight: 'bold', fontSize: 14},
  roleStatusOpen: {color: Colors.primary, fontSize: 12, marginTop: 4},
  roleStatusFilled: {color: Colors.success, fontSize: 12, marginTop: 4},
  applyButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  appliedButton: {
    backgroundColor: Colors.border,
  },
  applyButtonText: {color: Colors.textInverse, fontWeight: 'bold', fontSize: 12},

  membersScroll: {gap: Spacing.md, paddingVertical: Spacing.xs},
  memberAvatarCol: {alignItems: 'center', width: 70},
  memberNameText: {color: Colors.textPrimary, fontSize: 11, fontWeight: '600', marginTop: 4, width: '100%', textAlign: 'center'},
  memberRoleText: {color: Colors.textSecondary, fontSize: 9, width: '100%', textAlign: 'center'},

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: {...Typography.h3, color: Colors.textPrimary, textAlign: 'left'},
  modalSub: {...Typography.body, color: Colors.textSecondary, textAlign: 'left'},
  textArea: {height: 100, textAlignVertical: 'top', paddingVertical: Spacing.sm},
  modalActions: {flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.sm},
  modalBtn: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  modalBtnCancel: {backgroundColor: Colors.surface},
  modalBtnCancelText: {color: Colors.textSecondary, fontWeight: '600'},
  modalBtnSubmit: {backgroundColor: Colors.primary},
  modalBtnSubmitText: {color: Colors.textInverse, fontWeight: 'bold'},
});
