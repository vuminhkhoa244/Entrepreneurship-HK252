import React, {useContext, useState, useCallback} from 'react';
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
import {useFocusEffect} from '@react-navigation/native';
import {AuthContext} from '../App';
import {clearToken, isAuthenticated} from '../services/auth';
import {COLORS, FONT_SIZES} from '../constants/theme';

export default function SettingsScreen() {
  const {logout, user} = useContext(AuthContext);
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      isAuthenticated().then(setIsLoggedIn);
    }, [])
  );

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Profile */}
      {isLoggedIn && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.card}>
            <Ionicons name="person-circle" size={24} color={COLORS.accent} />
            <Text style={styles.profileName}>{user?.displayName || 'Reader'}</Text>
          </View>
        </View>
      )}

      {/* Reading */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reading</Text>
        <View style={styles.card}>
          {/* Font size */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Default font size</Text>
            <View style={styles.fontControls}>
              <TouchableOpacity onPress={() => setFontSize(Math.max(12, fontSize - 2))}>
                <Ionicons name="remove" size={20} color={COLORS.accent} />
              </TouchableOpacity>
              <Text style={styles.fontSizeValue}>{fontSize}px</Text>
              <TouchableOpacity onPress={() => setFontSize(Math.min(28, fontSize + 2))}>
                <Ionicons name="add" size={20} color={COLORS.accent} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Dark mode */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Dark mode</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{false: COLORS.border, true: COLORS.accent}}
              thumbColor={COLORS.white}
            />
          </View>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Reading reminders</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{false: COLORS.border, true: COLORS.accent}}
              thumbColor={COLORS.white}
            />
          </View>
        </View>
      </View>

      {/* Account */}
      {isLoggedIn && (
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* About */}
      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.textDim} />
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.versionText}>0.1.0</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  header: {padding: 20},
  title: {color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: 'bold'},
  section: {paddingHorizontal: 20, marginBottom: 20},
  sectionTitle: {color: COLORS.textDim, fontSize: FONT_SIZES.sm, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase'},
  card: {backgroundColor: COLORS.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border},
  profileName: {color: COLORS.text, fontSize: FONT_SIZES.md, marginLeft: 12},
  settingRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8},
  settingLabel: {color: COLORS.text, fontSize: FONT_SIZES.md},
  fontControls: {flexDirection: 'row', alignItems: 'center', gap: 16},
  fontSizeValue: {color: COLORS.white, fontSize: FONT_SIZES.md, minWidth: 40, textAlign: 'center'},
  logoutBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8},
  logoutText: {color: COLORS.error, fontSize: FONT_SIZES.md, fontWeight: '600'},
  versionText: {color: COLORS.textMuted, fontSize: FONT_SIZES.sm},
});
