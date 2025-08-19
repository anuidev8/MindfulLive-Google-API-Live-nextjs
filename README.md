# Guided Meditation App

A modern, AI-powered meditation app built with Next.js, featuring a beautiful glassy pastel UI, real-time session guidance, and progress tracking.

## Features

- **AI-Powered Meditation Guide**: Uses Google Gemini AI to recommend session durations, guide users, and provide supportive feedback.
- **Session Recommendation**: The AI suggests a meditation duration based on your recent activity and state.
- **Custom Timer**: Start a meditation session with a timer, guided by the AI.
- **Real-Time Feedback**: Receive supportive feedback and suggestions for your next session when the timer ends.
- **Progress Tracking**: View your current streak, last session time, and a visual progress bar.
- **Glassy Pastel UI**: All screens use a modern, glassy, pastel gradient design inspired by leading meditation apps.
- **Webcam, Screen, and Audio Controls**: Easily toggle your webcam, screen share, and microphone with beautiful circular controls (using Feather icons).
- **Profile Icon**: User/profile icon in the control tray for a personal touch.


## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. **Open your browser:**
   Visit [http://localhost:3000](http://localhost:3000) to use the app.

## Project Structure

- `src/app/page.tsx` — Main entry, sets up the glassy layout and loads the meditation guide.
- `src/components/meditation/MeditationGuide.tsx` — Main guided meditation experience, including timer, feedback, progress, and conversation.
- `src/components/control-tray/ControlTray.tsx` — Glassy, circular controls for mic, video, and screen, with Feather icons and connect/play button.
- `src/lib/toolDeclarations.ts` — All AI tool definitions (recommendation, set duration, begin timer, feedback) for the Gemini integration.

## Tool Declarations (AI Integration)

All AI tool definitions are managed in `src/lib/toolDeclarations.ts`:
- `recommend_duration`: Suggests a session duration and reason.
- `set_meditation_duration`: User confirms the final duration.
- `begin_meditation_timer`: Starts the meditation timer.
- `end_meditation_feedback`: Provides feedback and next session suggestion.

## Customization
- **UI**: Easily adjust colors and gradients in Tailwind classes for your brand.
- **AI Logic**: Extend or modify tool declarations in `src/lib/toolDeclarations.ts`.
- **Progress**: Integrate with a backend or local storage for persistent progress tracking.


