import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContentWithDetails } from '../../../types';
import { useUIStore } from '../../../stores';
import { formatPercentage, formatReadTime } from '../../../utils';

interface ContentCardProps {
  item: ContentWithDetails;
  progress?: number;
  onPress: () => void;
  onLongPress?: () => void;
}

export function ContentCard({ item, progress, onPress, onLongPress }: ContentCardProps) {
  const colors = useUIStore((s) => s.colors);

  const icon = item.type === 'book' ? 'book-outline' : 'document-text-outline';
  const subtitle =
    item.type === 'book'
      ? item.details.format?.toUpperCase()
      : item.details.site_name ?? 'Article';
  const readTime =
    item.type === 'article'
      ? formatReadTime(item.details.estimated_read_minutes)
      : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
    >
      {item.cover_uri ? (
        <Image source={{ uri: item.cover_uri }} style={styles.cover} />
      ) : (
        <View style={[styles.coverPlaceholder, { backgroundColor: colors.border }]}>
          <Ionicons name={icon} size={32} color={colors.textSecondary} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.author && (
          <Text style={[styles.author, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.author}
          </Text>
        )}
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {subtitle}{readTime ? ` · ${readTime}` : ''}
        </Text>
      </View>

      {progress != null && progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {formatPercentage(progress)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    alignItems: 'center',
  },
  cover: {
    width: 60,
    height: 84,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  coverPlaceholder: {
    width: 60,
    height: 84,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  author: {
    fontSize: 14,
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    alignItems: 'flex-end',
  },
  progressTrack: {
    width: 48,
    height: 3,
    borderRadius: 2,
    marginBottom: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
  },
});
