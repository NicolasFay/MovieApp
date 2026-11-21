import { supabase } from '@/api/supabase';
import { loadFriends, type FriendProfile } from '@/db/friends';

export type Group = {
  group_id: string;
  title: string;
  owner_id: string;
};

export type GroupMember = {
  user_id: string;
  username: string | null;
};

// a row from the group_watchlist_ranked SQL function
export type GroupMovie = {
  movie_id: number;
  title: string;
  movie_desc: string | null;
  release_date: string | null;
  rating: number | null;
  genre: number[];
  poster_path: string | null;
  // how many members have this movie on their watchlist
  want_count: number;
};

export type GroupDetails = {
  userId: string;
  group: Group;
  members: GroupMember[];
  movies: GroupMovie[];
};

export function errorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : 'Something went wrong. Try again.';
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!data.user) throw new Error('Sign in to use groups.');

  return data.user.id;
}

// groups the user owns or belongs to (row level security does the filtering)
export async function loadMyGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('group_id, title, owner_id')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []) as Group[];
}

// creates a group and returns its id. A database trigger adds the owner as a member.
export async function createGroup(title: string): Promise<string> {
  const userId = await currentUserId();

  const { data, error } = await supabase
    .from('groups')
    .insert({ title: title.trim(), owner_id: userId })
    .select('group_id')
    .single();

  if (error) throw error;

  return data.group_id as string;
}

// loads a group, its members, and its combined (ranked) watchlist
export async function loadGroup(groupId: string): Promise<GroupDetails> {
  const userId = await currentUserId();

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('group_id, title, owner_id')
    .eq('group_id', groupId)
    .single();

  if (groupError) throw groupError;

  const { data: memberRows, error: memberError } = await supabase
    .from('members')
    .select('user_id, users(username)')
    .eq('group_id', groupId)
    .order('joined_at');

  if (memberError) throw memberError;

  const members: GroupMember[] = (memberRows ?? []).map((row: any) => {
    const profile = Array.isArray(row.users) ? row.users[0] : row.users;
    return { user_id: row.user_id, username: profile?.username ?? null };
  });

  const { data: movies, error: movieError } = await supabase.rpc(
    'group_watchlist_ranked',
    { p_group_id: groupId }
  );

  if (movieError) throw movieError;

  return {
    userId,
    group: group as Group,
    members,
    movies: (movies ?? []) as GroupMovie[],
  };
}

// accepted friends who are not in the group yet
export async function loadFriendsNotInGroup(
  memberIds: string[]
): Promise<FriendProfile[]> {
  const { userId, relationships, profiles } = await loadFriends();

  const friendIds = new Set(
    relationships
      .filter((r) => r.f_status === 'Accepted')
      .map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id))
  );

  return profiles.filter(
    (p) => friendIds.has(p.user_id) && !memberIds.includes(p.user_id)
  );
}

// owner only (enforced by row level security)
export async function addMember(groupId: string, userId: string) {
  const { error } = await supabase
    .from('members')
    .insert({ group_id: groupId, user_id: userId });

  if (error) {
    // 23505 = unique violation: they are already a member
    if (error.code === '23505') {
      throw new Error('That friend is already in the group.');
    }
    throw error;
  }
}

// a member removes themselves from a group
export async function leaveGroup(groupId: string) {
  const userId = await currentUserId();

  const { data, error } = await supabase
    .from('members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select('user_id');

  if (error) throw error;

  if (!data?.length) {
    throw new Error('Could not leave this group. Refresh and try again.');
  }
}

// owner only (enforced by row level security); members are removed automatically
export async function deleteGroup(groupId: string) {
  const { data, error } = await supabase
    .from('groups')
    .delete()
    .eq('group_id', groupId)
    .select('group_id');

  if (error) throw error;

  if (!data?.length) {
    throw new Error('Could not delete this group. Refresh and try again.');
  }
}
