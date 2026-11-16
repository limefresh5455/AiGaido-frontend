import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SpInAppUpdates, {
  IAUUpdateKind,
  IAUInstallStatus,
} from 'sp-react-native-in-app-updates';

const UPDATE_DOWNLOADED_KEY = 'UPDATE_DOWNLOADED';

let inAppUpdatesInstance: SpInAppUpdates | null = null;

const getInAppUpdates = () => {
  if (!inAppUpdatesInstance) {
    inAppUpdatesInstance = new SpInAppUpdates(false);
  }

  return inAppUpdatesInstance;
};

const showRestartAlert = (inAppUpdates: SpInAppUpdates) => {
  Alert.alert(
    'Update Ready 🎉',
    'The latest version of AiGaido has been downloaded. Restart the app now to enjoy the latest features.',
    [
      {
        text: 'Later',
        style: 'cancel',
      },

      {
        text: 'Restart Now',

        onPress: async () => {
          try {
            await AsyncStorage.removeItem(UPDATE_DOWNLOADED_KEY);

            inAppUpdates.installUpdate();
          } catch (error: any) {
            console.log('INSTALL UPDATE ERROR => ');
          }
        },
      },
    ],
    { cancelable: false },
  );
};

export const checkDownloadedUpdate = async () => {
  try {
    const inAppUpdates = getInAppUpdates();

    const isDownloaded = await AsyncStorage.getItem(UPDATE_DOWNLOADED_KEY);

    if (isDownloaded === 'true') {
      showRestartAlert(inAppUpdates);
    }
  } catch (error: any) {
    console.log('CHECK DOWNLOADED UPDATE ERROR => ');
  }
};

export const checkForUpdates = async () => {
  try {
    const isDownloaded = await AsyncStorage.getItem(UPDATE_DOWNLOADED_KEY);

    if (isDownloaded === 'true') {
      return;
    }

    const inAppUpdates = getInAppUpdates();

    const checkOptions = Platform.select({
      ios: {
        bundleId: 'com.baizel',
      },
      android: {},
    });

    const result = await inAppUpdates.checkNeedsUpdate(checkOptions);

    if (result?.shouldUpdate) {
      console.log(result, 'result');

      if (Platform.OS === 'ios') {
        Alert.alert(
          'Baizel AI - Update Available',
          'A new version of Baizel AI is available. Please update to continue using the app with the latest features.',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Update Now',
              onPress: () => {
                const url = (result as any)?.trackViewUrl || ''; // APP UPDATE URL FOR IOS APP STORE
                Linking.openURL(url).catch(err =>
                  console.error('Failed to open app store:', err),
                );
              },
            },
          ],
        );
      } else {
        const updateOptions = {
          updateType: IAUUpdateKind.FLEXIBLE,
        };

        await inAppUpdates.startUpdate(updateOptions);
      }
    }
  } catch (error: any) {
    console.log('In-app update check failed:', error?.message || error);
  }
};

export const addUpdateListener = () => {
  if (Platform.OS !== 'android') {
    return () => {};
  }

  const inAppUpdates = getInAppUpdates();

  const statusCallback = async (status: any) => {
    if (status?.status === IAUInstallStatus.DOWNLOADED) {
      await AsyncStorage.setItem(UPDATE_DOWNLOADED_KEY, 'true');

      showRestartAlert(inAppUpdates);
    }
  };

  inAppUpdates.addStatusUpdateListener(statusCallback);

  return () => {
    inAppUpdates.removeStatusUpdateListener(statusCallback);
  };
};
