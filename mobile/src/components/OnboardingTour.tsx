import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  ZoomIn,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Palette } from '@/theme/palette';
import { Fonts } from '@/theme/typography';

const SALMON = Palette.accent; // #FF7264
const INK = '#0D0D0D';
const CHIP_BORDER = 'rgba(13,13,13,0.06)';
// Crossfade timing tuned to mirror the web's `mode="wait"` transition
// (deliberate easeOut, ~28px x-shift) rather than a snappy default preset.
const SHIFT = 28;
const OUT_MS = 120;
const IN_MS = 240;

// Staggered pop-in for chips/swatches. Scale starts at 0.6 (not 0) so items
// gently pop rather than balloon up from nothing — matching the web's popItem.
const pop = (delay = 0) =>
  ZoomIn.delay(delay)
    .springify()
    .damping(17)
    .stiffness(180)
    .withInitialValues({ transform: [{ scale: 0.6 }] });

type SlideId = 'welcome' | 'plan' | 'stayOnTop' | 'makeItYours';

const SLIDES: { id: SlideId; title: string; body: string; Art: () => React.ReactNode }[] = [
  {
    id: 'welcome',
    title: 'Welcome to Calent 👋',
    body: "Your schedule, simplified. Here's a quick tour.",
    Art: ArtWelcome,
  },
  {
    id: 'plan',
    title: 'Plan in a tap',
    body: 'Tap any time slot to add an event — switch between week, month, and agenda views.',
    Art: ArtPlan,
  },
  {
    id: 'stayOnTop',
    title: 'Stay on top',
    body: 'Organize events with labels and keep your deadlines in view.',
    Art: ArtStayOnTop,
  },
  {
    id: 'makeItYours',
    title: 'Make it yours',
    body: 'Switch themes, jot sticky notes, and jump anywhere with search.',
    Art: ArtMakeItYours,
  },
];

// A white pill that pops in as part of a staggered group. Gentle spring so the
// pop reads as soft, matching the web's staggerChildren feel.
function Chip({ index, children, bg = '#fff', color = INK }: {
  index: number;
  children: React.ReactNode;
  bg?: string;
  color?: string;
}) {
  return (
    <Animated.View
      entering={pop(index * 90)}
      style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color }]}>{children}</Text>
    </Animated.View>
  );
}

