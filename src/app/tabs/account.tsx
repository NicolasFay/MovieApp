import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

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
// account page with details and allows for changes
export default function Account() {
  const { userId } = useSession();
  const { styles } = useAppStyles();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  // prof pic state vars
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
const [uploading, setUploading] = useState(false);
  // loads the users email/profile
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
          .select('username, avatar_url')
          .eq('user_id', userId)
          .single();

        if (error) throw error;

        if (!cancelled) {
          setEmail(authData.user?.email ?? '');
          setUsername(data?.username ?? '');
          setAvatarUrl(data?.avatar_url ?? null);
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
  
  // picks a photo, uploads it, and saves the url
  async function changePhoto() {
  if (!userId || loading || uploading) return;

  setUploading(true);

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled) return;

    const image = result.assets[0];

    if (!image?.base64) {
      throw new Error('Could not read this photo.');
    }

    const path = `${userId}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, decode(image.base64), {
        contentType: 'image/jpeg',
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    const { error: profileError } = await supabase
      .from('users')
      .update({ avatar_url: urlData.publicUrl })
      .eq('user_id', userId)
      .select('user_id')
      .single();

    if (profileError) throw profileError;

    setAvatarUrl(urlData.publicUrl);
  } catch (error) {
    Alert.alert('Could not change photo', errorMessage(error));
  } finally {
    setUploading(false);
  }
}

  // save username and handle dupes
  async function updateProfile() {
    if (!userId || loading) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .update({
          username: username.trim() || null,
        })
        .eq('user_id', userId).select('user_id').single();

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

  // end current session
  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;
    } catch (error) {
      Alert.alert('Could not sign out', errorMessage(error));
    }
  }

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled">

    <View style={avatarStyles.section}>
      <ProfileAvatar uri={avatarUrl} size={88} />

      <Pressable
        onPress={changePhoto}
        disabled={loading || uploading}
        accessibilityRole="button"
        accessibilityState={{disabled: loading || uploading}}
        style={[avatarStyles.changeButton, {opacity: loading || uploading ? 0.5 : 1},]}
        >
          <ThemedText>
            {uploading ? 'Uploading...' : "Change photo"}
          </ThemedText>
        </Pressable>
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
          disabled={loading || uploading}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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