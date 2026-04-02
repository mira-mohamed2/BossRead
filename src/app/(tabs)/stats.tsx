import { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '../../stores';
import { useReadingStats } from '../../features/stats/hooks';

export default function StatsScreen() {
  const colors = useUIStore((s) => s.colors);
  const { stats, loading, loadStats } = useReadingStats();

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const cards = [
    { label: 'Total Reading', value: formatTime(stats.totalReadSeconds), icon: 'time-outline' as const },
    { label: 'Books', value: String(stats.totalBooks), icon: 'book-outline' as const },
    { label: 'Articles', value: String(stats.totalArticles), icon: 'document-text-outline' as const },
    { label: 'Completed', value: String(stats.completedItems), icon: 'checkmark-circle-outline' as const },
    { label: 'Current Streak', value: `${stats.currentStreak}d`, icon: 'flame-outline' as const },
    { label: 'Longest Streak', value: `${stats.longestStreak}d`, icon: 'trophy-outline' as const },
  ];

  const maxBarSeconds = Math.max(...stats.recentActivity.map((a) => a.seconds), 1);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.heading, { color: colors.text }]}>Reading Statistics</Text>

      {/* Stat cards grid */}
      <View style={styles.grid}>
        {cards.map((card) => (
          <View key={card.label} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name={card.icon} size={24} color={colors.primary} />
            <Text style={[styles.cardValue, { color: colors.text }]}>{card.value}</Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{card.label}</Text>
          </View>
        ))}
      </View>

      {/* Activity chart */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Last 14 Days</Text>
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chart}>
          {stats.recentActivity.map((day) => {
            const height = Math.max((day.seconds / maxBarSeconds) * 100, 4);
            return (
              <View key={day.date} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: day.seconds > 0 ? colors.primary : colors.border,
                    },
                  ]}
                />
                <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
                  {day.date.slice(8)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Most read */}
      {stats.topItems.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Most Read</Text>
          <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {stats.topItems.map((item, i) => (
              <View
                key={i}
                style={[styles.listItem, i < stats.topItems.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
              >
                <Text style={[styles.rank, { color: colors.primary }]}>{i + 1}</Text>
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.itemTime, { color: colors.textSecondary }]}>
                  {formatTime(item.seconds)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { fontSize: 24, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  card: {
    width: '45%',
    margin: '2.5%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  cardValue: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  cardLabel: { fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  chartCard: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, padding: 16 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120 },
  barCol: { alignItems: 'center', flex: 1 },
  bar: { width: 12, borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 9, marginTop: 4 },
  listCard: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rank: { fontSize: 16, fontWeight: '700', width: 24, textAlign: 'center' },
  itemTitle: { flex: 1, fontSize: 14 },
  itemTime: { fontSize: 12 },
});