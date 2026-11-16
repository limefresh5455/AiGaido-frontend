import React from 'react';
import { View, Text, StyleSheet, StatusBar, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomButton from '../components/Buttons/Button';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Initial'>;
};

export default function InitialScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#2c1e6e" />
      <View style={styles.container}>
        
        <View style={styles.content}>
          <View style={styles.heroContainer}>
            {/* App Logo Icon */}
            <Image 
              source={require('../assets/logo-trans.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.title}>AiGaido</Text>
          <Text style={styles.subtitle}>Discover amazing places{'\n'}around you</Text>
        </View>

        <View style={[styles.buttonContainer, { paddingBottom: Math.max(30, insets.bottom + 10) }]}>
          <CustomButton
            title="Get Started"
            type="secondary"
            onPress={() => navigation.navigate('Register')}
            buttonStyle={{ backgroundColor: '#ffffff', shadowColor: 'transparent', elevation: 0 }}
            textStyle={{ color: '#3b2c85' }}
          />

          <CustomButton
            title="Login / Register"
            type="secondary"
            onPress={() => navigation.navigate('Login')}
            buttonStyle={{ backgroundColor: 'transparent', borderColor: '#ffffff', borderWidth: 1 }}
            textStyle={{ color: '#ffffff' }}
          />
        </View>
        
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2c1e6e', // Deep purple representing the gradient
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -40,
  },
  heroContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  circleLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  circleMedium: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  circleSmall: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  logo: {
    width: 200,
    height: 200,
    zIndex: 2,
  },
  title: {
    fontSize: 40,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#3b2c85', // Purple text
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
});
