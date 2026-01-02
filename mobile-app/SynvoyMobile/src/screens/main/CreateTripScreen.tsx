import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { createTrip } from '../../store/slices/tripsSlice';
import { theme, colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const CreateTripScreen = ({ navigation }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState('USD');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  
  // Modal states
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];
  
  // Format date for display
  const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Convert Date to YYYY-MM-DD string for calendar
  const dateToString = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };
  
  // Convert YYYY-MM-DD string to Date
  const stringToDate = (dateString: string): Date => {
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'INR', name: 'Indian Rupee' },
    { code: 'MXN', name: 'Mexican Peso' },
    { code: 'BRL', name: 'Brazilian Real' },
    { code: 'SEK', name: 'Swedish Krona' },
  ];

  const handleCreateTrip = async () => {
    setError('');
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    // Validate dates
    if (startDate && endDate && startDate > endDate) {
      setError('End date cannot be before start date');
      return;
    }

    if (startDate && startDate < today) {
      setError('Start date cannot be before today');
      return;
    }

    setCreating(true);

    try {
      const tripData: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        budget: budget ? parseFloat(budget) : undefined,
        budget_currency: budget ? budgetCurrency : undefined,
        start_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
        end_date: endDate ? endDate.toISOString().split('T')[0] : undefined,
      };

      await dispatch(createTrip(tripData)).unwrap();
      navigation.goBack();
    } catch (err: any) {
      setError(err || 'Failed to create trip');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Trip</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="error" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Summer Vacation 2024"
              placeholderTextColor={colors.gray[400]}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about your trip..."
              placeholderTextColor={colors.gray[400]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Budget</Text>
            <View style={styles.budgetRow}>
              <TextInput
                style={[styles.input, styles.budgetInput]}
                placeholder="0.00"
                placeholderTextColor={colors.gray[400]}
                value={budget}
                onChangeText={setBudget}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                style={styles.currencyContainer}
                onPress={() => setShowCurrencyModal(true)}
              >
                <Text style={styles.currencyText}>{budgetCurrency}</Text>
                <Icon name="arrow-drop-down" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.dateRow}>
            <View style={[styles.inputContainer, styles.dateInputContainer]}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={[styles.dateText, !startDate && styles.datePlaceholder]}>
                  {startDate ? startDate.toLocaleDateString() : 'Select start date'}
                </Text>
                <Icon name="calendar-today" size={20} color={colors.gray[400]} />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputContainer, styles.dateInputContainer]}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  endDate && startDate && endDate < startDate && styles.inputError
                ]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={[styles.dateText, !endDate && styles.datePlaceholder]}>
                  {endDate ? formatDateForDisplay(endDate) : 'Select end date'}
                </Text>
                <Icon name="calendar-today" size={20} color={colors.gray[400]} />
              </TouchableOpacity>
              {endDate && startDate && endDate < startDate && (
                <Text style={styles.errorHelperText}>Must be after start date</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, creating && styles.createButtonDisabled]}
          onPress={handleCreateTrip}
          disabled={creating}
        >
          <LinearGradient
            colors={[colors.primary[600], colors.cyan[500]]}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {creating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.text.white} />
                <Text style={styles.createButtonText}>Creating...</Text>
              </View>
            ) : (
              <Text style={styles.createButtonText}>Create Trip</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCurrencyModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={currencies}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.currencyItem,
                    budgetCurrency === item.code && styles.currencyItemSelected
                  ]}
                  onPress={() => {
                    setBudgetCurrency(item.code);
                    setShowCurrencyModal(false);
                  }}
                >
                  <Text style={[
                    styles.currencyItemText,
                    budgetCurrency === item.code && styles.currencyItemTextSelected
                  ]}>
                    {item.code} - {item.name}
                  </Text>
                  {budgetCurrency === item.code && (
                    <Icon name="check" size={20} color={colors.primary[600]} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Start Date Calendar Modal */}
      <Modal
        visible={showStartDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStartDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStartDatePicker(false)}
        >
          <View style={styles.calendarModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Start Date</Text>
              <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <Calendar
              current={dateToString(startDate) || todayString}
              minDate={todayString}
              markedDates={{
                [dateToString(startDate) || '']: {
                  selected: true,
                  selectedColor: colors.primary[600],
                  selectedTextColor: colors.text.white,
                }
              }}
              onDayPress={(day) => {
                const selectedDate = stringToDate(day.dateString);
                setStartDate(selectedDate);
                setShowStartDatePicker(false);
                // If end date is before new start date, clear it
                if (endDate && selectedDate > endDate) {
                  setEndDate(null);
                }
              }}
              theme={{
                backgroundColor: colors.background.default,
                calendarBackground: colors.background.default,
                textSectionTitleColor: colors.text.secondary,
                selectedDayBackgroundColor: colors.primary[600],
                selectedDayTextColor: colors.text.white,
                todayTextColor: colors.primary[600],
                dayTextColor: colors.text.primary,
                textDisabledColor: colors.gray[300],
                dotColor: colors.primary[600],
                selectedDotColor: colors.text.white,
                arrowColor: colors.primary[600],
                monthTextColor: colors.text.primary,
                textDayFontWeight: '400',
                textMonthFontWeight: '600',
                textDayHeaderFontWeight: '500',
                textDayFontSize: theme.fontSize.md,
                textMonthFontSize: theme.fontSize.lg,
                textDayHeaderFontSize: theme.fontSize.sm,
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* End Date Calendar Modal */}
      <Modal
        visible={showEndDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEndDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEndDatePicker(false)}
        >
          <View style={styles.calendarModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select End Date</Text>
              <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <Calendar
              current={dateToString(endDate) || dateToString(startDate) || todayString}
              minDate={dateToString(startDate) || todayString}
              markedDates={{
                [dateToString(endDate) || '']: {
                  selected: true,
                  selectedColor: colors.primary[600],
                  selectedTextColor: colors.text.white,
                }
              }}
              onDayPress={(day) => {
                const selectedDate = stringToDate(day.dateString);
                setEndDate(selectedDate);
                setShowEndDatePicker(false);
              }}
              theme={{
                backgroundColor: colors.background.default,
                calendarBackground: colors.background.default,
                textSectionTitleColor: colors.text.secondary,
                selectedDayBackgroundColor: colors.primary[600],
                selectedDayTextColor: colors.text.white,
                todayTextColor: colors.primary[600],
                dayTextColor: colors.text.primary,
                textDisabledColor: colors.gray[300],
                dotColor: colors.primary[600],
                selectedDotColor: colors.text.white,
                arrowColor: colors.primary[600],
                monthTextColor: colors.text.primary,
                textDayFontWeight: '400',
                textMonthFontWeight: '600',
                textDayHeaderFontWeight: '500',
                textDayFontSize: theme.fontSize.md,
                textMonthFontSize: theme.fontSize.lg,
                textDayHeaderFontSize: theme.fontSize.sm,
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.red[50],
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: colors.error,
  },
  form: {
    gap: theme.spacing.md,
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
  input: {
    backgroundColor: colors.background.default,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputError: {
    borderColor: colors.red[300],
  },
  textArea: {
    minHeight: 100,
    paddingTop: theme.spacing.md,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  budgetInput: {
    flex: 1,
  },
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.default,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    paddingHorizontal: theme.spacing.md,
    minHeight: 52,
  },
  currencyText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: colors.text.primary,
  },
  dateText: {
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
    flex: 1,
  },
  datePlaceholder: {
    color: colors.gray[400],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '70%',
    paddingBottom: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  currencyItemSelected: {
    backgroundColor: colors.primary[50],
  },
  currencyItemText: {
    fontSize: theme.fontSize.md,
    color: colors.text.primary,
  },
  currencyItemTextSelected: {
    fontWeight: theme.fontWeight.semibold,
    color: colors.primary[600],
  },
  calendarModalContent: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: theme.spacing.lg,
    maxHeight: '80%',
  },
  dateRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  dateInputContainer: {
    flex: 1,
  },
  helperText: {
    fontSize: theme.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  errorHelperText: {
    fontSize: theme.fontSize.xs,
    color: colors.error,
    marginTop: theme.spacing.xs,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: colors.background.default,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  createButton: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.button,
  },
  createButtonDisabled: {
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
  createButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
});

export default CreateTripScreen;

