import { supabase } from '@/api/supabase';

export type FriendProfile = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
};

export type Friendship = {
  f_id: string;
  requester_id: string;
  addressee_id: string;
  f_status: 'Pending' | 'Rejected' | 'Accepted';
};

export type FriendsData = {
  userId: string;
  relationships: Friendship[];
  profiles: FriendProfile[];
};

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!data.user) throw new Error('Sign in to view friends.');

  return data.user.id;
}

export async function loadFriends(): Promise<FriendsData> {
  const userId = await currentUserId();

  const { data, error } = await supabase
    .from('friends')
    .select('f_id, requester_id, addressee_id, f_status')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) throw error;

  const relationships = (data ?? []) as Friendship[];

  const ids = [
    ...new Set(
      relationships.map((r) =>
        r.requester_id === userId ? r.addressee_id : r.requester_id
      )
    ),
  ];

  if (!ids.length) {
    return { userId, relationships, profiles: [] };
  }

  const { data: profiles, error: profileError } = await supabase
    .from('users')
    .select('user_id, username, avatar_url')
    .in('user_id', ids);

  if (profileError) throw profileError;

  return { userId, relationships, profiles: profiles ?? [] };
}

export async function findFriendProfiles(query: string, userId: string) {
  // Treat SQL pattern characters as literal username characters.
  const escaped = query.trim().replace(/[\\%_]/g, '\\$&');

  const { data, error } = await supabase
    .from('users')
    .select('user_id, username, avatar_url')
    .neq('user_id', userId)
    .ilike('username', `%${escaped}%`)
    .order('username')
    .limit(30);

  if (error) throw error;

  return (data ?? []) as FriendProfile[];
}

export async function requestFriend(otherId: string) {
  const userId = await currentUserId();

  const { error } = await supabase.from('friends').insert({
    requester_id: userId,
    addressee_id: otherId,
    f_status: 'Pending',
  });

  if (error) throw error;
}

export async function respondToFriend(
  id: string,
  status: 'Accepted' | 'Rejected'
) {
  const userId = await currentUserId();

  const { data, error } = await supabase
    .from('friends')
    .update({ f_status: status })
    .eq('f_id', id)
    .eq('addressee_id', userId)
    .eq('f_status', 'Pending')
    .select('f_id');

  if (error) throw error;

  if (!data?.length) {
    throw new Error('This request has changed. Refresh and try again.');
  }
}

export async function removeFriend(id: string) {
  const { data, error } = await supabase
    .from('friends')
    .delete()
    .eq('f_id', id)
    .select('f_id');

  if (error) throw error;

  if (!data?.length) {
    throw new Error('This relationship has changed. Refresh and try again.');
  }
}