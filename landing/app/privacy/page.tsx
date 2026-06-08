import type { Metadata } from 'next'
import { LegalLayout, type LegalSection } from '../components/LegalLayout'

export const metadata: Metadata = {
  title: 'Calent - Privacy Policy',
  description: 'How Calent handles your data.',
}

const INTRO =
  'Welcome to Calent (“we,” “our,” or “us”). This Privacy Policy explains how we collect, use, and protect your information when you use our website and services at calent.xyz.'

const SECTIONS: LegalSection[] = [
  {
    title: 'Information We Collect',
    blocks: [
      { type: 'sub', text: 'Account Information' },
      { type: 'p', text: 'When you create an account, we may collect:' },
      {
        type: 'list',
        items: [
          'Email address',
          'Name or profile information provided through Google OAuth',
          'Authentication information necessary to securely log you in',
        ],
      },
      { type: 'sub', text: 'Calendar & Event Data' },
      { type: 'p', text: 'When you use Calent, we store information you create, including:' },
      {
        type: 'list',
        items: [
          'Calendar events',
          'Event titles, notes, dates, and times',
          'Calendar preferences and customization settings',
        ],
      },
      { type: 'sub', text: 'Usage Information' },
      { type: 'p', text: 'We may collect limited technical and usage information such as:' },
      {
        type: 'list',
        items: ['Device/browser type', 'App interactions', 'Error logs and performance data'],
      },
    ],
  },
  {
    title: 'Authentication',
    blocks: [
      { type: 'p', text: 'Users may sign in using:' },
      { type: 'list', items: ['Email and password', 'Google OAuth authentication'] },
      {
        type: 'p',
        text: 'Google account authentication is handled securely through Google’s OAuth services. We do not receive or store your Google password.',
      },
    ],
  },
  {
    title: 'Backend & Data Storage',
    blocks: [
      {
        type: 'p',
        text: 'Calent uses Supabase as its backend infrastructure provider, including authentication and database services. Data is securely stored using industry-standard security practices.',
      },
    ],
  },
  {
    title: 'How We Use Your Information',
    blocks: [
      { type: 'p', text: 'We use your information to:' },
      {
        type: 'list',
        items: [
          'Provide and maintain the service',
          'Sync and display your calendar data',
          'Improve app performance and user experience',
          'Authenticate users and secure accounts',
          'Respond to support requests',
        ],
      },
      { type: 'p', text: 'We do not sell your personal information.' },
    ],
  },
  {
    title: 'Data Sharing',
    blocks: [
      { type: 'p', text: 'We do not share or sell your personal information to third parties except:' },
      {
        type: 'list',
        items: [
          'When necessary to operate the service (such as Supabase infrastructure services)',
          'When required by law',
          'To protect the security and integrity of the platform',
        ],
      },
    ],
  },
  {
    title: 'Data Retention',
    blocks: [
      {
        type: 'p',
        text: 'We retain your data for as long as your account remains active or as needed to provide the service.',
      },
      { type: 'p', text: 'You may request deletion of your account and associated data at any time.' },
    ],
  },
  {
    title: 'Security',
    blocks: [
      {
        type: 'p',
        text: 'We take reasonable measures to protect your information from unauthorized access, loss, misuse, or disclosure. However, no online service can guarantee absolute security.',
      },
    ],
  },
  {
    title: "Children's Privacy",
    blocks: [
      {
        type: 'p',
        text: 'Calent is not intended for children under 13 years old. We do not knowingly collect personal information from children.',
      },
    ],
  },
  {
    title: 'Changes to This Policy',
    blocks: [
      {
        type: 'p',
        text: 'We may update this Privacy Policy from time to time. Continued use of Calent after changes become effective constitutes acceptance of the updated policy.',
      },
    ],
  },
  {
    title: 'Contact',
    blocks: [
      {
        type: 'contact',
        text: 'If you have questions about this Privacy Policy, you can contact us at:',
        email: 'support@calent.xyz',
      },
    ],
  },
]

export default function Page() {
  return <LegalLayout title="Privacy" lastUpdated="May 29, 2026" intro={INTRO} sections={SECTIONS} />
}
