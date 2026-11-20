import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileAvatar } from '@/components/profile-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type FriendProfile } from '@/db/friends';
import {
  addMember,
  deleteGroup,
  errorMessage,
  leaveGroup,
  loadFriendsNotInGroup,
  loadGroup,
  type GroupDetails,
  type GroupMovie,
} from '@/db/groups';
import { Spacing } from '@/style/theme';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w185';

// shows one group: its members, a way to add friends (owner only),
// and the combined watchlist ranked by how many members want each movie
export default function GroupDetailScreen() {
  const params = useLocalSearchParams<{ groupId?: string | string[] }>();
  // reads the selected group id from the route
  const groupId = Array.isArray(params.groupId)
    ? params.groupId[0]
    : params.groupId;

  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [invitable, setInvitable] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // loads the group whenever this screen is shown (or reloadKey changes)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        setLoading(true);
        setError('');

        try {
          if (!groupId) throw new Error('Missing group ID.');

          const next = await loadGroup(groupId);

          // only the owner can add people, so only load friends for them
          const friends =
            next.group.owner_id === next.userId
              ? await loadFriendsNotInGroup(next.members.map((m) => m.user_id))
              : [];

          if (!cancelled) {
            setDetails(next);
            setInvitable(friends);
          }
        } catch (err) {
          if (!cancelled) setError(errorMessage(err));
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      void load();

      return () => {
        cancelled = true;
      };
    }, [groupId, reloadKey])
  );

  function refresh() {
    setReloadKey((value) => value + 1);
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  const isOwner = !!details && details.group.owner_id === details.userId;
  const memberCount = details?.members.length ?? 0;

  // adds a friend straight into the group (no accept step)
  async function add(friend: FriendProfile) {
    if (busy || !groupId) return;

    setBusy(friend.user_id);

    try {
      await addMember(groupId, friend.user_id);
      refresh();
    } catch (err) {
      Alert.alert('Could not add friend', errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  // owners delete the group, everyone else just leaves it
  function confirmExit() {
    if (!groupId) return;

    Alert.alert(
      isOwner ? 'Delete group?' : 'Leave group?',
      isOwner
        ? 'This removes the group for everyone.'
        : 'The group owner can add you back later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isOwner ? 'Delete' : 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isOwner) await deleteGroup(groupId);
              else await leaveGroup(groupId);
              goBack();
            } catch (err) {
              Alert.alert('Something went wrong', errorMessage(err));
            }
          },
        },
      ]
    );
  }

  function renderMovie({ item }: { item: GroupMovie }) {
    return (
      <View style={styles.movieRow}>
        {item.poster_path ? (
          <Image
            source={{ uri: POSTER_BASE + item.poster_path }}
            style={styles.poster}
          />
        ) : (
          <View style={styles.poster} />
        )}

        <View style={styles.movieInfo}>
          <ThemedText type="smallBold">{item.title}</ThemedText>

          {!!item.release_date && (
            <ThemedText>{item.release_date.slice(0, 4)}</ThemedText>
          )}

          <ThemedText>
            {item.want_count} of {memberCount} want to watch
          </ThemedText>
        </View>
      </View>
    );
  }

  const header = details && (
    <View>
      <ThemedText type="subtitle">{details.group.title}</ThemedText>

      {!!error && <ThemedText>{error}</ThemedText>}

      <ThemedText style={styles.sectionLabel}>
        Members ({memberCount})
      </ThemedText>
      <ThemedText>
        {details.members.map((m) => m.username ?? 'Unnamed user').join(', ')}
      </ThemedText>

      {isOwner && (
        <View>
          <ThemedText style={styles.sectionLabel}>Add friends</ThemedText>

          {invitable.length === 0 ? (
            <ThemedText>
              No friends to add. Add friends on the Friends tab first.
            </ThemedText>
          ) : (
            invitable.map((friend) => (
              <View key={friend.user_id} style={styles.friendRow}>
                <ProfileAvatar size={36} />

                <ThemedText style={styles.friendName}>
                  {friend.username ?? 'Unnamed user'}
                </ThemedText>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${friend.username ?? 'friend'}`}
                  disabled={busy !== null}
                  onPress={() => void add(friend)}
                  style={[styles.button, busy !== null && styles.dimmed]}
                >
                  {busy === friend.user_id ? (
                    <ActivityIndicator />
                  ) : (
                    <ThemedText>Add</ThemedText>
                  )}
                </Pressable>
              </View>
            ))
          )}
        </View>
      )}

      <ThemedText style={styles.sectionLabel}>Combined watchlist</ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          accessibilityRole="button"
          onPress={goBack}
          style={styles.backButton}
        >
          <ThemedText>← Back</ThemedText>
        </Pressable>

        {loading && !details ? (
          <ActivityIndicator style={styles.loading} />
        ) : !details ? (
          <View style={styles.errorBox}>
            <ThemedText>{error || 'Could not load this group.'}</ThemedText>

            <Pressable
              accessibilityRole="button"
              onPress={refresh}
              style={styles.button}
            >
              <ThemedText>Retry</ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={details.movies}
            keyExtractor={(item) => String(item.movie_id)}
            renderItem={renderMovie}
            onRefresh={refresh}
            refreshing={loading}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={header}
            ListEmptyComponent={
              <ThemedText>
                Nothing yet. Movies on a member's watchlist show up here,
                unless someone in the group has them on their hate list.
              </ThemedText>
            }
            ListFooterComponent={
              <Pressable
                accessibilityRole="button"
                onPress={confirmExit}
                style={styles.exitButton}
              >
                <ThemedText style={styles.destructive}>
                  {isOwner ? 'Delete group' : 'Leave group'}
                </ThemedText>
              </Pressable>
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    marginBottom: 12,
  },
  loading: { marginTop: 32 },
  errorBox: { marginTop: 24, gap: 12 },
  list: { flex: 1 },
  listContent: { paddingBottom: 24 },
  sectionLabel: {
    marginTop: 24,
    marginBottom: 8,
    fontWeight: '700',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  friendName: { flex: 1 },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#808080',
    borderRadius: 10,
  },
  dimmed: { opacity: 0.5 },
  movieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: 6,
    backgroundColor: '#444',
  },
  movieInfo: { flex: 1, justifyContent: 'center' },
  exitButton: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    marginTop: 24,
  },
  destructive: { color: '#dc2626' },
});
