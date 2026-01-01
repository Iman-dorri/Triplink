import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme, colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import apiService from '../../services/api';

interface VerificationStatus {
  email: string;
  is_verified: boolean;
  code_expires_at: string | null;
  account_deletion_at: string | null;
  time_remaining_seconds: number | null;
  deletion_time_remaining_seconds: number | null;
}

const VerifyEmailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const email = (route.params as any)?.email || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [codeExpired, setCodeExpired] = useState(false);
  const [accountDeletionTime, setAccountDeletionTime] = useState<number | null>(null);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!email) {
      navigation.goBack();
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await apiService.getVerificationStatus(email);
        setStatus(response);
        
        if (response.is_verified) {
          navigation.navigate('Dashboard' as never);
          return;
        }
        
        if (response.time_remaining_seconds !== null && response.time_remaining_seconds <= 0) {
          setCodeExpired(true);
        }
        
        setCanResend(response.time_remaining_seconds !== null && response.time_remaining_seconds <= 0);
        
        if (response.deletion_time_remaining_seconds !== null) {
          setAccountDeletionTime(response.deletion_time_remaining_seconds);
        }
      } catch (err: any) {
        console.error('Error fetching verification status:', err);
        if (err.response?.status === 404) {
          navigation.goBack();
        }
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [email, navigation]);

  useEffect(() => {
    if (!status?.time_remaining_seconds || status.time_remaining_seconds <= 0) {
      setCodeExpired(true);
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      if (status.time_remaining_seconds !== null) {
        const newTime = status.time_remaining_seconds - 1;
        setStatus({ ...status, time_remaining_seconds: newTime });
        
        if (newTime <= 0) {
          setCodeExpired(true);
          setCanResend(true);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status?.time_remaining_seconds]);

  useEffect(() => {
    if (accountDeletionTime === null || accountDeletionTime <= 0) return;

    const timer = setInterval(() => {
      setAccountDeletionTime(prev => {
        if (prev === null || prev <= 0) return null;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [accountDeletionTime]);

  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatHours = (seconds: number | null): string => {
    if (seconds === null || seconds < 0) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      // Auto-focus next input would require refs, simplified for now
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiService.verifyEmail(email, verificationCode);
      navigation.navigate('Dashboard' as never);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid verification code. Please try again.');
      setCode(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');

    try {
      await apiService.resendVerification(email);
      setError('');
      setCanResend(false);
      setCodeExpired(false);
      const response = await apiService.getVerificationStatus(email);
      setStatus(response);
      setCode(['', '', '', '', '', '']);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Please wait 5 minutes before requesting a new code.');
      } else {
        setError(err.response?.data?.detail || 'Failed to resend verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return null;
  }

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
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={[colors.primary[600], colors.cyan[500]]}
              style={styles.logo}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="email" size={48} color={colors.text.white} />
            </LinearGradient>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>Enter the 6-digit code sent to</Text>
            <Text style={styles.email}>{email}</Text>
          </View>

          {/* Account Deletion Warning */}
          {accountDeletionTime !== null && accountDeletionTime > 0 && (
            <View style={styles.warningBox}>
              <Icon name="warning" size={20} color={colors.error} />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Account Deletion Warning</Text>
                <Text style={styles.warningText}>
                  Your account will be automatically deleted in {formatHours(accountDeletionTime)} if not verified.
                </Text>
              </View>
            </View>
          )}

          {/* Code Expiration Timer */}
          {status?.time_remaining_seconds !== null && status.time_remaining_seconds > 0 && (
            <View style={styles.timerBox}>
              <Text style={styles.timerLabel}>Code Expires In</Text>
              <Text style={styles.timerValue}>{formatTime(status.time_remaining_seconds)}</Text>
            </View>
          )}

          {/* Code Expired Message */}
          {codeExpired && (
            <View style={styles.expiredBox}>
              <Text style={styles.expiredTitle}>Code Expired</Text>
              <Text style={styles.expiredText}>Your verification code has expired. Click below to request a new one.</Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={loading}
                style={[styles.resendButton, loading && styles.resendButtonDisabled]}
              >
                <Text style={styles.resendButtonText}>
                  {loading ? 'Sending...' : 'Request New Code'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Spam Folder Reminder */}
          <View style={styles.infoBox}>
            <Icon name="info" size={20} color={colors.primary[600]} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Can't find the email?</Text>
              <Text style={styles.infoText}>
                Please check your spam or junk folder. The email was sent from no-reply@synvoy.com
              </Text>
            </View>
          </View>

          {/* Verification Form */}
          {!codeExpired && (
            <View style={styles.form}>
              <Text style={styles.formLabel}>Enter Verification Code</Text>
              <View style={styles.codeContainer}>
                {code.map((digit, index) => (
                  <TextInput
                    key={index}
                    style={styles.codeInput}
                    value={digit}
                    onChangeText={(value) => handleCodeChange(index, value)}
                    keyboardType="numeric"
                    maxLength={1}
                    editable={!loading}
                  />
                ))}
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.verifyButton, (loading || code.join('').length !== 6) && styles.verifyButtonDisabled]}
                onPress={handleVerify}
                disabled={loading || code.join('').length !== 6}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={(loading || code.join('').length !== 6) ? [colors.gray[400], colors.gray[500]] : [colors.primary[600], colors.cyan[500]]}
                  style={styles.gradientButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.text.white} size="small" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify Email</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={20} color={colors.primary[600]} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
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
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
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
    fontSize: theme.fontSize['3xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.primary[600],
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  warningContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  warningTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: colors.error,
    marginBottom: theme.spacing.xs,
  },
  warningText: {
    fontSize: theme.fontSize.sm,
    color: colors.error,
  },
  timerBox: {
    backgroundColor: colors.primary[50],
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[600],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  timerLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: colors.primary[700],
    marginBottom: theme.spacing.xs,
  },
  timerValue: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.primary[700],
  },
  expiredBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  expiredTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: '#92400E',
    marginBottom: theme.spacing.xs,
  },
  expiredText: {
    fontSize: theme.fontSize.sm,
    color: '#92400E',
    marginBottom: theme.spacing.md,
  },
  resendButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#DBEAFE',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[600],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  infoContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  infoTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: colors.primary[700],
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: colors.primary[700],
  },
  form: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  formLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  codeInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: colors.gray[300],
    borderRadius: theme.borderRadius.lg,
    textAlign: 'center',
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
    backgroundColor: colors.background.default,
  },
  errorText: {
    color: colors.error,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  verifyButton: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.button,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  gradientButton: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  verifyButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  backButtonText: {
    color: colors.primary[600],
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    marginLeft: theme.spacing.xs,
  },
});

export default VerifyEmailScreen;




