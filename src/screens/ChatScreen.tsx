import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { placeService } from '../services/placeService';
import { chatService } from '../services/chatService';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';

type QASession = {
  session_id: string;
  place: {
    place_id: string;
    name: string;
    address: string;
  };
  title: string;
  last_message: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
};

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getPlaceInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('');
}

// Color palette for avatar backgrounds
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#2563eb',
];

function getAvatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const ChatScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'place' | 'travel'>('place');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  // Q&A (Place) sessions
  const { data: sessions, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['AllChats'],
    queryFn: async () => {
      const response = await placeService.listSessions();
 
      return (response?.sessions || (response as any)?.data || (response as any)?.items || []) as any[];
    },
    staleTime: 60 * 1000,
  });

  // Travel sessions
  const { data: travelSessions, isLoading: travelLoading, refetch: refetchTravel, isRefetching: isRefetchingTravel } = useQuery({
    queryKey: ['TravelChats'],
    queryFn: async () => {
      const response = await chatService.listSessions();
    
      return (response?.sessions || (response as any)?.data || []) as any[];
    },
    staleTime: 60 * 1000,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchTravel();
    }, [refetch, refetchTravel])
  );

  const deleteSessionsMutation = useMutation({
    mutationFn: (ids: string[]) => placeService.deleteSessions(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['AllChats'] });
      setIsSelectMode(false);
      setSelectedSessions([]);
   
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to delete chats');
    },
  });

  const deleteTravelSessionMutation = useMutation({
    mutationFn: (id: string) => chatService.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['TravelChats'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to delete conversation');
    },
  });

  const handleSessionPress = (session: QASession) => {
    if (isSelectMode) {
      toggleSelection(session.session_id);
    } else {
      navigation.navigate('ChatDetail', {
        sessionId: session.session_id,
        placeName: session.place?.name || 'Unknown Place',
        placeAddress: session.place?.address || '',
        placeId: session.place?.place_id,
      });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedSessions(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedSessions.length === 0) return;
    Alert.alert(
      'Delete Chats',
      `Are you sure you want to delete ${selectedSessions.length} conversation(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => deleteSessionsMutation.mutate(selectedSessions) 
        },
      ]
    );
  };

  const handleDeleteTravelSession = (sessionId: string, title: string) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title || 'this travel plan'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => deleteTravelSessionMutation.mutate(sessionId) 
        },
      ]
    );
  };

  const renderTravelSessionItem = ({ item }: { item: any }) => {
    const title = item.title || 'AI Travel Plan';
    const timeAgo = item.last_message_at ? formatTimeAgo(item.last_message_at) : '';
    
    return (
      <TouchableOpacity
        style={styles.sessionCard}
        activeOpacity={0.6}
        onPress={() => {
          navigation.navigate('AgentTravelChat', {
            sessionId: item.session_id,
            title: item.title,
          });
        }}
      >
        {/* Avatar with airplane icon */}
        <View style={[styles.avatar, { backgroundColor: '#4f46e5' }]}>
          <Icon name="airplane" size={24} color="#ffffff" />
        </View>

        {/* Content */}
        <View style={styles.sessionContent}>
          <View style={styles.sessionTopRow}>
            <Text style={styles.placeName} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.timeText}>{timeAgo}</Text>
          </View>
          <View style={styles.sessionBottomRow}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.message_count ? `${item.message_count} messages` : 'AI Travel Planner'}
            </Text>
            <TouchableOpacity 
              onPress={() => handleDeleteTravelSession(item.session_id, item.title)}
              style={styles.deleteButtonInline}
            >
              <Icon name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSessionItem = ({ item }: { item: QASession }) => {
    const placeName = item?.place?.name || 'Unknown Place';
    const initials = getPlaceInitials(placeName);
    const avatarColor = getAvatarColor(item?.session_id ? parseInt(item.session_id.toString().replace(/\D/g, '') || '0') : 0);
    const timeAgo = item?.last_message_at ? formatTimeAgo(item.last_message_at) : '';
    const isSelected = selectedSessions.includes(item?.session_id);

    return (
      <TouchableOpacity
        style={[styles.sessionCard, isSelected && styles.sessionCardSelected]}
        activeOpacity={0.6}
        onPress={() => handleSessionPress(item)}
        onLongPress={() => {
          setIsSelectMode(true);
          toggleSelection(item.session_id);
        }}>
        {/* Avatar / Selection Circle */}
        <View style={[styles.avatar, { backgroundColor: isSelectMode ? (isSelected ? '#3b2c85' : '#e5e7eb') : avatarColor }]}>
          {isSelectMode ? (
            <Icon name={isSelected ? "checkmark" : "ellipse-outline"} size={24} color="#ffffff" />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.sessionContent}>
          <View style={styles.sessionTopRow}>
            <Text style={styles.placeName} numberOfLines={1}>
              {placeName}
            </Text>
            {!isSelectMode && <Text style={styles.timeText}>{timeAgo}</Text>}
          </View>
          <View style={styles.sessionBottomRow}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item?.last_message || ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3b2c85" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {isSelectMode ? (
            <TouchableOpacity onPress={() => { setIsSelectMode(false); setSelectedSessions([]); }}>
              <Icon name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <Icon name={activeTab === 'place' ? "chatbubbles" : "airplane"} size={24} color="#ffffff" />
          )}
          <Text style={styles.headerTitle}>
            {isSelectMode 
              ? `${selectedSessions.length} Selected` 
              : activeTab === 'place' 
              ? 'AiGaido Chat' 
              : 'Travel History'}
          </Text>
        </View>
        <View style={styles.headerRightActions}>
          {isSelectMode ? (
            <TouchableOpacity onPress={handleDeleteSelected} disabled={selectedSessions.length === 0}>
              <Icon name="trash-outline" size={24} color={selectedSessions.length > 0 ? "#ffffff" : "rgba(255,255,255,0.5)"} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Tabs Container */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'place' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('place');
            setIsSelectMode(false);
            setSelectedSessions([]);
          }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'place' && styles.tabButtonTextActive]}>
            Place Chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'travel' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('travel');
            setIsSelectMode(false);
            setSelectedSessions([]);
          }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'travel' && styles.tabButtonTextActive]}>
            Travel Agent
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sessions List */}
      {activeTab === 'place' ? (
        isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b2c85" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : sessions && sessions.length > 0 ? (
          <FlatList
            data={sessions}
            keyExtractor={item => item.session_id.toString()}
            renderItem={renderSessionItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onRefresh={refetch}
            refreshing={isRefetching}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="chatbubbles-outline" size={48} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Ask a question on any place to start a conversation
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                navigation.navigate('Nearby' as any);
              }}>
              <Icon name="compass-outline" size={18} color="#ffffff" />
              <Text style={styles.emptyButtonText}>Explore Nearby</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        travelLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b2c85" />
            <Text style={styles.loadingText}>Loading travel history...</Text>
          </View>
        ) : travelSessions && travelSessions.length > 0 ? (
          <FlatList
            data={travelSessions}
            keyExtractor={item => item.session_id.toString()}
            renderItem={renderTravelSessionItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onRefresh={refetchTravel}
            refreshing={isRefetchingTravel}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="airplane-outline" size={48} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>No travel plans yet</Text>
            <Text style={styles.emptySubtitle}>
              Ask our AI Travel Agent to help you plan your next trip!
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                navigation.navigate('AgentTravelChat', { newChat: true });
              }}>
              <Icon name="chatbubble-ellipses-outline" size={18} color="#ffffff" />
              <Text style={styles.emptyButtonText}>Start Planning</Text>
            </TouchableOpacity>
          </View>
        )
      )}

      {/* Floating Action Button for Travel Agent */}
      {activeTab === 'travel' && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('AgentTravelChat', { newChat: true })}
        >
          <Icon name="add" size={30} color="#ffffff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#3b2c85',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#3b2c85',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-ExtraBold',
    color: '#ffffff',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  agentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  agentButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // List
  listContent: {
    backgroundColor: '#ffffff',
    paddingTop: 8,
    flexGrow: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 82,
  },

  // Session card
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
  },
  sessionCardSelected: {
    backgroundColor: '#f3f4f6',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
  sessionContent: {
    flex: 1,
    marginLeft: 14,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  placeName: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'Poppins-Medium',
  },
  sessionTitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 3,
    fontFamily: 'Poppins-Medium',
  },
  sessionBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    flex: 1,
    marginRight: 8,
  },
  messageBadge: {
    backgroundColor: '#3b2c85',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    fontFamily: 'Poppins-Regular',
  },
  messageBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b2c85',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  deleteButtonInline: {
    padding: 6,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#3b2c85',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#ffffff',
  },
  tabButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
  },
  tabButtonTextActive: {
    color: '#ffffff',
    fontFamily: 'Poppins-Regular',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default ChatScreen;