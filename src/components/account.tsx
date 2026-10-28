import { supabase } from '@/api/supabase';
import { appStyles } from '@/style/theme';
import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Account({ userId, email }: { userId: string; email?: string }) {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const styles = appStyles;

  useEffect(() => {
    if (userId) getProfile();
  }, [userId]);

  async function getProfile() {
    try {
      setLoading(true);

      // the Users row is created automatically by the handle_new_user trigger on signup
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('user_id', userId)
        .single();
      if (error) throw error;

      setUsername(data?.username ?? '');
    } catch (error) {
      if (error instanceof Error) Alert.alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setLoading(true);

      // username is UNIQUE, so store null instead of '' when it's blank
      const { error } = await supabase
        .from('users')
        .update({ username: username.trim() || null })
        .eq('user_id', userId);

      if (error) {
        // 23505 = unique violation
        if (error.code === '23505') {
          Alert.alert('That username is already taken.');
          return;
        }
        throw error;
      }
      Alert.alert('Profile updated');
    } catch (error: any) {
      Alert.alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email ?? ''}
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
          style={styles.input}
        />
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={updateProfile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Loading ...' : 'Update'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.verticallySpaced}>
        <TouchableOpacity style={styles.button} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}