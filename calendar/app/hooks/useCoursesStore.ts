'use client'

import { useState, useEffect, useCallback } from 'react'
import { Course } from '../types'
import { createClient } from '../lib/supabase/client'
import { rowToCourse } from '../lib/db-types'

export function useCoursesStore() {
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('courses')
      .select('id, name, color')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setCourses(data.map(rowToCourse))
      })
  }, [])

  const createCourse = useCallback(
    (data: Omit<Course, 'id'>): Course => {
      const id = crypto.randomUUID()
      const course: Course = { ...data, id }
      setCourses(prev => [...prev, course])
      const supabase = createClient()
      supabase
        .from('courses')
        .insert({ id, name: data.name, color: data.color })
        .then(({ error }) => { if (error) console.error('createCourse failed', error) })
      return course
    },
    []
  )

  const updateCourse = useCallback(
    (id: string, patch: Partial<Omit<Course, 'id'>>) => {
      setCourses(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
      const supabase = createClient()
      supabase.from('courses').update(patch).eq('id', id)
        .then(({ error }) => { if (error) console.error('updateCourse failed', error) })
    },
    []
  )

  const deleteCourse = useCallback(
    (id: string) => {
      setCourses(prev => prev.filter(c => c.id !== id))
      const supabase = createClient()
      supabase.from('courses').delete().eq('id', id)
        .then(({ error }) => { if (error) console.error('deleteCourse failed', error) })
    },
    []
  )

  return { courses, createCourse, updateCourse, deleteCourse }
}
