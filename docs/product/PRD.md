# isA_Reading — Product Requirements Document

## Overview

**Product**: isA_Reading — K12 English reading practice app
**Stack**: Next.js 16, Tailwind CSS 4, Supabase, OpenRouter, OpenAI
**Target Users**: K12 students (primary), teachers/parents (secondary)

## Core Value Proposition

Students read aloud, receive AI-powered pronunciation and comprehension feedback, and track their growth through gamification — all in a mobile-friendly web app.

---

## Shipped Features

### Reading Flow (MVP)
Paragraph-by-paragraph reading with TTS listen, audio recording, progressive assessment pipeline (transcribe + pronounce + assess in parallel), and session persistence with pause/resume/restart controls.

### Assessment Pipeline (MVP + Enhanced)
Three-stage parallel pipeline. Error categorization by type (sight_word, phoneme, fluency, comprehension). Progressive UI showing stage-by-stage progress.

### Gamification (MVP + Enhanced)
Points, 9 badge types (including Drill Master), daily streaks, reading levels. Drill completion awards 5 pts + streak bonus.

### Content System (MVP + Enhanced)
Static JSON materials with Supabase backend. Paragraph minimum length enforced (3 sentences / 50 words). 8 themes, 5 difficulty levels.

### Pronunciation Drills (Shipped)
DrillMode component for practicing mispronounced words. Max 2 attempts per word, pass/fail at 70%.

### Spaced Repetition (Shipped)
Leitner 5-box system (1/3/7/14/30 day intervals). Mispronounced words auto-queued. Dashboard shows queue stats.

### Error Patterns Dashboard (Shipped)
Teacher/parent view showing top 5 weakness areas with example words. Requires 5+ readings.

---

### Word Bank + Interactive Feedback (Shipped, Epic #14)
Word Bank page with vocabulary list, Leitner box visualization, search/filter, tap-to-hear TTS. Tap-to-hear on mispronounced words in feedback. Review due words via drill. Context-enriched vocab entries.

---

### Smart Recommendations, Progress, Engagement (Shipped, Epic #23)
Smart material recommendations, level progress bar + celebrations, streak protection via quick review, actionable error patterns, re-read improvement tracking.

---

## Planned: Personalized Onboarding + Calibration Read (Epic #31)

### 7.1 Profile Setup Screen (P0, #32)
Welcome screen with display name, avatar picker (8-10 options), grade selection (K-8). First onboarding step after signup.

### 7.2 Grade-to-Level Mapping + Reading Goal (P0, #33)
Map grade to estimated reading level (K/1→L1, 2/3→L2, 4/5→L3, 6/7→L4, 8+→L5). Add "I want to..." goal picker to ThemePicker.

### 7.3 Calibration Read (P0, #34)
Auto-select passage at estimated level after theme selection. Run first paragraph through assessment. Adjust level: up if >85%, down if <50%. Silent placement — feels like first activity, not a test.

### 7.4 Celebration Screen (P0, #35)
Level reveal with confetti animation, calibration score, first_reading badge earned. "Start Reading!" CTA.

### 7.5 Onboarding Flow Wiring (P0, #36)
New step machine: profile → themes → calibrate → celebrate → select. Returning users skip. BottomNav hidden during onboarding.

---

