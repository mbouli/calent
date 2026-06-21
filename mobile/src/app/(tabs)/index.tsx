import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resolveEventColor } from '@/domain/courseUtils';
import {
  addMonths,
  formatMonthYear,
  formatTime,
  getMonthGrid,
  isSameDay,
  toZoned,
  weekdayLabels,
} from '@/domain/dateUtils';
import { CalendarEvent } from '@/domain/types';
import { useEvents } from '@/hooks/useEvents';
import { EVENT_PALETTE, Palette } from '@/theme/palette';
import { Fonts } from '@/theme/typography';

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const WEEK_START_MONDAY = true;
const WEEKDAYS = weekdayLabels('en-US', WEEK_START_MONDAY, 'short');
// Floating tab bar clearance so list content scrolls clear of the bar.
const TAB_CLEARANCE = 120;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { events, courses, loading, refresh } = useEvents();
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());

  const today = new Date();
  const grid = useMemo(() => getMonthGrid(month, WEEK_START_MONDAY), [month]);

  // Bucket events by their zoned calendar day for dot rendering + agenda.
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const zoned = toZoned(e.start, TZ);
      const key = dayKey(zoned);
      const arr = map.get(key);
      if (arr) arr.push(e);
      else map.set(key, [e]);
    }
    return map;
  }, [events]);

  const agenda = useMemo(() => {
    const list = byDay.get(dayKey(selected)) ?? [];
    return [...list].sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [byDay, selected]);

  const selectDay = (d: Date) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSelected(d);
  };

  const shiftMonth = (delta: number) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMonth((m) => addMonths(m, delta));
  };

  // Tapping the month label jumps back to today (the example has no Today pill).
  const goToday = () => {
    const now = new Date();
    setMonth(now);
    setSelected(now);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header: Calent wordmark · centered month nav · settings gear */}
      <View style={styles.header}>
        <Image
          source={require('../../../assets/images/calent-wordmark.png')}
          style={styles.brandWordmark}
          resizeMode="contain"
        />
        <View style={styles.monthNav} pointerEvents="box-none">
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} style={styles.chev}>
            <SymbolView name="chevron.left" size={16} tintColor={Palette.textMuted} />
          </Pressable>
          <Pressable onPress={goToday} hitSlop={8}>
            <Text style={styles.monthLabel}>{formatMonthYear(month)}</Text>
          </Pressable>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={10} style={styles.chev}>
            <SymbolView name="chevron.right" size={16} tintColor={Palette.textMuted} />
          </Pressable>
        </View>
        <Pressable onPress={() => router.navigate('/settings')} hitSlop={8} style={styles.gearBtn}>
          <SymbolView name="gearshape" size={22} tintColor={Palette.textMuted} />
        </Pressable>
      </View>

      {/* Month grid — a bordered table like the web month view */}
      <View style={styles.table}>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <View key={i} style={styles.weekCell}>
              <Text style={styles.weekday}>{w}</Text>
            </View>
          ))}
        </View>
        <View style={styles.grid}>
          {grid.map((cell, i) => {
            if (!cell) return <View key={i} style={[styles.cell, styles.cellEmpty]} />;
            const isToday = isSameDay(cell, today);
            const isSelected = isSameDay(cell, selected);
            const dayEvents = byDay.get(dayKey(cell)) ?? [];
            return (
              <Pressable
                key={i}
                style={[styles.cell, isSelected && !isToday && styles.cellSelected]}
                onPress={() => selectDay(cell)}>
                <View style={[styles.dayCircle, isToday && styles.dayToday]}>
                  <Text
                    style={[
                      styles.dayNum,
                      isToday && styles.dayNumToday,
                      isSelected && !isToday && styles.dayNumSelected,
                    ]}>
                    {cell.getDate()}
                  </Text>
                </View>
                <View style={styles.dotRow}>
                  {dayEvents.slice(0, 4).map((e) => (
                    <View
                      key={e.id}
                      style={[
                        styles.dot,
                        { backgroundColor: EVENT_PALETTE[resolveEventColor(e, courses)].solid },
                      ]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Agenda for the selected day */}
      <View style={styles.agendaHeader}>
        <Text style={styles.agendaDateLine}>
          <Text style={styles.agendaDow}>
            {selected.toLocaleDateString('en-US', { weekday: 'short' })}{'  '}
          </Text>
          <Text style={styles.agendaDay}>{selected.getDate()}</Text>
          <Text style={styles.agendaMonth}>{'  '}{formatMonthYear(selected)}</Text>
        </Text>
      </View>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.agendaContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Palette.accent} />}>
        {agenda.length === 0 ? (
          <Text style={styles.empty}>No events</Text>
        ) : (
          agenda.map((e, idx) => (
            <AgendaRow
              key={e.id}
              event={e}
              color={resolveEventColor(e, courses)}
              last={idx === agenda.length - 1}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AgendaRow({
  event,
  color,
  last,
}: {
  event: CalendarEvent;
  color: CalendarEvent['color'];
  last: boolean;
}) {
  const set = EVENT_PALETTE[color];
  const isDeadline = event.type === 'deadline';
  const time = event.allDay
    ? 'All day'
    : `${formatTime(toZoned(event.start, TZ))} – ${formatTime(toZoned(event.end, TZ))}`;

  return (
    <View style={[styles.agendaItem, !last && styles.agendaItemDivider]}>
      <View style={[styles.agendaDot, { backgroundColor: set.solid }]} />
      <View style={styles.agendaItemBody}>
        <Text style={styles.agendaItemTitle} numberOfLines={1}>
          {isDeadline ? `◆ ${event.title}` : event.title}
        </Text>
        <Text style={styles.agendaItemTime}>{time}</Text>
      </View>
    </View>
  );
}

const HAIRLINE = StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
  },
  brandWordmark: { width: 84, height: 30 },
  monthNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  chev: { padding: 2 },
  monthLabel: { fontSize: 17, fontFamily: Fonts.semibold, color: Palette.text },
  gearBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  table: {
    marginTop: 4,
    borderTopWidth: HAIRLINE,
    borderLeftWidth: HAIRLINE,
    borderColor: Palette.border,
  },
  weekRow: { flexDirection: 'row' },
  weekCell: {
    width: `${100 / 7}%`,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: HAIRLINE,
    borderBottomWidth: HAIRLINE,
    borderColor: Palette.border,
  },
  weekday: { fontSize: 12, fontFamily: Fonts.medium, color: Palette.textFaint },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    height: 62,
    paddingTop: 6,
    alignItems: 'center',
    gap: 4,
    borderRightWidth: HAIRLINE,
    borderBottomWidth: HAIRLINE,
    borderColor: Palette.border,
  },
  cellEmpty: { backgroundColor: '#fafafa' },
  cellSelected: { backgroundColor: '#e9e9e9' },

  dayCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dayToday: { backgroundColor: Palette.today },
  dayNum: { fontSize: 14, color: Palette.text, fontFamily: Fonts.medium },
  dayNumToday: { color: Palette.accentText, fontFamily: Fonts.bold },
  dayNumSelected: { fontFamily: Fonts.bold },
  dotRow: { flexDirection: 'row', gap: 3, height: 6 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  agendaHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  agendaDateLine: { fontSize: 15 },
  agendaDow: { color: Palette.textFaint, fontFamily: Fonts.regular },
  agendaDay: { color: Palette.text, fontFamily: Fonts.bold, fontSize: 16 },
  agendaMonth: { color: Palette.textFaint, fontFamily: Fonts.regular },

  agendaContent: { paddingBottom: TAB_CLEARANCE },
  empty: { textAlign: 'center', color: Palette.textFaint, fontSize: 14, marginTop: 32, fontFamily: Fonts.regular },

  agendaItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  agendaItemDivider: { borderBottomWidth: HAIRLINE, borderBottomColor: Palette.border },
  agendaDot: { width: 9, height: 9, borderRadius: 5 },
  agendaItemBody: { flex: 1, gap: 3 },
  agendaItemTitle: { fontSize: 15, fontFamily: Fonts.semibold, color: Palette.text },
  agendaItemTime: { fontSize: 13, fontFamily: Fonts.regular, color: Palette.textMuted },
});
