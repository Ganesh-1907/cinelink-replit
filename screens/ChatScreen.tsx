import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import api from '../src/api/client';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadImage} from '../src/services/uploadService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Avatar, Header} from '../components/ui';
import {Colors, Spacing, Radius} from '../src/theme';
import {useApp} from '../src/context/AppContext';
import {
  getSocket,
  onChatMessage,
  sendChatMessage,
  sendChatRead,
  onChatRead,
  onChatDelivered,
} from '../src/services/socketService';
import {useTheme} from '../src/context/ThemeContext';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) {
    return 'User';
  }
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

const QUICK_EMOJIS = [
  '😊',
  '😂',
  '❤️',
  '👍',
  '🎬',
  '🎭',
  '🔥',
  '✅',
  '😍',
  '🙏',
  '💪',
  '🎉',
  '👏',
  '🤝',
];

export default function ChatScreen({route, navigation}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const chat = route?.params?.chat;
  const {user: currentUser} = useApp();
  const currentUserId = currentUser?._id || currentUser?.uid;

  useEffect(() => {
    const cid = chat?._id || chat?.id;
    if (!cid) {
      navigation.goBack();
    }
  }, [chat?._id, chat?.id, navigation]);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const chatId = chat?._id || chat?.id;
  const isGroup = chat?.isGroupChat || chat?.groupName;

  const getHeaderName = () => {
    if (isGroup) {
      return chat?.groupName || chat?.title || 'Group Chat';
    }
    const otherId = (chat?.participants || []).find(
      (id: string) => id !== currentUserId,
    );
    const idx = (chat?.participants || []).indexOf(otherId);
    return cleanName((chat?.participantNames || [])[idx] || 'User');
  };

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [headerName, setHeaderName] = useState(getHeaderName());
  const [sending, setSending] = useState(false);

  const renderTicks = (item: any, isImage?: boolean) => {
    if (item._id.startsWith('temp-')) {
      return <Text style={{fontSize: 9, color: isImage ? '#FFFFFF' : Colors.textInverse, opacity: 0.6}}> 🕒</Text>;
    }
    
    const otherParticipants = (chat?.participants || []).filter(
      (p: string) => p !== currentUserId,
    );
    if (otherParticipants.length === 0) {
      return null;
    }

    const isReadByAll = otherParticipants.every((p: string) =>
      (item.readBy || []).includes(p),
    );
    const isDeliveredToAll = otherParticipants.every((p: string) =>
      (item.deliveredTo || []).includes(p) || (item.readBy || []).includes(p),
    );

    const defaultColor = isImage ? '#FFFFFF' : Colors.textInverse;

    if (isReadByAll) {
      return (
        <Text style={{fontSize: 10, color: '#34B7F1', fontWeight: 'bold'}}>
          {' '}✓✓
        </Text>
      );
    }
    if (isDeliveredToAll) {
      return (
        <Text style={{fontSize: 10, color: defaultColor, opacity: 0.7, fontWeight: 'bold'}}>
          {' '}✓✓
        </Text>
      );
    }
    return (
      <Text style={{fontSize: 10, color: defaultColor, opacity: 0.7}}> ✓</Text>
    );
  };

  const loadMessages = useCallback(async () => {
    try {
      const res = await api.get<{messages: any[]}>(`/chat/${chatId}/messages`);
      setMessages(res.messages || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  const loadUserNames = useCallback(async () => {
    if (isGroup) {
      setHeaderName(chat?.groupName || 'Group Chat');
      return;
    }
    let otherId = (chat?.participants || []).find(
      (id: string) => id !== currentUserId,
    );

    // If participants are missing (e.g. opened from a notification),
    // look up the chat from the server to resolve the other participant.
    if (!otherId && chatId) {
      try {
        const listRes = await api.get<{chats: any[]}>('/chat/list');
        const found = (listRes.chats || []).find(
          c => String(c._id || c.id) === String(chatId),
        );
        otherId = (found?.participants || []).find(
          (id: string) => id !== currentUserId,
        );
      } catch (e) {
        console.log(e);
      }
    }

    if (!otherId) {
      return;
    }
    try {
      const res = await api.get<any>(`/users/${otherId}`);
      const data = res?.user;
      if (data) {
        const name =
          data.fullName || data.displayName || data.name || data.email;
        if (name) {
          setHeaderName(cleanName(name));
        }
      }
    } catch (e) {
      console.log(e);
    }
  }, [chat?.groupName, chat?.participants, chatId, currentUserId, isGroup]);

  useEffect(() => {
    loadMessages();
    loadUserNames();

    // Socket.IO real-time
    const socket = getSocket();
    if (socket) {
      socket.emit('chat:join', chatId);
      sendChatRead(chatId, currentUserId);

      const unsub = onChatMessage((msg: any) => {
        if (msg.chatId === chatId) {
          setMessages(prev => {
            // Deduplicate own messages that might be received via socket
            if (msg.senderId === currentUserId) {
              if (prev.some(m => m._id === msg._id)) {
                return prev;
              }
              const hasTemp = prev.find(
                m => m._id.startsWith('temp-') && m.text === msg.text,
              );
              if (hasTemp) {
                return prev.map(m => (m._id === hasTemp._id ? msg : m));
              }
              return prev;
            }

            // Deduplicate other participants' messages
            if (prev.some(m => m._id === msg._id)) {
              return prev;
            }
            // Mark as read immediately on receiving since screen is open
            sendChatRead(chatId, currentUserId);
            return [...prev, msg];
          });
          setTimeout(
            () => flatListRef.current?.scrollToEnd({animated: true}),
            100,
          );
        }
      });

      const unsubRead = onChatRead((data: { chatId: string; userId: string }) => {
        if (data.chatId === chatId) {
          setMessages(prev =>
            prev.map(m => {
              if (m.senderId === currentUserId && m.senderId !== data.userId) {
                const readBy = m.readBy || [];
                const deliveredTo = m.deliveredTo || [];
                return {
                  ...m,
                  readBy: readBy.includes(data.userId) ? readBy : [...readBy, data.userId],
                  deliveredTo: deliveredTo.includes(data.userId) ? deliveredTo : [...deliveredTo, data.userId],
                };
              }
              return m;
            })
          );
        }
      });

      const unsubDelivered = onChatDelivered((data: { chatId: string; userId: string }) => {
        if (data.chatId === chatId) {
          setMessages(prev =>
            prev.map(m => {
              if (m.senderId === currentUserId && m.senderId !== data.userId) {
                const deliveredTo = m.deliveredTo || [];
                return {
                  ...m,
                  deliveredTo: deliveredTo.includes(data.userId) ? deliveredTo : [...deliveredTo, data.userId],
                };
              }
              return m;
            })
          );
        }
      });

      return () => {
        unsub();
        unsubRead();
        unsubDelivered();
        socket.emit('chat:leave', chatId);
      };
    }
  }, [chatId, loadMessages, loadUserNames, currentUserId]);

  useEffect(() => {
    api.put(`/chat/${chatId}/read`).catch(() => {});
    sendChatRead(chatId, currentUserId);
    setTimeout(() => flatListRef.current?.scrollToEnd({animated: false}), 300);
  }, [chatId, messages.length]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || sending) {
      return;
    }
    const text = newMessage.trim();
    setNewMessage('');
    setShowEmojiPicker(false);
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      chatId,
      type: 'text',
      text,
      senderId: currentUserId || '',
      senderEmail: currentUser.email || '',
      createdAt: new Date().toISOString(),
    };

    // Append optimistically and scroll to bottom
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 100);

    try {
      const res = await api.post<any>(`/chat/${chatId}/messages`, {
        type: 'text',
        text,
      });
      if (res?.message) {
        // Replace temp message with server message
        setMessages(prev =>
          prev.map(m => (m._id === tempId ? res.message : m)),
        );
        // Emit Socket.IO message
        sendChatMessage(chatId, res.message);
      }
    } catch (e: any) {
      // Revert optimistic message and show text again
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setNewMessage(text);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.7});
    if (result.assets?.[0]?.uri) {
      uploadChatImage(result.assets[0].uri);
    }
  };

  const uploadChatImage = async (imageUri: string) => {
    try {
      const fileData = await uploadImage(imageUri);
      const res = await api.post<any>(`/chat/${chatId}/messages`, {
        type: 'image',
        imageUrl: fileData.secureUrl,
      });
      if (res?.message) {
        setMessages(prev => [...prev, res.message]);
        sendChatMessage(chatId, res.message);
        setTimeout(
          () => flatListRef.current?.scrollToEnd({animated: true}),
          100,
        );
      }
    } catch (e) {
      console.log(e);
      Alert.alert('Upload Failed', 'Could not send image. Please try again.');
    }
  };

  const unsendMessage = async (messageId: string) => {
    Alert.alert('Unsend Message', 'Remove this message for everyone?', [
      {
        text: 'Unsend',
        style: 'destructive',
        onPress: async () => {
          try {
            setMessages(prev =>
              prev.map(m =>
                m._id === messageId
                  ? {...m, deleted: true, text: 'This message was unsent'}
                  : m,
              ),
            );
            await api.delete(`/chat/${chatId}/messages/${messageId}`);
          } catch (e) {
            console.log(e);
          }
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleLongPress = (message: any) => {
    const isMyMessage = message.senderId === currentUserId;
    const options: any[] = [
      {
        text: '↩️ Reply',
        onPress: () => {
          inputRef.current?.focus();
        },
      },
    ];
    if (isMyMessage) {
      options.push({
        text: '🗑 Unsend',
        style: 'destructive',
        onPress: () => unsendMessage(message._id || message.id),
      });
    }
    options.push({text: 'Cancel', style: 'cancel'});
    Alert.alert('Message Options', '', options);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) {
      return '';
    }
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  const renderItem = ({item, index}: any) => {
    const isMine = item.senderId === currentUserId;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showAvatar = !isMine && item.senderId !== prevMsg?.senderId;

    if (item.deleted) {
      return (
        <View style={styles.deletedRow}>
          <Text style={styles.deletedText}>This message was unsent</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        style={[
          styles.msgRow,
          isMine ? styles.msgRowMine : styles.msgRowTheirs,
        ]}>
        {showAvatar && (
          <Avatar
            name={
              isGroup
                ? item.senderEmail || item.senderName || 'User'
                : headerName
            }
            size="xs"
          />
        )}
        {!showAvatar && !isMine && <View style={styles.avatarPlaceholder} />}
        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
            item.type === 'image' && styles.bubbleImageWrapper,
          ]}>
          {isGroup && !isMine && showAvatar && (
            <Text style={styles.senderName}>
              {cleanName(item.senderEmail || item.senderName || 'User')}
            </Text>
          )}
          {item.type === 'image' && item.imageUrl ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ImageViewer', {imageUrl: item.imageUrl})
              }
              activeOpacity={0.9}
              style={styles.imageBubbleContainer}>
              <Image
                source={{uri: item.imageUrl}}
                style={styles.bubbleImage}
                resizeMode="cover"
              />
              <View style={styles.imageTimeContainer}>
                <Text style={[styles.msgTime, styles.imageTimeText]}>
                  {formatTime(item.createdAt)}
                  {isMine && renderTicks(item, true)}
                </Text>
              </View>
            </TouchableOpacity>
          ) : item.type === 'image' ? (
            <View>
              <Text style={styles.photoText}>📷 Photo</Text>
              <Text style={styles.msgTime}>{formatTime(item.createdAt)}</Text>
            </View>
          ) : (
            <Text
              style={[
                styles.msgText,
                isMine ? styles.msgTextMine : styles.msgTextTheirs,
              ]}>
              {item.text}
              <Text
                style={[
                  styles.msgTimeInline,
                  isMine
                    ? styles.msgTimeInlineMine
                    : styles.msgTimeInlineTheirs,
                ]}>
                {'   ' + formatTime(item.createdAt)}
                {isMine && renderTicks(item)}
              </Text>
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}>
      <Header title={headerName} navigation={navigation} />

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.loader}
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item._id || item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.msgList}
        />
      )}

      {showEmojiPicker && (
        <View style={styles.emojiRow}>
          {QUICK_EMOJIS.map(emoji => (
            <TouchableOpacity
              key={emoji}
              onPress={() => {
                setNewMessage(prev => prev + emoji);
                inputRef.current?.focus();
              }}>
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={[styles.inputRow, {paddingBottom: insets.bottom + 8}]}>
        <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
          <Text style={styles.attachIcon}>📎</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowEmojiPicker(!showEmojiPicker)}
          style={styles.emojiBtn}>
          <Text style={styles.emojiIcon}>😊</Text>
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: Colors.textPrimary,
              backgroundColor: Colors.cardElevated,
              borderColor: Colors.border,
            },
          ]}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textTertiary}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!newMessage.trim() || sending) && styles.sendDisabled,
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}>
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backBtn: {padding: Spacing.sm},
  backText: {color: Colors.primary, fontSize: 24, fontWeight: 'bold'},
  headerName: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginLeft: Spacing.sm,
  },
  msgList: {padding: Spacing.md, paddingBottom: 20},
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
    gap: Spacing.xs,
  },
  msgRowMine: {justifyContent: 'flex-end'},
  msgRowTheirs: {justifyContent: 'flex-start'},
  bubble: {
    maxWidth: '75%',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  bubbleMine: {backgroundColor: Colors.primary},
  bubbleTheirs: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  msgText: {fontSize: 15, lineHeight: 20},
  msgTextMine: {color: Colors.textInverse},
  msgTextTheirs: {color: Colors.textPrimary},
  msgTime: {
    fontSize: 10,
    color: Colors.textTertiary,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  msgTimeInline: {fontSize: 9.5},
  msgTimeInlineMine: {color: Colors.textInverse, opacity: 0.75},
  msgTimeInlineTheirs: {color: Colors.textSecondary},
  avatarPlaceholder: {width: 24},
  photoText: {color: Colors.primary},
  deletedRow: {alignItems: 'center', paddingVertical: Spacing.xs},
  deletedText: {color: Colors.textTertiary, fontSize: 12, fontStyle: 'italic'},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
    gap: Spacing.xs,
  },
  attachBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachIcon: {fontSize: 20},
  emojiBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiIcon: {fontSize: 20},
  input: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    borderWidth: 1,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
  },
  sendDisabled: {opacity: 0.4},
  sendText: {color: '#FFFFFF', fontWeight: '700', fontSize: 14},
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.sm,
    backgroundColor: Colors.card,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  emoji: {fontSize: 22},
  loader: {marginTop: 60},
  bubbleImageWrapper: {
    paddingVertical: 3,
    paddingHorizontal: 3,
  },
  imageBubbleContainer: {
    position: 'relative',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  bubbleImage: {
    width: 220,
    height: 160,
    borderRadius: Radius.md,
  },
  imageTimeContainer: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  imageTimeText: {
    color: '#FFFFFF',
    fontSize: 9,
    marginTop: 0,
  },
});
