import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/api/supabase';
import { useSession } from '@/components/session-provider';
import { ThemedText } from '@/components/themed-text';
import { useAppStyles } from '@/style/theme';

// Client-side minimum. Keep in sync with the Supabase dashboard setting
const MIN_LENGTH = 8;

function errorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : 'Something went wrong. Please try again.';
}

type Props = {
  // pre-fills the email box with whatever was typed on the sign-in form
  initialEmail: string;
  // returns to the sign-in form
  onBack: () => void;
};

// Password reset for signed-out users, using Supabase's email one-time code:
//   step 1 'email' -> resetPasswordForEmail sends a code to the user's inbox
//   step 2 'code'  -> verifyOtp (type 'recovery') + updateUser sets the new password
// No deep links needed: the user types the code from the email into the app.
export function ForgotPassword({ initialEmail, onBack }: Props) {
  const { styles, colors } = useAppStyles();
  const { setRecovering } = useSession();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  // true once the code was accepted; Supabase has then signed the user in with
  // a recovery session, so a failed password update can be retried without a new code
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  // step 1: email the code. Supabase gives the same response whether or not the
  // account exists, so this never reveals who has an account.
  async function sendCode() {
    const address = email.trim();

    if (!address) {
      Alert.alert('Enter your email address.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(address);
      if (error) throw error;

      setEmail(address);
      setStep('code');
      Alert.alert(
        'Check your email',
        'If an account exists for that address, we sent a code.'
      );
    } catch (error) {
      Alert.alert('Could not send code', errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  // step 2: check the code, then set the new password
  async function resetPassword() {
    if (loading) return;

    if (!verified && !code.trim()) {
      Alert.alert('Enter the code from your email.');
      return;
    }
    if (password.length < MIN_LENGTH) {
      Alert.alert(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      Alert.alert('The passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      if (!verified) {
        // A correct code signs the user in. Flag the reset first so the app
        // keeps showing this screen until the new password is saved.
        setRecovering(true);

        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: code.trim(),
          type: 'recovery',
        });

        if (verifyError) {
          setRecovering(false);
          Alert.alert(
            verifyError.code === 'otp_expired'
              ? 'That code is wrong or has expired. Request a new one.'
              : errorMessage(verifyError)
          );
          return;
        }

        setVerified(true);
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Done. The user is signed in, so the app swaps to the main screens.
      setRecovering(false);
    } catch (error) {
      Alert.alert('Could not reset password', errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  // back to sign-in; drops the recovery session if the code was already used
  async function cancel() {
    if (loading) return;

    if (verified) {
      // 'local' signs out this device only, not the user's other sessions
      await supabase.auth.signOut({ scope: 'local' });
    }

    setRecovering(false);
    onBack();
  }

  if (step === 'email') {
    return (
      <View style={styles.container}>
        <ThemedText>
          Enter your email and we will send you a code to reset your password.
        </ThemedText>

        <View style={[styles.verticallySpaced, styles.mt20]}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email@address.com"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!loading}
            style={styles.input}
          />
        </View>

        <View style={[styles.verticallySpaced, styles.mt20]}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={sendCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending ...' : 'Send code'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          style={local.textButton}
          onPress={onBack}
        >
          <ThemedText type="linkPrimary">Back to sign in</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText>
        {verified
          ? 'Code accepted. Choose a new password.'
          : `Enter the code we sent to ${email} and choose a new password.`}
      </ThemedText>

      {!verified && (
        <View style={[styles.verticallySpaced, styles.mt20]}>
          <Text style={styles.label}>Code</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Code from email"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            editable={!loading}
            style={styles.input}
          />
        </View>
      )}

      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>New password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={`At least ${MIN_LENGTH} characters`}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!loading}
          style={styles.input}
        />
      </View>

      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Confirm new password</Text>
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="Re-enter new password"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!loading}
          style={styles.input}
        />
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={resetPassword}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Saving ...' : 'Reset password'}
          </Text>
        </TouchableOpacity>
      </View>

      {!verified && (
        <TouchableOpacity
          accessibilityRole="button"
          style={local.textButton}
          onPress={sendCode}
          disabled={loading}
        >
          <ThemedText type="linkPrimary">Send a new code</ThemedText>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        accessibilityRole="button"
        style={local.textButton}
        onPress={cancel}
        disabled={loading}
      >
        <ThemedText type="linkPrimary">Back to sign in</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const local = StyleSheet.create({
  textButton: {
    alignSelf: 'center',
    paddingVertical: 12,
  },
});
