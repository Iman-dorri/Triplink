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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { register } from '../../store/slices/authSlice';
import { theme, colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const RegisterScreen = ({ navigation }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    testerCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTesterCode, setShowTesterCode] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleRegister = async () => {
    setLocalError('');
    
    // Validate required fields
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword || !formData.firstName || !formData.lastName) {
      setLocalError('Please fill in all required fields');
      return;
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match. Please try again.');
      return;
    }

    // Validate tester code
    if (!formData.testerCode.trim()) {
      setLocalError('Tester code is required. The application is currently in development.');
      return;
    }

    // Validate username: 3-50 characters, alphanumeric and underscore only
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (formData.username.length < 3 || formData.username.length > 50) {
      setLocalError('Username must be between 3 and 50 characters');
      return;
    }
    if (!usernameRegex.test(formData.username)) {
      setLocalError('Username can only contain letters, numbers, and underscores');
      return;
    }

    // Validate password: minimum 6 characters
    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    try {
      const result = await dispatch(register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        testerCode: formData.testerCode.trim(),
      })).unwrap();
      // After registration, user is not verified, redirect to verification screen
      if (result?.user && !result.user.is_verified) {
        navigation.navigate('VerifyEmail' as never, { email: formData.email } as never);
      }
    } catch (err: any) {
      setLocalError(err || 'Registration failed. Please try again.');
    }
  };

  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Logo and Title */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[colors.teal[600], colors.emerald[600], colors.green[600]]}
              style={styles.logo}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="public" size={48} color={colors.text.white} />
            </LinearGradient>
            <Text style={styles.title}>Join Synvoy</Text>
            <Text style={styles.subtitle}>Start your travel journey today</Text>
          </View>

          {/* Development Notice */}
          <View style={styles.noticeContainer}>
            <Icon name="info" size={20} color={colors.blue[600]} style={styles.noticeIcon} />
            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>🚧 Application in Development</Text>
              <Text style={styles.noticeText}>
                The application is currently in development. Registration is limited to testers only. If you don't have a tester code, please contact our support team via the Contact page to request one.
              </Text>
            </View>
          </View>

          {/* Error Message */}
          {displayError && (
            <View style={styles.errorContainer}>
              <Icon name="error" size={20} color={colors.error} style={styles.errorIcon} />
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          {/* Register Form */}
          <View style={styles.form}>
            {/* Name Fields - Side by Side */}
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: theme.spacing.sm }]}>
                <Text style={styles.label}>
                  First Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Icon name="person" size={20} color={colors.gray[400]} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="John"
                    placeholderTextColor={colors.gray[400]}
                    value={formData.firstName}
                    onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                    autoCapitalize="words"
                  />
                </View>
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>
                  Last Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Icon name="person" size={20} color={colors.gray[400]} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Doe"
                    placeholderTextColor={colors.gray[400]}
                    value={formData.lastName}
                    onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>

            {/* Username Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Username <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Icon name="person" size={20} color={colors.gray[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="johndoe"
                  placeholderTextColor={colors.gray[400]}
                  value={formData.username}
                  onChangeText={(text) => {
                    // Only allow alphanumeric and underscore, convert to lowercase
                    const value = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setFormData({ ...formData, username: value });
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={50}
                />
              </View>
              <Text style={styles.helperText}>
                3-50 characters, letters, numbers, and underscores only
              </Text>
            </View>

            {/* Email Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Email Address <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Icon name="email" size={20} color={colors.gray[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.gray[400]}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Phone Field (Optional) */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Phone Number <Text style={styles.optional}>(Optional)</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Icon name="phone" size={20} color={colors.gray[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 123-4567"
                  placeholderTextColor={colors.gray[400]}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, styles.passwordContainer]}>
                <Icon name="lock" size={20} color={colors.gray[400]} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Create a strong password"
                  placeholderTextColor={colors.gray[400]}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icon 
                    name={showPassword ? 'visibility-off' : 'visibility'} 
                    size={24} 
                    color={colors.gray[400]} 
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>Minimum 6 characters</Text>
            </View>

            {/* Confirm Password Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Confirm Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, styles.passwordContainer]}>
                <Icon name="lock" size={20} color={colors.gray[400]} style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input, 
                    styles.passwordInput,
                    formData.confirmPassword && formData.password !== formData.confirmPassword && styles.inputError
                  ]}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.gray[400]}
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Icon 
                    name={showConfirmPassword ? 'visibility-off' : 'visibility'} 
                    size={24} 
                    color={colors.gray[400]} 
                  />
                </TouchableOpacity>
              </View>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <Text style={styles.errorHelperText}>Passwords do not match</Text>
              )}
            </View>

            {/* Tester Code Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Tester Code <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, styles.passwordContainer]}>
                <Icon name="lock" size={20} color={colors.gray[400]} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Enter tester code"
                  placeholderTextColor={colors.gray[400]}
                  value={formData.testerCode}
                  onChangeText={(text) => setFormData({ ...formData, testerCode: text })}
                  secureTextEntry={!showTesterCode}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowTesterCode(!showTesterCode)}
                >
                  <Icon 
                    name={showTesterCode ? 'visibility-off' : 'visibility'} 
                    size={24} 
                    color={colors.gray[400]} 
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                Don't have a tester code? Contact our support team via the Contact page.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[colors.teal[600], colors.emerald[600], colors.green[600]]}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.text.white} />
                    <Text style={styles.registerButtonText}>Creating account...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.registerButtonText}>Create Account</Text>
                    <Icon name="arrow-forward" size={20} color={colors.text.white} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Already a member?</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sign in link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign in instead</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.xxl,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  title: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
  },
  noticeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.blue[50],
    borderLeftWidth: 4,
    borderLeftColor: colors.blue[500],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  noticeIcon: {
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: colors.blue[800],
    marginBottom: theme.spacing.xs,
  },
  noticeText: {
    fontSize: theme.fontSize.sm,
    color: colors.blue[800],
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: colors.red[50],
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  errorIcon: {
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  errorText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: colors.error,
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  required: {
    color: colors.error,
  },
  optional: {
    color: colors.gray[400],
    fontWeight: theme.fontWeight.normal,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
    minHeight: 52,
    ...theme.shadows.sm,
  },
  inputIcon: {
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
    padding: theme.spacing.md,
    paddingLeft: 0,
  },
  inputError: {
    borderColor: colors.red[300],
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  helperText: {
    fontSize: theme.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorHelperText: {
    fontSize: theme.fontSize.xs,
    color: colors.error,
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerButton: {
    borderRadius: theme.borderRadius.xl,
    marginTop: theme.spacing.lg,
    overflow: 'hidden',
    ...theme.shadows.button,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  gradientButton: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  registerButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[200],
  },
  dividerText: {
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  loginText: {
    color: colors.text.secondary,
    fontSize: theme.fontSize.md,
  },
  loginLink: {
    color: colors.teal[600],
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
});

export default RegisterScreen;
