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

## Planned: Smart Recommendations, Progress Visualization, Engagement (Epic #23)

### 6.1 Smart Material Recommendations (P0, #24)
"Recommended for You" section in MaterialSelector. Factors in reading level, accuracy trends, error patterns, theme diversity. Level-up nudges when accuracy >85%.

### 6.2 Level Progress Bar + Celebrations (P0, #25)
Visual progress bar toward next level in Dashboard. Level-up celebration modal. Tappable badge details showing earned date and progress.

### 6.3 Streak Protection via Quick Review (P1, #26)
"Quick Review" button on Dashboard — review 5 due vocab words to maintain streak on busy days. Distinguishes "read today" vs "reviewed today".

### 6.4 Actionable Error Patterns (P1, #27)
Tap an error pattern category on Dashboard → launches targeted drill with words from that category.

### 6.5 Re-read Comparison (P2, #28)
Track reading history per material. Show previous score on material cards. Completion screen shows improvement delta. Dashboard shows trend arrows for re-reads.
