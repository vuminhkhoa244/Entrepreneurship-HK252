import React, {useEffect, useState, createContext, useContext} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {isAuthenticated} from './services/auth';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import LibraryScreen from './screens/LibraryScreen';
import BookDetailScreen from './screens/BookDetailScreen';
import ReaderScreen from './screens/ReaderScreen';
import NotesScreen from './screens/NotesScreen';
import StatsScreen from './screens/StatsScreen';
import SettingsScreen from './screens/SettingsScreen';

import {COLORS} from './constants/theme';
import { Ionicons } from '@expo/vector-icons';

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
  BookDetail: {bookId: string};
  Reader: {bookId: string; fileType: 'epub' | 'pdf'};
  Notes: {bookId: string};
};

export type MainTabParamList = {
  Library: undefined;
  Stats: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ── Auth Context ────────────────────────────────────────────────────────────

interface AuthContextType {
  user: any | null;
  setUser: React.Dispatch<React.SetStateAction<any | null>>;
  login: (user: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  login: () => {},
  logout: () => {},
});

export {AuthContext};

// ── Main Tabs ───────────────────────────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: COLORS.primary},
        headerTintColor: COLORS.text,
        tabBarStyle: {
          backgroundColor: COLORS.primary,
          borderTopColor: COLORS.border,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textDim,
      }}>
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── Root App ────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    (async () => {
      const authed = await isAuthenticated();
      setIsAuth(authed);
      setInitializing(false);
    })();
  }, []);

  const login = (userData: any) => setUser(userData);
  const logout = () => {
    setUser(null);
    import('./services/auth').then(m => m.clearToken());
  };

  if (initializing) return null;

  return (
    <AuthContext.Provider value={{user, setUser: login, login, logout}}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {backgroundColor: COLORS.primary},
            headerTintColor: COLORS.text,
            headerBackTitleVisible: false,
            contentStyle: {backgroundColor: COLORS.background},
          }}>
          {isAuth ? (
            <>
              <Stack.Screen
                name="Main"
                component={MainTabs}
                options={{headerShown: false}}
              />
              <Stack.Screen
                name="BookDetail"
                component={BookDetailScreen}
                options={{title: 'Book Details'}}
              />
              <Stack.Screen
                name="Reader"
                component={ReaderScreen}
                options={{headerShown: false}}
              />
              <Stack.Screen
                name="Notes"
                component={NotesScreen}
                options={{title: 'Notes & Highlights'}}
              />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : (
            <>
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{headerShown: false}}
              />
              <Stack.Screen
                name="Register"
                component={RegisterScreen}
                options={{headerShown: false}}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
