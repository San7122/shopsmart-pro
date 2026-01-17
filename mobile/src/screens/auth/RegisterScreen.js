import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { COLORS, validatePhone } from '../../utils/helpers';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    shopName: '',
    shopType: 'kirana',
    city: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const shopTypes = [
    { value: 'kirana', label: '🏪 Kirana' },
    { value: 'grocery', label: '🛒 Grocery' },
    { value: 'medical', label: '💊 Medical' },
    { value: 'electronics', label: '📱 Electronics' },
    { value: 'clothing', label: '👕 Clothing' },
    { value: 'other', label: '📦 Other' },
  ];

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone) {
      newErrors.phone = 'Phone is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Enter valid 10-digit number';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Min 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.shopName.trim()) newErrors.shopName = 'Shop name is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    const result = await register({
      name: formData.name,
      phone: formData.phone,
      password: formData.password,
      shopName: formData.shopName,
      shopType: formData.shopType,
      address: { city: formData.city },
    });
    setLoading(false);

    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Welcome to ShopSmart Pro!',
        text2: 'Your account has been created',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: result.error,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (step === 1 ? navigation.goBack() : setStep(1))}>
            <Icon name="arrow-left" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
            <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
            <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            {step === 1 ? 'Create Account' : 'Shop Details'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1 ? 'Step 1: Personal Information' : 'Step 2: Business Information'}
          </Text>

          {step === 1 ? (
            <>
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Name</Text>
                <View style={[styles.inputContainer, errors.name && styles.inputError]}>
                  <Icon name="user" size={20} color={COLORS.gray[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={COLORS.gray[400]}
                    value={formData.name}
                    onChangeText={(text) => updateField('name', text)}
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
                  <Icon name="phone" size={20} color={COLORS.gray[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={COLORS.gray[400]}
                    value={formData.phone}
                    onChangeText={(text) => updateField('phone', text.replace(/\D/g, ''))}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                  <Icon name="lock" size={20} color={COLORS.gray[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Create a strong password"
                    placeholderTextColor={COLORS.gray[400]}
                    value={formData.password}
                    onChangeText={(text) => updateField('password', text)}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.gray[400]} />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
                  <Icon name="lock" size={20} color={COLORS.gray[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor={COLORS.gray[400]}
                    value={formData.confirmPassword}
                    onChangeText={(text) => updateField('confirmPassword', text)}
                    secureTextEntry={!showPassword}
                  />
                </View>
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
              </View>

              <TouchableOpacity style={styles.button} onPress={handleNext}>
                <Text style={styles.buttonText}>Continue</Text>
                <Icon name="arrow-right" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Shop Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Shop Name</Text>
                <View style={[styles.inputContainer, errors.shopName && styles.inputError]}>
                  <Icon name="shopping-bag" size={20} color={COLORS.gray[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your shop name"
                    placeholderTextColor={COLORS.gray[400]}
                    value={formData.shopName}
                    onChangeText={(text) => updateField('shopName', text)}
                  />
                </View>
                {errors.shopName && <Text style={styles.errorText}>{errors.shopName}</Text>}
              </View>

              {/* Shop Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Shop Type</Text>
                <View style={styles.shopTypeGrid}>
                  {shopTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.shopTypeButton,
                        formData.shopType === type.value && styles.shopTypeButtonActive,
                      ]}
                      onPress={() => updateField('shopType', type.value)}>
                      <Text
                        style={[
                          styles.shopTypeText,
                          formData.shopType === type.value && styles.shopTypeTextActive,
                        ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* City */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>City</Text>
                <View style={[styles.inputContainer, errors.city && styles.inputError]}>
                  <Icon name="map-pin" size={20} color={COLORS.gray[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your city"
                    placeholderTextColor={COLORS.gray[400]}
                    value={formData.city}
                    onChangeText={(text) => updateField('city', text)}
                  />
                </View>
                {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 40,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.gray[200],
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressLine: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.gray[200],
    marginHorizontal: 8,
    borderRadius: 2,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.gray[500],
    marginTop: 8,
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.gray[900],
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
  },
  shopTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  shopTypeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.gray[100],
    borderRadius: 10,
    margin: 4,
  },
  shopTypeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  shopTypeText: {
    fontSize: 14,
    color: COLORS.gray[700],
  },
  shopTypeTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default RegisterScreen;
