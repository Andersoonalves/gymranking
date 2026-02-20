
# 🏋️ FitRank - Workout Tracker & Friends Ranking

A PWA mobile-first app where friends track workouts and compete through rankings.

## Phase 1: Foundation & Auth

### Backend Setup (Lovable Cloud / Supabase)
- Database with tables: profiles, groups, group_members, workouts
- Authentication with email/password (persistent sessions)
- Row-level security so users only see data from their groups

### Auth Pages
- **Login page** — email + password, "remember me"
- **Sign up page** — name, email, password
- Dark theme by default with light mode toggle

## Phase 2: Groups & Invite System
- After login, user can **create a group** (gets an invite code) or **join a group** with a code
- Group dashboard becomes the home screen
- Each user belongs to one or more groups

## Phase 3: Workout Registration
- **Quick "Register Workout" button** always visible on dashboard
- Select workout type from predefined list (Peito, Costas, Ombro, Bíceps, Tríceps, Pernas, Glúteos, Abdômen, Cardio, Funcional, Cross Training, HIIT, Mobilidade/Alongamento, Full Body, Treino Livre)
- Date & time picker (allows past dates)
- Multiple workouts per day supported
- Simple, fast — 2-3 taps to log a workout

## Phase 4: Dashboard & Activity Feed
- **Home dashboard** showing:
  - Current weekly ranking (top 3 highlighted with medals 🥇🥈🥉)
  - Recent group activity feed (who trained what, when)
  - Quick register workout button
- Clean card-based layout, mobile-first

## Phase 5: Rankings
- **Weekly ranking** — resets every Monday
- **Monthly ranking** — resets on the 1st
- **Annual ranking** — full year view
- **By workout type** — filter rankings by specific exercise type
- Visual progress bars showing workout count per person
- Medals/icons for top 3 positions
- Tabs to switch between ranking periods

## Phase 6: User Settings
- Change password
- Edit profile name
- Notification preferences toggle (prepared for future push notifications)
- Dark/light theme toggle
- Manage groups (view invite code, leave group)

## Phase 7: PWA Setup
- Installable from browser (manifest + service worker via vite-plugin-pwa)
- Offline support — cached views for previously loaded data
- Auto-update prompt when new version is available
- Mobile-optimized install prompt page

## Design Direction
- **Dark theme** as default with vibrant accent color (green/lime for energy)
- Light theme toggle available
- Bold typography, card-based UI
- Bottom navigation bar (mobile): Home, Rankings, Register, Settings
- Responsive — works well on desktop with wider layout

## Tech Stack
- React + TypeScript + Tailwind CSS
- Lovable Cloud (Supabase) for auth, database, and edge functions
- vite-plugin-pwa for PWA support
- Recharts for ranking visualizations
