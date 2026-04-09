import React, {useContext, useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {AuthContext} from '../context/AuthContext';
import {clearToken} from '../services/auth';
import {LibraryAPI} from '../services/api';
import type {ReadingSession} from '../types';
import { FONT_SIZES } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

function StatCard({icon, label, value}: {icon: string; label: string; value: string}) {
  const { colors } = useTheme(); 

  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={`${icon}-outline` as any} size={24} color={colors.accent} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textDim }]}>{label}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const {logout} = useContext(AuthContext);
  const [stats, setStats] = useState<any>(null);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  const fetchData = useCallback(async () => {
    try {
      const {data} = await LibraryAPI.stats();
      setStats(data);
    } catch { /* */ }
    try {
      const {data} = await LibraryAPI.recentSessions();
      setSessions(data);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const handleLogout = async () => {
    await clearToken();
    logout();
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return <View style={[styles.center, {backgroundColor: colors.background}]}><Text style={[styles.loadingText, {color: colors.text}]}>Loading...</Text></View>;
  }

  return (
    <ScrollView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: colors.text}]}>Reading Stats</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>

      {stats && (
        <View style={styles.grid}>
          <StatCard icon="book" label="Total Books" value={stats.total_books?.toString() || '0'} />
          <StatCard icon="checkmark-circle" label="Completed" value={stats.completed_books?.toString() || '0'} />
          <StatCard icon="layers" label="Pages Read" value={stats.total_pages_read?.toString() || '0'} />
          <StatCard icon="time" label="Reading Time" value={formatTime(stats.total_reading_seconds || 0)} />
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: colors.text}]}>Recent Activity</Text>
        {sessions.length === 0 ? (
          <Text style={[styles.emptyText, {color: colors.textDim}]}>No reading sessions yet. Start reading!</Text>
        ) : (
          sessions.slice(0, 5).map(s => (
            <View key={s.id} style={[styles.sessionCard, {backgroundColor: colors.card}]}>
              <Ionicons name="book-outline" size={18} color={colors.textDim} />
              <Text style={[styles.sessionText, {color: colors.text}]}>
                {s.pages_read} pages · {formatTime(s.duration_seconds)}
              </Text>
              <Text style={[styles.sessionDate, {color: colors.textDim}]}>
                {new Date(s.started_at).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loadingText: { fontSize: FONT_SIZES.lg},
  header: {flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center'},
  title: { fontSize: FONT_SIZES.xl, fontWeight: 'bold'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12},
  statCard: {
    width: '47%',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    borderWidth: 1,
  },
  statValue: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', marginTop: 8},
  statLabel: { fontSize: FONT_SIZES.sm, marginTop: 4},
  section: {padding: 20},
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600', marginBottom: 12},
  emptyText: { fontSize: FONT_SIZES.md, textAlign: 'center', marginTop: 24},
  sessionCard: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, marginBottom: 8},
  sessionText: {flex: 1, fontSize: FONT_SIZES.sm},
  sessionDate: { fontSize: FONT_SIZES.xs},
});
