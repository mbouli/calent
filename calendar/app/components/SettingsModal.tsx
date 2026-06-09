'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, RefreshCw, Download, LogOut, Trash2, Plus, Pencil } from 'lucide-react'
import { createClient } from '../lib/supabase/client'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Settings } from '../hooks/useSettingsStore'
import { Course, EventColor, CalendarEvent } from '../types'
import { ColorPicker } from './ColorPicker'
import { suggestEventsForCourse } from '../lib/courseUtils'
import { useT } from '../lib/i18n/useT'
import {
  PRESET_THEMES,
  THEME_PREVIEW,
  isCustomTheme,
  parseCustomTheme,
  encodeCustomTheme,
  DEFAULT_CUSTOM,
  type PresetTheme,
} from '../lib/themes'

type Category = 'preferences' | 'customization' | 'account' | 'courses'

const CATEGORIES: { id: Category; labelKey: string }[] = [
  { id: 'preferences', labelKey: 'settings.preferences' },
  { id: 'customization', labelKey: 'settings.customization' },
  { id: 'courses', labelKey: 'settings.labels' },
  { id: 'account', labelKey: 'settings.account' },
]

const COURSE_DOT: Record<string, string> = {
  indigo: '#818cf8', violet: '#a78bfa', rose: '#fb7185',
  emerald: '#34d399', amber: '#fbbf24', sky: '#38bdf8',
}

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
]

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Vancouver', 'America/Mexico_City', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Amsterdam', 'Europe/Zurich', 'Europe/Stockholm', 'Europe/Warsaw',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Singapore',
  'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland', 'Pacific/Honolulu',
  'UTC',
]

interface SettingsModalProps {
  open: boolean
  settings: Settings
  onUpdateSettings: (updates: Partial<Settings>) => void
  onClose: () => void
  courses: Course[]
  events: CalendarEvent[]
  onCreateCourse: (data: Omit<Course, 'id'>) => void
  onUpdateCourse: (id: string, patch: Partial<Omit<Course, 'id'>>) => void
  onDeleteCourse: (id: string) => void
  initialTab?: Category
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30',
        checked ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span className={cn(
        'inline-block h-3.5 w-3.5 rounded-full bg-card shadow-sm transform transition-transform duration-200',
        checked ? 'translate-x-[18px]' : 'translate-x-0.5'
      )} />
    </button>
  )
}

function SettingRow({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 border-b border-border/20 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground/50 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3 mt-5 first:mt-0">
      {children}
    </p>
  )
}

