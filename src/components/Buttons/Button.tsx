import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export type ButtonType = 'primary' | 'secondary';
export type ButtonSize = 'xs' | 'extrasmall' | 'extraSmall' | 'sm' | 'md' | 'lg';

export interface CustomButtonProps {
  title?: string;
  subtitle?: string;
  onPress?: (event: GestureResponderEvent) => void;
  type?: ButtonType;
  variant?: ButtonType;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  activeOpacity?: number;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  gradientColors?: string[];
  gradientLocations?: number[];
  gradientStart?: { x: number; y: number };
  gradientEnd?: { x: number; y: number };
  onLayout?: (event: LayoutChangeEvent) => void;
  borderRadius?: number;
}

// True diagonal gradient: Top-Right (#8149e8) to Bottom-Left (#4324b5)
const DEFAULT_PRIMARY_GRADIENT = [
  "#7E5DDB",
  "#6E4DCE",
  "#5E3DC0",
  "#4E2FB2",
  "#3D209E"
];
const DEFAULT_GRADIENT_LOCATIONS = [0, 0.25, 0.5, 0.75, 1];
const DEFAULT_GRADIENT_START = { x: 1, y: 0 }; // Top-Right
const DEFAULT_GRADIENT_END = { x: 0, y: 1 };   // Bottom-Left

export const CustomButton = ({
  title,
  subtitle,
  onPress,
  type = 'primary',
  variant,
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  activeOpacity = 0.82,
  buttonStyle,
  textStyle,
  subtitleStyle,
  children,
  gradientColors = DEFAULT_PRIMARY_GRADIENT,
  gradientLocations = DEFAULT_GRADIENT_LOCATIONS,
  gradientStart = DEFAULT_GRADIENT_START,
  gradientEnd = DEFAULT_GRADIENT_END,
  onLayout,
  borderRadius,
}: CustomButtonProps) => {
  const activeType = variant || type;
  const isPrimary = activeType === 'primary';
  const isDisabled = disabled || loading;
  const isExtraSmall = size === 'xs' || size === 'extrasmall' || size === 'extraSmall';

  const resolvedBorderRadius = borderRadius !== undefined 
    ? borderRadius 
    : isExtraSmall
      ? 8
      : size === 'sm' 
        ? 10 
        : 16;

  const flatStyle = (StyleSheet.flatten(buttonStyle) || {}) as Record<string, any>;
  const outerStyleKeys = [
    'position', 'top', 'bottom', 'left', 'right',
    'margin', 'marginVertical', 'marginHorizontal', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
    'flex', 'flexGrow', 'flexShrink', 'alignSelf',
    'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
    'zIndex', 'aspectRatio',
    'shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius', 'elevation'
  ];

  const outerStyle: any = {};
  const innerStyle: any = {};

  Object.keys(flatStyle).forEach(key => {
    if (outerStyleKeys.includes(key)) {
      outerStyle[key] = flatStyle[key];
    } else {
      innerStyle[key] = flatStyle[key];
    }
  });

  if (flatStyle.borderRadius !== undefined) {
    outerStyle.borderRadius = flatStyle.borderRadius;
    innerStyle.borderRadius = flatStyle.borderRadius;
  }

  const sizeStyle =
    isExtraSmall
      ? styles.buttonExtraSmall
      : size === 'sm'
      ? styles.buttonSmall
      : size === 'lg'
      ? styles.buttonLarge
      : styles.buttonMedium;

  const textSizeStyle =
    isExtraSmall
      ? styles.buttonTextExtraSmall
      : size === 'sm'
      ? styles.buttonTextSmall
      : size === 'lg'
      ? styles.buttonTextLarge
      : styles.buttonTextMedium;

  const renderInnerContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={isPrimary ? '#ffffff' : '#475569'}
        />
      );
    }

    if (children) {
      return children;
    }

    return (
      <View
        style={[
          styles.contentContainer,
          isExtraSmall && styles.contentContainerExtraSmall,
        ]}>
        {icon && iconPosition === 'left' && (
          <View style={styles.leftIconWrapper}>{icon}</View>
        )}

        {subtitle ? (
          <View style={styles.textColumn}>
            {title ? (
              <Text
                style={[
                  styles.baseText,
                  isPrimary ? styles.primaryText : styles.secondaryText,
                  textSizeStyle,
                  textStyle,
                ]}>
                {title}
              </Text>
            ) : null}
            <Text
              style={[
                styles.subtitleText,
                isPrimary
                  ? styles.primarySubtitleText
                  : styles.secondarySubtitleText,
                subtitleStyle,
              ]}>
              {subtitle}
            </Text>
          </View>
        ) : (
          title && (
            <Text
              style={[
                styles.baseText,
                isPrimary ? styles.primaryText : styles.secondaryText,
                textSizeStyle,
                textStyle,
              ]}>
              {title}
            </Text>
          )
        )}

        {icon && iconPosition === 'right' && (
          <View style={styles.rightIconWrapper}>{icon}</View>
        )}
      </View>
    );
  };

  if (isPrimary) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        disabled={isDisabled}
        onPress={onPress}
        onLayout={onLayout}
        style={[
          styles.primaryShadowWrapper,
          { borderRadius: resolvedBorderRadius },
          isDisabled && styles.disabledButton,
          outerStyle,
        ]}>
        <LinearGradient
          start={gradientStart}
          end={gradientEnd}
          colors={gradientColors}
          locations={gradientLocations}
          style={[
            styles.baseButton,
            { borderRadius: resolvedBorderRadius },
            sizeStyle,
            { borderRadius: resolvedBorderRadius },
            innerStyle,
          ]}>
          {renderInnerContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      disabled={isDisabled}
      onPress={onPress}
      onLayout={onLayout}
      style={[
        styles.baseButton,
        styles.secondaryButton,
        { borderRadius: resolvedBorderRadius },
        sizeStyle,
        { borderRadius: resolvedBorderRadius },
        isDisabled && styles.disabledButton,
        buttonStyle,
      ]}>
      {renderInnerContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primaryShadowWrapper: {
    borderRadius: 16,
    shadowColor: '#3b2c85',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  baseButton: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  contentContainerExtraSmall: {
    gap: 8,
  },
  textColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Poppins-Regular',
  },
  leftIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Secondary Variant
  secondaryButton: {
    backgroundColor: '#f1f5f9', // Clean gray background
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: 'transparent',
    elevation: 0,
  },

  // Sizes
  buttonExtraSmall: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  buttonSmall: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  buttonMedium: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  buttonLarge: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 16,
  },

  // Text Styles
  baseText: {
    fontFamily: 'Poppins-Bold',
    textAlign: 'center',
  },
  primaryText: {
    color: '#ffffff',
    fontFamily: 'Poppins-Regular',
  },
  secondaryText: {
    color: '#334155', // Dark slate/gray text
    fontFamily: 'Poppins-Regular',
  },
  buttonTextExtraSmall: {
    fontSize: 11.5,
    fontFamily: 'Poppins-Regular',
  },
  buttonTextSmall: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
  buttonTextMedium: {
    fontSize: 15.5,
    fontFamily: 'Poppins-Regular',
  },
  buttonTextLarge: {
    fontSize: 16.5,
    fontFamily: 'Poppins-Regular',
  },

  // Subtitle Styles
  subtitleText: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
  },
  primarySubtitleText: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontFamily: 'Poppins-Regular',
  },
  secondarySubtitleText: {
    color: '#64748b',
    fontFamily: 'Poppins-Regular',
  },

  // Disabled
  disabledButton: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default CustomButton;