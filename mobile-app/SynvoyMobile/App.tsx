import React, { ErrorInfo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error Boundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading app</Text>
          <Text style={styles.errorDetail}>{this.state.error?.message || 'Unknown error'}</Text>
          {this.state.error?.stack && (
            <Text style={styles.errorStack} numberOfLines={10}>
              {this.state.error.stack}
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <AppNavigator />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </Provider>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 10,
  },
  errorDetail: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorStack: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'left',
    fontFamily: 'monospace',
  },
});

export default App;

