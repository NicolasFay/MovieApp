import { useEffect, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchNames } from '@/components/search-names';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { UserProfile, searchUsers } from '@/db/dbFunctions';

export default function FriendsScreen() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      searchUsers(query)
        .then((r) => { if (!cancelled) setResults(r); })
        .catch(console.error);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function cancelSearch() {
    setQuery('');
    setSearching(false);
    Keyboard.dismiss();
  }



  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Friends</ThemedText>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <SearchNames
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearching(true)}
            />
          </View>
          {searching && (
            <Pressable onPress={cancelSearch}>
              <ThemedText>Cancel</ThemedText>
            </Pressable>
          )}
        </View>

        {searching ? (
          <FlatList
            data={results}
            keyExtractor={(u) => u.user_id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              query.trim() ? <ThemedText>No users found.</ThemedText> : undefined
            }
            renderItem={({ item }) => (
              <ThemedText style={styles.resultRow}>{item.username}</ThemedText>
            )}
          />
        ) : (
          <ThemedText>Your friends list goes here.</ThemedText>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 },
  searchBox: { flex: 1 },
  resultRow: { paddingVertical: 10 },
});