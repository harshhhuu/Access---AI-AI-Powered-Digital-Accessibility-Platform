# AccessAI

AI-Powered Accessibility Platform

Built for NMIMS Tech Hackathon 2026.

## Problem
1.3 billion people with disabilities face barriers when using the internet.

## Solution
AccessAI removes accessibility barriers using AI.

## Features

### Sign Language Detection
Converts sign language gestures into text and speech using MediaPipe and TensorFlow.

### Voice Navigator
Navigate websites using voice commands.

### Cognitive Simplifier
Simplifies complex text into easy-to-read language.

### Image Describer
Generates descriptions of images for visually impaired users.

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- TensorFlow.js

### API (see repo root / `server/`)
- Node.js (Fastify + Prisma)
- PostgreSQL

### AI
- MediaPipe
- HuggingFace
- TensorFlow

## Installation

### Frontend
1. Copy `frontend/.env.example` to `frontend/.env` (or use a local `.env.local` for overrides). Set:
   - `VITE_API_BASE_URL=http://localhost:8001`
   - `VITE_WS_URL=ws://localhost:8001`
2. Install dependencies with `pnpm install` (or `npm install`)
3. Run the frontend with `pnpm dev` (or `npm run dev`)
