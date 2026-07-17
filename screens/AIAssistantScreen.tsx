import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';

import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Chip} from '../components/ui';

const SYSTEM_CONTEXT = `You are CineLink AI — an expert assistant for Indian cinema creators.
You help actors, directors, and short film makers with:
- Audition tips and preparation
- Script writing and feedback
- Film production advice
- Crew hiring guidance
- Contest strategies
- Career growth in Indian cinema (Bollywood, Tollywood, Kollywood, etc.)
Keep responses concise, practical, and encouraging. Use simple language.`;

/* ── safe error message helper ── */
const getErrorMessage = (e: unknown): string => {
  if (e instanceof Error) {
    return e.message;
  }
  if (typeof e === 'string') {
    return e;
  }
  return 'Something went wrong. Please try again.';
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
};

const SUGGESTED_PROMPTS = [
  '🎭 How to prepare for an audition?',
  '🎬 Tips for directing a short film',
  '📝 Help me write a character bio',
  '🏆 How to win a film contest?',
];

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: "Namaste! 🎬 I'm CineLink AI, your personal cinema assistant. Ask me anything about auditions, filmmaking, scripts, or growing your career in Indian cinema!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 100);
    }
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || loading) {
      return;
    }

    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== '0')
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.text,
        }));

      // Use backend API — Gemini key is on the server
      const result = await api.post('/ai/chat', {
        message: userText,
        history,
      });

      const aiText =
        result.reply ||
        'Sorry, I could not generate a response. Please try again.';

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: aiText.trim(),
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      /* FIX: use getErrorMessage helper — no .message property access */
      const errorMsg = getErrorMessage(e);
      console.log('AI error:', errorMsg);

      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `⚠️ ${errorMsg}\n\nPlease check your internet connection and try again.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({item}: {item: Message}) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}>
        {!isUser && <Text style={styles.aiLabel}>🤖 CineLink AI</Text>}
        <Text style={[styles.messageText, isUser && styles.userText]}>
          {item.text}
        </Text>
        <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
          {item.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🤖</Text>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>CineLink AI</Text>
          <Text style={styles.headerSubtitle}>Your Cinema Assistant</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}>
        {/* MESSAGES */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading ? (
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.typingText}>
                  CineLink AI is thinking...
                </Text>
              </View>
            ) : null
          }
        />

        {/* SUGGESTED PROMPTS */}
        {messages.length === 1 && (
          <View style={styles.suggestedContainer}>
            <Text style={styles.suggestedLabel}>Quick questions:</Text>
            <View style={styles.suggestedRow}>
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <Chip
                  key={i}
                  label={prompt}
                  onPress={() => sendMessage(prompt)}
                  selected={false}
                />
              ))}
            </View>
          </View>
        )}

        {/* INPUT ROW */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about auditions, films, scripts..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || loading) && styles.sendBtnDisabled,
            ]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}>
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  container: {flex: 1, backgroundColor: Colors.background},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.cardElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  headerIcon: {fontSize: 28},
  headerTextBlock: {flex: 1},
  headerTitle: {...Typography.h4, color: Colors.textPrimary},
  headerSubtitle: {...Typography.caption, color: Colors.textSecondary},
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.success,
  },

  messageList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.sm,
  },

  messageBubble: {
    maxWidth: '82%',
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.xs,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.cardElevated,
    borderBottomLeftRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  aiLabel: {
    ...Typography.micro,
    color: Colors.primary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  messageText: {...Typography.body, color: Colors.textSecondary},
  userText: {color: Colors.textPrimary},

  timestamp: {
    ...Typography.micro,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    alignSelf: 'flex-end',
  },
  userTimestamp: {color: 'rgba(255,255,255,0.6)'},

  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  typingText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },

  suggestedContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  suggestedLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  suggestedRow: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm},

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.cardElevated,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    ...Typography.body,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {backgroundColor: Colors.borderLight},
  sendIcon: {color: Colors.textPrimary, fontSize: 16, marginLeft: 2},
});
