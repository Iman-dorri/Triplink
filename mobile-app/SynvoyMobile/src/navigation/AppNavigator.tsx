import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { loadUser } from '../store/slices/authSlice';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main screens
import DashboardScreen from '../screens/main/DashboardScreen';
import TripsScreen from '../screens/main/TripsScreen';
import ShoppingScreen from '../screens/main/ShoppingScreen';
import SocialScreen from '../screens/main/SocialScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import ChatScreen from '../screens/main/ChatScreen';
import SearchUsersScreen from '../screens/main/SearchUsersScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => {
            return <Icon name="dashboard" size={size} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="Trips"
        component={TripsScreen}
        options={{
          tabBarIcon: ({ color, size }) => {
            return <Icon name="flight" size={size} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="Shopping"
        component={ShoppingScreen}
        options={{
          tabBarIcon: ({ color, size }) => {
            return <Icon name="shopping-bag" size={size} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="Social"
        component={SocialScreen}
        options={{
          tabBarIcon: ({ color, size }) => {
            return <Icon name="people" size={size} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ color, size }) => {
            return <Icon name="message" size={size} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => {
            return <Icon name="person" size={size} color={color} />;
          },
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    try {
      dispatch(loadUser());
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  try {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen 
                name="Chat" 
                component={ChatScreen}
                options={{
                  headerShown: true,
                  headerStyle: { backgroundColor: '#ffffff' },
                  headerTintColor: '#1f2937',
                  headerTitleStyle: { fontWeight: '600' },
                }}
              />
              <Stack.Screen 
                name="SearchUsers" 
                component={SearchUsersScreen}
                options={{ 
                  headerShown: false,
                  ...TransitionPresets.SlideFromRightIOS,
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                }}
              />
              <Stack.Screen 
                name="Connections" 
                component={SocialScreen}
                options={{ 
                  headerShown: false,
                  ...TransitionPresets.SlideFromRightIOS,
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                }}
              />
              <Stack.Screen 
                name="TripsStack" 
                component={TripsScreen}
                options={{ 
                  headerShown: false,
                  ...TransitionPresets.SlideFromRightIOS,
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                }}
              />
              <Stack.Screen 
                name="MessagesStack" 
                component={MessagesScreen}
                options={{ 
                  headerShown: false,
                  ...TransitionPresets.SlideFromRightIOS,
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                }}
              />
              <Stack.Screen 
                name="ProfileStack" 
                component={ProfileScreen}
                options={{ 
                  headerShown: false,
                  ...TransitionPresets.SlideFromRightIOS,
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                }}
              />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    );
  } catch (error) {
    console.error('Navigation error:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Navigation Error</Text>
        <Text style={styles.errorDetail}>{String(error)}</Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
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
  },
});

export default AppNavigator;

