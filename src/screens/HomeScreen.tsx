import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { locationService } from '../services/locationService';
import Icon from 'react-native-vector-icons/Ionicons';
import CustomButton from '../components/Buttons/Button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { weatherService } from '../services/weatherService';
import mapStyle from '../constants/mapStyles';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isClearModalVisible, setIsClearModalVisible] = useState(false);
  const query = useQueryClient();

  // Fetch weather data
  const { data: weatherData } = useQuery({
    queryKey: ['homeWeather'],
    queryFn: () => weatherService.getWeather(),
    staleTime: 10 * 60 * 1000,
  });

  const getWeatherIcon = (code: number, isDay: boolean = true) => {
    switch (code) {
      case 0:
      case 1:
        return isDay ? 'sunny' : 'moon';
      case 2:
      case 3:
        return isDay ? 'partly-sunny' : 'cloudy-night';
      case 45:
      case 48:
        return 'water';
      case 51:
      case 53:
      case 55:
      case 61:
      case 63:
      case 65:
      case 80:
      case 81:
      case 82:
        return 'rainy';
      case 71:
      case 73:
      case 75:
      case 77:
      case 85:
      case 86:
        return 'snow';
      case 95:
      case 96:
      case 99:
        return 'thunderstorm';
      default:
        return 'thermometer';
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (data: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    }) => locationService.updateGps(data),
    onSuccess: res => {
      if (res.success) {
        query.invalidateQueries({ queryKey: ['NearbyPlaces'] });
        query.invalidateQueries({ queryKey: ['GetSavedLocation'] });
        query.invalidateQueries({ queryKey: ['locationsHistory'] });
        navigation.reset({
          index: 0,
          routes: [{ name: 'Nearby' }],
        });
      } else {
      
        Alert.alert('Error', res.message || 'Failed to update location');
      }
    },
    onError: (error: any) => {
   
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        'An error occurred while updating location';
      Alert.alert('Error', errorMessage);
    },
  });

  const requestLocationPermission = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'ios') {
        const auth = await Geolocation.requestAuthorization('whenInUse');
        if (auth === 'granted') {
          setPermissionGranted(true);
          getCurrentLocation();
        } else {
          setPermissionGranted(false);
          setLoading(false);
        }
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'We need access to your location to show it on the map.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionGranted(true);
          getCurrentLocation();
        } else {
          setPermissionGranted(false);
          setLoading(false);
        }
      }
    } catch (err) {
   
      setPermissionGranted(false);
      setLoading(false);
    }
  };

  const {
    data: latestLocation,
    isLoading: latestLoading,
    refetch: refetchLatest,
  } = useQuery({
    queryKey: ['GetLatestLocation'],
    queryFn: async () => {
      try {
        const response = await locationService.getLatest();
        const resData = response?.data;

        if (
          resData &&
          resData.latitude !== undefined &&
          resData.latitude !== null
        ) {
          const lat =
            typeof resData.latitude === 'string'
              ? parseFloat(resData.latitude)
              : resData.latitude;
          const lng =
            typeof resData.longitude === 'string'
              ? parseFloat(resData.longitude)
              : resData.longitude;

          setLocation({
            latitude: lat,
            longitude: lng,
            accuracy: resData.accuracy,
          });
          return { latitude: lat, longitude: lng, accuracy: resData.accuracy };
        }
        return null;
      } catch (error) {
        console.log('No latest location found.');
        return null;
      }
    },
    staleTime: 0, // Always get fresh latest location
  });


  const { data, isLoading: savedLoading } = useQuery({
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
          const acc =
            typeof resData.accuracy === 'string'
              ? parseInt(resData.accuracy)
              : resData.accuracy;

          if (!location) {
            setLocation({
              latitude: lat,
              longitude: lng,
              accuracy: acc,
            });
          }
          return { latitude: lat, longitude: lng, accuracy: acc };
        }
        return null;
      } catch (error) {
        console.log('No saved location found.');
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: addressData, isLoading: addressLoading } = useQuery({
    queryKey: ['reverseGeocode', location?.latitude, location?.longitude],
    queryFn: async () => {
      if (!location) return null;
      try {
        const response = await locationService.reverseGeocode(location.latitude, location.longitude);
        return response?.data || response;
      } catch (error) {
        console.log('Error reverse geocoding:', error);
        return null;
      }
    },
    enabled: !!location,
    staleTime: 10 * 60 * 1000,
  });

  const getCurrentLocation = () => {
    setLoading(true);
    Geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude, accuracy } = position.coords;

        // Update UI immediately for better UX
        setLocation({ latitude, longitude, accuracy });
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
        setLoading(false);
      },
      error => {
        console.log('GPS Error:', error.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };

  const handleConfirmLocation = () => {
    if (location) {
      mutate({
        latitude: location?.latitude,
        longitude: location?.longitude,
        accuracy: location?.accuracy,
      });
    }
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  if (loading && !location) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b2c85" />
          <Text style={styles.loadingText}>Fetching your location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Only show permission error if we have NO location data at all
  if (
    permissionGranted === false &&
    !location &&
    !latestLoading &&
    !savedLoading
  ) {
    return (
      <SafeAreaView style={styles.safeAreaLoading}>
        <View style={styles.centerContainer}>
          <Icon
            name="location-outline"
            size={64}
            color="#ef4444"
            style={{ marginBottom: 20 }}
          />
          <Text style={styles.errorText}>
            Location permission is required to fetch your current GPS position.
          </Text>
          <Text
            style={[
              styles.errorText,
              { fontSize: 14, opacity: 0.8, marginTop: 8 },
            ]}
          >
            Please enable location services or set your location manually to
            continue.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={requestLocationPermission}
          >
            <Text style={styles.retryButtonText}>Retry Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { marginTop: 12, backgroundColor: '#3b2c85' },
            ]}
            onPress={() => navigation.navigate('SetManualLocation')}
          >
            <Text style={styles.retryButtonText}>Set Location Manually</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback if everything finished but no location was found
  if (!loading && !location && !latestLoading && !savedLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centerContainer}>
          <Icon
            name="map-outline"
            size={64}
            color="#d1d5db"
            style={{ marginBottom: 20 }}
          />
          <Text style={[styles.errorText, { color: '#111827' }]}>
            No location data available.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { marginTop: 20 }]}
            onPress={() => navigation.navigate('SetManualLocation')}
          >
            <Text style={styles.retryButtonText}>Set Location Manually</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { marginTop: 12, backgroundColor: '#f3f4f6' },
            ]}
            onPress={requestLocationPermission}
          >
            <Text style={[styles.retryButtonText, { color: '#4b5563' }]}>
              Try GPS Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Location</Text>
        <View style={styles.headerRight}>
          {weatherData?.data?.forecast?.current_weather ? (
            <TouchableOpacity
              style={styles.weatherPill}
              onPress={() => navigation.navigate('Weather')}
            >
              <Icon
                name={getWeatherIcon(
                  weatherData.data.forecast.current_weather.weathercode,
                  !!weatherData.data.forecast.current_weather.is_day,
                )}
                size={18}
                color="#3b2c85"
              />
              <Text style={styles.weatherPillText}>
                {weatherData.data.forecast.current_weather.temperature?.toFixed(0)}°
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.weatherPill, { opacity: 0.6 }]}>
              <ActivityIndicator size="small" color="#3b2c85" />
            </View>
          )}
        </View>
      </View>

      <View style={styles.mapContainer}>
        {location && !isNaN(location.latitude) && !isNaN(location.longitude) ? (
          <MapView
          customMapStyle={mapStyle}
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={false}
            onMapReady={() => console.log('Google Maps is successfully ready')}
          >
            <Marker coordinate={location} title="You are here" />
          </MapView>
        ) : (
          <View style={styles.centerContainer}>
            <Text style={{ color: '#111827', marginTop: 20 }}>
              Invalid Coordinates!
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.cardContainer, { paddingBottom: Math.max(40, insets.bottom + 20) }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Icon name="location" size={24} color="#4f46e5" />
            <Text style={styles.cardTitle}>Current Location</Text>
          </View>
          {/* {location && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setIsClearModalVisible(true)}
              disabled={deleteLocationMutation.isPending}
            >
              <Icon name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          )} */}
        </View>

        <Text style={styles.addressText}>
          {addressLoading
            ? 'Fetching address...'
            : addressData?.address || addressData?.display_name || addressData?.formatted_address || addressData?.full_address || `Lat: ${location?.latitude.toFixed(6)}, Lng: ${location?.longitude.toFixed(6)}`}
        </Text> 
        {/* {location?.accuracy && (
          <Text style={styles.accuracyText}>
            Accuracy: {location?.accuracy.toFixed(2)} m
          </Text>
        )} */}

        <View style={styles.buttonGroup}>
          <CustomButton
            type="primary"
            title="Confirm GPS Location"
            onPress={handleConfirmLocation}
            loading={loading || isPending}
            disabled={loading || isPending}
          />

          <CustomButton
            type="secondary"
            title="Refetch Location"
            onPress={getCurrentLocation}
            loading={loading}
            disabled={loading}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaLoading: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  weatherPillText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#3b2c85',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 20,
    marginTop: -30, // Overlap the map
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  addressText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 4,
  },
  accuracyText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    marginBottom: 24,
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#3b2c85',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4b5563',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Poppins-Regular',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  retryButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  modalMessage: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#4b5563',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
  },
  clearConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  clearConfirmButtonText: {
    color: '#ffffff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
  },
});
