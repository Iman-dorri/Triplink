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
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!formData.username || !formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate username: 3-50 characters, alphanumeric and underscore only
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (formData.username.length < 3 || formData.username.length > 50) {
      Alert.alert('Error', 'Username must be between 3 and 50 characters');
      return;
    }
    if (!usernameRegex.test(formData.username)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    // Validate password: minimum 6 characters
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      await dispatch(register(formData)).unwrap();
    } catch (err: any) {
      Alert.alert('Registration Failed', err || 'Please try again');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Logo and Title */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[colors.primary[600], colors.cyan[500]]}
              style={styles.logo}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="public" size={48} color={colors.text.white} />
            </LinearGradient>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Synvoy today</Text>
          </View>

          {/* Register Form */}
          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: theme.spacing.sm }]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John"
                  placeholderTextColor={colors.gray[400]}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>Last Name</Text>
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrapper}>
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
              <Text style={styles.helperText}>
                3-50 characters, letters, numbers, and underscores only
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="john@example.com"
                placeholderTextColor={colors.gray[400]}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone (Optional)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                placeholder="+1234567890"
                placeholderTextColor={colors.gray[400]}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrapper, styles.passwordContainer]}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Create a password"
                  placeholderTextColor={colors.gray[400]}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  minLength={6}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>Minimum 6 characters</Text>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[colors.primary[600], colors.cyan[500]]}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
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
    fontSize: theme.fontSize['3xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
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
    fontWeight: theme.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: colors.background.default,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    minHeight: 52,
  },
  inputWrapper: {
    ...theme.shadows.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
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
  registerButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  loginText: {
    color: colors.text.secondary,
    fontSize: theme.fontSize.md,
  },
  loginLink: {
    color: colors.primary[600],
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  helperText: {
    fontSize: theme.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: theme.spacing.xs,
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
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggleText: {
    fontSize: 20,
  },
});

export default RegisterScreen;

