import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { weatherService } from '../services/weatherService';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Weather'>;
};

const getWeatherCondition = (code: number) => {
  switch (code) {
    case 0: return 'Clear sky';
    case 1: return 'Mainly clear';
    case 2: return 'Partly cloudy';
    case 3: return 'Overcast';
    case 45:
    case 48: return 'Fog';
    case 51:
    case 53:
    case 55: return 'Drizzle';
    case 56:
    case 57: return 'Freezing Drizzle';
    case 61:
    case 63:
    case 65: return 'Rain';
    case 66:
    case 67: return 'Freezing Rain';
    case 71:
    case 73:
    case 75: return 'Snow fall';
    case 77: return 'Snow grains';
    case 80:
    case 81:
    case 82: return 'Rain showers';
    case 85:
    case 86: return 'Snow showers';
    case 95: return 'Thunderstorm';
    case 96:
    case 99: return 'Thunderstorm with hail';
    default: return 'Unknown';
  }
};

const getWeatherIcon = (code: number, isDay: boolean = true) => {
  switch (code) {
    case 0:
    case 1: return isDay ? 'sunny' : 'moon';
    case 2:
    case 3: return isDay ? 'partly-sunny' : 'cloudy-night';
    case 45:
    case 48: return 'water';
    case 51:
    case 53:
    case 55:
    case 61:
    case 63:
    case 65:
    case 80:
    case 81:
    case 82: return 'rainy';
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86: return 'snow';
    case 95:
    case 96:
    case 99: return 'thunderstorm';
    default: return 'thermometer';
  }
};

