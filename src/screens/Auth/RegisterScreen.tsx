import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { authService } from '../../services/authService';
import Icon from 'react-native-vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from '../../components/Buttons/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { referralService } from '../../services/referralService';
import useDebounce from '../../hooks/useDebounce';
import { ActivityIndicator } from 'react-native-paper';


type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [referenceError,setReferenceError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState('');


  const { mutate, isPending } = useMutation({
    mutationFn: async ({ email, password, full_name, referenceId }: { email: string, password: string, full_name: string, referenceId?: any }) => {
      try {
        const response = await authService.signup({ full_name, email, password ,referral_code:referenceId?referenceId:undefined});
        return response;
      } catch (error: any) {

        const errorMessage = error?.response?.data?.detail || error?.response?.data?.message || 'An error occurred during registration. Please try again.';
        Alert.alert('Registration Failed', errorMessage);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      navigation.replace('OTPVerification', { email: variables.email, password: variables.password });
    },
  });

  const {mutate:validateReferral,isPending:isValidateReferralPending,isSuccess:isValidateSuccess} = useMutation({
    mutationFn: async (referenceId: string) => {
      try {
        const response = await referralService.validateReferal(referenceId);
        console.log(response,'response================')
        return response;
      } catch (error: any) {
        const errorMessage = error?.response?.data?.detail || error?.response?.data?.message || 'An error occurred during validation. Please try again.';
        Alert.alert('Validation Failed', errorMessage);
        throw error;
      }
    },
    onSuccess: (data) => {
      setReferenceError(null);
    },
  });



  const validatePassword = (pass: string) => {
    const errors: string[] = [];
    if (pass.length < 8) errors.push("• Must be at least 8 characters long");
    if (!/[A-Z]/.test(pass)) errors.push("• Must contain at least 1 uppercase letter");
    if (!/[0-9]/.test(pass)) errors.push("• Must contain at least 1 number");
    if (!/[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\;'/~`]/.test(pass)) errors.push("• Must contain at least 1 symbol");
    
    return errors.length > 0 ? errors.join('\n') : null;
  };


  const handleSubmit = async() => {
    if (!fullName || !email || !password) {
      Alert.alert('Validation Error', 'Please fill in all fields.');
      return;
    }

    const error = validatePassword(password);
    if (error) {
      setPasswordError(error);
      return;
    }
    if(!isValidateSuccess && referenceId){
      Alert.alert('Validation Error', 'Please validate your referral code.');
      return;
    }

    mutate({email, password, full_name: fullName, referenceId});
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.container}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Create Account ✨</Text>
            <Text style={styles.subtitle}>Sign up to explore and discover{'\n'}great places</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Icon name="person-outline" size={20} color="#9ca3af" style={styles.inputIconLeft} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9ca3af"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <Icon name="mail-outline" size={20} color="#9ca3af" style={styles.inputIconLeft} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputWrapper, passwordError ? styles.inputWrapperError : null]}>
                <Icon name="lock-closed-outline" size={20} color={passwordError ? "#ef4444" : "#9ca3af"} style={styles.inputIconLeft} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError(null);
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              {passwordError && (
                <Text style={styles.errorText}>{passwordError}</Text>
              )}
            </View>

           <View style={styles.inputContainer}>
  <Text style={styles.inputLabel}>Reference ID</Text>

  <View style={styles.inputWrapper}>
    <TextInput
      style={styles.input}
      placeholder="Enter Reference ID"
      placeholderTextColor="#9ca3af"
      value={referenceId}
      onChangeText={(text) => {
        setReferenceId(text);
      }}
    />

  <TouchableOpacity
  style={[
    styles.applyButton,
    (referenceId.length !== 6 ||
      isValidateReferralPending) &&
      styles.applyButtonDisabled,
  ]}
  onPress={() => {
    validateReferral(referenceId);
  }}
  disabled={
    referenceId.length !== 6 ||
    isValidateReferralPending
  }
>
  {isValidateReferralPending ? (
    <ActivityIndicator
      size="small"
      color="#fff"
    />
  ) : (
    <Text
      style={[
        styles.applyButtonText,
        referenceId.length !== 6 &&
          styles.applyButtonDisabledText,
      ]}
    >
      Apply
    </Text>
  )}
</TouchableOpacity>
    {isValidateSuccess && (
      <Icon
        size={24}
        name="checkmark-circle-outline"
        color="#008000"
      />
    )}

    {referenceError && !isValidateSuccess && (
      <Icon
        size={24}
        name="information-circle-outline"
        color="#FF0000"
      />
    )}
  </View>

  {referenceError && (
    <Text style={styles.errorText}>
      {referenceError}
    </Text>
  )}
</View>

           <CustomButton onPress={handleSubmit} title='Register' disabled={isPending} loading={isValidateReferralPending||isPending}/>
        
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.replace('Login')}>
              <Text style={styles.toggleText}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa', // Light background
  },
  container: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-ExtraBold',
    color: '#111827', // Dark gray
    marginBottom: 8,
  },
applyButton: {
  backgroundColor: "#508267",
  paddingHorizontal: 16,
  paddingVertical: 9,
  borderRadius: 6,
  justifyContent: "center",
  alignItems: "center",
  marginLeft: 8,
  minWidth: 72,
  minHeight: 40,
},

applyButtonDisabled: {
  backgroundColor: "#D1D5DB",
  opacity: 1,
},

applyButtonText: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "600",
},

applyButtonDisabledText: {
  color: "#6B7280",
},
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280', // Slate 500
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    flex: 1,
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIconLeft: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#111827',
  },
  inputWrapperError: {
    borderColor: '#ef4444',
    fontFamily: 'Poppins-Regular',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginTop: 6,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#3b2c85', // Solid purple button
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9ca3af',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  socialIcon: {
    marginRight: 12,
  },
  socialButtonText: {
    color: '#111827',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
  },
  toggleText: {
    color: '#4f46e5',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
});
