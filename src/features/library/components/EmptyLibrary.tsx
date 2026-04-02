import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '../../../stores';

interface EmptyLibraryProps {
  filterActive: boolean;
}

export function EmptyLibrary({ filterActive }: EmptyLibraryProps) {
  const colors = useUIStore((s) => s.colors);

  return (
    <View style={styles.container}>
      <Ionicons
        name={filterActive ? 'search-outline' : 'library-outline'}
        size={64}
        color={colors.textSecondary}
      />
      <Text style={[styles.title, { color: colors.text }]}>
        {filterActive ? 'No results' : 'Your library is empty'}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {filterActive
          ? 'Try a different search or filter'
          : 'Import a book or save an article to get started'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingBottom: 80,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});
