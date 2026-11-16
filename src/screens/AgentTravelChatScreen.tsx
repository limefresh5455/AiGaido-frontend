import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../services/chatService';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'AgentTravelChat'>;
  route: RouteProp<AuthStackParamList, 'AgentTravelChat'>;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  orderIndex?: number;
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AgentTravelChatScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  
  const routeSessionId = route.params?.sessionId;

  const [messageText, setMessageText] = useState('');
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(routeSessionId || null);
  const [typingDots, setTypingDots] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (isBotTyping) {
      interval = setInterval(() => {
        setTypingDots(prev => (prev.length >= 3 ? '' : prev + '.'));
      }, 400);
    } else {
      setTypingDots('');
    }
    return () => clearInterval(interval);
  }, [isBotTyping]);

  // If no sessionId passed in route params, restore from AsyncStorage
  // Only restore previous session if explicitly opening the chat (not new chat)
  useEffect(() => {
    if (!routeSessionId) {
      // newChat: true means the user pressed + to start a fresh conversation
      const isNewChat = route.params?.newChat === true;
      if (!isNewChat) {
        AsyncStorage.getItem('agent_travel_session_id').then(savedId => {
          if (savedId && savedId !== 'null' && savedId !== 'undefined' && savedId.trim() !== '') {
            setSessionId(savedId);
          }
        });
      }
    }
  }, [routeSessionId]);

  const PAGE_SIZE = 5;

  // Infinite query for pagination
  const {
    data: sessionPages,
    isLoading: isLoadingHistory,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['TravelChatSession', sessionId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await chatService.getSession(sessionId as string, pageParam, PAGE_SIZE);
      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage?.has_next) {
        return (lastPage.page || 1) + 1;
      }
      return undefined;
    },
    enabled: !!sessionId,
    staleTime: 10 * 1000,
    refetchOnMount: 'always',
  });

  const firstPage = sessionPages?.pages?.[0];
  const sessionTitle = firstPage?.title;

  // Function to sort messages in descending order (latest message first, index 0 is newest)
  const sortMessagesDescending = (msgs: Message[]) => {
    return [...msgs].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) {
        return timeB - timeA; // Descending: latest first
      }
      // If timestamps are identical, assistant message is the response to user, so assistant is newer
      if (a.role !== b.role) {
        return a.role === 'assistant' ? -1 : 1;
      }
      if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
        return b.orderIndex - a.orderIndex;
      }
      return (b.id || '').localeCompare(a.id || '');
    });
  };

  // Normalize text only for matching the optimistic message with the backend message.
  const normalizeMessageContent = (content: string) =>
    (content || '').replace(/\s+/g, ' ').trim();

  // Find the backend copy of an optimistic message.
  // We deliberately do NOT use the message ID because the local optimistic
  // message and the backend message have different IDs.
  const findApiMatchForLocalMessage = (
    localMessage: Message,
    apiMessages: Message[],
  ): Message | undefined => {
    if (!localMessage.id.startsWith('local_')) return undefined;

    const localContent = normalizeMessageContent(localMessage.content);
    if (!localContent) return undefined;

    const candidates = apiMessages.filter(apiMessage => {
      if (!apiMessage || apiMessage.role !== localMessage.role) return false;

      const apiContent = normalizeMessageContent(apiMessage.content);
      if (!apiContent) return false;

      if (localMessage.role === 'user') {
        // The user's request should be exactly the same.
        return apiContent === localContent;
      }

      // The assistant response can be streamed locally while the backend
      // already contains the complete answer.
      return (
        apiContent === localContent ||
        apiContent.startsWith(localContent) ||
        localContent.startsWith(apiContent)
      );
    });

    if (candidates.length === 0) return undefined;

    // Prefer the newest matching backend message. This prevents an old
    // identical assistant answer from being selected when the conversation
    // contains repeated text.
    return [...candidates].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    })[0];
  };

  // Sync display messages with backend data and temporary optimistic messages.
  useEffect(() => {
    let globalIndex = 0;

    const apiMessages: Message[] = (sessionPages?.pages?.flatMap((page, pageIdx) => {
      return (page?.messages || []).map((m: any, mIdx: number) => {
        const orderIdx = globalIndex++;

        return {
          id: m.id ? String(m.id) : `api_${pageIdx}_${mIdx}_${m.created_at || ''}`,
          role: m.role as 'user' | 'assistant',
          content: m.content || m.message_text || '',
          created_at: m.created_at || new Date().toISOString(),
          orderIndex: orderIdx,
        };
      });
    }) || []) as Message[];

    // Backend messages are the source of truth.
    const map = new Map<string, Message>();

    for (const msg of apiMessages) {
      if (msg?.id) {
        map.set(msg.id, msg);
      }
    }

    // Local messages are ONLY temporary optimistic messages. Once the
    // backend returns their copy, do not render the local copy.
for (const localMessage of localMessages) {
      if (!localMessage?.id) continue;

      const apiMatch = findApiMatchForLocalMessage(localMessage, apiMessages);

      if (!apiMatch) {
        map.set(localMessage.id, localMessage);
      }
    }

    setDisplayMessages(sortMessagesDescending(Array.from(map.values())));
}, [sessionPages, localMessages, sessionId]);

  const { mutateAsync: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (content: string) => {
      const payload: any = { query: content };
      if (sessionId && sessionId !== 'null' && sessionId !== 'undefined' && sessionId.trim() !== '') {
        payload.session_id = sessionId;
      }
      return await chatService.sendMessage(payload);
    },
 onSuccess: async (data) => {
  const newSessionId = data?.session_id
    ? String(data.session_id)
    : null;

  const activeSessionId = newSessionId || sessionId;

  if (newSessionId && !sessionId) {
    setSessionId(newSessionId);

    await AsyncStorage.setItem(
      'agent_travel_session_id',
      newSessionId,
    );
  }

  const assistantText = data?.answer || '';

  if (assistantText) {
    simulateStreaming(assistantText);
  } else {
    setIsBotTyping(false);
  }

  if (activeSessionId) {
    await queryClient.invalidateQueries({
      queryKey: ['TravelChatSession', activeSessionId],
    });
  }

  await queryClient.invalidateQueries({
    queryKey: ['TravelChats'],
  });
},
  onError: (error: any) => {
  setIsBotTyping(false);

  const errorMessage =
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    'Something went wrong. Please try again.';

  Alert.alert('Error', errorMessage);
},
  });

  const simulateStreaming = (fullText: string) => {
    setIsBotTyping(false);
    setIsStreaming(true);
    
    const assistantMessageId = `local_assistant_${Date.now()}`;
    const newAssistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    
    setLocalMessages(prev => [newAssistantMessage, ...prev]);
    scrollToBottom(true);

    let currentText = '';
    let charIndex = 0;
    const chunkSize = 8;

    const interval = setInterval(() => {
      if (charIndex < fullText.length) {
        currentText += fullText.slice(charIndex, charIndex + chunkSize);
        setLocalMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId ? { ...msg, content: currentText } : msg
          )
        );
        charIndex += chunkSize;
      } else {
        clearInterval(interval);
        setIsStreaming(false);
      }
    }, 5);
  };

  const scrollToBottom = (animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated });
    });
  };

