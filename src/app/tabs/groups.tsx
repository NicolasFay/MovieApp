import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  createGroup,
  errorMessage,
  loadMyGroups,
  type Group,
} from '@/db/groups';
import { BottomTabInset, Spacing, useAppStyles } from '@/style/theme';

// lists the user's groups and lets them create a new one
export default function GroupsScreen() {
  const { styles: appStyles, colors } = useAppStyles();

  const [groups, setGroups] = useState<Group[]>([]);
  const [title, setTitle] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');

    try {
      setGroups(await loadMyGroups());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }, []);

  // reload whenever the tab is shown (e.g. after leaving or deleting a group)
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  // creates the group, then opens it so friends can be added right away
  async function create() {
    const name = title.trim();
    if (!name || creating) return;

    setCreating(true);

    try {
      const groupId = await createGroup(name);
      setTitle('');
      router.push({ pathname: '/group-detail', params: { groupId } });
    } catch (err) {
      Alert.alert('Could not create group', errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedText type="title">Groups</ThemedText>

        <View style={styles.createRow}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="New group name"
            placeholderTextColor={colors.placeholder}
            maxLength={40}
            editable={!creating}
            returnKeyType="done"
            onSubmitEditing={create}
            style={[appStyles.input, styles.input]}
          />

          <TouchableOpacity
            accessibilityRole="button"
            style={[
              appStyles.button,
              (creating || !title.trim()) && appStyles.buttonDisabled,
            ]}
            onPress={create}
            disabled={creating || !title.trim()}
          >
            <Text style={appStyles.buttonText}>Create</Text>
          </TouchableOpacity>
        </View>

        {!!error && (
          <View style={styles.error}>
            <ThemedText>{error}</ThemedText>

            <Pressable
              accessibilityRole="button"
              onPress={() => void refresh()}
            >
              <ThemedText>Retry</ThemedText>
            </Pressable>
          </View>
        )}

        <FlatList
          style={styles.list}
          data={groups}
          keyExtractor={(item) => item.group_id}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            refreshing ? (
              <ActivityIndicator />
            ) : error ? null : (
              <ThemedText>No groups yet. Create one above.</ThemedText>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              onPress={() =>
                router.push({
                  pathname: '/group-detail',
                  params: { groupId: item.group_id },
                })
              }
              style={styles.row}
            >
              <ThemedText type="smallBold" style={styles.groupName}>
                {item.title}
              </ThemedText>
              <ThemedText>›</ThemedText>
            </Pressable>
          )}
        />
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
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 16,
  },
  input: { flex: 1 },
  error: { gap: 8, marginBottom: 12 },
  list: { flex: 1 },
  listContent: { paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#808080',
  },
  groupName: { flex: 1, fontSize: 18 },
});
