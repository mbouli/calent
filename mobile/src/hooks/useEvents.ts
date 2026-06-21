import { useCallback, useEffect, useState } from 'react';

import { CourseRow, EventRow, rowToCourse, rowToEvent } from '@/domain/db-types';
import { CalendarEvent, Course } from '@/domain/types';
import { supabase } from '@/lib/supabase';

interface EventsState {
  events: CalendarEvent[];
  courses: Course[];
  loading: boolean;
  error: string | null;
}

const EVENT_COLUMNS =
  'id, title, start, end, color, notes, all_day, recurrence, recurrence_group_id, recurrence_rule, course_id, type';

/**
 * Loads the signed-in user's events + courses from Supabase. RLS scopes rows to
 * the current user, so no explicit user filter is needed. `refresh` backs
 * pull-to-refresh.
 */
export function useEvents() {
  const [state, setState] = useState<EventsState>({
    events: [],
    courses: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    const [{ data: eventRows, error: eventErr }, { data: courseRows }] = await Promise.all([
      supabase.from('events').select(EVENT_COLUMNS),
      supabase.from('courses').select('id, name, color'),
    ]);

    if (eventErr) {
      setState((s) => ({ ...s, loading: false, error: eventErr.message }));
      return;
    }

    setState({
      events: ((eventRows ?? []) as EventRow[]).map(rowToEvent),
      courses: ((courseRows ?? []) as CourseRow[]).map(rowToCourse),
      loading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    await load();
  }, [load]);

  return { ...state, refresh };
}
