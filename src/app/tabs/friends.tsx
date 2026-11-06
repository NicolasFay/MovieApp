import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileAvatar } from '@/components/profile-avatar';
import { SearchNames } from '@/components/search-names';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  findFriendProfiles,
  loadFriends,
  removeFriend,
  requestFriend,
  respondToFriend,
  type FriendProfile,
  type FriendsData,
} from '@/db/friends';
import { BottomTabInset, Spacing } from '@/style/theme';

type Tab = 'Friends' | 'Requests' | 'Sent';

function errorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : 'Something went wrong. Try again.';
}

export default function FriendsScreen() {
  const [snapshot, setSnapshot] = useState<FriendsData | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [tab, setTab] = useState<Tab>('Friends');

  const [refreshing, setRefreshing] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const actionLock = useRef(false);
  const refreshVersion = useRef(0);
  const searchVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;

    setRefreshing(true);
    setError('');

    try {
      const next = await loadFriends();

      if (version === refreshVersion.current) {
        setSnapshot(next);
      }
    } catch (err) {
      if (version === refreshVersion.current) {
        setError(errorMessage(err));
      }
    } finally {
      if (version === refreshVersion.current) {
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();

      return () => {
        refreshVersion.current++;
      };
    }, [refresh])
  );

  useEffect(() => {
    const version = ++searchVersion.current;

    setResults([]);
    setSearchError('');

    if (!searching || !query.trim() || !snapshot?.userId) {
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const found = await findFriendProfiles(query, snapshot.userId);

        if (version === searchVersion.current) {
          setResults(found);
        }
      } catch (err) {
        if (version === searchVersion.current) {
          setSearchError(errorMessage(err));
        }
      } finally {
        if (version === searchVersion.current) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      searchVersion.current++;
    };
  }, [query, searching, snapshot?.userId]);

  const relationships = snapshot?.relationships ?? [];
  const userId = snapshot?.userId;

  function otherId(relationship: FriendsData['relationships'][number]) {
    return relationship.requester_id === userId
      ? relationship.addressee_id
      : relationship.requester_id;
  }

  const visibleIds = new Set(
    relationships
      .filter((relationship) => {
        if (tab === 'Friends') {
          return relationship.f_status === 'Accepted';
        }

        return (
          relationship.f_status === 'Pending' &&
          (tab === 'Requests'
            ? relationship.addressee_id === userId
            : relationship.requester_id === userId)
        );
      })
      .map(otherId)
  );

  const rows = searching
    ? results
    : (snapshot?.profiles ?? []).filter((profile) =>
        visibleIds.has(profile.user_id)
      );

  const incomingCount = relationships.filter(
    (relationship) =>
      relationship.f_status === 'Pending' &&
      relationship.addressee_id === userId
  ).length;

  async function act(id: string, operation: () => Promise<void>) {
    if (actionLock.current) return;

    actionLock.current = true;
    setBusy(id);

    try {
      await operation();
      await refresh();
    } catch (err) {
      Alert.alert('Could not update friends', errorMessage(err));
    } finally {
      actionLock.current = false;
      setBusy(null);
    }
  }

  function actionButton(
    label: string,
    id: string,
    operation: () => Promise<void>
  ) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={busy !== null}
        onPress={() => void act(id, operation)}
        style={({ pressed }) => [
          styles.button,
          { opacity: pressed || busy !== null ? 0.5 : 1 },
        ]}
      >
        <ThemedText>{label}</ThemedText>
      </Pressable>
    );
  }

  function renderProfile({ item }: { item: FriendProfile }) {
    const matches = relationships.filter(
      (relationship) => otherId(relationship) === item.user_id
    );

    const accepted = matches.find(
      (relationship) => relationship.f_status === 'Accepted'
    );

    const pending =
      matches.find(
        (relationship) =>
          relationship.f_status === 'Pending' &&
          relationship.addressee_id === userId
      ) ??
      matches.find((relationship) => relationship.f_status === 'Pending');

    const rejected = matches.find(
      (relationship) => relationship.f_status === 'Rejected'
    );

    let actions;

    if (busy === item.user_id) {
      actions = <ActivityIndicator />;
    } else if (accepted) {
      actions = searching ? (
        <ThemedText>Friends</ThemedText>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={busy !== null}
          style={styles.button}
          onPress={() =>
            Alert.alert(
              'Remove friend?',
              `Remove ${item.username ?? 'this user'}?`,
              [
                { text: 'Keep', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () =>
                    void act(item.user_id, () =>
                      removeFriend(accepted.f_id)
                    ),
                },
              ]
            )
          }
        >
          <ThemedText>Remove</ThemedText>
        </Pressable>
      );
    } else if (pending) {
      actions =
        pending.addressee_id === userId ? (
          <>
            {actionButton('Accept', item.user_id, () =>
              respondToFriend(pending.f_id, 'Accepted')
            )}
            {actionButton('Decline', item.user_id, () =>
              respondToFriend(pending.f_id, 'Rejected')
            )}
          </>
        ) : (
          actionButton('Cancel request', item.user_id, () =>
            removeFriend(pending.f_id)
          )
        );
    } else if (rejected) {
      actions = <ThemedText>Request declined</ThemedText>;
    } else {
      actions = actionButton('Add', item.user_id, () =>
        requestFriend(item.user_id)
      );
    }

    return (
      <View style={styles.row}>
        <Pressable
        style={styles.friendIdentity}
        accessibilityRole="button"
        accessibilityLabel={`View ${item.username ?? 'user'}'s profile`}
        disabled={!accepted}
        onPress={() =>
          router.push({
            pathname: '/friends-profile',
            params: { userId: item.user_id },
          })
        }
      >
        <ProfileAvatar />

        <ThemedText style={styles.name}>
          {item.username ?? 'Unnamed user'}
        </ThemedText>
      </Pressable>

      <View style={styles.actions}>{actions}</View>
    </View>
  );
  }

  function cancelSearch() {
    searchVersion.current++;
    setResults([]);
    setQuery('');
    setSearching(false);
    Keyboard.dismiss();
  }

  function emptyMessage() {
    if (searching) {
      if (searchError) return searchError;
      if (!snapshot) return 'Load your profile before searching.';
      return query.trim() ? 'No users found.' : 'Search by username.';
    }

    if (error) return '';
    if (tab === 'Friends') return 'No friends yet. Search for someone to add.';
    if (tab === 'Requests') return 'No incoming requests.';
    return 'No outgoing requests.';
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'left', 'right']}
      >
        <ThemedText type="title">Friends</ThemedText>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <SearchNames
              value={query}
              onChangeText={(value) => {
                searchVersion.current++;
                setResults([]);
                setSearchLoading(Boolean(value.trim()));
                setQuery(value);
              }}
              onFocus={() => setSearching(true)}
            />
          </View>

          {searching && (
            <Pressable
              accessibilityRole="button"
              onPress={cancelSearch}
            >
              <ThemedText>Cancel</ThemedText>
            </Pressable>
          )}
        </View>

        {!searching && (
          <View style={styles.tabs}>
            {(['Friends', 'Requests', 'Sent'] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === value }}
                onPress={() => setTab(value)}
                style={[
                  styles.tab,
                  tab === value && styles.selectedTab,
                ]}
              >
                <ThemedText>
                  {value === 'Requests'
                    ? `Requests (${incomingCount})`
                    : value}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}

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
          data={rows}
          keyExtractor={(item) => item.user_id}
          renderItem={renderProfile}
          keyboardShouldPersistTaps="handled"
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            searchLoading || (!snapshot && refreshing) ? (
              <ActivityIndicator />
            ) : (
              <ThemedText>{emptyMessage()}</ThemedText>
            )
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
  },
  searchBox: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  selectedTab: {
    borderBottomColor: '#808080',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  name: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    maxWidth: '65%',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#808080',
    borderRadius: 10,
  },
  error: {
    gap: 8,
    marginBottom: 12,
  },
  friendIdentity: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  },
});