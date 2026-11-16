import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  StatusBar,
  FlatList,
  Linking,
  Dimensions,
  ActivityIndicator,
  ViewToken,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Share,
  Animated,
  KeyboardAvoidingView,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {AuthStackParamList} from '../navigation/AuthNavigator';
import Icon from 'react-native-vector-icons/Ionicons';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {placeService} from '../services/placeService';
import {locationService} from '../services/locationService';
import CustomButton from '../components/Buttons/Button';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Config from 'react-native-config';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const CAROUSEL_HEIGHT = 280;

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'PlaceDetails'>;
  route: RouteProp<AuthStackParamList, 'PlaceDetails'>;
};

export default function PlaceDetailsScreen({navigation, route}: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const {
    placeId,
    placeName = 'Place',
    formatted_address,
    latitude,
    longitude,
    google_maps_uri,
    open_now,
    is_locked,
    typeIcon,
    user_rating_count,
    rating,
    photoUrl,
  } = route.params || {};

  const [activeIndex, setActiveIndex] = useState(0);
  const [isLocallyUnlocked, setIsLocallyUnlocked] = useState(false);
  const [isLockedError, setIsLockedError] = useState(false);
  const [isUnlockedAnimating, setIsUnlockedAnimating] = useState(false);
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  const buttonGreenWidthAnim = useRef(new Animated.Value(0)).current;
  const lockScreenTranslateX = useRef(new Animated.Value(0)).current;
  const greenProgress = useRef(new Animated.Value(0)).current;
  const [carouselImagesLoading, setCarouselImagesLoading] = useState<Record<string, boolean>>({});
  const [isVisitModalVisible, setIsVisitModalVisible] = useState(false);
  const [visitRating, setVisitRating] = useState(5);
  const [visitReview, setVisitReview] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const fullScreenListRef = useRef<FlatList>(null);
  const [showUnlocked, setShowUnlocked] = useState(false);
  const [unlockButtonWidth, setUnlockButtonWidth] = useState(0);

  const {data: unlockCostData, isLoading: isUnlockCostLoading} = useQuery({
    queryKey: ['placeUnlockCost', placeId],
    queryFn: () => placeService.getUnlockCost(placeId!),
    enabled: !!placeId && !isLocallyUnlocked,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (unlockCostData?.is_unlocked && !isLocallyUnlocked) {
      setIsLocallyUnlocked(true);
    }
  }, [unlockCostData?.is_unlocked, isLocallyUnlocked]);

  const {data, isLoading} = useQuery({
    queryKey: ['GetPlaceDetailsById', placeId],
    queryFn: async () => {
      try {
        const response = await placeService.getDetails(placeId!);
        return response?.data;
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.detail ||
          error?.response?.data?.message || "";
          
        if (errorMessage.toLowerCase().includes('not unlocked') || errorMessage.toLowerCase().includes('locked')) {
           setIsLockedError(true);
           throw error;
        }
        
        Alert.alert('Error Getting Place Details', errorMessage);
        throw error;
      }
    },
    staleTime: 60 * 1000,
    enabled: !!placeId && (!is_locked || isLocallyUnlocked || isUnlockedAnimating),
  });


  const {data: userLocationData} = useQuery({
    queryKey: ['GetSavedLocation'],
    queryFn: async () => {
      const res = await locationService.getMyLocation();
      return res?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    if (d < 1) {
      return `${Math.round(d * 1000)} m away`;
    }
    return `${d.toFixed(1)} km away`;
  };

  const placeLat = latitude || data?.latitude;
  const placeLng = longitude || data?.longitude;
  const distanceText =
    userLocationData?.latitude && userLocationData?.longitude && placeLat && placeLng
      ? calculateDistance(
          userLocationData.latitude,
          userLocationData.longitude,
          placeLat,
          placeLng
        )
      : 'Get Directions';

  const {data: savedPlaces} = useQuery({
    queryKey: ['savedPlaces'],
    queryFn: () => placeService.listSaved(),
  });

  const savedPlace = savedPlaces?.data?.find((p: any) => p.place_id === placeId);
  const isSaved = !!savedPlace;

  const { data: existingSessionsData } = useQuery({
    queryKey: ['listSessions', placeId],
    queryFn: () => placeService.listSessions(1, 1, placeId),
    enabled: !!placeId,
    staleTime: 5 * 60 * 1000,
  });

   //============================ save mutation===========================
  const saveMutation = useMutation({
    mutationFn: () => placeService.savePlace(placeId!),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['savedPlaces']});
      queryClient.invalidateQueries({queryKey: ['NearbyPlaces']});
    },
    onError: (error: any) => {
      console.error('[SavePlace Error]:', error?.response?.data || error?.message || error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to save place');
    },
  });

   //============================ unsave mutation ===========================
  const unsaveMutation = useMutation({
    mutationFn: () => placeService.unsavePlace(savedPlace!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['savedPlaces']});
      queryClient.invalidateQueries({queryKey: ['NearbyPlaces']});
    },
    onError: (error: any) => {
      console.error('[UnsavePlace Error]:', error?.response?.data || error?.message || error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to unsave place');
    },
  });

   //============================ log visit mutation ===========================
  const logVisitMutation = useMutation({
    mutationFn: () => placeService.logVisit(placeId!, {
      rating_given: visitRating,
      review_text: visitReview,
    }),
    onSuccess: () => {
      setIsVisitModalVisible(false);
      queryClient.invalidateQueries({queryKey: ['visits']});
      queryClient.invalidateQueries({queryKey: ['GetPlaceDetailsById', placeId]});
    },
    onError: (error: any) => {
      console.error('[LogVisit Error]:', error?.response?.data || error?.message || error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to log visit');
    },
  });

   //============================ unlock mutation===========================
  const unlockMutation = useMutation({
    mutationFn: () => placeService.unlockPlace(placeId!),
    onSuccess: () => {
      setIsUnlockedAnimating(true);
      setShowUnlocked(false);
         // Save current cached data in case API fails
    const previousQueries = queryClient.getQueriesData({
      queryKey: ['NearbyPlaces'],
    });

    // Optimistically update all NearbyPlaces queries
    queryClient.setQueriesData(
      {
        queryKey: ['NearbyPlaces'],
      },
      (oldData: any) => {
        if (!oldData) return oldData;

        return oldData.map((place:any) =>
          place.place_id === placeId
            ? {
                ...place,
                is_locked: false,
              }
            : place,
        );
      },
    );

  //   // Return previous data for rollback
  //   return { previousQueries };
  // },
      // 1. Animate green overlay across the exact measured button width.
      // Numeric width is more reliable than interpolating percentage strings.
    Animated.timing(greenProgress, {
  toValue: 1,
  duration: 600,
  useNativeDriver: false,
}).start(({finished}) => {
  if (!finished) return;

  // Keep the button visible and show completed state
  setShowUnlocked(true);

  // Give the user time to see:
  // green 100% + check icon + "Unlocked"
  setTimeout(() => {
    Animated.timing(lockScreenTranslateX, {
      toValue: -SCREEN_WIDTH,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setIsLocallyUnlocked(true);
      setIsUnlockedAnimating(false);
      setShowUnlocked(false);
      setIsLockedError(false);

      greenProgress.setValue(0);
      lockScreenTranslateX.setValue(0);

      queryClient.invalidateQueries({
        queryKey: ['GetPlaceDetailsById', placeId],
      });
      queryClient.invalidateQueries({
        queryKey: ['UnlockedPlaces'],
      });
      queryClient.invalidateQueries({
        queryKey: ['NearbyPlaces'],
      });
      queryClient.invalidateQueries({
        queryKey: ['placeUnlockCost', placeId],
      });
      queryClient.invalidateQueries({
        queryKey: ['authMe'],
      });
    });
  }, 700);
});

    },
    onError: (error: any) => {
   
      Alert.alert('Error', error?.response?.data?.message || 'Failed to unlock place');
    },
  });

  const getPhotoUrl: any = (photoName: string | null): string | null => {
    if (!photoName) return null;
    if (photoName.startsWith('http')) return photoName;
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${Config.GOOGLE_MAPS_API_KEY}`;
  };

  const displayedName = data?.display_name || placeName;
  const displayedAddress = data?.formatted_address || formatted_address;
  const displayedRating = data?.rating ?? rating ?? 0;
  const displayedRatingCount = data?.user_rating_count ?? user_rating_count ?? 0;
  const displayedOpenNow = data?.open_now ?? open_now;
  const displayedLat = data?.latitude ?? latitude;
  const displayedLng = data?.longitude ?? longitude;
  const displayedGoogleMapsUri = data?.google_maps_uri ?? google_maps_uri;

  // Build photos array strictly prioritizing API data photos (capped at 4)
  const photos: any[] = (data?.photos?.length
    ? data.photos
    : photoUrl
    ? [{ name: photoUrl }]
    : []).slice(0, 4);

  // Create new chat session and navigate to ChatDetail
  const {mutate: startChatMutation, isPending: isStartingChat} = useMutation({
    mutationFn: async () => {
      return await placeService.askQuestion(placeId!, {
        question: `Tell me about ${displayedName}`,
      });
    },
    onSuccess: (responseData: any) => {
      const sessionId = responseData?.session_id;
      if (sessionId) {
        setLocalSessionId(sessionId);
        queryClient.setQueryData(['GetPlaceDetailsById', placeId], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            session: sessionId,
          };
        });
        
        navigation.navigate('ChatDetail', {
          sessionId,
          placeName: displayedName ?? undefined,
          placeAddress: displayedAddress ?? undefined,
          placeId: placeId ?? undefined,
        });
      }
    },
    onError: (error: any) => {
  
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message || "";
      Alert.alert('Error Sending Message', errorMessage);
    },
  });

  const startChat = () => {
    const backendSessionId = existingSessionsData?.sessions?.[0]?.session_id;
    const existingSessionId = localSessionId || data?.session || backendSessionId;
    
    if (existingSessionId) {
      navigation.navigate('ChatDetail', {
        sessionId: existingSessionId,
        placeName: displayedName ?? undefined,
        placeAddress: displayedAddress ?? undefined,
        placeId: placeId ?? undefined,
      });
    } else {
      startChatMutation();
    }
  };

  

  const onViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: ViewToken[]}) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({viewAreaCoveragePercentThreshold: 50}).current;

   //============================ share ===========================
  const onShare = async () => {
    try {
      const shareUrl = displayedGoogleMapsUri;
      const title = displayedName || 'Checkout this place';
      
      const message = `${title}  ${shareUrl ? `\n${shareUrl}` : ''}`;
      
      await Share.share({
        message,
        url: shareUrl || undefined,
        title,
      });
    } catch (error: any) {
      Alert.alert(error.message);
    }
  };

   //============================ render stars ===========================
  const renderStars = (ratingValue: number = 0) => {
    const fullStars = Math.floor(ratingValue);
    const hasHalfStar = ratingValue % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.stars}>
        {[...Array(fullStars)].map((_, index) => (
          <Icon key={`full-${index}`} name="star" size={14} color="#f59e0b" />
        ))}
        {hasHalfStar && <Icon name="star-half" size={14} color="#f59e0b" />}
        {[...Array(emptyStars)].map((_, index) => (
          <Icon
            key={`empty-${index}`}
            name="star-outline"
            size={14}
            color="#d1d5db"
          />
        ))}
      </View>
    );
  };

   //============================ render carousel ===========================
  const renderCarouselItem = ({item, index}: {item: {name:string}, index: number}) => {
    const uri = getPhotoUrl(item?.name) || '';
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          setSelectedPhotoIndex(index);
          setIsPhotoModalVisible(true);
          setTimeout(() => {
            fullScreenListRef.current?.scrollToIndex({ index, animated: false });
          }, 50);
        }}
      >
        <View style={styles.carouselImage}>
          {carouselImagesLoading[uri] && (
            <View style={StyleSheet.absoluteFill}>
              <ActivityIndicator size="small" color="#3b2c85" style={{ flex: 1, alignSelf: 'center' }} />
            </View>
          )}
          <Image
            source={{uri}}
            style={styles.carouselImage}
            resizeMode="cover"
            onLoadStart={() => setCarouselImagesLoading(prev => ({ ...prev, [uri]: true }))}
            onLoadEnd={() => setCarouselImagesLoading(prev => ({ ...prev, [uri]: false }))}
          />
        </View>
      </TouchableOpacity>
    );
  };

  //============================ unlock button animation===========================
  const animateUnlockButton = () => {
  setIsUnlockedAnimating(true);
  setShowUnlocked(false);

  greenProgress.setValue(0);

  Animated.timing(greenProgress, {
    toValue: 1,
    duration: 600,
    useNativeDriver: false,
  }).start(({ finished }) => {
    if (finished) {
      setShowUnlocked(true);

      // After the button finishes, trigger your modal slide-left animation here.
      setTimeout(() => {
        // setShowUnlockModal(false)
        // or start your modal translateX animation
      }, 300);
    }
  });
};

if (isLoading && !isUnlockedAnimating) {
  return (
    <SafeAreaView style={styles.loadingContainer} edges={['top']}>
      <ActivityIndicator size="large" color="#3b2c85" />
      <Text style={styles.loadingText}>Loading...</Text>
    </SafeAreaView>
  );
}

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* ===== ZONE 1: Floating Header Buttons ===== */}
      <View style={[styles.headerOverlay, { top: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        {((!is_locked || isLocallyUnlocked) && data?.is_locked !== true) && (
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => {
                if (isSaved) {
                  unsaveMutation.mutate();
                } else {
                  saveMutation.mutate();
                }
              }}
              style={[styles.iconButton, {marginRight: 12}]}>
             {   saveMutation?.isPending || unsaveMutation?.isPending ?<ActivityIndicator size="small" color="#3b2c85" />: <Icon name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color={isSaved ? "#3b2c85" : "#111827"} />}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('Commute', {
                  placeId,
                  destinationName: displayedName ?? undefined,
                  destinationLat: displayedLat ?? undefined,
                  destinationLng: displayedLng ?? undefined,
                });
              }}
              style={styles.iconButton}>
              <Icon name="navigate" size={20} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onShare}
              style={[styles.iconButton, {marginLeft: 12}]}>
              <Icon name="share-social-outline" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
        )}
      </View>


          {/* ===== ZONE 2: Centered Image Carousel ===== */}
      <View style={styles.carouselContainer}>
        {photos.length > 0 ? (
          <>
            <FlatList
              data={photos.slice(0, 4)}
              renderItem={renderCarouselItem as any}
              keyExtractor={(item, index) => `photo-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              bounces={false}
              style={styles.carouselList}
            />
            {/* Dot Indicators */}
            {photos.slice(0, 4).length > 1 && (
              <View style={styles.dotContainer}>
                {photos.slice(0, 4).map((_, index) => (
                  <View
                    key={`dot-${index}`}
                    style={[
                      styles.dot,
                      index === activeIndex
                        ? styles.dotActive
                        : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>
            )}
            {/* Photo counter badge */}
            <View style={styles.photoBadge}>
              <Icon name="images-outline" size={12} color="#ffffff" />
              <Text style={styles.photoBadgeText}>
                {activeIndex + 1}/{Math.min(photos.length, 4)}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.placeholderImage}>
            <Icon
              name={(typeIcon as string) || 'location'}
              size={48}
              color="#9ca3af"
            />
            <Text style={styles.placeholderText}>No photos available</Text>
          </View>
        )}
      </View>

      {/* ===== ZONE 3: Bottom Info + Ask Button ===== */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(24, insets.bottom + 20) }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Place Info */}
          <View style={styles.infoSection}>
            {/* Title & Review Row */}
            <View style={styles.titleRow}>
              <View style={styles.titleWithBadge}>
                <Text style={styles.placeTitle} numberOfLines={2}>
                  {displayedName}
                </Text>
              </View>
            </View>

            {/* Rating & Review Count */}
            <View style={styles.ratingRow}>
              <Text style={styles.ratingText}>{Number(displayedRating).toFixed(1)}</Text>
              {renderStars(displayedRating)}
              <Text style={styles.reviewCount}>
                ({displayedRatingCount.toLocaleString()} reviews)
              </Text>
            </View>

            {/* Address */}
            <View style={styles.addressRow}>
              <Icon name="location-outline" size={16} color="#374151" style={{ marginTop: 2 }} />
              <Text style={styles.detailsText} numberOfLines={3}>
                {displayedAddress}
              </Text>
            </View>

            {/* Status & Timing Pill Row */}
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  displayedOpenNow
                    ? styles.statusBadgeOpen
                    : styles.statusBadgeClosed,
                ]}>
                <View
                  style={[
                    styles.statusDot,
                    displayedOpenNow
                      ? styles.statusDotOpen
                      : styles.statusDotClosed,
                  ]}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    displayedOpenNow
                      ? styles.statusTextOpen
                      : styles.statusTextClosed,
                  ]}>
                  {displayedOpenNow ? 'Open Now' : 'Closed'}
                </Text>
              </View>

              {/* Closes at info */}
              <View style={styles.closesInfoWrapper}>
                <Text style={styles.closesInfoText}>
                  {displayedOpenNow ? 'Closes at 9:30 PM' : 'Opens tomorrow'}
                </Text>
                <Icon name="information-circle-outline" size={15} color="#9ca3af" style={{ marginLeft: 4 }} />
              </View>
            </View>

            {/* Quick Action Buttons (Call, Website, Directions) */}
            <View style={styles.actionCardsRow}>
              {/* Call Card */}
              {Boolean(data?.international_phone_number || data?.national_phone_number) && (
                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => {
                    Linking.openURL(`tel:${data?.international_phone_number || data?.national_phone_number}`);
                  }}
                >
                  <View style={styles.actionIconContainer}>
                    <Icon name="call" size={20} color="#3b2c85" />
                  </View>
                  <Text style={styles.actionCardTitle}>Call</Text>
                  <Text style={styles.actionCardSubtitle} numberOfLines={1}>
                    {data?.international_phone_number || data?.national_phone_number || 'Not available'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Website Card */}
              {Boolean(data?.website_uri) && (
                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => {
                    if (data?.website_uri) {
                      Linking.openURL(data.website_uri);
                    }
                  }}
                >
                  <View style={styles.actionIconContainer}>
                    <Icon name="globe" size={20} color="#3b2c85" />
                  </View>
                  <Text style={styles.actionCardTitle}>Website</Text>
                  <Text style={styles.actionCardSubtitle} numberOfLines={1}>
                    {data?.website_uri ? data.website_uri.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : 'visit website'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Directions Card */}
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => {
                  navigation.navigate('Commute', {
                    placeId,
                    destinationName: displayedName ?? undefined,
                    destinationLat: displayedLat ?? undefined,
                    destinationLng: displayedLng ?? undefined,
                  });
                }}
              >
                <View style={styles.actionIconContainer}>
                  <Icon name="arrow-redo" size={20} color="#3b2c85" />
                </View>
                <Text style={styles.actionCardTitle}>Directions</Text>
                <Text style={styles.actionCardSubtitle} numberOfLines={1}>
                  {distanceText}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Opening Hours Card */}
            <View style={styles.openingHoursCard}>
              <View style={styles.openingHoursHeader}>
                <View style={styles.openingHoursHeaderLeft}>
                  <Icon name="time-outline" size={22} color="#3b2c85" />
                  <Text style={styles.openingHoursTitle}>Opening Hours</Text>
                </View>
                <View style={[styles.openingHoursBadge, {backgroundColor: displayedOpenNow ? '#ecfdf5' : '#fef2f2'}]}>
                  <Text style={[styles.openingHoursBadgeText, {color: displayedOpenNow ? '#10b981' : '#ef4444'}]}>
                    {displayedOpenNow ? 'Open Now' : 'Closed'}
                  </Text>
                </View>
              </View>

              <View style={styles.hoursTable}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, idx) => {
                  const desc = data?.opening_hours?.weekday_descriptions?.find(d => d.toLowerCase().startsWith(day.toLowerCase()));
                  const timeText = desc ? desc.split(': ').slice(1).join(': ') : '11:30 AM – 9:30 PM';
                  return (
                    <View key={day} style={[styles.hoursTableRow, idx === 6 && { borderBottomWidth: 0 }]}>
                      <Text style={styles.dayText}>{day}</Text>
                      <Text style={styles.timeText}>{timeText}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Editorial Summary */}
            {data?.editorial_summary && (
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.summaryText}>{data.editorial_summary}</Text>
              </View>
            )}

            {/* Write Review Card (Banner) */}
            <View style={styles.reviewBannerCard}>
              <Text style={styles.reviewBannerTitle}>Love this place?</Text>
              <Text style={styles.reviewBannerSubtitle}>
                {data?.is_visit ? 'Thank you for sharing your experience!' : 'Share your thoughts about this place'}
              </Text>
             {
             !data?.is_visit&& <TouchableOpacity
                style={styles.reviewBannerButton}
                onPress={() => setIsVisitModalVisible(true)}
                activeOpacity={0.85}
              >
                <Icon
                  name={'star-outline'}
                  size={18}
                  color="#5b36ec"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.reviewBannerButtonText}>
                  Write a Review
                </Text>
              </TouchableOpacity>}
            </View>

            {/* Reviews */}
            {data?.reviews && data.reviews.length > 0 && (
              <View style={styles.reviewsSection}>
                <Text style={styles.sectionTitle}>Recent Reviews</Text>
                {data.reviews.slice(0, 3).map((review, index) => (
                  <View key={index} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewAuthor}>{review.author_name}</Text>
                      <View style={styles.reviewRating}>
                        <Text style={styles.reviewRatingText}>{review.rating}</Text>
                        <Icon name="star" size={12} color="#f59e0b" />
                      </View>
                    </View>
                    <Text style={styles.reviewDate}>{review.relative_publish_time_description}</Text>
                    <Text style={styles.reviewText} numberOfLines={3}>{review.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Ask About This Place Button */}
        <CustomButton
          type="primary"
          title="Ask About This Place"
          subtitle="Get Answers from Local & AI"
          icon={<Icon name="chatbubble-ellipses-outline" size={20} color="#ffffff" />}
          iconPosition="left"
          loading={isStartingChat}
          disabled={isStartingChat}
          onPress={() => startChat()}
          buttonStyle={styles.askButton}
        />
      </View>

      {/* Lock Screen Overlay (Rendered absolutely on top if locked/unlocking) */}
      {(((is_locked && !isLocallyUnlocked) || (data?.is_locked === true && !isLocallyUnlocked) || isLockedError)) && (
        <Animated.View 
          style={[
            styles.lockedScreenContainer,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 100,
              backgroundColor: '#f9fafb',
              transform: [{ translateX: lockScreenTranslateX }]
            }
          ]}
        >
          <View style={styles.mysteryBadge}>
            <Icon name="lock-closed" size={24} color="#3b2c85" />
          </View>
          <Text style={styles.lockedTitle}>Place Locked</Text>
          {unlockCostData?.popularity_tier ? (
            <View style={styles.tierPill}>
              <Text style={styles.tierPillText}>
                {unlockCostData.popularity_tier.toUpperCase()} TIER
              </Text>
            </View>
          ) : null}
          <Text style={styles.lockedSubtitle}>
            Unlock this location to reveal its name, photos, directions, reviews, and AI insights.
          </Text>          
          <CustomButton
            onLayout={(event: LayoutChangeEvent) => {
              const {width} = event.nativeEvent.layout;
              if (width !== unlockButtonWidth) {
                setUnlockButtonWidth(width);
              }
            }}
            onPress={() => {
              if (unlockMutation.isPending || isUnlockedAnimating) return;
              unlockMutation.mutate();
            }}
            disabled={false}
            loading={unlockMutation.isPending}
            buttonStyle={{ width: '100%', elevation: 0 }}
          >
            {/* Green left-to-right fill */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.buttonGreenSlider,
                {
                  width: greenProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, unlockButtonWidth],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />

            <View style={styles.unlockButtonContent}>
              <Icon
                name={showUnlocked ? "checkmark-circle" : "key"}
                size={20}
                color="#ffffff"
                style={{ marginRight: 2 }}
              />

              <Text style={styles.unlockButtonText}>
                {showUnlocked ? "Unlocked" : "Unlock Place"}
              </Text>

              {!showUnlocked && (
                unlockCostData?.token_cost != null ? (
                  <View style={styles.unlockCostBadge}>
                    <Icon name="flash" size={13} color="#fef08a" style={{ marginRight: 3 }} />
                    <Text style={styles.unlockCostBadgeText}>
                      {unlockCostData.token_cost} {unlockCostData.token_cost === 1 ? 'Credit' : 'Credits'}
                    </Text>
                  </View>
                ) : isUnlockCostLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginLeft: 6 }} />
                ) : null
              )}
            </View>
          </CustomButton>
        </Animated.View>
      )}

      {/* Visit Modal */}
      <Modal
        visible={isVisitModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVisitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsVisitModalVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 15}
            style={styles.keyboardAvoidingModal}
          >
            <View style={[styles.modalContent, { maxHeight: '85%' }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: Math.max(32, insets.bottom + 24) }}
              >
                <Text style={styles.modalTitle}>Write a Review</Text>
                
                <Text style={styles.label}>Rating</Text>
                <View style={styles.modalStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setVisitRating(star)}>
                      <Icon 
                        name={star <= visitRating ? "star" : "star-outline"} 
                        size={32} 
                        color="#f59e0b" 
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Review (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="How was your visit?"
                  placeholderTextColor="#9ca3af"
                  value={visitReview}
                  onChangeText={setVisitReview}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setIsVisitModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.submitButton}
                    onPress={() => logVisitMutation.mutate()}
                    disabled={logVisitMutation.isPending}
                  >
                    {logVisitMutation.isPending ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Full-Screen Image Carousel Modal with Pinch-to-Zoom */}
      <Modal
        visible={isPhotoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPhotoModalVisible(false)}
      >
        <View style={styles.fullScreenOverlay}>
          <TouchableOpacity 
            style={styles.closeFullScreenButton} 
            onPress={() => setIsPhotoModalVisible(false)}
          >
            <Icon name="close" size={28} color="#ffffff" />
          </TouchableOpacity>

          {/* Photo Counter Badge */}
          {photos.length > 0 && (
            <View style={styles.fullScreenCounter}>
              <Text style={styles.fullScreenCounterText}>
                {selectedPhotoIndex + 1} / {photos.length}
              </Text>
            </View>
          )}

          <FlatList
            ref={fullScreenListRef}
            data={photos}
            keyExtractor={(item, index) => `fullscreen-photo-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={selectedPhotoIndex < photos.length ? selectedPhotoIndex : 0}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setSelectedPhotoIndex(newIndex);
            }}
            renderItem={({ item }) => {
              const uri = getPhotoUrl(item?.name) || '';
              return (
                <ScrollView
                  style={{ width: SCREEN_WIDTH, height: '100%' }}
                  contentContainerStyle={styles.zoomScrollContainer}
                  minimumZoomScale={1}
                  maximumZoomScale={3.5}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  centerContent={true}
                  bouncesZoom={true}
                >
                  {carouselImagesLoading[uri] && (
                    <View style={StyleSheet.absoluteFill}>
                      <ActivityIndicator size="large" color="#ffffff" style={{ flex: 1, alignSelf: 'center' }} />
                    </View>
                  )}
                  <Image
                    source={{ uri }}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                    onLoadStart={() => setCarouselImagesLoading(prev => ({ ...prev, [uri]: true }))}
                    onLoadEnd={() => setCarouselImagesLoading(prev => ({ ...prev, [uri]: false }))}
                  />
                </ScrollView>
              );
            }}
          />

          {/* Left / Right Quick Navigation Arrows for Large Collections */}
          {photos.length > 1 && selectedPhotoIndex > 0 && (
            <TouchableOpacity
              style={styles.fullScreenArrowLeft}
              onPress={() => {
                const prev = selectedPhotoIndex - 1;
                setSelectedPhotoIndex(prev);
                fullScreenListRef.current?.scrollToIndex({ index: prev, animated: true });
              }}
            >
              <Icon name="chevron-back" size={28} color="#ffffff" />
            </TouchableOpacity>
          )}

          {photos.length > 1 && selectedPhotoIndex < photos.length - 1 && (
            <TouchableOpacity
              style={styles.fullScreenArrowRight}
              onPress={() => {
                const next = selectedPhotoIndex + 1;
                setSelectedPhotoIndex(next);
                fullScreenListRef.current?.scrollToIndex({ index: next, animated: true });
              }}
            >
              <Icon name="chevron-forward" size={28} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
   loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
  },
  lockedScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  mysteryBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    fontFamily: 'Poppins-Regular',
  },
  lockedTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-ExtraBold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
unlockButton: {
  borderRadius: 25,
  width: '100%',
  shadowColor: '#4324b5',
  shadowOffset: {width: 0, height: 12},
  shadowOpacity: 0.25,
  shadowRadius: 25,
  elevation: 8,
},

unlockButtonGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 18,
  paddingHorizontal: 32,
  borderRadius: 25,
  width: '100%',
  position: 'relative',
  overflow: 'hidden',
},

buttonGreenSlider: {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  backgroundColor: '#10b981',
},

unlockButtonContent: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  zIndex: 10,
},

unlockButtonText: {
  color: '#ffffff',
  fontSize: 16,
  fontFamily: 'Poppins-Bold',
  zIndex: 10,
},

unlockCostBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.22)',
  paddingHorizontal: 9,
  paddingVertical: 3,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.35)',
  zIndex: 10,
},

unlockCostBadgeText: {
  color: '#ffffff',
  fontSize: 13,
  fontFamily: 'Poppins-Bold',
  letterSpacing: 0.2,
},

tierPill: {
  backgroundColor: '#ede9fe',
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 12,
  marginTop: 6,
  marginBottom: 8,
},

tierPillText: {
  color: '#3b2c85',
  fontSize: 11,
  fontFamily: 'Poppins-Bold',
  letterSpacing: 0.8,
},

  // ===== Zone 1: Floating Header =====
  headerOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerRight: {
    flexDirection: 'row',
  },

  // ===== Zone 2: Carousel =====
  carouselContainer: {
    height: CAROUSEL_HEIGHT,
    backgroundColor: '#f3f4f6',
    position: 'relative',
  },
  carouselList: {
    height: CAROUSEL_HEIGHT,
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#3b2c85',
    width: 24,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  photoBadge: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    fontFamily: 'Poppins-Regular',
  },
  photoBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
  },
  placeholderImage: {
    height: CAROUSEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    fontFamily: 'Poppins-Regular',
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
  },

  // ===== Zone 3: Bottom Section =====
  bottomSection: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  infoSection: {
    marginBottom: 20,
    fontFamily: 'Poppins-Regular',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    fontFamily: 'Poppins-Regular',
  },
  titleWithBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginRight: 12,
    fontFamily: 'Poppins-Regular',
  },
  placeTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-ExtraBold',
    color: '#111827',
    marginRight: 6,
    lineHeight: 28,
  },
  verifiedIcon: {
    marginLeft: 2,
  },
  logVisitButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#3b2c85',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 6,
  },
  logVisitButtonOutlineDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 6,
    pointerEvents: 'none',
  },
  logVisitTextOutline: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    color: '#3b2c85',
  },
  logVisitTextOutlineDisabled: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    color: '#9ca3af',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    fontFamily: 'Poppins-Regular',
  },
  ratingText: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
    marginRight: 6,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
    gap: 2,
  },
  reviewCount: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 6,
  },
  detailsText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#4b5563',
    flex: 1,
    lineHeight: 19,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
    fontFamily: 'Poppins-Regular',
  },
  statusBadgeOpen: {
    backgroundColor: '#ecfdf5',
    fontFamily: 'Poppins-Regular',
  },
  statusBadgeClosed: {
    backgroundColor: '#fef2f2',
    fontFamily: 'Poppins-Regular',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotOpen: {
    backgroundColor: '#10b981',
  },
  statusDotClosed: {
    backgroundColor: '#ef4444',
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  statusTextOpen: {
    color: '#10b981',
    fontFamily: 'Poppins-Regular',
  },
  statusTextClosed: {
    color: '#ef4444',
    fontFamily: 'Poppins-Regular',
  },
  closesInfoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    fontFamily: 'Poppins-Regular',
  },
  closesInfoText: {
    fontSize: 13,
    color: '#4b5563',
    fontFamily: 'Poppins-Medium',
  },

  // Action Cards (Call, Website, Directions)
  actionCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 22,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionCardTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
    marginBottom: 2,
  },
  actionCardSubtitle: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
    textAlign: 'center',
  },

  // Opening Hours Card
  openingHoursCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  openingHoursHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  openingHoursHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openingHoursTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  openingHoursBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontFamily: 'Poppins-Regular',
  },
  openingHoursBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#10b981',
  },
    openingHoursBadgeTextClosed: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#ef4444',
  },
  hoursTable: {
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 6,
  },
  hoursTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f8fafc',
  },
  dayText: {
    fontSize: 13,
    color: '#4b5563',
    fontFamily: 'Poppins-Medium',
  },
  timeText: {
    fontSize: 13,
    color: '#111827',
    fontFamily: 'Poppins-SemiBold',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#4b5563',
    lineHeight: 20,
  },
  hoursSection: {
    marginBottom: 16,
  },
  hoursText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#4b5563',
    marginBottom: 4,
  },
  reviewsSection: {
    marginBottom: 16,
  },
  reviewItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewAuthor: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#111827',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    fontFamily: 'Poppins-Regular',
  },
  reviewRatingText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  reviewDate: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    marginBottom: 6,
  },
  reviewText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#4b5563',
    lineHeight: 18,
  },

  // ===== Ask Button =====
  askButton: {
    backgroundColor: '#3b2c85',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#3b2c85',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  askButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  askButtonSubText:{
    color:"#fff",
    fontSize:13,
    fontFamily: 'Poppins-Regular',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingModal: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    maxHeight: Dimensions.get('window').height * 0.8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-ExtraBold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  modalStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#111827',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#3b2c85',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  
  // Full Screen Image Styles
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullScreenButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
  },
  fullScreenCounter: {
    position: 'absolute',
    top: 55,
    alignSelf: 'center',
    zIndex: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  fullScreenCounterText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
  },
  fullScreenArrowLeft: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: [{ translateY: -22 }],
    zIndex: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenArrowRight: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -22 }],
    zIndex: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  reviewBannerCard: {
    backgroundColor: '#5b36ec',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5b36ec',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  reviewBannerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Poppins-ExtraBold',
    marginBottom: 4,
  },
  reviewBannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    marginBottom: 16,
    textAlign: 'center',
  },
  reviewBannerButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBannerButtonText: {
    color: '#5b36ec',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
});