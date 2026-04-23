import React, { useContext, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { clearToken, isAuthenticated } from '../services/auth';
import { FONT_SIZES } from '../constants/theme';

export default function SettingsScreen() {
  const { logout, user } = useContext(AuthContext);
  const { mode, setMode, colors } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();

  useFocusEffect(
    useCallback(() => {
      isAuthenticated().then(setIsLoggedIn);
    }, [])
  );

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await clearToken();
          logout();
        },
      },
    ]);
  };

  const c = colors;

   return (
     <ScrollView style={[s.container, { backgroundColor: c.background }]} contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}>
       <View style={{ padding: 20 }}>
         {/* Đã cập nhật c.white thành c.text để tự động đổi màu chữ theo theme */}
         <Text style={[s.title, { color: c.text }]}>Settings</Text>
       </View>

      {/* Profile */}
      {isLoggedIn && (
        <View style={[s.section]}>
          <Text style={[s.sectionTitle, { color: c.textDim }]}>Profile</Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="person-circle" size={24} color={c.accent} />
              <Text style={[s.profileName, { color: c.text }]}>
                {user?.displayName || 'Reader'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Appearance */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: c.textDim }]}>Appearance</Text>
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={s.settingRow}>
            <Text style={{ color: c.text, fontSize: FONT_SIZES.md }}>Dark mode</Text>
            <Switch
              value={mode === 'dark'}
              onValueChange={(v) => setMode(v ? 'dark' : 'light')}
              trackColor={{ false: c.border, true: c.accent }}
              thumbColor={c.white}
            />
          </View>
        </View>
      </View>

      {/* Account */}
      {isLoggedIn && (
        <View style={s.section}>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color={c.error} />
              <Text style={{ color: c.error, fontSize: FONT_SIZES.md, fontWeight: '600' }}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* About */}
      <View style={s.section}>
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={s.settingRow}>
            <Ionicons name="information-circle-outline" size={20} color={c.textDim} />
            <Text style={{ color: c.text, fontSize: FONT_SIZES.md }}>Version</Text>
            <Text style={{ color: c.textMuted, fontSize: FONT_SIZES.sm }}>0.1.0</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: FONT_SIZES.xl, fontWeight: 'bold' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  profileName: { fontSize: FONT_SIZES.md, marginLeft: 12 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
});