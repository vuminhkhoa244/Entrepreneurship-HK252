import React, {useContext, useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type {MainTabParamList} from '../App';
import {AuthContext} from '../App';
import {clearToken} from '../services/auth';
import {LibraryAPI, ReaderAPI} from '../services/api';
import type {ReadingSession} from '../types';
import {COLORS, FONT_SIZES} from '../constants/theme';

export default function StatsScreen() {
  const {logout} = useContext(AuthContext);
  const [stats, setStats] = useState<any>(null);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(true);

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

  useFocusEffect(fetchData);

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
    return <View style={styles.center}><Text style={styles.loadingText}>Loading...</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reading Stats</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
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
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {sessions.length === 0 ? (
          <Text style={styles.emptyText}>No reading sessions yet. Start reading!</Text>
        ) : (
          sessions.slice(0, 5).map(s => (
            <View key={s.id} style={styles.sessionCard}>
              <Ionicons name="book-outline" size={18} color={COLORS.textDim} />
              <Text style={styles.sessionText}>
                {s.pages_read} pages · {formatTime(s.duration_seconds)}
              </Text>
              <Text style={styles.sessionDate}>
                {new Date(s.started_at).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({icon, label, value}: {icon: string; label: string; value: string}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={`${icon}-outline`} size={24} color={COLORS.accent} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background},
  loadingText: {color: COLORS.textDim, fontSize: FONT_SIZES.lg},
  header: {flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center'},
  title: {color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: 'bold'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12},
  statCard: {
    width: '47%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: 'bold', marginTop: 8},
  statLabel: {color: COLORS.textDim, fontSize: FONT_SIZES.sm, marginTop: 4},
  section: {padding: 20},
  sectionTitle: {color: COLORS.white, fontSize: FONT_SIZES.lg, fontWeight: '600', marginBottom: 12},
  emptyText: {color: COLORS.textMuted, fontSize: FONT_SIZES.md, textAlign: 'center', marginTop: 24},
  sessionCard: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: COLORS.card, borderRadius: 8, marginBottom: 8},
  sessionText: {flex: 1, color: COLORS.text, fontSize: FONT_SIZES.sm},
  sessionDate: {color: COLORS.textMuted, fontSize: FONT_SIZES.xs},
});
