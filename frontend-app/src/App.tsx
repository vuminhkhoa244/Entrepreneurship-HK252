import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { isAuthenticated } from "./services/auth";

import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import LibraryScreen from "./screens/LibraryScreen";
import BookDetailScreen from "./screens/BookDetailScreen";
import ReaderScreen from "./screens/ReaderScreen";
import PDFReaderScreen from "./screens/PDFReaderScreen";
import NotesScreen from "./screens/NotesScreen";
import StatsScreen from "./screens/StatsScreen";
import SettingsScreen from "./screens/SettingsScreen";

import { useTheme, ThemeProvider } from "./context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export type { RootStackParamList, MainTabParamList } from "./types/navigation";
export { AuthContext } from "./context/AuthContext";
export type { AuthUser, AuthContextType } from "./context/AuthContext";

import { RootStackParamList, MainTabParamList } from "./types/navigation";
import { AuthContext } from "./context/AuthContext";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ── Main Tabs (Tự gọi theme context bên trong) ───────────────────────

function MainTabs() {
  // Lấy colors trực tiếp từ hook, không cần qua props nữa
  const { colors } = useTheme(); 

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.primary,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── Inner app that consumes theme ────────────────────────────────────

function ThemedApp() {
  const [user, setUser] = useState<any | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const { colors } = useTheme();

  const isAuth = !!user;

  useEffect(() => {
    (async () => {
      const authed = await isAuthenticated();
      if (authed) setUser({});
      setAuthReady(true);
      setInitializing(false);
    })();
  }, []);

  const login = (userData: any) => setUser(userData);
  const logout = () => {
    setUser(null);
    import("./services/auth").then((m) => m.clearToken());
  };

  if (!authReady) return null;

  return (
    <AuthContext.Provider value={{ user, setUser: login, login, logout }}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: colors.text,
            headerBackTitleVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          {isAuth ? (
            <>
              <Stack.Screen
                name="Main"
                component={MainTabs}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="BookDetail"
                component={BookDetailScreen}
                options={{ title: "Book Details" }}
              />
              <Stack.Screen
                name="Reader"
                component={ReaderScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PDFReader"
                component={PDFReaderScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Notes"
                component={NotesScreen}
                options={{ title: "Notes & Highlights" }}
              />
            </>
          ) : (
            <>
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Register"
                component={RegisterScreen}
                options={{ headerShown: false }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

// ── Root ─────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}