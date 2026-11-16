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
  Modal,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { placeService } from '../services/placeService';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { Menu } from "react-native-paper"
import Markdown from 'react-native-markdown-display';
type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ChatDetail'>;
  route: RouteProp<AuthStackParamList, 'ChatDetail'>;
};

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type SessionDetail = {
  session_id: number;
  place: {
    place_id: string;
    name: string;
    address: string;
  };
  title: string;
  messages: Message[];
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#2563eb',
];

function getAvatarColor(id: any): string {
  return '#fff';
}

function getPlaceInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('');
}


function formatDate(dateString: string): string {
  const date = new Date(dateString);
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

export default function ChatDetailScreen({ navigation, route }: Props) {
  const {
    sessionId,
    placeName = 'Chat',
    placeAddress = '',
    placeId
  } = route.params || {};
  const insets = useSafeAreaInsets();
  const [messageText, setMessageText] = useState('');
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
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
  const avatarColor = getAvatarColor(sessionId);
  const initials = getPlaceInitials(placeName);
  const [visible, setVisible] = useState(false);
  const [newTitle, setNewTitle] = useState(placeName);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const query = useQueryClient();

  const PAGE_SIZE = 30;

  // Fetch session detail with infinite pagination
  const {
    data: sessionPages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['ChatSession', sessionId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await placeService.getSession(sessionId as string, pageParam, PAGE_SIZE);
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

  const firstPageSession = sessionPages?.pages?.[0]?.session;
  const currentPlaceId = firstPageSession?.place?.place_id || placeId;
  const currentPlaceName = firstPageSession?.place?.name || placeName;
  const currentPlaceAddress = firstPageSession?.place?.address || placeAddress;

  useEffect(() => {
    if (firstPageSession?.title) {
      setNewTitle(firstPageSession.title);
    }
  }, [firstPageSession?.title]);

  // Function to sort messages in descending order (latest message first)
  const sortMessagesDescending = (msgs: Message[]) => {
    return [...msgs].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) {
        return timeB - timeA; // Descending: latest first
      }
      return (b.id || 0) - (a.id || 0); // Descending by id
    });
  };

  // Sync display messages with session data and local messages
  useEffect(() => {
    const apiMessages: Message[] = (sessionPages?.pages
      ?.flatMap(page => (page.session?.messages as Message[]) || []) || []) as Message[];

    const map = new Map<number | string, Message>();
    for (const msg of apiMessages) {
      if (msg && msg.id != null) {
        map.set(msg.id, msg);
      }
    }
    for (const msg of localMessages) {
      if (msg && msg.id != null) {
        map.set(msg.id, msg);
      }
    }

    const merged = Array.from(map.values());
    setDisplayMessages(sortMessagesDescending(merged));
  }, [sessionPages, localMessages]);

  // Send a new message
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (content: string) => {
      return await placeService.askQuestion(
        currentPlaceId!,
        {
          question: content,
          session_id: sessionId as string,
        }
      );
    },

    onSuccess: (data) => {
      const assistantText = data?.answer || '';
      setIsBotTyping(false);

      if (assistantText) {
        const assistantMessage: Message = {
          id: Date.now() + 1,
          role: 'assistant',
          content: assistantText,
          created_at: new Date().toISOString(),
        };

        setLocalMessages(prev => [assistantMessage, ...prev]);
        scrollToBottom(true);
      }
      query.invalidateQueries({ queryKey: ['AllChats'] });
    },

    onError: (error: any) => {
      setIsBotTyping(false);

      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        'Something went wrong. Please try again.';

      Alert.alert('Error Sending Message', errorMessage);
    },
  });

  const handleDeleteSession = (sessionIdToDelete: any) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSession(sessionIdToDelete),
        },
      ]
    );
  };

  // delete session
  const { mutate: deleteSession, isPending: isDeleting } = useMutation({
    mutationFn: async (sessionIdToDelete: any) => {
      return await placeService.deleteSessions([sessionIdToDelete]);
    },
    onSuccess: () => {
      query.invalidateQueries({ queryKey: ['AllChats'] });
      navigation.goBack();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || error?.response?.data?.message || '';
      Alert.alert('Error Deleting Chat', errorMessage);
    }
  });

  // Scroll to bottom (offset 0 in inverted FlatList)
  const scrollToBottom = (animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated });
    });
  };

  const handleSend = () => {
    const trimmed = messageText.trim();

    if (!trimmed || isSending || isBotTyping) {
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    // Show user's message immediately at index 0 (latest)
    setLocalMessages(prev => [userMessage, ...prev]);
    setMessageText('');

    // Show typing indicator
    setIsBotTyping(true);

    // Scroll to bottom
    scrollToBottom(true);

    // Send API request
    sendMessage(trimmed);
  };

  // Load next page of older messages when scrolling to top of chat
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Group messages by date in descending order (index 0 is newest, index N is oldest)
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
          <Icon name="sparkles" size={14} color="#3b2c85" />
        </View>
        <View style={[styles.messageBubble, styles.assistantBubble, { paddingVertical: 12, paddingHorizontal: 16, minWidth: 50 }]}>
          <Text style={{ fontSize: 18, color: '#3b2c85', letterSpacing: 2 }}>
            {typingDots || ' '}
          </Text>
        </View>
      </View>
    );
  };

  // ListHeaderComponent renders at the bottom in inverted FlatList
  const renderListHeader = () => {
    return renderTypingIndicator();
  };

  // ListFooterComponent renders at the top in inverted FlatList
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
          <Icon name="location-outline" size={18} color="#3b2c85" />
          <Text style={styles.chatInfoText}>
            Conversation about{' '}
            <Text style={styles.chatInfoBold}>{currentPlaceName}</Text>
          </Text>
        </View>
      );
    }
    return null;
  };

  // ListEmptyComponent (flipped to remain upright in inverted list)
  const renderEmptyComponent = () => {
    if (isLoading) return null;
    return (
      <View style={[styles.emptyChat, { transform: [{ scaleY: -1 }] }]}>
        <Icon name="chatbubble-outline" size={40} color="#d1d5db" />
        <Text style={styles.emptyChatText}>
          No messages yet. Ask something!
        </Text>
      </View>
    );
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
              <Icon name="sparkles" size={14} color="#3b2c85" />
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3b2c85" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        {/* Avatar */}
        <TouchableOpacity
          onPress={() => {
            if (currentPlaceId) {
              navigation.navigate('PlaceDetails' as any, {
                placeId: currentPlaceId,
                placeName: currentPlaceName,
                placeAddress: currentPlaceAddress,
              });
            }
          }}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentPlaceName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {currentPlaceAddress}
          </Text>
        </View>
        <Menu
          visible={visible}
          onDismiss={() => setVisible(false)}
          anchor={
            <TouchableOpacity 
              onPress={() => setVisible(true)}
              style={styles.headerAction}>
              <Icon name="ellipsis-vertical" size={20} color="#ffffff" />
            </TouchableOpacity>
          }
        >
          <Menu.Item
            onPress={() => {
              setVisible(false);
              if (currentPlaceId) {
                navigation.navigate('PlaceDetails' as any, {
                  placeId: currentPlaceId,
                  placeName: currentPlaceName,
                  placeAddress: currentPlaceAddress,
                });
              }
            }}
            title="View Place Details"
          />
          <Menu.Item
            onPress={() => {
              setVisible(false);
              handleDeleteSession(sessionId);
            }}
            title="Delete Chat"
          />
        </Menu>
      </View>

      {/* Chat Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b2c85" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayMessages}
            inverted={true}
            keyExtractor={(item, index) =>
              item.id ? item.id.toString() : index.toString()
            }
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
            ListHeaderComponent={renderListHeader}
            ListFooterComponent={renderListFooter}
            ListEmptyComponent={renderEmptyComponent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.2}
          />
        )}

        {/* Input Bar */}
        <View style={[styles.inputContainer, { paddingBottom: isKeyboardVisible ? 10 : Math.max(10, insets.bottom + 10) }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ask a question..."
              placeholderTextColor="#9ca3af"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
              editable={!isSending && !isBotTyping }
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || isSending || isBotTyping ) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!messageText.trim() || isSending || isBotTyping }>
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
  //avatar
   avatar: {
    width: 52,
    height: 52,
    borderRadius:100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#0000',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:"center",
    columnGap:10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#3b2c85',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
    fontFamily: 'Poppins-Regular',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Chat
  chatContainer: {
    flex: 1,
    backgroundColor: '#f0eff5',
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingBottom: 8,
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

  // Message bubbles
  messageBubbleRow: {
    flexDirection: 'row',
    marginBottom: 6,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e8e6f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    lineHeight: 21,
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

  // Input
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 4,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3b2c85',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

  // Empty
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyChatText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#111827',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#6b7280',
  },
  modalSaveButton: {
    backgroundColor: '#3b2c85',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
});
