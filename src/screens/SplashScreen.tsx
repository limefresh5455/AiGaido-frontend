import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import Icon from 'react-native-vector-icons/Ionicons';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

const { width } = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const checkTokenAndNavigate = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        
        // Wait for animation to finish (at least 2000ms)
        setTimeout(() => {
          if (token) {
            navigation.replace('Home');
          } else {
            navigation.replace('Initial');
          }
        }, 2500);

      } catch (error) {
        console.log('Error checking token:', error);
        setTimeout(() => {
          navigation.replace('Initial');
        }, 2500);
      }
    };

    // Start animations
    opacity.value = withTiming(1, { duration: 1000 });
    scale.value = withSequence(
      withTiming(1.1, { duration: 1000, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 500, easing: Easing.bounce })
    );

    checkTokenAndNavigate();
  }, [navigation, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

 
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.contentContainer, animatedStyle]}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo-trans.png')}
            style={styles.logo}
            resizeMode="contain"
            onError={(error) => {
              console.warn('AiGaido logo failed to load:', error.nativeEvent.error);
            }}
          />
        </View>

        <Text style={styles.title}>AiGaido</Text>

        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Icon name="location-sharp" size={16} color="#7e60ff" style={styles.pinIcon} />
          <View style={styles.line} />
        </View>

        <Text style={styles.subtitle}>Explore. Compare. Plan. Experience.</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#14084f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 150,
    height: 150,
    borderRadius: 32,
    // backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    overflow: 'hidden',
  },
  logo: {
    width: 126,
    height: 126,
  },
  title: {
    fontSize: 46,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '70%',
    marginVertical: 10,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#3d288a', 
  },
  pinIcon: {
    marginHorizontal: 15,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#d0c8ff', 
    marginTop: 5,
    letterSpacing: 0.5,
  },
});

export default SplashScreen;