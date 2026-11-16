import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Alert,
  Platform,
  useColorScheme,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import MapView, {
  PROVIDER_GOOGLE,
  Marker,
  Circle,
} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { locationService } from '../services/locationService';
import { weatherService } from '../services/weatherService';
import { discoveryService } from '../services/discoveryService';
import { placeService } from '../services/placeService';
import { AutocompletePrediction } from '../services/types';
import Config from 'react-native-config';
import {
  RADIUS_OPTIONS,
  getPlaceTypeIcon,
  getPlaceTypeLabel,
} from '../constants/placeTypes';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import mapStyle from '../constants/mapStyles';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Nearby'>;
};

type LocationType = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

type NearbyPlace = {
  place_id: string;
  display_name: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  user_rating_count: number | null;
  primary_type: string | null;
  types: string[] | null;
  business_status: string | null;
  google_maps_uri: string | null;
  open_now: boolean | null;
  price_level: string | null;
  first_photo_name: string | null;
  is_locked?: boolean | null;
  is_visit?: boolean | null;
  is_suggested?: boolean;
};

type FilterState = {
  radius: number;
  max_result_count: number;
  category: string;
  sub_category?: string[];
  place_source?: 'all' | 'AiGaido';
};

const DEFAULT_FILTERS: FilterState = {
  radius: 500,
  max_result_count: 15,
  category: 'explore',
  sub_category: [],
  place_source: 'all',
};

// Keeps the selected filters when NearbyScreen is remounted after navigation.
let persistedFilters: FilterState = { ...DEFAULT_FILTERS };
let persistedMapType: 'standard' | 'satellite' = 'standard';

const SUBCATEGORIES: Record<string, { id: string; label: string }[]> = {
  explore: [
    { id: 'photo_spots', label: 'Photo Spots' },
    { id: 'religious_places', label: 'Religious Places' },
    { id: 'monuments', label: 'Monuments' },
    { id: 'parks_and_nature', label: 'Parks & Nature' },
  ],
  food_and_drinks: [
    { id: 'cafes', label: 'Cafés' },
    { id: 'street_food', label: 'Street Food' },
    { id: 'restaurants', label: 'Restaurants' },
    { id: 'quick_bites_sweets', label: 'Quick Bites & Sweets' },
  ],

  shopping: [
    { id: 'malls', label: 'Malls' },
    { id: 'local_markets', label: 'Local Markets' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'everyday_shops', label: 'Everyday Shops' },
  ],

  park_and_ride: [
    { id: 'parking', label: 'Parking' },
    { id: 'ev_charging', label: 'EV Charging' },
    { id: 'bus_stops', label: 'Bus Stops' },
    
  ],

  fuel:[
    { id: 'fuel_stations', label: 'Fuel Stations' },
  ]
};

const getCirclePoints = (
  center: { latitude: number; longitude: number },
  radius: number,
  numPoints: number = 64,
) => {
  const points = [];
  const earthRadius = 6371000; // meters
  const lat = (center.latitude * Math.PI) / 180;
  const lon = (center.longitude * Math.PI) / 180;
  const dByR = radius / earthRadius;

  for (let i = 0; i <= numPoints; i++) {
    const bearing = (i * 2 * Math.PI) / numPoints;
    const lat2 = Math.asin(
      Math.sin(lat) * Math.cos(dByR) +
        Math.cos(lat) * Math.sin(dByR) * Math.cos(bearing),
    );
    const lon2 =
      lon +
      Math.atan2(
        Math.sin(bearing) * Math.sin(dByR) * Math.cos(lat),
        Math.cos(dByR) - Math.sin(lat) * Math.sin(lat2),
      );
    points.push({
      latitude: (lat2 * 180) / Math.PI,
      longitude: (lon2 * 180) / Math.PI,
    });
  }
  return points;
};

