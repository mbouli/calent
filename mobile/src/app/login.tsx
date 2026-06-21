import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { Palette, Radius } from '@/theme/palette';
import { Fonts } from '@/theme/typography';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    const result = isSignup
      ? await signUp(email, password, name)
      : await signIn(email, password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    // On success the auth listener flips the session and the root gate routes us in.
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View style={styles.container}>
          <View style={styles.brandBlock}>
            <Image
              source={require('../../assets/images/calent-wordmark.png')}
              style={styles.wordmark}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Your schedule, simplified.</Text>
          </View>

          <View style={styles.form}>
            {isSignup && (
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={Palette.textFaint}
                selectionColor={Palette.accent}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Palette.textFaint}
              selectionColor={Palette.accent}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Palette.textFaint}
              selectionColor={Palette.accent}
              secureTextEntry
              textContentType={isSignup ? 'newPassword' : 'password'}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
              returnKeyType="go"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={submit}
              disabled={busy}>
              {busy ? (
                <ActivityIndicator color={Palette.accentText} />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {isSignup ? 'Create account' : 'Sign in'}
                </Text>
              )}
            </Pressable>
          </View>

          <Pressable
            style={styles.switchRow}
            onPress={() => {
              setError(null);
              setMode(isSignup ? 'signin' : 'signup');
            }}>
            <Text style={styles.switchText}>
              {isSignup ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={styles.switchAction}>{isSignup ? 'Sign in' : 'Create one'}</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.background },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    gap: 36,
  },
  brandBlock: { alignItems: 'center', gap: 12 },
  // The Calent serif wordmark (brand asset, 2.75:1) — the logotype the web uses.
  wordmark: { width: 188, height: 68 },
  tagline: { fontSize: 15, color: Palette.textMuted, fontFamily: Fonts.regular },
  form: { gap: 12 },
  input: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Palette.surfaceMuted,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Palette.text,
    fontFamily: Fonts.regular,
  },
  error: { color: Palette.danger, fontSize: 13, paddingHorizontal: 4, fontFamily: Fonts.regular },
  primaryBtn: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  pressed: { opacity: 0.85 },
  primaryBtnText: { color: Palette.accentText, fontSize: 16, fontFamily: Fonts.semibold },
  switchRow: { alignItems: 'center' },
  switchText: { color: Palette.textMuted, fontSize: 14, fontFamily: Fonts.regular },
  switchAction: { color: Palette.text, fontFamily: Fonts.semibold },
});
