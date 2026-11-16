import { Text, TextInput, StyleSheet } from 'react-native';

/**
 * Global Poppins Font Bootstrap
 *
 * Uses multiple strategies to ensure Poppins is applied everywhere:
 *  1. Override Text.render / Text.type.render (for forwardRef / memo components)
 *  2. Fallback: set defaultProps (for unstyled Text components)
 */

export const getPoppinsFontFamily = (fontWeight?: string | number): string => {
  if (!fontWeight) return 'Poppins-Regular';
  const w = String(fontWeight).toLowerCase();
  switch (w) {
    case '100':
    case '200':
    case 'extralight':
      return 'Poppins-ExtraLight';
    case '300':
    case 'light':
      return 'Poppins-Light';
    case '400':
    case 'normal':
    case 'regular':
      return 'Poppins-Regular';
    case '500':
    case 'medium':
      return 'Poppins-Medium';
    case '600':
    case 'semibold':
      return 'Poppins-SemiBold';
    case '700':
    case 'bold':
      return 'Poppins-Bold';
    case '800':
    case '900':
    case 'extrabold':
      return 'Poppins-ExtraBold';
    default:
      return 'Poppins-Regular';
  }
};

// ---------- Helper to inject fontFamily into props ----------
function injectFont(props: any) {
  const flatStyle = StyleSheet.flatten(props.style) || {} as any;
  if (!flatStyle.fontFamily) {
    const fontFamily = getPoppinsFontFamily(flatStyle.fontWeight);
    return { ...props, style: [{ fontFamily }, props.style] };
  }
  return props;
}

// ---------- Strategy 1: Override .render (forwardRef) ----------
const textRender = (Text as any).render;
if (typeof textRender === 'function') {
  (Text as any).render = function (props: any, ref: any) {
    return textRender.call(this, injectFont(props), ref);
  };
}

// ---------- Strategy 2: Override .type.render (memo + forwardRef) ----------
if ((Text as any).type && typeof (Text as any).type.render === 'function') {
  const typeRender = (Text as any).type.render;
  (Text as any).type.render = function (props: any, ref: any) {
    return typeRender.call(this, injectFont(props), ref);
  };
}

// ---------- Strategy 3: defaultProps fallback ----------
const existingDefaults = (Text as any).defaultProps || {};
(Text as any).defaultProps = {
  ...existingDefaults,
  style: { fontFamily: 'Poppins-Regular' },
};

// ---------- TextInput defaults ----------
const inputRender = (TextInput as any).render;
if (typeof inputRender === 'function') {
  (TextInput as any).render = function (props: any, ref: any) {
    return inputRender.call(this, injectFont(props), ref);
  };
}

if ((TextInput as any).type && typeof (TextInput as any).type.render === 'function') {
  const typeRender = (TextInput as any).type.render;
  (TextInput as any).type.render = function (props: any, ref: any) {
    return typeRender.call(this, injectFont(props), ref);
  };
}

const existingInputDefaults = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps = {
  ...existingInputDefaults,
  style: { fontFamily: 'Poppins-Regular' },
};
