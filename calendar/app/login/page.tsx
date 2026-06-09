'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '../lib/supabase/client'
import { signInWithGoogle } from '../lib/supabase/oauth'
import { useBrowserT } from '../lib/i18n/useT'

const GoogleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

type Mode = 'signin' | 'signup'

function AuthInput({
  label,
  rightLabel,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string
  rightLabel?: React.ReactNode
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const isPw = type === 'password'

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label
          className="text-[11px] font-medium"
          style={{ color: 'rgba(13,13,13,0.45)' }}
        >
          {label}
        </label>
        {rightLabel}
      </div>
      <div className="relative">
        <input
          type={isPw && showPw ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full rounded-[10px] px-3 py-2.5 text-[13px] outline-none transition-all placeholder:opacity-30"
          style={{
            background: focused ? '#fff' : 'rgba(13,13,13,0.04)',
            border: `1px solid ${focused ? 'rgba(13,13,13,0.20)' : 'rgba(13,13,13,0.08)'}`,
            color: '#0D0D0D',
            caretColor: '#FF7264',
            paddingRight: isPw ? '2.5rem' : undefined,
          }}
        />
        {isPw && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-50"
            style={{ color: 'rgba(13,13,13,0.35)' }}
          >
            {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
    </div>
  )
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' as const } },
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const isSignup = mode === 'signup'

  const { t } = useBrowserT()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Surface a failed OAuth callback (redirected back with ?error=oauth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'oauth') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(t('login.somethingWrong'))
    }
  }, [t])

  const handleGoogle = async () => {
    setError(null)
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    // On success the browser redirects to Google; only handle the error case.
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)
    const supabase = createClient()
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
      router.push('/')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('login.somethingWrong'))
      setSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: '#fff', fontFamily: 'var(--font-geist)' }}
    >
      {/* Wordmark */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="mb-7"
      >
        <Link href="/">
          <Image
            src="/calent_wordmark_black.png"
            alt="Calent"
            width={132}
            height={48}
            className="w-[45px] h-auto"
            style={{ opacity: 0.6 }}
          />
        </Link>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1], delay: 0.04 }}
        className="w-full max-w-[352px] rounded-[18px] p-7"
        style={{
          background: '#fff',
          border: '1px solid rgba(13,13,13,0.09)',
          boxShadow: '0 2px 8px rgba(13,13,13,0.05), 0 20px 60px rgba(13,13,13,0.08)',
        }}
      >
        {/* Mode toggle — sliding pill via layoutId */}
        <div
          className="flex rounded-[10px] p-0.5 mb-7"
          style={{ background: 'rgba(13,13,13,0.05)' }}
        >
          {(['signin', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="relative flex-1 py-[7px] text-[12.5px] font-medium rounded-[8px] transition-colors duration-150"
              style={{ color: mode === m ? '#0D0D0D' : 'rgba(13,13,13,0.38)' }}
            >
              {mode === m && (
                <motion.div
                  layoutId="auth-tab-pill"
                  className="absolute inset-0 rounded-[8px] bg-white"
                  style={{ boxShadow: '0 1px 4px rgba(13,13,13,0.09)' }}
                  transition={{ type: 'spring', stiffness: 450, damping: 42 }}
                />
              )}
              <span className="relative z-10">
                {m === 'signin' ? t('login.signIn') : t('login.createAccount')}
              </span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            variants={container}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
          >
            {/* Google */}
            <motion.button
              variants={item}
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 rounded-[10px] py-2.5 text-[12.5px] font-medium transition-colors hover:bg-gray-50 disabled:opacity-50"
              style={{
                border: '1px solid rgba(13,13,13,0.11)',
                color: '#0D0D0D',
              }}
            >
              <GoogleIcon />
              {googleLoading ? t('login.pleaseWait') : t('login.continueWithGoogle')}
            </motion.button>

            {/* Divider */}
            <motion.div variants={item} className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ background: 'rgba(13,13,13,0.07)' }} />
              <span className="text-[11px]" style={{ color: 'rgba(13,13,13,0.32)' }}>{t('login.or')}</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(13,13,13,0.07)' }} />
            </motion.div>

            {/* Fields */}
            <motion.div variants={item} className="flex flex-col gap-3.5">
              {isSignup && (
                <AuthInput
                  label={t('login.fullName')}
                  value={name}
                  onChange={setName}
                  placeholder={t('login.yourName')}
                  autoFocus
                />
              )}
              <AuthInput
                label={t('login.email')}
                type="email"
                value={email}
                onChange={setEmail}
                placeholder={t('login.emailPlaceholder')}
                autoFocus={!isSignup}
              />
              <AuthInput
                label={t('login.password')}
                type="password"
                value={password}
                onChange={setPassword}
                placeholder={isSignup ? t('login.createPassword') : t('login.enterPassword')}
                rightLabel={
                  !isSignup ? (
                    <button
                      type="button"
                      className="text-[11px] transition-opacity hover:opacity-50"
                      style={{ color: 'rgba(13,13,13,0.38)' }}
                    >
                      {t('login.forgotPassword')}
                    </button>
                  ) : undefined
                }
              />
            </motion.div>

            {/* Submit */}
            <motion.button
              variants={item}
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-5 rounded-[10px] py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-85 active:opacity-70 disabled:opacity-50"
              style={{ background: '#FF7264', color: '#0D0D0D' }}
            >
              {submitting ? t('login.pleaseWait') : isSignup ? t('login.createAccount') : t('login.signIn')}
            </motion.button>
            {error && (
              <p className="mt-3 text-center text-[11.5px]" style={{ color: '#FF7264' }}>
                {error}
              </p>
            )}

            {/* Terms */}
            {isSignup && (
              <motion.p
                variants={item}
                className="mt-4 text-center text-[10.5px] leading-relaxed"
                style={{ color: 'rgba(13,13,13,0.33)' }}
              >
                {t('login.agreePrefix')}{' '}
                <a href="https://calent.xyz/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 cursor-pointer hover:opacity-60 transition-opacity">
                  {t('login.terms')}
                </a>{' '}
                {t('login.and')}{' '}
                <a href="https://calent.xyz/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 cursor-pointer hover:opacity-60 transition-opacity">
                  {t('login.privacyPolicy')}
                </a>
                .
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Switch mode prompt */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.22 }}
        className="mt-5 text-[11.5px]"
        style={{ color: 'rgba(13,13,13,0.38)' }}
      >
        {isSignup ? (
          <>
            {t('login.alreadyHaveAccount')}{' '}
            <button
              onClick={() => setMode('signin')}
              className="underline underline-offset-2 transition-opacity hover:opacity-60"
              style={{ color: '#0D0D0D' }}
            >
              {t('login.signIn')}
            </button>
          </>
        ) : (
          <>
            {t('login.noAccount')}{' '}
            <button
              onClick={() => setMode('signup')}
              className="underline underline-offset-2 transition-opacity hover:opacity-60"
              style={{ color: '#0D0D0D' }}
            >
              {t('login.createOne')}
            </button>
          </>
        )}
      </motion.p>
    </div>
  )
}
