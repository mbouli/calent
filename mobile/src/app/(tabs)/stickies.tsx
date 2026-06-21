import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Palette } from '@/theme/palette';
import { Fonts } from '@/theme/typography';

export default function StickiesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Stickies</Text>
      </View>
      <View style={styles.empty}>
        <SymbolView name="square.stack.3d.up" size={44} tintColor={Palette.textFaint} />
        <Text style={styles.emptyText}>Your sticky notes will live here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 26, fontFamily: Fonts.bold, color: Palette.text, letterSpacing: -0.5 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingBottom: 80 },
  emptyText: { color: Palette.textMuted, fontSize: 15, fontFamily: Fonts.regular },
});
