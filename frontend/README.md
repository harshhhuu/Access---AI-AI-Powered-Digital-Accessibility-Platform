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

### Backend
- FastAPI
- PostgreSQL
- SQLAlchemy

### AI
- MediaPipe
- HuggingFace
- TensorFlow

## Installation

### Backend

### Frontend
1. Copy `.env.example` to `.env`
2. Set:
   - `VITE_API_BASE_URL=http://localhost:8000`
   - `VITE_WS_URL=ws://localhost:8000`
3. Install dependencies with `npm install`
4. Run the frontend with `npm run dev`
