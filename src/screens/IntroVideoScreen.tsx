import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'IntroVideo'>;
};

export default function IntroVideoScreen({ navigation }: Props) {
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handleSkip = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const togglePlay = () => {
    setPaused(!paused);
  };

  const handleProgress = (data: { currentTime: number }) => {
    setCurrentTime(data.currentTime);
    if (duration > 0) {
      setProgress(data.currentTime / duration);
    }
  };

  const handleLoad = (data: { duration: number }) => {
    setDuration(data.duration);
    setLoading(false);
  };

  const handleEnd = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (isExpanded) {
    return (
      <View style={styles.fullscreenContainer}>
        <StatusBar hidden={true} />
        
        <Video
          source={{ uri: 'https://res.cloudinary.com/dzrsq52v7/video/upload/v1787815174/clideo_editor_fda051a0e39c474a8ebcc2d5313b39e9_online-video-cutter.com_n6ihty.mp4' }}
          style={StyleSheet.absoluteFill}
          paused={paused}
          resizeMode="cover"
          repeat={false}
          playWhenInactive
          onLoadStart={() => setLoading(true)}
          onLoad={handleLoad}
          onProgress={handleProgress}
          onEnd={handleEnd}
        />

        {/* Loading Indicator */}
        {loading && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
          </View>
        )}

        {/* Fullscreen Close/Back Button */}
        <TouchableOpacity style={styles.fullscreenCloseButton} onPress={() => setIsExpanded(false)}>
          <Icon name="close" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* Big play overlay if paused */}
        {paused && !loading && (
          <TouchableOpacity style={styles.fullscreenPlayOverlay} onPress={togglePlay}>
            <View style={styles.playButtonCircle}>
              <Icon name="play" size={32} color="#ffffff" style={styles.playIcon} />
            </View>
          </TouchableOpacity>
        )}

        {/* Fullscreen Bottom Controls */}
        <View style={styles.fullscreenControls}>
          <TouchableOpacity onPress={togglePlay} style={styles.controlButton}>
            <Icon name={paused ? "play" : "pause"} size={24} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>

          <Text style={styles.timeText}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>

          <TouchableOpacity onPress={() => setIsExpanded(false)} style={styles.controlButton}>
            <Icon name="contract" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1c1240" />

      {/* Header Skip Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
          <Icon name="chevron-forward" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Title and Subtitle */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Welcome to AiGaido</Text>
        <Text style={styles.subtitle}>
          Watch this short video to see how{'\n'}AiGaido works
        </Text>
      </View>

      {/* Video Container Box */}
      <View style={styles.videoCard}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={togglePlay}
          style={StyleSheet.absoluteFill}
        >
          <Video
            source={{ uri: 'https://res.cloudinary.com/dzrsq52v7/video/upload/v1787815174/clideo_editor_fda051a0e39c474a8ebcc2d5313b39e9_online-video-cutter.com_n6ihty.mp4' }}
            style={StyleSheet.absoluteFill}
            paused={paused}
            resizeMode="cover"
            repeat={false}
            playWhenInactive
            onLoadStart={() => setLoading(true)}
            onLoad={handleLoad}
            onProgress={handleProgress}
            onEnd={handleEnd}
          />
        </TouchableOpacity>

        {/* Loading Indicator */}
        {loading && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
          </View>
        )}

        {/* Overlay Play Button */}
        {paused && !loading && (
          <TouchableOpacity style={styles.overlayContainer} onPress={togglePlay}>
            <View style={styles.playButtonCircle}>
              <Icon name="play" size={32} color="#ffffff" style={styles.playIcon} />
            </View>
          </TouchableOpacity>
        )}

        {/* Bottom controls bar */}
        <View style={styles.controlsBar}>
          <TouchableOpacity onPress={togglePlay} style={styles.controlButton}>
            <Icon name={paused ? "play" : "pause"} size={20} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>

          <Text style={styles.timeText}>
            {formatTime(currentTime)}
          </Text>

          <TouchableOpacity onPress={() => setIsExpanded(true)} style={styles.controlButton}>
            <Icon name="expand" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom spacer mimicking safe area / home indicator */}
      <View style={styles.bottomSpacer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1240', // Deep violet-purple matching UI
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  skipButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginRight: 2,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
    paddingHorizontal: 24,
    fontFamily: 'Poppins-Regular',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontFamily: 'Poppins-ExtraBold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  videoCard: {
    width: SCREEN_WIDTH * 0.88,
    flex: 1,
    maxHeight: SCREEN_HEIGHT * 0.64,
    borderWidth: 1.5,
    borderColor: 'rgba(138, 43, 226, 0.5)', // Glow border color
    borderRadius: 24,
    backgroundColor: '#0d0822',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8a2be2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Dim overlay when paused
  },
  playButtonCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  playIcon: {
    marginLeft: 4, // Visual offset to center play triangle
  },
  loader: {
    alignSelf: 'center',
  },
  bottomSpacer: {
    height: 24,
  },
  controlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  controlButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8a2be2',
  },
  timeText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    marginRight: 6,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullscreenPlayOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  fullscreenControls: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    height: 56,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 28,
    justifyContent: 'space-between',
    zIndex: 10,
  },
});
