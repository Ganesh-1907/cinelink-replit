import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, ScrollView, Alert, Modal, TextInput
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '../src/context/AppContext';
import {Header, Input, Chip, Card, Avatar, Button, PopupModal} from '../components/ui';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {useTheme} from '../src/context/ThemeContext';

const TIPS = ['Actor', 'Director', 'Mumbai', 'Telugu', 'Editor', 'Writer', 'DOP'];

export default function CrewScreen({navigation}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const {user: currentUser} = useApp();
  
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<{[key: string]: 'connected' | 'pending' | 'none'}>({});
  const [actionLoading, setActionLoading] = useState<{[key: string]: 'follow' | 'connect' | null}>({});
  
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedTargetUser, setSelectedTargetUser] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedInviteRole, setSelectedInviteRole] = useState('');
  const [inviting, setInviting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Custom Alert Modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState<'success' | 'warning' | 'info' | 'confirm'>('info');

  const showAlert = (title: string, message: string, variant: 'success' | 'warning' | 'info' | 'confirm' = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVariant(variant);
    setAlertVisible(true);
  };

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch follow states, connection states, and user projects on focus
  const fetchRelations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [followRes, connRes, projRes] = await Promise.all([
        api.get<{followingIds: string[]}>('/users/following-ids'),
        api.get<{connections: any[]}>('/connections/all'),
        api.get<{projects: any[]}>('/projects?createdBy=' + (currentUser._id || currentUser.uid))
      ]);

      if (followRes?.followingIds) {
        setFollowingIds(new Set(followRes.followingIds));
      }

      if (connRes?.connections) {
        const statusMap: {[key: string]: 'connected' | 'pending' | 'none'} = {};
        connRes.connections.forEach((c: any) => {
          const otherId = c.requesterId === currentUser._id ? c.targetId : c.requesterId;
          if (c.status === 'accepted') {
            statusMap[otherId] = 'connected';
          } else if (c.status === 'pending') {
            statusMap[otherId] = 'pending';
          }
        });
        setConnectionStatus(statusMap);
      }

      if (projRes?.projects) {
        setMyProjects(projRes.projects);
      }
    } catch (e) {
      console.log('Error fetching relations:', e);
    }
  }, [currentUser]);

  const doSearch = useCallback(async (queryStr: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    setLoading(true);
    setSearched(true);
    try {
      const queryString = queryStr.trim() ? `query=${encodeURIComponent(queryStr.trim())}` : '';
      const res = await api.get<any>(`/users/search?${queryString}`);
      
      // Filter out admin and self
      const filtered = (res.users || []).filter((u: any) => {
        return u._id !== currentUser?._id && u.role !== 'Admin';
      });
      setUsers(filtered);
    } catch (e) {
      console.log('Search error:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchRelations();
    doSearch('');
    const unsub = navigation.addListener('focus', () => {
      fetchRelations();
      doSearch('');
    });
    return unsub;
  }, [navigation, fetchRelations, doSearch]);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 400);
  };

  const handleTipPress = (tip: string) => {
    setSearchText(tip);
    doSearch(tip);
  };

  const toggleFollow = async (targetUserId: string) => {
    if (actionLoading[targetUserId]) return;
    setActionLoading(prev => ({...prev, [targetUserId]: 'follow'}));
    try {
      const isFollowing = followingIds.has(targetUserId);
      await api.post<any>('/users/follow', {targetUserId});
      
      setFollowingIds(prev => {
        const next = new Set(prev);
        if (isFollowing) {
          next.delete(targetUserId);
        } else {
          next.add(targetUserId);
        }
        return next;
      });
    } catch (e: any) {
      showAlert('Error', e.message || 'Could not perform follow action.', 'warning');
    } finally {
      setActionLoading(prev => ({...prev, [targetUserId]: null}));
    }
  };

  const sendConnectRequest = async (targetUser: any) => {
    const targetId = targetUser._id;
    if (actionLoading[targetId]) return;
    setActionLoading(prev => ({...prev, [targetId]: 'connect'}));
    try {
      await api.post('/connections/request', {targetUserId: targetId});
      setConnectionStatus(prev => ({...prev, [targetId]: 'pending'}));
      showAlert('Request Sent! 🤝', `Connection request sent to ${targetUser.fullName || targetUser.displayName || 'User'}`, 'success');
    } catch (e: any) {
      showAlert('Error', e.message || 'Could not send request.', 'warning');
    } finally {
      setActionLoading(prev => ({...prev, [targetId]: null}));
    }
  };

  const handleInvitePress = (user: any) => {
    setSelectedTargetUser(user);
    if (myProjects.length === 0) {
      showAlert('No Projects', 'You do not have any projects to invite this creator to. Go to CineLink Rooms to create a project!', 'info');
      return;
    }
    setSelectedProject(myProjects[0]);
    const openRoles = myProjects[0].rolesNeeded?.filter((r: any) => !r.filled) || [];
    setSelectedInviteRole(openRoles.length > 0 ? openRoles[0].role : '');
    setDropdownOpen(false);
    setInviteModalVisible(true);
  };

  const sendInvitation = async () => {
    if (!selectedTargetUser || !selectedProject || !selectedInviteRole) {
      showAlert('Error', 'Please select a project and a role.', 'warning');
      return;
    }
    setInviting(true);
    try {
      await api.post(`/projects/${selectedProject._id || selectedProject.id}/invite`, {
        userId: selectedTargetUser._id,
        role: selectedInviteRole,
      });
      showAlert('Invitation Sent! 📩', `Invited ${selectedTargetUser.fullName || 'creator'} to join "${selectedProject.title}" as ${selectedInviteRole}`, 'success');
      setInviteModalVisible(false);
    } catch (e: any) {
      showAlert('Error', e.message || 'Could not send invitation.', 'warning');
    } finally {
      setInviting(false);
    }
  };

  const renderUser = ({item}: any) => {
    const displayName = item.fullName || item.displayName || item.name || 'User';
    const status = connectionStatus[item._id] || 'none';
    const isFollowing = followingIds.has(item._id);

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => navigation.navigate('PublicProfile', {userId: item._id})}>
        
        {/* Main top info row */}
        <View style={styles.cardTopRow}>
          <Avatar name={displayName} size="md" uri={item.photoUrl || item.photoURL} />

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
              {item.verificationStatus === 'verified' && <Text style={styles.verifiedTag}>✅</Text>}
            </View>
            <Text style={styles.userRole}>🎭 {item.role || 'Creator'}</Text>
            {item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
            {item.location ? <Text style={styles.userLocation}>📍 {item.location}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.followPill, isFollowing && styles.followingPill]}
            disabled={!!actionLoading[item._id]}
            onPress={e => { e.stopPropagation(); toggleFollow(item._id); }}>
            {actionLoading[item._id] === 'follow' ? (
              <ActivityIndicator size="small" color={isFollowing ? Colors.primary : Colors.textInverse} style={{ transform: [{ scale: 0.8 }] }} />
            ) : (
              <Text style={[styles.followPillText, isFollowing && styles.followingPillText]}>
                {isFollowing ? '✓ Following' : '+ Follow'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom action row with divider (rendered only if actions exist) */}
        <View style={styles.cardActionDivider} />
        <View style={styles.cardBottomActionsRow}>
          {status === 'connected' ? (
            <View style={[styles.actionButton, styles.actionButtonConnected]}>
              <Text style={styles.actionBtnTextConnected}>✅ Connected</Text>
            </View>
          ) : status === 'pending' ? (
            <View style={[styles.actionButton, styles.actionButtonPending]}>
              <Text style={styles.actionBtnTextPending}>⏳ Request Pending</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              disabled={!!actionLoading[item._id]}
              onPress={e => { e.stopPropagation(); sendConnectRequest(item); }}>
              {actionLoading[item._id] === 'connect' ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.actionBtnText}>🤝 Connect</Text>
              )}
            </TouchableOpacity>
          )}

          {myProjects.length > 0 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={e => { e.stopPropagation(); handleInvitePress(item); }}>
              <Text style={styles.actionBtnText}>📩 Invite to Project</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: Colors.background}]}>
      <Header title="Find Creators" navigation={navigation} />

      <View style={styles.searchOuter}>
        <Input
          placeholder="Search by name, role, bio..."
          value={searchText}
          onChangeText={handleSearchChange}
          autoCorrect={false}
          leftIcon="🔍"
          rightIcon={
            searchText.length > 0 ? (
              <TouchableOpacity onPress={() => { setSearchText(''); setUsers([]); setSearched(false); }}>
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            ) : undefined
          }
        />
      </View>

      <TouchableOpacity
        style={styles.roomsBanner}
        onPress={() => navigation.navigate('BrowseProjects')}>
        <View style={styles.roomsTextCol}>
          <Text style={styles.roomsTitle}>🎬 CineLink Rooms</Text>
          <Text style={styles.roomsSub}>Find projects · Join film teams · Collaborate</Text>
        </View>
        <Text style={styles.roomsArrow}>→</Text>
      </TouchableOpacity>

      {!searched ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Search for Creators</Text>
          <Text style={styles.emptySubtitle}>
            Type a name, role or location to find actors, directors and crew members
          </Text>
          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>Try searching for:</Text>
            <View style={styles.tipsChipsRow}>
              {TIPS.map(tip => (
                <TouchableOpacity key={tip} onPress={() => handleTipPress(tip)}>
                  <Text style={styles.tipChip}>🔎 {tip}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : users.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>😔</Text>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>Try a different name or role</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item._id || item.id}
          renderItem={renderUser}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 100}]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            searchText.trim().length > 0 ? (
              <Text style={styles.resultsCount}>
                {users.length} result{users.length > 1 ? 's' : ''} for "{searchText}"
              </Text>
            ) : null
          }
        />
      )}

      {/* INVITE MODAL */}
      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>📩 Invite to Project</Text>
            <Text style={styles.modalSub}>
              Invite {selectedTargetUser?.fullName || selectedTargetUser?.displayName || 'Creator'} to join one of your projects.
            </Text>

            <Text style={styles.label}>Select Project</Text>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity 
                style={[styles.dropdownTrigger, { marginBottom: 0 }]} 
                onPress={() => setDropdownOpen(!dropdownOpen)}
              >
                <Text style={styles.dropdownTriggerText}>
                  {selectedProject ? `🎬 ${selectedProject.title}` : 'Select a project...'}
                </Text>
                <View style={[styles.dropdownArrow, { transform: [{ rotate: dropdownOpen ? '180deg' : '0deg' }] }]}>
                  <Svg width={12} height={8} viewBox="0 0 12 8" fill="none">
                    <Path
                      d="M1 1.5L6 6.5L11 1.5"
                      stroke={Colors.textTertiary}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              </TouchableOpacity>

              {dropdownOpen && (
                <View style={styles.dropdownListContainer}>
                  <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled>
                    {myProjects.map((p) => {
                      const isSelected = selectedProject?._id === p._id;
                      return (
                        <TouchableOpacity
                          key={p._id}
                          style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                          onPress={() => {
                            setSelectedProject(p);
                            const openRoles = p.rolesNeeded?.filter((r: any) => !r.filled) || [];
                            setSelectedInviteRole(openRoles.length > 0 ? openRoles[0].role : '');
                            setDropdownOpen(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                            🎬 {p.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      style={[styles.dropdownItem, styles.dropdownCreateItem]}
                      onPress={() => {
                        setInviteModalVisible(false);
                        setDropdownOpen(false);
                        navigation.navigate('CreateProject');
                      }}
                    >
                      <Text style={styles.dropdownCreateText}>
                        ➕ Create New Room
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}
            </View>

            <Text style={styles.label}>Select Role</Text>
            <View style={styles.rolesContainer}>
              {selectedProject && (selectedProject.rolesNeeded?.filter((r: any) => !r.filled) || []).length > 0 ? (
                <View style={styles.rolesChipsRow}>
                  {(selectedProject.rolesNeeded?.filter((r: any) => !r.filled) || []).map((r: any) => {
                    const isSelected = selectedInviteRole === r.role;
                    return (
                      <TouchableOpacity
                        key={r.role}
                        style={[styles.roleChip, isSelected && styles.roleChipActive]}
                        onPress={() => setSelectedInviteRole(r.role)}
                      >
                        <Text style={[styles.roleChipText, isSelected && styles.roleChipTextActive]}>
                          {r.role}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.noRolesBox}>
                  <Text style={styles.noRolesText}>No open roles in this project.</Text>
                  <TextInput
                    style={styles.roleInput}
                    placeholder="Enter custom role..."
                    placeholderTextColor={Colors.textTertiary}
                    value={selectedInviteRole}
                    onChangeText={setSelectedInviteRole}
                  />
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setInviteModalVisible(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={sendInvitation}
                disabled={inviting || !selectedInviteRole}
              >
                {inviting ? (
                  <ActivityIndicator color={Colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.modalBtnTextSubmit}>Send Invite</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PopupModal
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        title={alertTitle}
        message={alertMessage}
        variant={alertVariant === 'confirm' ? 'confirm' : alertVariant}
        confirmLabel="OK"
        onConfirm={() => setAlertVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  list: {paddingHorizontal: Spacing.lg},
  searchOuter: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  clearText: {color: Colors.textTertiary, fontSize: 18, fontWeight: 'bold', padding: Spacing.xs},
  roomsBanner: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  roomsTextCol: {flex: 1, alignItems: 'flex-start'},
  roomsTitle: {...Typography.label, color: Colors.textPrimary},
  roomsSub: {...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.xs},
  roomsArrow: {color: Colors.primary, fontSize: 22, fontWeight: 'bold'},
  emptyState: {alignItems: 'center', paddingTop: Spacing.xl, paddingHorizontal: Spacing.xl},
  emptyEmoji: {fontSize: 60, marginBottom: Spacing.md},
  emptyTitle: {...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.sm},
  emptySubtitle: {...Typography.body, color: Colors.textSecondary, textAlign: 'center'},
  tipsBox: {marginTop: Spacing.xl, alignItems: 'center', width: '100%'},
  tipsTitle: {...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.md},
  tipsChipsRow: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm},
  tipChip: {
    color: Colors.primary,
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  resultsCount: {color: Colors.textSecondary, ...Typography.caption, marginBottom: Spacing.md},
  userCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  userInfo: {flex: 1, marginLeft: Spacing.md, alignItems: 'flex-start'},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs},
  userName: {color: Colors.textPrimary, fontSize: 15, fontWeight: 'bold'},
  verifiedTag: {fontSize: 14},
  userRole: {color: Colors.primary, fontSize: 12, marginBottom: Spacing.xs},
  userBio: {color: Colors.textSecondary, fontSize: 12},
  userLocation: {color: Colors.textTertiary, fontSize: 11, marginTop: Spacing.xs},
  followPill: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primaryLight
  },
  followingPill: {
    backgroundColor: 'transparent',
    borderColor: Colors.primary
  },
  followingPillText: {
    color: Colors.primary
  },
  followPillText: {color: Colors.textInverse, fontSize: 11, fontWeight: 'bold'},
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  cardActionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
    width: '100%',
    opacity: 0.5,
  },
  cardBottomActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    height: 36,
  },
  actionButtonConnected: {
    borderColor: Colors.success,
    backgroundColor: Colors.successFaint,
  },
  actionButtonPending: {
    borderColor: Colors.warning,
    backgroundColor: Colors.warningFaint,
  },
  actionBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionBtnTextConnected: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionBtnTextPending: {
    color: Colors.warning,
    fontSize: 12,
    fontWeight: 'bold',
  },
  loader: {marginTop: 60},

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.primary,
    marginBottom: Spacing.sm
  },
  modalSub: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md
  },
  label: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 999,
    marginBottom: Spacing.md,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
    marginBottom: Spacing.xs,
  },
  dropdownTriggerText: {
    color: Colors.textPrimary,
    fontSize: 14,
  },
  dropdownArrow: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownListContainer: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    zIndex: 9999,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownScrollView: {
    maxHeight: 180,
  },
  dropdownItem: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  dropdownItemActive: {
    backgroundColor: Colors.primaryFaint,
  },
  dropdownItemText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  dropdownCreateItem: {
    backgroundColor: Colors.background,
    borderBottomWidth: 0,
  },
  dropdownCreateText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  rolesContainer: {
    minHeight: 60,
    justifyContent: 'center'
  },
  rolesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs
  },
  roleChip: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs
  },
  roleChipActive: {
    backgroundColor: Colors.primaryFaint,
    borderColor: Colors.primary
  },
  roleChipText: {
    ...Typography.bodySm,
    color: Colors.textSecondary
  },
  roleChipTextActive: {
    color: Colors.primary,
    fontWeight: 'bold'
  },
  noRolesBox: {
    alignItems: 'center'
  },
  noRolesText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm
  },
  roleInput: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalBtnCancel: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border
  },
  modalBtnSubmit: {
    backgroundColor: Colors.primary
  },
  modalBtnTextCancel: {
    ...Typography.label,
    color: Colors.textSecondary
  },
  modalBtnTextSubmit: {
    ...Typography.label,
    color: Colors.textInverse,
    fontWeight: 'bold'
  }
});
