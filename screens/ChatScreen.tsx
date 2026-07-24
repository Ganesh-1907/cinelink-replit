import React, {useEffect, useState, useRef} from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import api from '../src/api/client';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadImage} from '../src/services/uploadService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Avatar} from '../components/ui';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {useApp} from '../src/context/AppContext';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return 'User';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

const QUICK_EMOJIS = ['😊','😂','❤️','👍','🎬','🎭','🔥','✅','😍','🙏','💪','🎉','👏','🤝'];

export default function ChatScreen({route, navigation}: any) {
  const insets = useSafeAreaInsets();
  const chat = route?.params?.chat;
  const {user: currentUser} = useApp();

  useEffect(() => {
    if (!chat?.id && !chat?._id) navigation.goBack();
  }, []);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const otherUserId = (chat?.participants || []).find((id: string) => id !== currentUser?.uid);
  const initialHeaderName = cleanName((chat?.participantNames || [])[0] || 'User');
  const chatId = chat?._id || chat?.id;

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [otherUserName, setOtherUserName] = useState(initialHeaderName);
  const [sending, setSending] = useState(false);

  const loadMessages = async () => {
    try {
      const res = await api.get<{messages: any[]}>(`/chat/${chatId}/messages`);
      setMessages(res.messages || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  const loadOtherUser = async () => {
    if (!otherUserId) return;
    try {
      const res = await api.get<any>(`/users/${otherUserId}`);
      const data = res?.user;
      if (data) {
        const name = data.fullName || data.displayName || data.name || data.email;
        if (name) setOtherUserName(cleanName(name));
      }
    } catch (e) { console.log(e); }
  };

  useEffect(() => {
    loadMessages();
    loadOtherUser();
    // Poll for new messages every 3s (Socket.IO would be better but REST is reliable)
    pollRef.current = setInterval(loadMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    // Mark as read
    api.put(`/chat/${chatId}/read`).catch(() => {});
    setTimeout(() => flatListRef.current?.scrollToEnd({animated: false}), 300);
  }, [messages.length]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || sending) return;
    const text = newMessage.trim();
    setNewMessage('');
    setShowEmojiPicker(false);
    setSending(true);

    try {
      await api.post(`/chat/${chatId}/messages`, {type: 'text', text});
      loadMessages();
    } catch (e: any) {
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
      await api.post(`/chat/${chatId}/messages`, {type: 'image', imageUrl: fileData.secureUrl});
      loadMessages();
    } catch (e) {
      console.log(e);
      Alert.alert('Upload Failed', 'Could not send image. Please try again.');
    }
  };

  const unsendMessage = async (messageId: string) => {
    Alert.alert('Unsend Message', 'Remove this message for everyone?', [
      {text: 'Unsend', style: 'destructive', onPress: async () => {
        try {
          setMessages(prev => prev.map(m => m._id === messageId ? {...m, deleted: true, text: 'This message was unsent'} : m));
          await api.delete(`/chat/${chatId}/messages/${messageId}`);
        } catch (e) { console.log(e); }
      }},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleLongPress = (message: any) => {
    const isMyMessage = message.senderId === currentUser?.uid;
    const options: any[] = [
      {text: '↩️ Reply', onPress: () => { inputRef.current?.focus(); }},
    ];
    if (isMyMessage) {
      options.push({text: '🗑 Unsend', style: 'destructive', onPress: () => unsendMessage(message._id || message.id)});
    }
    options.push({text: 'Cancel', style: 'cancel'});
    Alert.alert('Message Options', '', options);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  const renderItem = ({item, index}: any) => {
    const isMine = item.senderId === currentUser?.uid;
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
      <TouchableOpacity onLongPress={() => handleLongPress(item)} style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
        {showAvatar && <Avatar name={otherUserName} size="xs" />}
        {!showAvatar && !isMine && <View style={{width: 24}} />}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {item.type === 'image' ? (
            <TouchableOpacity>
              <Text style={{color: Colors.primary}}>📷 Photo</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.msgText, isMine ? styles.msgTextMine : styles.msgTextTheirs]}>{item.text}</Text>
          )}
          <Text style={styles.msgTime}>{formatTime(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <View style={[styles.header, {paddingTop: insets.top + 4}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerName}>{otherUserName}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} />
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
            <TouchableOpacity key={emoji} onPress={() => { setNewMessage(prev => prev + emoji); inputRef.current?.focus(); }}>
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={[styles.inputRow, {paddingBottom: insets.bottom + 8}]}>
        <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
          <Text style={styles.attachIcon}>📎</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowEmojiPicker(!showEmojiPicker)} style={styles.emojiBtn}>
          <Text style={styles.emojiIcon}>😊</Text>
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={[styles.input, {color: Colors.textPrimary, backgroundColor: Colors.cardElevated, borderColor: Colors.border}]}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textTertiary}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border, backgroundColor: Colors.card},
  backBtn: {padding: Spacing.sm},
  backText: {color: Colors.primary, fontSize: 24, fontWeight: 'bold'},
  headerName: {color: Colors.textPrimary, fontSize: 17, fontWeight: '700', marginLeft: Spacing.sm},
  msgList: {padding: Spacing.md, paddingBottom: 20},
  msgRow: {flexDirection: 'row', alignItems: 'flex-end', marginBottom: Spacing.sm, gap: Spacing.xs},
  msgRowMine: {justifyContent: 'flex-end'},
  msgRowTheirs: {justifyContent: 'flex-start'},
  bubble: {maxWidth: '75%', padding: Spacing.md, borderRadius: Radius.lg},
  bubbleMine: {backgroundColor: Colors.primary},
  bubbleTheirs: {backgroundColor: Colors.cardElevated, borderWidth: 1, borderColor: Colors.border},
  msgText: {fontSize: 15, lineHeight: 21},
  msgTextMine: {color: '#FFFFFF'},
  msgTextTheirs: {color: Colors.textPrimary},
  msgTime: {fontSize: 10, color: Colors.textTertiary, alignSelf: 'flex-end', marginTop: 4},
  deletedRow: {alignItems: 'center', paddingVertical: Spacing.xs},
  deletedText: {color: Colors.textTertiary, fontSize: 12, fontStyle: 'italic'},
  inputRow: {flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: Colors.border, backgroundColor: Colors.card, gap: Spacing.xs},
  attachBtn: {width: 36, height: 36, justifyContent: 'center', alignItems: 'center'},
  attachIcon: {fontSize: 20},
  emojiBtn: {width: 36, height: 36, justifyContent: 'center', alignItems: 'center'},
  emojiIcon: {fontSize: 20},
  input: {flex: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: 15, borderWidth: 1, maxHeight: 100},
  sendBtn: {backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2},
  sendDisabled: {opacity: 0.4},
  sendText: {color: '#FFFFFF', fontWeight: '700', fontSize: 14},
  emojiRow: {flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.sm, backgroundColor: Colors.card, borderTopWidth: 0.5, borderTopColor: Colors.border, gap: Spacing.sm},
  emoji: {fontSize: 22},
});