function ArtWelcome() {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    y.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(6, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [reduce, y]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View style={floatStyle}>
      <Image
        source={require('../../assets/images/calent-splash.png')}
        style={styles.welcomeIcon}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

function ArtPlan() {
  return (
    <View style={styles.artColumn}>
      <Chip index={0}>📚 CS 101</Chip>
      <Chip index={1} bg={SALMON}>＋ New event</Chip>
      <Chip index={2}>⏰ 2:00 PM</Chip>
    </View>
  );
}

function ArtStayOnTop() {
  const dots = ['#818cf8', '#fb7185', '#34d399'];
  return (
    <View style={[styles.artColumn, { gap: 12 }]}>
      <Animated.View entering={pop()} style={styles.dotRow}>
        {dots.map((c) => (
          <View key={c} style={[styles.bigDot, { backgroundColor: c }]} />
        ))}
      </Animated.View>
      <Animated.View entering={pop(90)} style={styles.deadlineRow}>
        <View style={[styles.smallDot, { backgroundColor: SALMON }]} />
        <Text style={styles.deadlineText}>Essay due</Text>
        <Text style={styles.deadlineDay}>Fri</Text>
      </Animated.View>
    </View>
  );
}

function ArtMakeItYours() {
  const swatches = ['#FF7264', '#a7f3d0', '#c4b5fd', '#fbcfe8'];
  return (
    <View style={[styles.artColumn, { gap: 12 }]}>
      <Animated.View entering={pop()} style={styles.swatchRow}>
        {swatches.map((c) => (
          <View key={c} style={[styles.swatch, { backgroundColor: c }]} />
        ))}
      </Animated.View>
      <Animated.View entering={pop(90)} style={styles.stickyNote}>
        <Text style={styles.stickyText}>✏️ note to self</Text>
      </Animated.View>
    </View>
  );
}

export function OnboardingTour({ open, onComplete }: { open: boolean; onComplete: () => void }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const last = SLIDES.length - 1;
  const slide = SLIDES[step];

  // Drive the slide crossfade by hand so it matches the web's deliberate
  // exit-then-enter timing instead of a snappy entering/exiting preset.
  const opacity = useSharedValue(1);
  const tx = useSharedValue(0);
  const slideStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }],
  }));

  const reset = () => {
    setStep(0);
    opacity.value = 1;
    tx.value = 0;
  };

  // Swap to `next` after the current content has slid/faded out.
  const commit = (next: number, sign: number) => {
    setStep(next);
    opacity.value = 0;
    tx.value = reduce ? 0 : SHIFT * sign;
    opacity.value = withTiming(1, { duration: IN_MS, easing: Easing.out(Easing.cubic) });
    tx.value = withTiming(0, { duration: IN_MS, easing: Easing.out(Easing.cubic) });
  };

  const change = (next: number) => {
    if (next === step) return;
    const sign = next > step ? 1 : -1; // forward → current exits to the left
    opacity.value = withTiming(0, { duration: OUT_MS, easing: Easing.in(Easing.cubic) });
    tx.value = withTiming(
      reduce ? 0 : -SHIFT * sign,
      { duration: OUT_MS, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(commit)(next, sign);
      },
    );
  };

  const handleNext = () => (step === last ? onComplete() : change(step + 1));

  return (
    <Modal visible={open} animationType="fade" onShow={reset} onRequestClose={onComplete}>
      <SafeAreaView style={styles.safe}>
        {/* Skip */}
        <Pressable onPress={onComplete} hitSlop={12} style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>

        {/* One centered group: dots → illustration → text → controls */}
        <View style={styles.center}>
          {/* Dots indicator (top) */}
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View
                key={s.id}
                style={[
                  styles.dot,
                  { width: i === step ? 18 : 6, backgroundColor: i === step ? SALMON : 'rgba(13,13,13,0.15)' },
                ]}
              />
            ))}
          </View>

          {/* Illustration panel — static gradient box, art crossfades inside */}
          <LinearGradient
            colors={['#FFF1EF', '#FFE3DE']}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.panel}>
            <Animated.View style={slideStyle}>
              <View key={slide.id}>
                <slide.Art />
              </View>
            </Animated.View>
          </LinearGradient>

          {/* Text — minHeight reserved so the panel never shifts between slides */}
          <Animated.View style={[styles.textBlock, slideStyle]}>
            <View key={slide.id}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.bodyText}>{slide.body}</Text>
            </View>
          </Animated.View>

          {/* Controls */}
          <View style={styles.controls}>
            {step > 0 && (
              <Pressable onPress={() => change(step - 1)} style={styles.backBtn} hitSlop={8}>
                <SymbolView name="arrow.left" size={17} tintColor="rgba(13,13,13,0.5)" />
              </Pressable>
            )}
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>{step === last ? 'Get started' : 'Next'}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.background, paddingHorizontal: 28 },
  skip: { position: 'absolute', top: 60, right: 24, zIndex: 10 },
  skipText: { fontSize: 13, color: 'rgba(13,13,13,0.4)', fontFamily: Fonts.regular },

  // Whole tour group, vertically centered so controls hug the content.
  center: { flex: 1, justifyContent: 'center', gap: 20 },

  panel: {
    height: 220,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textBlock: { minHeight: 76, paddingHorizontal: 4 },
  title: { fontSize: 21, fontFamily: Fonts.bold, color: INK, marginBottom: 7 },
  bodyText: { fontSize: 15, lineHeight: 22, fontFamily: Fonts.regular, color: 'rgba(13,13,13,0.55)' },

  // Art
  welcomeIcon: { width: 92, height: 92 },
  artColumn: { alignItems: 'center', gap: 10 },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: CHIP_BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  chipText: { fontSize: 13, fontFamily: Fonts.semibold },
  dotRow: { flexDirection: 'row', gap: 8 },
  bigDot: { height: 12, width: 12, borderRadius: 6 },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minWidth: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: CHIP_BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  smallDot: { height: 9, width: 9, borderRadius: 5 },
  deadlineText: { fontSize: 13, fontFamily: Fonts.medium, color: INK },
  deadlineDay: { marginLeft: 'auto', fontSize: 12, color: 'rgba(13,13,13,0.4)', fontFamily: Fonts.regular },
  swatchRow: { flexDirection: 'row', gap: 8 },
  swatch: { height: 30, width: 30, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(13,13,13,0.08)' },
  stickyNote: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    transform: [{ rotate: '-3deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  stickyText: { fontSize: 13, fontFamily: Fonts.medium, color: INK },

  // Dots indicator
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { height: 6, borderRadius: 3 },

  // Controls
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  backBtn: {
    height: 48,
    width: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceMuted,
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    backgroundColor: SALMON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  primaryText: { fontSize: 15, fontFamily: Fonts.semibold, color: INK },
});