const handleSend = async () => {
  const trimmed = messageText.trim();

  // Only block while the current API request is being sent or the
  // typing indicator is active. Streaming the previous answer should
  // NOT prevent the user from sending the next message.
  if (!trimmed || isSending || isBotTyping) {
    return;
  }

  const optimisticUserMessage: Message = {
    id: `local_user_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    role: 'user',
    content: trimmed,
    created_at: new Date().toISOString(),
  };

  // Clear input immediately so the user can see that the message was sent.
  setMessageText('');

  // Add the user message directly to localMessages. This is more reliable
  // than useOptimistic/useTransition for this chat flow.
  setLocalMessages(prev => [optimisticUserMessage, ...prev]);

  requestAnimationFrame(() => {
    scrollToBottom(true);
  });

  try {
    // Wait only for the API request. The AI answer may continue streaming
    // after this resolves, and that streaming must not block another send.
    await sendMessage(trimmed);
  } catch {
    // onError in the mutation displays the error to the user.
  }
};

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const getDateLabel = (index: number): string | null => {
    if (!displayMessages[index]?.created_at) return null;
    if (index === displayMessages.length - 1) {
      return formatDate(displayMessages[index].created_at);
    }
    const nextOlderItem = displayMessages[index + 1];
    if (!nextOlderItem?.created_at) return null;
    const currentDate = new Date(displayMessages[index].created_at).toDateString();
    const olderDate = new Date(nextOlderItem.created_at).toDateString();
    if (currentDate !== olderDate) {
      return formatDate(displayMessages[index].created_at);
    }
    return null;
  };

  const renderTypingIndicator = () => {
    if (!isBotTyping) return null;
    return (
      <View style={[styles.messageBubbleRow, styles.messageBubbleRowLeft]}>
        <View style={styles.assistantIconContainer}>
          <Icon name="airplane" size={14} color="#3b2c85" />
        </View>
        <View style={[styles.messageBubble, styles.assistantBubble, { paddingVertical: 12, paddingHorizontal: 16, minWidth: 50 }]}>
          <Text style={{ fontSize: 18, color: '#3b2c85', letterSpacing: 2 }}>
            {typingDots || ' '}
          </Text>
        </View>
      </View>
    );
  };

  const renderListHeader = () => {
    return renderTypingIndicator();
  };

  const renderListFooter = () => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#3b2c85" />
          <Text style={styles.loadingMoreText}>Loading older messages...</Text>
        </View>
      );
    }
    if (!hasNextPage && displayMessages.length > 0) {
      return (
        <View style={styles.chatInfoCard}>
          <Icon name="airplane-outline" size={18} color="#3b2c85" />
          <Text style={styles.chatInfoText}>
            AI Travel Planning with{' '}
            <Text style={styles.chatInfoBold}>Travel Agent</Text>
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';
    const dateLabel = getDateLabel(index);

    return (
      <>
      
        <View
          style={[
            styles.messageBubbleRow,
            isUser ? styles.messageBubbleRowRight : styles.messageBubbleRowLeft,
          ]}>
          {!isUser && (
            <View style={styles.assistantIconContainer}>
              <Icon name="airplane" size={14} color="#3b2c85" />
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.assistantBubble,
            ]}>
            {isUser ? (
              <Text
                style={[
                  styles.messageText,
                  styles.userMessageText,
                ]}>
                {item.content}
              </Text>
            ) : (
              <Markdown
                style={{
                  body: StyleSheet.flatten([styles.messageText, styles.assistantMessageText, { marginVertical: 0 }]) as any,
                  paragraph: { marginTop: 0, marginBottom: 0 },
                }}>
                {item.content}
              </Markdown>
            )}
            <Text
              style={[
                styles.messageTime,
                isUser ? styles.userMessageTime : styles.assistantMessageTime,
              ]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
          {dateLabel && (
          <View style={styles.dateLabelContainer}>
            <View style={styles.dateLabelPill}>
              <Text style={styles.dateLabelText}>{dateLabel}</Text>
            </View>
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#3b2c85" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {sessionTitle || 'Travel Agent'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {sessionTitle ? 'Travel Agent' : 'AI Assistant'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.headerAction}
          onPress={() => {
            const isHistory = !!sessionId;
            Alert.alert(
              isHistory ? 'Delete Chat' : 'Clear Chat',
              isHistory 
                ? 'Are you sure you want to delete this travel session history?' 
                : 'Are you sure you want to clear the conversation?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: isHistory ? 'Delete' : 'Clear', 
                  style: 'destructive', 
                  onPress: async () => {
                    if (sessionId) {
                      try {
                        await chatService.deleteSession(sessionId);
                        queryClient.invalidateQueries({ queryKey: ['TravelChats'] });
                        queryClient.removeQueries({ queryKey: ['TravelChatSession', sessionId] });
                        AsyncStorage.removeItem('agent_travel_messages');
                        AsyncStorage.removeItem('agent_travel_session_id');
                        if (route.params?.sessionId) {
                          navigation.goBack();
                        } else {
                          setSessionId(null);
                          setLocalMessages([]);
                          setDisplayMessages([]);
                        }
                      } catch (error) {
                        Alert.alert('Error', 'Failed to delete travel session');
                      }
                    } else {
                      setDisplayMessages([]);
                      setLocalMessages([]);
                      setSessionId(null);
                      AsyncStorage.removeItem('agent_travel_messages');
                      AsyncStorage.removeItem('agent_travel_session_id');
                    }
                  } 
                }
              ]
            );
          }}>
          <Icon name="trash-outline" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {isLoadingHistory && displayMessages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b2c85" />
            <Text style={styles.loadingText}>Loading conversation history...</Text>
          </View>
        ) : displayMessages.length === 0 ? (
          // Keep the empty/default state OUTSIDE the inverted FlatList.
          // This prevents FlatList's inversion transform from rotating it.
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="chatbubble" size={32} color="#3b2c85" />
            </View>

            <Text style={styles.emptyTitle}>
              AI Travel Assistant
            </Text>

            <Text style={styles.emptyText}>
              Where would you like to travel? Tell me your destination, duration, or budget to plan your itinerary.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayMessages}
            inverted={true}
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
            ListFooterComponent={renderListFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.2}
          />
        )}

        <View style={[styles.inputContainer, { paddingBottom: isKeyboardVisible ? 10 : Math.max(10, insets.bottom + 10) }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type your travel query..."
              placeholderTextColor="#9ca3af"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              editable={!isSending && !isBotTyping}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || isSending || isBotTyping) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!messageText.trim() || isSending || isBotTyping}>
              {isSending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Icon name="send" size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#3b2c85',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#3b2c85',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
    fontFamily: 'Poppins-Regular',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255,255,255,0.7)',
  },
  headerAction: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f0eff5',
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexGrow: 1,
    fontFamily: 'Poppins-Regular',
  },

  // Chat info card
  chatInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8e6f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginVertical: 12,
    gap: 8,
    alignSelf: 'center',
    fontFamily: 'Poppins-Regular',
  },
  chatInfoText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
  },
  chatInfoBold: {
    fontFamily: 'Poppins-SemiBold',
    color: '#3b2c85',
  },

  // Date label
  dateLabelContainer: {
    alignItems: 'center',
    marginVertical: 12,
    fontFamily: 'Poppins-Regular',
  },
  dateLabelPill: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    fontFamily: 'Poppins-Regular',
  },
  dateLabelText: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: 'Poppins-SemiBold',
  },

  messageBubbleRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    fontFamily: 'Poppins-Regular',
  },
  messageBubbleRowRight: {
    justifyContent: 'flex-end',
    fontFamily: 'Poppins-Regular',
  },
  messageBubbleRowLeft: {
    justifyContent: 'flex-start',
    fontFamily: 'Poppins-Regular',
  },
  assistantIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e8e6f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    fontFamily: 'Poppins-Regular',
  },
  userBubble: {
    backgroundColor: '#3b2c85',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    lineHeight: 20,
  },
  userMessageText: {
    color: '#ffffff',
    fontFamily: 'Poppins-Regular',
  },
  assistantMessageText: {
    color: '#1f2937',
    fontFamily: 'Poppins-Regular',
  },
  messageTime: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Poppins-Regular',
  },
  assistantMessageTime: {
    color: '#9ca3af',
    fontFamily: 'Poppins-Regular',
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#111827',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b2c85',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
  },
  loadingMoreContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
    alignSelf: 'center',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#3b2c85',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
