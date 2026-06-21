You are an expert React Native, Expo, and TypeScript engineer.

Your task is NOT to modify my existing web application.

Make sure to use skills/design-taste-frontend as your guidebook.

## Project structure

The repository currently contains:

/calendar

This is a Next.js + React + TypeScript calendar web app with a polished UI and complete functionality.

I want you to create an entirely separate mobile application inside:

/mobile

Do NOT remove, rename, or edit existing files inside /calendar unless absolutely necessary for sharing backend logic or types.

The /calendar project should continue functioning exactly as before.

## Goal

Build a native mobile version of the app using:

- Expo
- React Native
- TypeScript
- Expo Router

The /calendar directory should serve as a reference implementation for:
- functionality
- business logic
- UI design
- layouts
- interactions
- color palette
- spacing
- typography

However, do NOT directly port HTML or CSS.

Instead, recreate the experience using proper React Native components and mobile UX patterns.

## Mobile design philosophy

The app should feel like a real iOS application rather than a website inside a phone.

If a desktop interaction doesn't make sense on mobile, redesign it while preserving the intent.

Optimize for thumb reachability and one-handed use.

## Navigation

Do NOT recreate the website navigation.

Instead, implement a native bottom tab navigation using Expo Router.

The tab bar should:

- float slightly above the bottom safe area
- use a translucent glass effect
- blur the content behind it
- have rounded corners
- feel inspired by modern iOS aesthetics
- animate smoothly
- use SF Symbol-style icons where appropriate

The navigation should look premium and polished.

## UI

Preserve the Caly visual identity:
- colors
- typography hierarchy
- spacing
- branding
- personality

But adapt layouts for phones instead of copying desktop layouts, USE THE MOBILE WEB VIEW AS INSPO.

## Calendar

The calendar is the centerpiece.

It should:
- feel touch-first
- scroll smoothly
- animate naturally
- use appropriate gestures
- have generous touch targets

Desktop drag interactions may be replaced with mobile-friendly alternatives if needed.

## iOS features

Take advantage of native capabilities where appropriate:

- haptic feedback
- native sheets
- safe area handling
- keyboard avoidance
- pull-to-refresh
- smooth transitions
- Reanimated animations

## Authentication

Reuse the existing Supabase backend.

Support:
- login
- signup
- logout
- session persistence

## Performance

Build for production quality.

Avoid unnecessary rerenders.

Use FlatList where appropriate.

Organize code into reusable components.

## Existing code

Before implementing any feature, inspect the corresponding implementation inside /calendar.

Mirror the behavior and business logic whenever practical.

The web app is the source of truth for functionality.

## Deliverable

Create a complete Expo application inside /mobile.

The result should look and feel like a thoughtfully designed native iOS productivity app while maintaining feature parity with the existing web application.

Most importantly:

- Do not break /calendar.
- Do not replace /calendar.
- Build a new mobile client in /mobile that uses it as a reference.