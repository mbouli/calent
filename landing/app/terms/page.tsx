import type { Metadata } from 'next'
import { LegalLayout, type LegalSection } from '../components/LegalLayout'

export const metadata: Metadata = {
  title: 'Calent - Terms of Service',
  description: 'The terms for using Calent.',
}

const INTRO =
  'Welcome to Calent (“Calent,” “we,” “our,” or “us”). By accessing or using calent.xyz and related services (the “Service”), you agree to these Terms of Service. If you do not agree to these Terms, please do not use the Service.'

const SECTIONS: LegalSection[] = [
  {
    title: 'Use of the Service',
    blocks: [
      {
        type: 'p',
        text: 'Calent provides a calendar and scheduling platform designed to help users organize events, schedules, and related information.',
      },
      {
        type: 'p',
        text: 'You agree to use the Service only for lawful purposes and in compliance with all applicable laws and regulations.',
      },
      { type: 'p', text: 'You may not:' },
      {
        type: 'list',
        items: [
          'Use the Service to distribute malicious software or harmful content',
          'Attempt unauthorized access to accounts, systems, or data',
          'Interfere with or disrupt the operation of the Service',
          'Abuse, scrape, or overload the platform infrastructure',
        ],
      },
    ],
  },
  {
    title: 'Accounts',
    blocks: [
      { type: 'p', text: 'To use certain features, you may be required to create an account using:' },
      { type: 'list', items: ['Email and password', 'Google OAuth authentication'] },
      { type: 'p', text: 'You are responsible for maintaining the security of your account and credentials.' },
      { type: 'p', text: 'You are responsible for all activity that occurs under your account.' },
    ],
  },
  {
    title: 'User Content',
    blocks: [
      {
        type: 'p',
        text: 'You retain ownership of the content you create within Calent, including calendar events, notes, and related data.',
      },
      {
        type: 'p',
        text: 'By using the Service, you grant Calent a limited license to store, process, and display your content solely for the purpose of operating and improving the Service.',
      },
      { type: 'p', text: 'We do not claim ownership of your content.' },
    ],
  },
  {
    title: 'Subscription & Payments',
    blocks: [
      {
        type: 'p',
        text: 'Certain features may require a paid subscription (“Calent Plus” or similar premium plans).',
      },
      {
        type: 'p',
        text: 'Subscription pricing, billing terms, and included features may change over time. Any pricing changes will be communicated in advance where required by law.',
      },
      { type: 'p', text: 'Subscriptions may automatically renew unless canceled before the renewal date.' },
      { type: 'p', text: 'Refunds may be provided at our discretion unless otherwise required by law.' },
    ],
  },
  {
    title: 'Availability',
    blocks: [
      {
        type: 'p',
        text: 'We strive to provide a reliable experience, but we do not guarantee uninterrupted or error-free availability of the Service.',
      },
      { type: 'p', text: 'Features may change, be modified, or discontinued at any time.' },
    ],
  },
  {
    title: 'Third-Party Services',
    blocks: [
      { type: 'p', text: 'Calent may integrate with third-party services such as:' },
      {
        type: 'list',
        items: ['Google OAuth', 'Calendar providers', 'Infrastructure providers like Supabase'],
      },
      { type: 'p', text: 'Use of third-party services may also be subject to their own terms and privacy policies.' },
      { type: 'p', text: 'We are not responsible for third-party services or content.' },
    ],
  },
  {
    title: 'Termination',
    blocks: [
      { type: 'p', text: 'We reserve the right to suspend or terminate access to the Service if:' },
      {
        type: 'list',
        items: ['These Terms are violated', 'Use of the Service creates risk or harm', 'Required by law'],
      },
      { type: 'p', text: 'You may stop using the Service at any time.' },
    ],
  },
  {
    title: 'Disclaimer',
    blocks: [
      {
        type: 'p',
        text: 'The Service is provided “as is” and “as available” without warranties of any kind, express or implied.',
      },
      { type: 'p', text: 'We do not guarantee:' },
      {
        type: 'list',
        items: [
          'Continuous availability',
          'Accuracy of scheduling data',
          'Error-free operation',
          'Compatibility with all devices or services',
        ],
      },
    ],
  },
  {
    title: 'Limitation of Liability',
    blocks: [
      {
        type: 'p',
        text: 'To the maximum extent permitted by law, Calent and its affiliates shall not be liable for:',
      },
      {
        type: 'list',
        items: [
          'Indirect or consequential damages',
          'Loss of data',
          'Lost profits or business interruption',
          'Scheduling conflicts or missed events resulting from use of the Service',
        ],
      },
      { type: 'p', text: 'Your use of the Service is at your own risk.' },
    ],
  },
  {
    title: 'Changes to These Terms',
    blocks: [
      {
        type: 'p',
        text: 'We may update these Terms from time to time. Continued use of the Service after changes become effective constitutes acceptance of the updated Terms.',
      },
    ],
  },
  {
    title: 'Contact',
    blocks: [
      {
        type: 'contact',
        text: 'If you have questions about these Terms, contact:',
        email: 'support@calent.xyz',
      },
    ],
  },
]

export default function Page() {
  return <LegalLayout title="Terms" lastUpdated="May 29, 2026" intro={INTRO} sections={SECTIONS} />
}
