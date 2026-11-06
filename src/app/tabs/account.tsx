import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/api/supabase';
import { ProfileAvatar } from '@/components/profile-avatar';
import { useSession } from '@/components/session-provider';
import { ThemedText } from '@/components/themed-text';
import { useAppStyles } from '@/style/theme';

function errorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : 'Something went wrong. Please try again.';
}

export default function Account() {
  const { userId } = useSession();
  const { styles } = useAppStyles();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function getProfile() {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        const { data, error } = await supabase
          .from('users')
          .select('username')
          .eq('user_id', userId)
          .single();

        if (error) throw error;

        if (!cancelled) {
          setEmail(authData.user?.email ?? '');
          setUsername(data?.username ?? '');
        }
      } catch (error) {
        if (!cancelled) {
          Alert.alert('Could not load profile', errorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void getProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function updateProfile() {
    if (!userId || loading) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('users')
        .update({
          username: username.trim() || null,
        })
        .eq('user_id', userId)
        .select('user_id')
        .single();

      if (error) {
        if (error.code === '23505') {
          Alert.alert('That username is already taken.');
          return;
        }

        throw error;
      }

      if (!data) {
        throw new Error('Your profile could not be updated.');
      }

      setUsername(username.trim());
      Alert.alert('Profile updated');
    } catch (error) {
      Alert.alert('Could not update profile', errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;
    } catch (error) {
      Alert.alert('Could not sign out', errorMessage(error));
    }
  }

  return (
    <View style={styles.container}>
      <View style={avatarStyles.section}>
        <ProfileAvatar size={88} />

        <Pressable
          disabled
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          style={avatarStyles.changeButton}
        >
          <ThemedText>Change photo</ThemedText>
        </Pressable>

        <ThemedText>Coming soon</ThemedText>
      </View>

      <View>
        <Text style={styles.label}>Email</Text>

        <TextInput
          value={email}
          editable={false}
          selectTextOnFocus={false}
          style={[styles.input, styles.inputDisabled]}
        />
      </View>

      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Username</Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          style={styles.input}
        />
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[
            styles.button,
            loading && styles.buttonDisabled,
          ]}
          onPress={updateProfile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading ...' : 'Update'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.verticallySpaced}>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.button}
          onPress={signOut}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  section: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  changeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#808080',
    borderRadius: 10,
    opacity: 0.5,
  },
});