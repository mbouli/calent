import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette, Radius } from '@/theme/palette';
import { Fonts } from '@/theme/typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Structural subset of expo-router's BottomTabBarProps — just the fields this
// bar consumes. Avoids importing from fragile internal SDK build paths.
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

// SF Symbol per route name. The values map to /(tabs) screen file names.
const ICONS: Record<string, SymbolViewProps['name']> = {
  index: 'calendar',
  stickies: 'square.stack.3d.up.fill',
  settings: 'gearshape.fill',
};

const LABELS: Record<string, string> = {
  index: 'Calendar',
  stickies: 'Stickies',
  settings: 'Settings',
};

function TabButton({
  focused,
  label,
  icon,
  onPress,
}: {
  focused: boolean;
  label: string;
  icon: SymbolViewProps['name'];
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tint = focused ? Palette.text : Palette.textFaint;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.88, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 280 });
      }}
      style={[styles.button, animatedStyle]}>
      <SymbolView name={icon} size={24} tintColor={tint} type="monochrome" />
      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

// Center salmon "+" — the new-event action, sitting between the nav tabs.
function AddButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="New event"
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 280 });
      }}
      style={[styles.addButton, animatedStyle]}>
      <SymbolView name="plus" size={26} tintColor="#ffffff" type="monochrome" />
    </AnimatedPressable>
  );
}

export function GlassTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const liquid = isLiquidGlassAvailable();

  // Settings now lives in the calendar header gear, so it's hidden from the bar;
  // the remaining tabs split evenly around the centered + (new-event) button.
  const activeKey = state.routes[state.index]?.key;
  const navRoutes = state.routes.filter((r) => r.name !== 'settings');
  const mid = Math.ceil(navRoutes.length / 2);

  const renderTab = (route: { key: string; name: string }) => {
    const focused = route.key === activeKey;
    const onPress = () => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };
    return (
      <TabButton
        key={route.key}
        focused={focused}
        label={LABELS[route.name] ?? route.name}
        icon={ICONS[route.name] ?? 'circle'}
        onPress={onPress}
      />
    );
  };

  const onAdd = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: wire to the event editor once the create flow exists.
    Alert.alert('New event', 'Event creation is coming soon.');
  };

  const content = (
    <View style={styles.row}>
      {navRoutes.slice(0, mid).map(renderTab)}
      <AddButton onPress={onAdd} />
      {navRoutes.slice(mid).map(renderTab)}
    </View>
  );

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {liquid ? (
        <GlassView glassEffectStyle="regular" isInteractive style={styles.bar}>
          {content}
        </GlassView>
      ) : (
        <BlurView intensity={40} tint="light" style={[styles.bar, styles.barFallback]}>
          {content}
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    overflow: 'hidden',
    paddingHorizontal: 8,
    height: 64,
    minWidth: 300,
    // Soft floating shadow.
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  barFallback: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.border,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  button: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginHorizontal: 8,
    backgroundColor: Palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.accent,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
