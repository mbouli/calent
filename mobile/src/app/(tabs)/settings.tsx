import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { Palette, Radius } from '@/theme/palette';
import { Fonts } from '@/theme/typography';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const name = (user?.user_metadata?.name as string | undefined) ?? user?.email ?? 'You';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{name}</Text>
            {user?.email ? <Text style={styles.profileEmail}>{user.email}</Text> : null}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.85 }]}
          onPress={signOut}>
          <SymbolView name="rectangle.portrait.and.arrow.right" size={18} tintColor={Palette.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 26, fontFamily: Fonts.bold, color: Palette.text, letterSpacing: -0.5 },
  content: { paddingHorizontal: 16, gap: 24 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Palette.surfaceMuted,
    borderRadius: Radius.lg,
    padding: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Palette.primaryText, fontSize: 22, fontFamily: Fonts.bold },
  profileName: { fontSize: 17, fontFamily: Fonts.semibold, color: Palette.text },
  profileEmail: { fontSize: 14, color: Palette.textMuted, marginTop: 2, fontFamily: Fonts.regular },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: Radius.md,
    backgroundColor: Palette.surfaceMuted,
  },
  signOutText: { color: Palette.danger, fontSize: 16, fontFamily: Fonts.semibold },
});
