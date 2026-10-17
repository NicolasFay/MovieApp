import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListOptions, ListType } from '@/components/list-options';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function UserListsScreen() {
  const [selected, setSelected] = useState<ListType>('liked');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">User Lists</ThemedText>

        <ListOptions selected={selected} onSelect={setSelected} />

        <View style={styles.content}>
          <ThemedText>This will be the {selected} list</ThemedText>
        </View>
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
  content: { flex: 1, paddingTop: 16 },
});