function NativeSelect({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-xs font-medium bg-muted border border-border text-foreground rounded-md px-2.5 py-1.5 pr-7 outline-none hover:bg-accent cursor-pointer appearance-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function PreferencesSection({ settings, onUpdate }: {
  settings: Settings
  onUpdate: (updates: Partial<Settings>) => void
}) {
  const { t } = useT()
  return (
    <div>
      <SectionLabel>{t('settings.general')}</SectionLabel>
      <SettingRow label={t('settings.language')}>
        <NativeSelect
          value={settings.language}
          onChange={language => onUpdate({ language })}
          options={LANGUAGES}
        />
      </SettingRow>
      <SettingRow label={t('settings.timezone')}>
        <NativeSelect
          value={settings.timezone}
          onChange={timezone => onUpdate({ timezone })}
          options={TIMEZONES.map(tz => ({ value: tz, label: tz.replace(/_/g, ' ') }))}
        />
      </SettingRow>

      <SectionLabel>{t('settings.calendar')}</SectionLabel>
      <SettingRow
        label={t('settings.startMonday')}
        description={t('settings.startMondayDesc')}
      >
        <Toggle checked={settings.startWeekMonday} onChange={v => onUpdate({ startWeekMonday: v })} />
      </SettingRow>
      <SettingRow
        label={t('settings.hour24')}
        description={t('settings.hour24Desc')}
      >
        <Toggle checked={settings.hour24} onChange={v => onUpdate({ hour24: v })} />
      </SettingRow>
    </div>
  )
}

const THEME_LABEL_KEY: Record<PresetTheme, string> = {
  light: 'settings.light',
  dark: 'settings.dark',
  mint: 'settings.themeMint',
  lavender: 'settings.themeLavender',
  pink: 'settings.themePink',
  butter: 'settings.themeButter',
  'war-eagle': 'settings.themeWarEagle',
}

// A miniature UI preview (canvas + a faux event bar + accent dot).
function ThemeSwatch({ bg, accent, ink }: { bg: string; accent: string; ink: string }) {
  return (
    <div
      className="aspect-square sm:aspect-auto sm:h-11 rounded-lg border border-black/10 flex items-center gap-1 px-2"
      style={{ background: bg }}
    >
      <span className="h-1.5 flex-1 rounded-full" style={{ background: ink, opacity: 0.22 }} />
      <span className="h-4 w-4 rounded-full shrink-0" style={{ background: accent }} />
    </div>
  )
}

function ThemeCard({ active, label, onClick, children }: {
  active: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1.5 p-1.5 rounded-xl border-2 transition-all duration-150 text-left',
        active ? 'border-primary shadow-sm' : 'border-border hover:border-muted-foreground/40'
      )}
    >
      {children}
      <span className={cn('text-[11px] font-medium px-0.5', active ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
    </button>
  )
}

function CustomizationSection({ settings, onUpdate }: {
  settings: Settings
  onUpdate: (updates: Partial<Settings>) => void
}) {
  const { t } = useT()
  const custom = isCustomTheme(settings.theme)
  const initial = custom ? parseCustomTheme(settings.theme) : DEFAULT_CUSTOM
  const [accent, setAccent] = useState(initial.accent)
  const [base, setBase] = useState(initial.base)

  // Keep the editors in sync if the theme changes elsewhere.
  useEffect(() => {
    if (isCustomTheme(settings.theme)) {
      const p = parseCustomTheme(settings.theme)
      setAccent(p.accent)
      setBase(p.base)
    }
  }, [settings.theme])

  const applyCustom = (a: string, b: string) => {
    setAccent(a)
    setBase(b)
    onUpdate({ theme: encodeCustomTheme({ accent: a, base: b }) })
  }

  return (
    <div>
      <SectionLabel>{t('settings.appearance')}</SectionLabel>
      <p className="text-sm font-medium text-foreground mb-3">{t('settings.theme')}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {PRESET_THEMES.map(id => {
          const p = THEME_PREVIEW[id]
          return (
            <ThemeCard
              key={id}
              active={!custom && settings.theme === id}
              label={t(THEME_LABEL_KEY[id])}
              onClick={() => onUpdate({ theme: id })}
            >
              <ThemeSwatch bg={p.bg} accent={p.accent} ink={p.ink} />
            </ThemeCard>
          )
        })}

        {/* Custom */}
        <ThemeCard
          active={custom}
          label={t('settings.themeCustom')}
          onClick={() => applyCustom(accent, base)}
        >
          <ThemeSwatch bg={base} accent={accent} ink={custom ? THEME_PREVIEW.dark.ink : '#888'} />
        </ThemeCard>
      </div>

      {custom && (
        <div className="mt-4 space-y-3 p-3 rounded-lg bg-muted/60 border border-border/50">
          <ColorField
            label={t('settings.customAccent')}
            value={accent}
            onChange={v => applyCustom(v, base)}
          />
          <ColorField
            label={t('settings.customBase')}
            value={base}
            onChange={v => applyCustom(accent, v)}
          />
        </div>
      )}
    </div>
  )
}

function ColorField({ label, value, onChange }: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono uppercase text-muted-foreground tabular-nums">{value}</span>
        <label
          className="h-7 w-7 rounded-md border border-border cursor-pointer overflow-hidden shrink-0"
          style={{ background: value }}
        >
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="opacity-0 w-full h-full cursor-pointer"
          />
        </label>
      </div>
    </div>
  )
}

function CoursesSection({
  courses,
  events,
  onCreateCourse,
  onUpdateCourse,
  onDeleteCourse,
}: {
  courses: Course[]
  events: CalendarEvent[]
  onCreateCourse: (data: Omit<Course, 'id'>) => void
  onUpdateCourse: (id: string, patch: Partial<Omit<Course, 'id'>>) => void
  onDeleteCourse: (id: string) => void
}) {
  const { t } = useT()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<EventColor>('indigo')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<CalendarEvent[]>([])

  const handleNameBlur = () => {
    setSuggestions(suggestEventsForCourse(newName, events))
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    onCreateCourse({ name: newName.trim(), color: newColor })
    setAdding(false)
    setNewName('')
    setNewColor('indigo')
    setSuggestions([])
  }

  return (
    <div>
      <SectionLabel>{t('settings.yourLabels')}</SectionLabel>

      {courses.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground/50 mb-4">
          {t('settings.noLabels')}
        </p>
      )}

      <div className="space-y-1 mb-3">
        {courses.map(course => (
          <div key={course.id} className="flex items-center gap-2 py-2 border-b border-border/20 last:border-0">
            {editingId === course.id ? (
              <>
                <input
                  autoFocus
                  defaultValue={course.name}
                  onBlur={e => { onUpdateCourse(course.id, { name: e.target.value }); setEditingId(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  className="flex-1 text-sm bg-transparent outline-none border-b border-border"
                />
                <ColorPicker
                  value={course.color}
                  onChange={color => onUpdateCourse(course.id, { color })}
                />
              </>
            ) : (
              <>
                <span
                  style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COURSE_DOT[course.color] ?? '#818cf8', flexShrink: 0, display: 'inline-block' }}
                />
                <span className="flex-1 text-sm text-foreground">{course.name}</span>
                <button onClick={() => setEditingId(course.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil size={11} />
                </button>
                {deleteId === course.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground/60">{t('settings.deleteQuestion')}</span>
                    <button onClick={() => { onDeleteCourse(course.id); setDeleteId(null) }} className="text-xs text-rose-500 font-medium hover:text-rose-600">{t('common.yes')}</button>
                    <button onClick={() => setDeleteId(null)} className="text-xs text-muted-foreground/60 hover:text-foreground">{t('common.no')}</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteId(course.id)} className="text-muted-foreground hover:text-rose-400 transition-colors">
                    <Trash2 size={11} />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="space-y-3 p-3 bg-muted/80 rounded-lg border border-border/40">
          <input
            autoFocus
            placeholder={t('settings.labelNamePlaceholder')}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAdding(false) }}
            className="w-full text-sm bg-transparent outline-none border-b border-border pb-1"
          />
          <ColorPicker value={newColor} onChange={setNewColor} />

          {suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground/60 font-medium">
                {t('settings.matchingEvents')}
              </p>
              {suggestions.map(ev => (
                <p key={ev.id} className="text-xs text-muted-foreground truncate pl-1">
                  · {ev.title}
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-30"
            >
              {t('settings.addLabel')}
            </button>
            <button
              onClick={() => { setAdding(false); setNewName(''); setSuggestions([]) }}
              className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus size={12} />
          {t('settings.addLabel')}
        </button>
      )}
    </div>
  )
}

function AccountSection() {
  const { t } = useT()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    const supabase = createClient()
    // getSession() reads the locally-cached session (no network round-trip),
    // so name/email render instantly. getUser() would re-validate against the
    // auth server every time, which is slow and unnecessary for display.
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (user) {
        setEmail(user.email ?? '')
        setFullName((user.user_metadata?.full_name as string) ?? '')
      }
    })
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    const supabase = createClient()
    // delete_user() is a SECURITY DEFINER rpc that removes auth.users where
    // id = auth.uid(); all app tables cascade-delete from there.
    const { error } = await supabase.rpc('delete_user')
    if (error) {
      setDeleting(false)
      setConfirmDelete(false)
      alert(t('settings.deleteAccountError', { message: error.message }))
      return
    }
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div>
      <SectionLabel>{t('settings.profile')}</SectionLabel>
      <SettingRow label={t('settings.name')}>
        <span className="text-sm text-muted-foreground">{fullName || '—'}</span>
      </SettingRow>
      <SettingRow label={t('settings.email')}>
        <span className="text-xs text-muted-foreground font-mono">{email}</span>
      </SettingRow>
      <SettingRow label={t('settings.googleCalendar')} description={t('settings.googleCalendarDesc')}>
        <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted border border-border hover:bg-muted transition-colors text-foreground">
          <RefreshCw size={11} />
          {t('settings.connect')}
        </button>
      </SettingRow>

      <SectionLabel>{t('settings.data')}</SectionLabel>
      <SettingRow label={t('settings.exportData')} description={t('settings.exportDataDesc')}>
        <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted border border-border hover:bg-muted transition-colors text-foreground">
          <Download size={11} />
          {t('settings.export')}
        </button>
      </SettingRow>
      <SettingRow label={t('settings.privacyPolicy')}>
        <a
          href="https://calent.xyz/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          {t('settings.view')}
        </a>
      </SettingRow>

      <SectionLabel>{t('settings.session')}</SectionLabel>
      <SettingRow label={t('settings.signOut')}>
        <button onClick={handleSignOut} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-colors">
          <LogOut size={11} />
          {t('settings.signOut')}
        </button>
      </SettingRow>
      <SettingRow label={t('settings.deleteAccount')} description={t('settings.deleteAccountDesc')}>
        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors disabled:opacity-50',
            confirmDelete
              ? 'text-primary-foreground bg-rose-500 hover:bg-rose-600 border-rose-500'
              : 'text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-200'
          )}
        >
          <Trash2 size={11} />
          {deleting ? t('settings.deleting') : confirmDelete ? t('settings.confirmDelete') : t('common.delete')}
        </button>
      </SettingRow>
    </div>
  )
}

export function SettingsModal({ open, settings, onUpdateSettings, onClose, courses, events, onCreateCourse, onUpdateCourse, onDeleteCourse, initialTab }: SettingsModalProps) {
  const { t } = useT()
  const [category, setCategory] = useState<Category>(initialTab ?? 'preferences')

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className="p-0 sm:max-w-[600px] overflow-hidden">
        <div className="flex h-[85dvh] sm:h-[480px] overflow-hidden">
          {/* Sidebar */}
          <aside className="w-[168px] shrink-0 bg-muted/80 border-r border-border/40 flex flex-col">
            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{t('settings.title')}</h2>
              <button
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            </div>

            <nav className="px-2 flex flex-col gap-0.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    'flex items-center px-3 py-2 rounded-lg text-sm text-left transition-all duration-100',
                    category === cat.id
                      ? 'bg-card shadow-sm text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'
                  )}
                >
                  {t(cat.labelKey)}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 overflow-y-auto px-5 py-4">
            {category === 'preferences' && <PreferencesSection settings={settings} onUpdate={onUpdateSettings} />}
            {category === 'customization' && <CustomizationSection settings={settings} onUpdate={onUpdateSettings} />}
            {category === 'account' && <AccountSection />}
            {category === 'courses' && (
              <CoursesSection
                courses={courses}
                events={events}
                onCreateCourse={onCreateCourse}
                onUpdateCourse={onUpdateCourse}
                onDeleteCourse={onDeleteCourse}
              />
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}