export default function WeatherScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: weather, isLoading: weatherLoading, error: weatherError, refetch: refetchWeather } = useQuery({
    queryKey: ['weather'],
    queryFn: () => weatherService.getWeather(),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchWeather();
    setIsRefreshing(false);
  };

  const weatherData = weather?.data;
  const current = weatherData?.forecast?.current_weather;
  const hourly = weatherData?.forecast?.hourly;
  const daily = weatherData?.forecast?.daily;
  const aqiData = weatherData?.air_quality;

  if (weatherLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#3b2c85" />
        <Text style={styles.loadingText}>Fetching weather data...</Text>
      </SafeAreaView>
    );
  }

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  const getDayName = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleDateString([], { weekday: 'short' });
    } catch {
      return timeStr;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weather & Air Quality</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.backButton} disabled={isRefreshing}>
          {isRefreshing ? (
             <ActivityIndicator size="small" color="#111827" />
          ) : (
             <Icon name="refresh" size={22} color="#111827" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(20, insets.bottom + 20) }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#3b2c85']} />
        }
      >
        {weatherData && current ? (
          <>
            <View style={styles.mainCard}>
              <Text style={styles.cityText}>{weatherData.location?.city || 'Current Location'}</Text>
              <Text style={styles.timeText}>As of {formatTime(current.time)}</Text>
              
              <View style={styles.tempRow}>
                <Icon
                  name={getWeatherIcon(current.weathercode, !!current.is_day)}
                  size={64}
                  color="#3b2c85"
                />
                <View style={styles.tempContainer}>
                  <Text style={styles.currentTemp}>{current.temperature?.toFixed(1)}°C</Text>
                  <Text style={styles.conditionText}>{getWeatherCondition(current.weathercode)}</Text>
                </View>
              </View>

              <View style={styles.subInfoRow}>
                <View style={styles.subInfoItem}>
                  <Text style={styles.subInfoLabel}>Wind</Text>
                  <Text style={styles.subInfoValue}>{current.windspeed} km/h</Text>
                </View>
                <View style={styles.subInfoItem}>
                  <Text style={styles.subInfoLabel}>Direction</Text>
                  <Text style={styles.subInfoValue}>{current.winddirection}°</Text>
                </View>
                {daily && (
                  <View style={styles.subInfoItem}>
                    <Text style={styles.subInfoLabel}>H/L</Text>
                    <Text style={styles.subInfoValue}>
                      {daily.temperature_2m_max[0]?.toFixed(0)}° / {daily.temperature_2m_min[0]?.toFixed(0)}°
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {hourly && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hourly Forecast</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyScroll}>
                  {hourly.time.slice(0, 24).map((time, index) => (
                    <View key={time} style={styles.hourlyItem}>
                      <Text style={styles.hourlyTime}>{index === 0 ? 'Now' : formatTime(time).split(' ')[0]}</Text>
                      <Icon 
                        name={getWeatherIcon(hourly.weathercode[index], !!current.is_day)} 
                        size={24} 
                        color="#3b2c85" 
                      />
                      <Text style={styles.hourlyTemp}>{hourly.temperature_2m[index].toFixed(0)}°</Text>
                      <View style={styles.humidityRow}>
                        <Icon name="water" size={10} color="#60a5fa" />
                        <Text style={styles.hourlyHumidity}>{hourly.relativehumidity_2m[index]}%</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Air Quality Index</Text>
              <View style={styles.aqiCard}>
                <View style={styles.aqiMain}>
                  <Text style={styles.aqiValue}>{aqiData?.hourly?.pm2_5?.[0]?.toFixed(0) || 'N/A'}</Text>
                  <Text style={styles.aqiLabel}>PM2.5</Text>
                </View>
                <View style={styles.aqiDetails}>
                  <Text style={styles.aqiStatus}>
                    {(aqiData?.hourly?.pm2_5?.[0] || 0) <= 50 ? 'Good' : (aqiData?.hourly?.pm2_5?.[0] || 0) <= 100 ? 'Moderate' : 'Unhealthy'}
                  </Text>
                  <Text style={styles.aqiDescription}>
                    Air quality is satisfactory, and air pollution poses little or no risk.
                  </Text>
                </View>
              </View>
            </View>

            {daily && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Daily Summary</Text>
                <View style={styles.dailyCard}>
                  {daily.time.map((time, index) => (
                    <View key={time} style={styles.dailyItem}>
                      <Text style={styles.dailyDay}>{index === 0 ? 'Today' : getDayName(time)}</Text>
                      <Icon 
                        name={getWeatherIcon(daily.weathercode[index])} 
                        size={24} 
                        color="#3b2c85" 
                        style={styles.dailyIcon}
                      />
                      <View style={styles.dailyTempRange}>
                        <Text style={styles.dailyMaxTemp}>{daily.temperature_2m_max[index].toFixed(0)}°</Text>
                        <View style={styles.tempBar} />
                        <Text style={styles.dailyMinTemp}>{daily.temperature_2m_min[index].toFixed(0)}°</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Icon name="cloud-offline-outline" size={64} color="#d1d5db" />
            <Text style={styles.errorText}>Unable to load weather data</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  cityText: {
    fontSize: 24,
    fontFamily: 'Poppins-ExtraBold',
    color: '#111827',
  },
  timeText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 24,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 32,
  },
  tempContainer: {
    flex: 1,
  },
  currentTemp: {
    fontSize: 48,
    fontFamily: 'Poppins-ExtraBold',
    color: '#3b2c85',
  },
  conditionText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#4b5563',
    marginTop: -4,
  },
  subInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 20,
    fontFamily: 'Poppins-Regular',
  },
  subInfoItem: {
    alignItems: 'center',
    fontFamily: 'Poppins-Regular',
  },
  subInfoLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    marginBottom: 4,
  },
  subInfoValue: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    color: '#374151',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
    marginBottom: 12,
    marginLeft: 4,
  },
  hourlyScroll: {
    paddingVertical: 8,
  },
  hourlyItem: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    width: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  hourlyTime: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontFamily: 'Poppins-SemiBold',
  },
  hourlyTemp: {
    fontSize: 16,
    fontFamily: 'Poppins-ExtraBold',
    color: '#111827',
    marginTop: 8,
  },
  humidityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  hourlyHumidity: {
    fontSize: 10,
    color: '#60a5fa',
    fontFamily: 'Poppins-Bold',
  },
  aqiCard: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  aqiMain: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#dcfce7',
  },
  aqiValue: {
    fontSize: 32,
    fontFamily: 'Poppins-ExtraBold',
    color: '#166534',
  },
  aqiLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#166534',
    marginTop: -2,
  },
  aqiDetails: {
    flex: 1,
    paddingLeft: 20,
    justifyContent: 'center',
  },
  aqiStatus: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#166534',
    marginBottom: 4,
  },
  aqiDescription: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#166534',
    lineHeight: 18,
    opacity: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  gridLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    marginTop: 8,
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    color: '#374151',
  },
  dailyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  dailyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dailyDay: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#111827',
    width: 80,
  },
  dailyIcon: {
    marginHorizontal: 20,
  },
  dailyTempRange: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dailyMaxTemp: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
    width: 30,
    textAlign: 'right',
  },
  dailyMinTemp: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#9ca3af',
    width: 30,
    textAlign: 'right',
  },
  tempBar: {
    height: 4,
    width: 60,
    backgroundColor: '#f3f4f6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    fontFamily: 'Poppins-Regular',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    marginTop: 12,
  },
  retryButton: {
    backgroundColor: '#3b2c85',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  retryText: {
    color: '#ffffff',
    fontFamily: 'Poppins-Bold',
  },
});
