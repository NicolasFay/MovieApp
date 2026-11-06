import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/api/supabase';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/style/theme';

import { ProfileAvatar } from '@/components/profile-avatar';

type ListStatus = 'liked' | 'watchlist' | 'disliked';

type Profile = {
  user_id: string;
  username: string | null;
};

type Movie = {
  movie_id: number;
  title: string;
  movie_desc: string | null;
  release_date: string | null;
  rating: number | null;
};

type ListedMovie = {
  movie_id: number;
  status: ListStatus;
  created_at: string;
  movie: Movie | null;
};

const listOptions: { label: string; value: ListStatus }[] = [
  { label: 'Liked', value: 'liked' },
  { label: 'Watchlist', value: 'watchlist' },
  { label: 'Disliked', value: 'disliked' },
];

function errorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : 'Could not load this profile.';
}

export default function FriendProfileScreen() {
  const params = useLocalSearchParams<{
    userId?: string | string[];
  }>();

  const friendId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [selected, setSelected] = useState<ListStatus>('liked');
  const [movies, setMovies] = useState<ListedMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadProfile() {
        setLoading(true);
        setError('');
        setProfile(null);
        setMovies([]);

        try {
          if (!friendId) {
            throw new Error('Missing friend ID.');
          }

          const { data: authData, error: authError } =
            await supabase.auth.getUser();

          if (authError) throw authError;

          if (!authData.user) {
            throw new Error('Sign in to view this profile.');
          }

          // Your schema already defines this function.
          const { data: isFriend, error: friendshipError } =
            await supabase.rpc('is_friend', {
              other: friendId,
            });

          if (friendshipError) throw friendshipError;

          if (!isFriend) {
            throw new Error(
              'You must be friends with this user to view their lists.'
            );
          }

          const { data: friend, error: profileError } =
            await supabase
              .from('users')
              .select('user_id, username')
              .eq('user_id', friendId)
              .single();

          if (profileError) throw profileError;

          const { data: listedMovies, error: listError } =
            await supabase
              .from('listed')
              .select(`
                movie_id,
                status,
                created_at,
                movie:movies (
                  movie_id,
                  title,
                  movie_desc,
                  release_date,
                  rating
                )
              `)
              .eq('user_id', friendId)
              .in('status', ['liked', 'watchlist', 'disliked'])
              .order('created_at', { ascending: false })
              .returns<ListedMovie[]>();

          if (listError) throw listError;

          if (!cancelled) {
            setProfile(friend);
            setMovies(listedMovies ?? []);
          }
        } catch (err) {
          if (!cancelled) {
            setError(errorMessage(err));
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      void loadProfile();

      return () => {
        cancelled = true;
      };
    }, [friendId, reloadKey])
  );

  const visibleMovies = movies.filter(
    (item) => item.status === selected && item.movie !== null
  );

  function refresh() {
    setReloadKey((value) => value + 1);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            }
          }}
          style={styles.backButton}
        >
          <ThemedText>← Back</ThemedText>
        </Pressable>

        <View style={styles.profileHeader}>
          <ProfileAvatar size={88} />

          <ThemedText type="title">
            {profile?.username ?? 'Friend Profile'}
          </ThemedText>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loading} />
        ) : error ? (
          <View style={styles.error}>
            <ThemedText>{error}</ThemedText>

            <Pressable
              accessibilityRole="button"
              onPress={refresh}
              style={styles.button}
            >
              <ThemedText>Retry</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <ThemedText style={styles.subtitle}>
              Movie lists
            </ThemedText>

            <View style={styles.tabs}>
              {listOptions.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="tab"
                  accessibilityState={{
                    selected: selected === option.value,
                  }}
                  onPress={() => setSelected(option.value)}
                  style={[
                    styles.tab,
                    selected === option.value &&
                      styles.selectedTab,
                  ]}
                >
                  <ThemedText>{option.label}</ThemedText>
                </Pressable>
              ))}
            </View>

            <FlatList
              style={styles.list}
              data={visibleMovies}
              keyExtractor={(item) => String(item.movie_id)}
              onRefresh={refresh}
              refreshing={loading}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <ThemedText>
                  No movies in this list yet.
                </ThemedText>
              }
              renderItem={({ item }) => {
                const movie = item.movie;
                if (!movie) return null;

                return (
                  <View style={styles.movieRow}>
                    <ThemedText style={styles.movieTitle}>
                      {movie.title}
                    </ThemedText>

                    <View style={styles.metadata}>
                      {movie.release_date && (
                        <ThemedText>
                          {movie.release_date.slice(0, 4)}
                        </ThemedText>
                      )}

                      {movie.rating !== null && (
                        <ThemedText>
                          Rating: {movie.rating}/10
                        </ThemedText>
                      )}
                    </View>

                    {!!movie.movie_desc && (
                      <ThemedText numberOfLines={3}>
                        {movie.movie_desc}
                      </ThemedText>
                    )}
                  </View>
                );
              }}
            />
          </>
        )}
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
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    marginBottom: 12,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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
    paddingBottom: 24,
  },
  movieRow: {
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#808080',
  },
  movieTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  loading: {
    marginTop: 32,
  },
  error: {
    marginTop: 24,
    gap: 12,
  },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#808080',
    borderRadius: 10,
  },
  profileHeader: {
  alignItems: 'center',
  gap: 12,
  marginBottom: 16,
  },
});