export default function NearbyScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const isFocused = useIsFocused();

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>(() => ({
    ...persistedFilters,
  }));
  const [tempFilters, setTempFilters] = useState<FilterState>(() => ({
    ...persistedFilters,
  }));
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<
    AutocompletePrediction[]
  >([]);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>(
    persistedMapType,
  );

  const mapRef = useRef<MapView>(null);

  // Fetch user's saved location
  const {
    data: userLocation,
    isLoading: locationLoading,
    refetch: refetchUserLocation,
  } = useQuery({
    queryKey: ['GetSavedLocation'],
    queryFn: async () => {
      try {
        const response = await locationService.getMyLocation();
        const resData = response?.data;
        if (
          resData &&
          resData.latitude !== undefined &&
          resData.latitude !== null &&
          resData.longitude !== undefined &&
          resData.longitude !== null
        ) {
          const lat =
            typeof resData.latitude === 'string'
              ? parseFloat(resData.latitude)
              : resData.latitude;
          const lng =
            typeof resData.longitude === 'string'
              ? parseFloat(resData.longitude)
              : resData.longitude;
          return { latitude: lat, longitude: lng };
        }
        return null;
      } catch (error) {
        console.log('No saved location found.');
        return null;
      }
    },
    // staleTime: 5 * 60 * 1000,
  });

  // Fetch weather data
  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ['weather', userLocation?.latitude, userLocation?.longitude],
    queryFn: async () => {
      try {
        const response = await weatherService.getWeather();
        return response?.data;
      } catch (error: any) {
        console.log('Error fetching weather data:', error.message);
        return null;
      }
    },
    enabled: !!userLocation,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch nearby places from backend
  const {
    data: nearbyPlaces,
    isLoading: placesLoading,
    refetch: refetchPlaces,
    isFetching,
  } = useQuery({
    queryKey: ['NearbyPlaces', activeFilters, showSavedOnly],
    queryFn: async () => {
      try {
        if (showSavedOnly) {
          const response = await placeService.listSaved();
          const savedItems = response?.data || [];
          return savedItems.map(p => ({
            place_id: p.place_id,
            display_name: p.display_name || '',
            formatted_address: p.formatted_address || '',
            latitude: p.latitude ?? 0,
            longitude: p.longitude ?? 0,
            rating: p.rating,
            user_rating_count: null,
            primary_type: p.primary_type,
            types: null,
            business_status: null,
            google_maps_uri: null,
            open_now: null,
            price_level: null,
            first_photo_name: null,
            is_locked: p.is_unlocked === true ? false : true,
            is_visit: p.is_visit ?? false,
            is_suggested: false,
          })) as NearbyPlace[];
        }

        if (searchQuery.length > 2) {
          const response = await discoveryService.textSearch({
            text_query: searchQuery,
          });
          return (response?.data || []) as NearbyPlace[];
        }

        const payload: any = {
          radius: activeFilters.radius,
          max_result_count: activeFilters.max_result_count,
          category: activeFilters.category,
          sub_category: activeFilters?.sub_category ?? [],
        };

        const placeSource = activeFilters.place_source || 'all';

        if (placeSource === 'AiGaido') {
          // Only fetch suggestions
          const suggestResponse = await discoveryService.suggest(payload);
          const suggestedPlaces = (suggestResponse?.data || []).map(p => ({
            ...p,
            is_suggested: true,
          }));
          return suggestedPlaces as NearbyPlace[];
        }

        // placeSource === 'all': fetch both nearby and suggestions in parallel
        const [nearbyResponse, suggestResponse] = await Promise.all([
          discoveryService.nearbySearch(payload),
          discoveryService.suggest(payload).catch(() => ({ data: [] })),
        ]);

        const nearbyData = (nearbyResponse?.data || []).map(p => ({
          ...p,
          is_suggested: false,
        })) as NearbyPlace[];

        const suggestData = (suggestResponse?.data || []).map(p => ({
          ...p,
          is_suggested: true,
        })) as NearbyPlace[];

        // Deduplicate: if a place appears in both, keep the nearby version
        const seenIds = new Set(nearbyData.map(p => p.place_id));
        const uniqueSuggestions = suggestData.filter(
          p => !seenIds.has(p.place_id),
        );

        return [...nearbyData, ...uniqueSuggestions];
      } catch (error: any) {
        console.log('Search error:', error.message);
        return [];
      }
    },
    enabled: !!userLocation,
    // staleTime: 5 * 60 * 1000,
  });

  const { data: autocompleteData, isFetching: autocompleteLoading } = useQuery({
    queryKey: ['autocomplete', searchQuery],
    queryFn: () =>
      discoveryService.autocomplete(
        searchQuery,
        userLocation?.latitude,
        userLocation?.longitude,
      ),
    enabled: searchQuery.length > 2 && isSearchVisible,
  });

  useEffect(() => {
    if (autocompleteData?.predictions) {
      setAutocompleteResults(autocompleteData.predictions);
    } else {
      setAutocompleteResults([]);
    }
  }, [autocompleteData]);

  // Adjust map view when radius changes or user location coordinates change
  const syncMapToRadius = useCallback(() => {
    if (
      !userLocation ||
      !mapRef.current ||
      !Number.isFinite(userLocation.latitude) ||
      !Number.isFinite(userLocation.longitude) ||
      !Number.isFinite(activeFilters.radius)
    ) {
      return;
    }

    const radius = Math.max(activeFilters.radius, 100);

    const latitudeDelta = Math.max((radius * 2.2) / 111320, 0.005);

    const longitudeDelta =
      latitudeDelta /
      Math.max(Math.cos((userLocation.latitude * Math.PI) / 180), 0.01);

    mapRef.current.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta,
        longitudeDelta,
      },
      500,
    );
  }, [activeFilters.radius, userLocation?.latitude, userLocation?.longitude]);

  useEffect(() => {
    syncMapToRadius();
  }, [syncMapToRadius]);

  // Restore the selected radius after returning from Place Details.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const refreshNearbyMap = async () => {
        try {
          // Give MapView time to mount after navigation
          await new Promise((resolve: any) => setTimeout(resolve, 300));

          if (!isActive) return;

          // Re-fetch location when returning to Nearby screen
          refetchUserLocation();

          if (!isActive) return;

          // Give React state/map time to update
          setTimeout(() => {
            if (!isActive) return;

            syncMapToRadius();
          }, 300);
        } catch (error) {
          console.log('Nearby screen refresh error:', error);
        }
      };

      refreshNearbyMap();

      return () => {
        isActive = false;
      };
    }, [refetchUserLocation, syncMapToRadius]),
  );

  useEffect(() => {
    if (!userLocation) return;

    const timer = setTimeout(() => {
      syncMapToRadius();
    }, 300);

    return () => clearTimeout(timer);
  }, [
    userLocation?.latitude,
    userLocation?.longitude,
    activeFilters.radius,
    syncMapToRadius,
  ]);

  const handleAutocompleteSelect = async (
    prediction: AutocompletePrediction,
  ) => {
    setSearchQuery(prediction.main_text);
    setAutocompleteResults([]);

    try {
      const detailsResponse = await placeService.getDetails(
        prediction.place_id,
      );
      const data = detailsResponse?.data;
      if (data?.latitude && data?.longitude && mapRef.current) {
        const delta = (activeFilters.radius * 2) / 111320;
        mapRef.current.animateToRegion(
          {
            latitude: data.latitude,
            longitude: data.longitude,
            latitudeDelta: delta * 1.2,
            longitudeDelta: delta * 1.2,
          },
          1000,
        );
      }
    } catch (e) {
      console.log('Error fetching autocomplete place details:', e);
    }

    refetchPlaces();
  };

  const togglePlaceSelection = (placeId: string) => {
    setSelectedPlaceIds(prev => {
      if (prev.includes(placeId)) {
        return prev.filter(id => id !== placeId);
      }
      if (prev.length >= 10) {
        Alert.alert(
          'Limit Reached',
          'You can compare up to 10 places at once.',
        );
        return prev;
      }
      return [...prev, placeId];
    });
  };

  const handleCompare = () => {
    if (selectedPlaceIds.length < 2) {
      Alert.alert(
        'Select Places',
        'Please select at least 2 places to compare.',
      );
      return;
    }
    setCompareModalVisible(true);
  };

  const getPhotoUrl = (photoName: string | null): string | null => {
    if (!photoName) return null;
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${Config.GOOGLE_MAPS_API_KEY}`;
  };

  const openFilterModal = () => {
    setTempFilters({ ...activeFilters });
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    const newFilters = { ...tempFilters };
    persistedFilters = newFilters;
    setActiveFilters(newFilters);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setTempFilters({ ...DEFAULT_FILTERS });
  };


  const hasActiveFilters =
    activeFilters.category !== DEFAULT_FILTERS.category ||
    activeFilters.radius !== DEFAULT_FILTERS.radius ||
    activeFilters.max_result_count !== DEFAULT_FILTERS.max_result_count ||
    activeFilters.place_source !== DEFAULT_FILTERS.place_source;

  const renderPlaceCard = ({ item }: { item: NearbyPlace }) => {
    const photoUrl = getPhotoUrl(item.first_photo_name);
    const typeLabel = item.is_suggested
      ? 'AiGaido Pick'
      : getPlaceTypeLabel(item.primary_type);
    const typeIcon = item.is_suggested
      ? 'heart'
      : getPlaceTypeIcon(item.primary_type);
    const isSelected = selectedPlaceIds.includes(item.place_id);

    return (
      <TouchableOpacity
        style={[styles.placeCard, isSelected && styles.placeCardSelected]}
        activeOpacity={0.7}
        onPress={() => {
          if (isCompareMode) {
            togglePlaceSelection(item.place_id);
          } else {
            navigation.navigate('PlaceDetails', {
              placeId: item.place_id,
              placeName: item.display_name,
              formatted_address: item?.formatted_address,
              latitude: item?.latitude,
              longitude: item?.longitude,
              google_maps_uri: item?.google_maps_uri,
              open_now: item?.open_now,
              photoUrl: photoUrl,
              typeIcon: typeIcon,
              rating: item?.rating as number,
              user_rating_count: item?.user_rating_count as number,
              is_locked: item?.is_locked,
            });
          }
        }}
        onLongPress={() => {
          if (!isCompareMode) {
            setIsCompareMode(true);
            togglePlaceSelection(item.place_id);
          }
        }}
      >
        <View style={styles.cardLeft}>
          {isCompareMode && (
            <View
              style={[
                styles.selectionCircle,
                isSelected && styles.selectionCircleActive,
              ]}
            >
              {isSelected && (
                <Icon name="checkmark" size={14} color="#ffffff" />
              )}
            </View>
          )}
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.placeImage} />
          ) : (
            <View style={[styles.placeImage, styles.placeImagePlaceholder]}>
              <Icon name={typeIcon} size={24} color="#9ca3af" />
            </View>
          )}
          {item.is_locked && (
            <View
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: 12,
                padding: 4,
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 1,
              }}
            >
              <Icon name="lock-closed" size={12} color="#3b2c85" />
            </View>
          )}
        </View>
        <View style={styles.placeInfo}>
          <Text style={styles.placeName} numberOfLines={1}>
            {item.display_name}
          </Text>
          <Text style={styles.placeAddress} numberOfLines={1}>
            {item.formatted_address}
          </Text>
          <View style={styles.placeMetaRow}>
            <View style={styles.typeBadge}>
              <Icon name={typeIcon} size={10} color="#3b82f6" />
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
            {item.open_now !== null && (
              <View
                style={[
                  styles.openStatusBadge,
                  { backgroundColor: item.open_now ? '#ecfdf5' : '#fef2f2' },
                ]}
              >
                <Text
                  style={[
                    styles.openStatusText,
                    { color: item.open_now ? '#10b981' : '#ef4444' },
                  ]}
                >
                  {item.open_now ? 'Open' : 'Closed'}
                </Text>
              </View>
            )}
          </View>
        </View>
        {item.rating && (
          <View style={styles.ratingContainer}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              <Icon name="star" size={11} color="#d97706" />
            </View>
            {item.user_rating_count && (
              <Text style={styles.ratingCount}>
                {item.user_rating_count > 999
                  ? `${(item.user_rating_count / 1000).toFixed(1)}k`
                  : item.user_rating_count}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (locationLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b2c85" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      {/* Fullscreen Map */}
      <MapView
        userInterfaceStyle="light"
        mapType={mapType}
        customMapStyle={mapStyle}
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: userLocation?.latitude ?? 0,
          longitude: userLocation?.longitude ?? 0,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsPointsOfInterests={false}
        scrollEnabled={true}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        <Circle
           key={`radius-${isFocused ? 'focused' : 'unfocused'}`}
          center={{
            latitude: userLocation?.latitude || 0,
            longitude: userLocation?.longitude || 0,
          }}
          radius={activeFilters.radius || 0}
          fillColor={
            userLocation && (activeFilters.radius || 0) > 0
              ? isDarkMode
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(59, 44, 133, 0.08)'
              : 'transparent'
          }
          strokeColor={
            userLocation && (activeFilters.radius || 0) > 0
              ? isDarkMode
                ? 'rgba(255, 255, 255, 0.65)'
                : 'rgba(59, 44, 133, 0.65)'
              : 'transparent'
          }
          strokeWidth={userLocation && (activeFilters.radius || 0) > 0 ? 3 : 0}
          zIndex={1}
        />

        {nearbyPlaces?.map(place => {
          const isLocked = place.is_locked ?? true;
          const isSelected = selectedPlaceIds.includes(place.place_id);

          return (
            <Marker
              key={place.place_id}
              coordinate={{
                latitude: place.latitude || 0,
                longitude: place.longitude || 0,
              }}
              tracksViewChanges={Platform.OS !== 'ios'}
              onPress={() => {
                if (isCompareMode) {
                  if (isLocked) {
                    Alert.alert(
                      'Place Locked',
                      'Only unlocked places can be compared. Please unlock this place first.',
                    );
                    return;
                  }
                  togglePlaceSelection(place.place_id);
                } else {
                  navigation.navigate('PlaceDetails', {
                    placeId: place.place_id,
                    placeName: isLocked ? undefined : place.display_name,
                    formatted_address: isLocked
                      ? undefined
                      : place.formatted_address,
                    latitude: place.latitude,
                    longitude: place.longitude,
                    rating: isLocked ? 0 : place.rating || 0,
                    user_rating_count: isLocked
                      ? 0
                      : place.user_rating_count || 0,
                    is_locked: isLocked,
                    typeIcon: getPlaceTypeIcon(place.primary_type),
                    open_now: isLocked ? null : place.open_now,
                    google_maps_uri: isLocked ? null : place.google_maps_uri,
                    photoUrl: isLocked
                      ? null
                      : getPhotoUrl(place.first_photo_name),
                  });
                }
              }}
            >
              <View style={styles.markerAnchor}>
                <View
                  style={[
                    styles.mapIconContainer,
                    isLocked && styles.mapIconLocked,
                    isSelected && styles.mapIconSelected,
                  ]}
                >
                  <Icon
                    name={
                      isLocked
                        ? 'lock-closed'
                        : place.is_suggested
                        ? 'heart'
                        : getPlaceTypeIcon(place.primary_type)
                    }
                    size={14}
                    color={
                      isSelected ? '#ffffff' : isLocked ? '#ffffff' : '#3b2c85'
                    }
                  />
                </View>
                {isSelected && (
                  <View style={styles.selectedCheckBadge}>
                    <Icon name="checkmark" size={10} color="#ffffff" />
                  </View>
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>
      {isFetching && (
        <View style={[styles.fetchingOverlay, { top: insets.top + 80 }]}>
          <ActivityIndicator size="small" color="#3b2c85" />
          <Text style={styles.fetchingText}>Searching...</Text>
        </View>
      )}
      {/* Map Type Toggle Button */}
      <TouchableOpacity
        style={[styles.mapTypeButton, { top: insets.top + 80 }]}
        onPress={() => {
          const next = mapType === 'standard' ? 'satellite' : 'standard';
          persistedMapType = next;
          setMapType(next);
        }}
      >
        <Icon
          name={mapType === 'standard' ? 'earth' : 'map'}
          size={24}
          color="#3b2c85"
        />
      </TouchableOpacity>
      {/* Solid White Status Bar Background */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top + 16,
          backgroundColor: '#ffffff',
          zIndex: 90,
        }}
      />
      {/* Floating Header */}
      <View style={[styles.header, { top: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (isCompareMode) {
              setIsCompareMode(false);
              setSelectedPlaceIds([]);
            } else {
              const parentNav = navigation.getParent();
              if (parentNav && parentNav.canGoBack()) {
                parentNav.goBack();
              } else {
                navigation.navigate('Home');
              }
            }
          }}
        >
          <Icon
            name={isCompareMode ? 'close' : 'arrow-back'}
            size={22}
            color="#111827"
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isCompareMode
              ? `${selectedPlaceIds.length} Selected to Compare`
              : 'Nearby Places'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {isCompareMode
              ? 'Tap unlocked pins on map to select/unselect'
              : `${nearbyPlaces?.length ?? 0} places discovered`}
          </Text>
        </View>

        {!isCompareMode ? (
          <>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => {
                setIsCompareMode(true);
                setSelectedPlaceIds([]);
              }}
            >
              <Icon name="git-compare-outline" size={20} color="#3b2c85" />
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={[styles.headerIconButton, showSavedOnly && styles.headerIconButtonActive]}
              onPress={() => setShowSavedOnly(!showSavedOnly)}>
              <Icon name={showSavedOnly ? "bookmark" : "bookmark-outline"} size={20} color={showSavedOnly ? "#ffffff" : "#3b2c85"} />
            </TouchableOpacity> */}
            {/* 
            {weatherData?.forecast?.current_weather && (
              <TouchableOpacity
                style={styles.weatherPill}
                onPress={() => navigation.navigate('Weather')}
              >
                <Icon
                  name={getWeatherIcon(weatherData.forecast.current_weather.weathercode, !!weatherData.forecast.current_weather.is_day)}
                  size={18}
                  color="#3b2c85"
                />
                <Text style={styles.weatherPillText}>
                  {weatherData.forecast.current_weather.temperature?.toFixed(0)}°
                </Text>
              </TouchableOpacity>
            )} */}
          </>
        ) : (
          <TouchableOpacity
            style={[
              styles.compareButton,
              selectedPlaceIds.length < 2 && styles.compareButtonDisabled,
            ]}
            onPress={handleCompare}
            disabled={selectedPlaceIds.length < 2}
          >
            <Text style={styles.compareButtonText}>
              Compare ({selectedPlaceIds.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Floating Action Buttons */}
      {!isCompareMode && (
        <View
          style={[
            styles.floatingButtonsContainer,
            { bottom: Math.max(20, insets.bottom) },
          ]}
        >
          <TouchableOpacity
            style={styles.floatingFilterButton}
            onPress={openFilterModal}
            activeOpacity={0.8}
          >
            <Icon name="options-outline" size={18} color="#3b2c85" />
            <Text style={styles.floatingFilterText}>Apply Filters</Text>
            {hasActiveFilters && <View style={styles.floatingFilterDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingTravelAgentButton}
            onPress={() =>
              navigation.navigate('AgentTravelChat', { newChat: true })
            }
            activeOpacity={0.8}
          >
            <Icon name="sparkles" size={18} color="#ffffff" />
            <Text style={styles.floatingTravelAgentText}>
              Chat With TravelAgent
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: Math.max(24, insets.bottom + 16) },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Places</Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Place Source Header */}
              <View style={styles.placeSourceFilterContainer}>
                <View style={styles.placeSourceIconContainer}>
                  <Icon name="location-outline" size={18} color="#3b2c85" />
                </View>
                <View style={styles.placeSourceTextContainer}>
                  <Text style={styles.placeSourceTitle}>
                    <Text style={styles.placeSourceTitleBold}>Place </Text>
                    Source
                  </Text>
                  <Text style={styles.placeSourceSubtitle}>
                    Discover standout destinations with AiGaido Suggested Places,
                    specially selected for a better travel experience.
                  </Text>
                </View>
              </View>

              {/* Place Source Toggle */}
              <View style={styles.placeSourceToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.placeSourceTab,
                    (!tempFilters.place_source ||
                      tempFilters.place_source === 'all') &&
                      styles.placeSourceTabActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() =>
                    setTempFilters(prev => ({ ...prev, place_source: 'all' }))
                  }
                >
                  <Icon
                    name="earth"
                    size={16}
                    color={
                      !tempFilters.place_source ||
                      tempFilters.place_source === 'all'
                        ? '#ffffff'
                        : '#3b2c85'
                    }
                  />
                  <Text
                    style={[
                      styles.placeSourceTabText,
                      !tempFilters.place_source ||
                      tempFilters.place_source === 'all'
                        ? styles.placeSourceTabTextActive
                        : styles.placeSourceTabTextInactive,
                    ]}
                  >
                    All Places
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.placeSourceTab,
                    tempFilters.place_source === 'AiGaido' &&
                      styles.placeSourceTabActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() =>
                    setTempFilters(prev => ({
                      ...prev,
                      place_source: 'AiGaido',
                    }))
                  }
                >
                  <Icon
                    name="sparkles"
                    size={16}
                    color={
                      tempFilters.place_source === 'AiGaido'
                        ? '#ffffff'
                        : '#3b2c85'
                    }
                  />
                  <Text
                    style={[
                      styles.placeSourceTabText,
                      tempFilters.place_source === 'AiGaido'
                        ? styles.placeSourceTabTextActive
                        : styles.placeSourceTabTextInactive,
                    ]}
                  >
                    AiGaido Picks
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.filterSectionTitle}>
                What are you looking for?
              </Text>
              <Text style={styles.filterSectionSubtitle}>
                Select categories to filter results
              </Text>
              <View style={{ marginTop: 8 }}>
                {[
                  { id: 'explore', label: 'Explore', icon: 'compass-outline' },
                  // { id: 'tourist', label: 'Tourist', icon: 'camera-outline' },
                  {
                    id: 'food_and_drinks',
                    label: 'Food & Dining',
                    icon: 'restaurant-outline',
                  },
                  { id: 'shopping', label: 'Shopping', icon: 'cart-outline' },
                  {
                    id: 'park_and_ride',
                    label: 'Park & Ride',
                    icon: 'car-outline',
                  },
                  {
                    id: 'fuel',
                    label: 'Fuel',
                    icon: 'flame-outline',
                  },
                ].map(category => {
                  const isExpanded = tempFilters.category === category.id;
                  const categorySubs = SUBCATEGORIES[category.id] || [];
                  const hasSubcategories = categorySubs.length > 1;
                  const selectedCount =
                    isExpanded && hasSubcategories
                      ? tempFilters.sub_category?.length || 0
                      : 0;

                  return (
                    <View
                      key={category.id}
                      style={{
                        borderBottomWidth: 1,
                        borderBottomColor: '#f9fafb',
                      }}
                    >
                      <TouchableOpacity
                        style={styles.categoryHeader}
                        onPress={() => {
                          if (isExpanded) {
                            setTempFilters(prev => ({
                              ...prev,
                              category: '',
                              sub_category: [],
                            }));
                          } else {
                            const defaultSubs =
                              categorySubs.length === 1
                                ? [categorySubs[0].id]
                                : [];
                            setTempFilters(prev => ({
                              ...prev,
                              category: category.id,
                              sub_category: defaultSubs,
                            }));
                          }
                        }}
                      >
                        <View style={styles.categoryHeaderLeft}>
                          <View style={styles.categoryIconContainer}>
                            <Icon
                              name={category.icon}
                              size={18}
                              color={isExpanded ? '#3b2c85' : '#6b7280'}
                            />
                          </View>
                          <Text
                            style={[
                              styles.categoryLabel,
                              isExpanded && { color: '#3b2c85' },
                            ]}
                          >
                            {category.label}
                          </Text>
                          {selectedCount > 0 && (
                            <View style={styles.selectedBadge}>
                              <Text style={styles.selectedBadgeText}>
                                {selectedCount}
                              </Text>
                            </View>
                          )}
                        </View>
                        {hasSubcategories ? (
                          <Icon
                            name={
                              isExpanded
                                ? 'chevron-up-outline'
                                : 'chevron-down-outline'
                            }
                            size={20}
                            color="#9ca3af"
                          />
                        ) : isExpanded ? (
                          <Icon name="checkmark" size={18} color="#3b2c85" />
                        ) : null}
                      </TouchableOpacity>

                      {isExpanded && hasSubcategories && (
                        <View style={styles.categoryTypes}>
                          <TouchableOpacity
                            style={[
                              styles.typeChip,
                              (!tempFilters.sub_category ||
                                tempFilters.sub_category.length === 0) &&
                                styles.typeChipSelected,
                            ]}
                            onPress={() =>
                              setTempFilters(prev => ({
                                ...prev,
                                sub_category: [],
                              }))
                            }
                          >
                            <Text
                              style={[
                                styles.typeChipText,
                                (!tempFilters.sub_category ||
                                  tempFilters.sub_category.length === 0) &&
                                  styles.typeChipTextSelected,
                              ]}
                            >
                              All
                            </Text>
                          </TouchableOpacity>

                          {categorySubs.map(sub => {
                            const isSubSelected =
                              tempFilters.sub_category?.includes(sub.id);
                            return (
                              <TouchableOpacity
                                key={sub.id}
                                style={[
                                  styles.typeChip,
                                  isSubSelected && styles.typeChipSelected,
                                ]}
                                onPress={() => {
                                  setTempFilters(prev => {
                                    const currentSubs = prev.sub_category || [];
                                    if (isSubSelected) {
                                      return {
                                        ...prev,
                                        sub_category: currentSubs.filter(
                                          id => id !== sub.id,
                                        ),
                                      };
                                    } else {
                                      return {
                                        ...prev,
                                        sub_category: [...currentSubs, sub.id],
                                      };
                                    }
                                  });
                                }}
                              >
                                <Text
                                  style={[
                                    styles.typeChipText,
                                    isSubSelected &&
                                      styles.typeChipTextSelected,
                                  ]}
                                >
                                  {sub.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              <Text style={[styles.filterSectionTitle, { marginTop: 24 }]}>
                Search Radius
              </Text>
              <View style={styles.optionRow}>
                {RADIUS_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionButton,
                      styles.optionButtonSmall,
                      tempFilters.radius === opt.value &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() =>
                      setTempFilters(prev => ({ ...prev, radius: opt.value }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        tempFilters.radius === opt.value &&
                          styles.optionButtonTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Icon name="refresh-outline" size={18} color="#6b7280" />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
                <Icon name="checkmark" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Compare Modal */}
      <Modal
        visible={compareModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCompareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              styles.compareModalContent,
              {
                paddingHorizontal: 5,
                paddingBottom: Math.max(28, insets.bottom + 24),
              },
            ]}
          >
            <View style={[styles.modalHeader, styles.compareModalHeader]}>
              <Text style={styles.modalTitle}>Comparison Type</Text>
              <TouchableOpacity
                onPress={() => setCompareModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <Text
              style={[
                styles.filterSectionSubtitle,
                { marginTop: 0, marginBottom: 16, marginLeft: 5 },
              ]}
            >
              Choose how you want to compare these places:
            </Text>

            <TouchableOpacity
              style={styles.compareOptionButton}
              onPress={() => {
                setCompareModalVisible(false);
                navigation.navigate('CompareBasic', {
                  placeIds: selectedPlaceIds,
                });
                setIsCompareMode(false);
                setSelectedPlaceIds([]);
              }}
            >
              <Icon name="list" size={24} color="#3b2c85" />
              <View style={styles.compareOptionTextContainer}>
                <Text style={styles.compareOptionTitle}>Detailed Table</Text>
                <Text style={styles.compareOptionDesc}>
                  Side-by-side comparison of all attributes
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.compareOptionButton}
              onPress={() => {
                setCompareModalVisible(false);
                navigation.navigate('CompareRecommend', {
                  placeIds: selectedPlaceIds,
                });
                setIsCompareMode(false);
                setSelectedPlaceIds([]);
              }}
            >
              <Icon name="sparkles" size={24} color="#3b2c85" />
              <View style={styles.compareOptionTextContainer}>
                <Text style={styles.compareOptionTitle}>
                  Smart Recommendation
                </Text>
                <Text style={styles.compareOptionDesc}>
                  AI-driven insights to help you choose
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  compareModalContent: {
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 28,
  },

  compareModalSubtitle: {
    marginTop: 0,
    marginBottom: 14,
    marginLeft: 24,
    marginRight: 24,
  },

  compareOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',

    marginHorizontal: 12,
    marginBottom: 10,

    paddingHorizontal: 16,
    paddingVertical: 14,

    minHeight: 62,

    backgroundColor: '#f9fafb',
    borderRadius: 12,

    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
  },
  header: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 999,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  headerIconButtonActive: {
    backgroundColor: '#3b2c85',
  },
  infoTooltip: {
    position: 'absolute',
    top: 30,
    left: 0,
    width: 250,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,

    // Shadow for Android
    elevation: 5,

    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,

    zIndex: 100,
  },
  infoTooltipText: { 
    fontSize: 12,
    lineHeight: 18,
    color: '#555',
  },
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 6,
    gap: 4,
  },
  weatherPillText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    color: '#3b2c85',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  filterButtonActive: {
    backgroundColor: '#3b2c85',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#3b2c85',
  },
  searchBarContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 99,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#111827',
    padding: 0,
  },
  mapContainer: {
    backgroundColor: '#e5e7eb',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  centerDotGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  markerAnchor: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  mapIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  mapIconLocked: {
    backgroundColor: '#3b2c85',
    borderColor: '#ffffff',
  },
  mapIconSelected: {
    backgroundColor: '#10b981',
    borderColor: '#ffffff',
    borderWidth: 2,
    transform: [{ scale: 1.2 }],
  },
  fetchingOverlay: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffffee',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  fetchingText: {
    fontSize: 13,
    color: '#3b2c85',
    fontFamily: 'Poppins-SemiBold',
  },
  placeSourceFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  placeSourceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f3f0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeSourceTextContainer: {
    flex: 1,
  },
  placeSourceTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#111827',
  },
  placeSourceTitleBold: {
    fontFamily: 'Poppins-Bold',
  },
  placeSourceSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    marginTop: 1,
  },
  placeSourceToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 30,
    padding: 3,
    marginTop: 14,
    marginBottom: 16,
  },
  placeSourceTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  placeSourceTabActive: {
    backgroundColor: '#3b2c85',
  },
  placeSourceTabText: {
    fontSize: 13,
  },
  placeSourceTabTextActive: {
    color: '#ffffff',
    fontFamily: 'Poppins-SemiBold',
  },
  placeSourceTabTextInactive: {
    color: '#374151',
    fontFamily: 'Poppins-Medium',
  },
  mapTypeButton: {
    position: 'absolute',
    top: 20,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  minimizeMapButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 24,
  },
  floatingButtonsContainer: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 1000,
    paddingHorizontal: 12,
  },
  floatingFilterButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#3b2c85',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#3b2c85',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    gap: 6,
  },
  floatingFilterText: {
    color: '#3b2c85',
    fontFamily: 'Poppins-Bold',
    fontSize: 13,
  },
  floatingFilterDot: {
    position: 'absolute',
    top: 8,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  floatingTravelAgentButton: {
    backgroundColor: '#3b2c85',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#3b2c85',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    gap: 6,
  },
  floatingTravelAgentText: {
    color: '#ffffff',
    fontFamily: 'Poppins-Bold',
    fontSize: 13,
  },
  bottomSheetHandleContainer: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  placeCardSelected: {
    backgroundColor: '#f5f3ff',
    borderColor: '#c084fc',
    borderWidth: 1.5,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCircleActive: {
    backgroundColor: '#3b2c85',
    borderColor: '#3b2c85',
  },
  compareButton: {
    backgroundColor: '#3b2c85',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  compareButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  compareButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
  },
  placeImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
  },
  placeImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Poppins-Regular',
  },
  placeInfo: {
    flex: 1,
    marginLeft: 14,
    fontFamily: 'Poppins-Regular',
  },
  placeName: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    marginBottom: 4,
  },
  placeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    fontFamily: 'Poppins-Regular',
  },
  typeBadgeText: {
    fontSize: 10,
    color: '#3b82f6',
    fontFamily: 'Poppins-SemiBold',
  },
  openStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontFamily: 'Poppins-Regular',
  },
  openStatusText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
  },
  ratingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
    minWidth: 48,
    fontFamily: 'Poppins-Regular',
  },
  ratingText: {
    fontSize: 13,
    fontFamily: 'Poppins-ExtraBold',
    color: '#d97706',
  },
  ratingCount: {
    fontSize: 8,
    color: '#b45309',
    fontFamily: 'Poppins-SemiBold',
    marginTop: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 40,
  },
  emptyButton: {
    backgroundColor: '#3b2c85',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  listLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  listLoadingText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  compareModalHeader: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-ExtraBold',
    color: '#111827',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
    marginBottom: 4,
    marginTop: 10,
  },
  filterSectionSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    marginBottom: 12,
  },
  categoryBlock: {
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f3f0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#374151',
  },
  selectedBadge: {
    backgroundColor: '#3b2c85',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    fontFamily: 'Poppins-Regular',
  },
  selectedBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
  },
  categoryTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 12,
    paddingLeft: 42,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeChipSelected: {
    backgroundColor: '#3b2c85',
    borderColor: '#3b2c85',
  },
  typeChipText: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'Poppins-Medium',
  },
  typeChipTextSelected: {
    color: '#ffffff',
    fontFamily: 'Poppins-Regular',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  optionButtonSmall: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  optionButtonSelected: {
    backgroundColor: '#3b2c85',
    borderColor: '#3b2c85',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Poppins-SemiBold',
  },
  optionButtonTextSelected: {
    color: '#ffffff',
    fontFamily: 'Poppins-Regular',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Poppins-SemiBold',
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3b2c85',
    gap: 6,
  },
  applyButtonText: {
    fontSize: 15,
    color: '#ffffff',
    fontFamily: 'Poppins-Bold',
  },
  autocompleteContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 200,
    overflow: 'hidden',
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  autocompleteTextContainer: {
    marginLeft: 12,
    flex: 1,
    fontFamily: 'Poppins-Regular',
  },
  autocompleteMainText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#111827',
  },
  autocompleteSecondaryText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
  },
  compareOptionTextContainer: {
    marginLeft: 12,
    flex: 1,
    fontFamily: 'Poppins-Regular',
  },
  compareOptionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  compareOptionDesc: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
  },
});
