import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Minimal test app to isolate the issue
const App = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Synvoy Mobile</Text>
      <Text style={styles.subtext}>App is loading...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#6b7280',
  },
});

export default App;





