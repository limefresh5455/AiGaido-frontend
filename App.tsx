import React, { useEffect } from 'react';
import { Appearance } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import AuthNavigator from './src/navigation/AuthNavigator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, MD3LightTheme, configureFonts } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { navigationRef } from './src/navigation/NavigationService';

// Configure fonts for React Native Paper (MD3)
const fontConfig = {
  fontFamily: 'Poppins-Regular',
};
const paperTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
};

// Configure fonts for React Navigation
const navTheme = {
  ...DefaultTheme,
  fonts: {
    ...DefaultTheme.fonts,
    regular: { fontFamily: 'Poppins-Regular', fontWeight: '400' as const },
    medium: { fontFamily: 'Poppins-Medium', fontWeight: '500' as const },
    bold: { fontFamily: 'Poppins-Bold', fontWeight: '700' as const },
    heavy: { fontFamily: 'Poppins-ExtraBold', fontWeight: '800' as const },
  },
};

const App = () => {
  const queryClient = new QueryClient();
  
  useEffect(() => {
    // Force React Native appearance to light
    if (Appearance && typeof Appearance.setColorScheme === 'function') {
      Appearance.setColorScheme('light');
    }
  }, []);
  
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={paperTheme}>
            <AuthNavigator />
          </PaperProvider>
        </QueryClientProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
