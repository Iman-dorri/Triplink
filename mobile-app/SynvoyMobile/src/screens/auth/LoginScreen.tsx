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
import { login } from '../../store/slices/authSlice';
import { theme, colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const LoginScreen = ({ navigation }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!usernameOrEmail || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await dispatch(login({ usernameOrEmail, password })).unwrap();
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : err?.message || 'Invalid credentials';
      Alert.alert('Login Failed', errorMessage);
      console.error('Login error details:', err);
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
            <Text style={styles.title}>Synvoy</Text>
            <Text style={styles.subtitle}>Smart Travel Platform</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Sign in to continue</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email or Username</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email or username"
                  placeholderTextColor={colors.gray[400]}
                  value={usernameOrEmail}
                  onChangeText={setUsernameOrEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.gray[400]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isLoading ? [colors.gray[400], colors.gray[500]] : [colors.primary[600], colors.cyan[500]]}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.white} size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signupLink}>Sign Up</Text>
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
    marginBottom: theme.spacing.xxl,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  title: {
    fontSize: theme.fontSize['4xl'],
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
  formTitle: {
    fontSize: theme.fontSize['3xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  formSubtitle: {
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
    marginBottom: theme.spacing.xl,
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
  inputWrapper: {
    ...theme.shadows.sm,
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
  errorText: {
    color: colors.error,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
  },
  loginButton: {
    borderRadius: theme.borderRadius.xl,
    marginTop: theme.spacing.lg,
    overflow: 'hidden',
    ...theme.shadows.button,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  gradientButton: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  loginButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  forgotPasswordText: {
    color: colors.primary[600],
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  signupText: {
    color: colors.text.secondary,
    fontSize: theme.fontSize.md,
  },
  signupLink: {
    color: colors.primary[600],
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
});

export default LoginScreen;

