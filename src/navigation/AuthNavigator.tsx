import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InitialScreen from '../screens/InitialScreen';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import OTPVerificationScreen from '../screens/Auth/OTPVerificationScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import HomeTabNavigator from './HomeTabNavigator';
import PlaceDetailsScreen from '../screens/PlaceDetailsScreen';
import AllPhotosScreen from '../screens/AllPhotosScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import AgentTravelChatScreen from '../screens/AgentTravelChatScreen';
import CommuteScreen from '../screens/CommuteScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SavedPlacesScreen from '../screens/SavedPlacesScreen';
import WeatherScreen from '../screens/WeatherScreen';
import CompareBasicScreen from '../screens/CompareBasicScreen';
import CompareRecommendScreen from '../screens/CompareRecommendScreen';
import PlansScreen from '../screens/PlansScreen';
import IntroVideoScreen from '../screens/IntroVideoScreen';
import ReferralScreen from '../screens/ReferralScreen';
import { addUpdateListener, checkDownloadedUpdate, checkForUpdates } from '../screens/updateService';

export type AuthStackParamList = {
  Splash: undefined;
  Initial: undefined;
  IntroVideo: undefined;
  Login: { email?: string; password?: string } | undefined;
  Register: undefined;
  ForgotPassword: { email?: string } | undefined;
  ChangePassword: undefined;
  OTPVerification: { email: string; password?: string };
  Home: undefined;
  Nearby: undefined;
  SetManualLocation: undefined;
  PlaceDetails: {
    placeId?: string;
    placeName?: string;
    formatted_address?: string;
    latitude?: number;
    longitude?: number;
    google_maps_uri?: string | null;
    open_now?: boolean | null;
    photoUrl?: string | null;
    typeIcon?: string;
    rating?: number;
    user_rating_count?: number;
    is_locked?: boolean | null;
  } | undefined;
  AllPhotos: { photos?: string[] } | undefined;
  ChatDetail: {
    sessionId: string | number;
    placeName?: string;
    placeAddress?: string;
    placeId?:string
  } | undefined;
  AgentTravelChat: { sessionId?: string; title?: string; newChat?: boolean } | undefined;
  Commute: {
    placeId?: string;
    destinationName?: string;
    destinationLat?: number;
    destinationLng?: number;
  } | undefined;
  History: undefined;
  SavedPlaces: undefined;
  Weather: undefined;
  CompareBasic: { placeIds: string[] };
  CompareRecommend: { placeIds: string[] };
  Plans: undefined;
  Referral: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {

  //================ Service for App Update ===================
  useEffect(() => {
     const removeListener = addUpdateListener();
    checkDownloadedUpdate();

    const timer = setTimeout(() => {
      checkForUpdates();
    }, 3000);

    return () => {
      clearTimeout(timer);
      if (removeListener) {
        removeListener();
      }
    };
  }, []);

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Splash">
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Initial" component={InitialScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="IntroVideo" component={IntroVideoScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Nearby" component={HomeTabNavigator} />
      <Stack.Screen name="PlaceDetails" component={PlaceDetailsScreen} />
      <Stack.Screen name="AllPhotos" component={AllPhotosScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="AgentTravelChat" component={AgentTravelChatScreen} />
      <Stack.Screen name="Commute" component={CommuteScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="SavedPlaces" component={SavedPlacesScreen} />
      <Stack.Screen name="Weather" component={WeatherScreen} />
      <Stack.Screen name="CompareBasic" component={CompareBasicScreen} />
      <Stack.Screen name="CompareRecommend" component={CompareRecommendScreen} />
      <Stack.Screen name="Plans" component={PlansScreen} />
      <Stack.Screen name="Referral" component={ReferralScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
