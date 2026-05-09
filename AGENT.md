# AGENT.md

## Project Overview

This is a Next.js 15 / React 19 guided meditation app. The app combines a glassy pastel meditation UI with Google GenAI Live API audio, microphone input, optional webcam/screen streaming, meditation timer tools, and simple progress/badge UI.

The main user flow is:

1. User connects to the Live API from the control tray.
2. The meditation guide asks Gemini Live for a session duration recommendation.
3. The user accepts or overrides the duration.
4. Gemini calls meditation tool functions in order.
5. The React timer runs locally and asks Gemini for feedback when complete.

## Tech Stack

- Next.js `15.4.6` with the App Router.
- React `19.1.0`.
- TypeScript with `strict: true`.
- Tailwind CSS v4 via `@import "tailwindcss"` in `src/app/globals.css`.
- Google GenAI Live API through `@google/genai`.
- MediaPipe dependencies are installed for pose/camera-related analysis.
- Framer Motion for transitions.
- `react-icons/fi` for the current icon set.
- `eventemitter3` for the Live API client event layer.

Use `npm` for dependency commands because the repository contains `package-lock.json`.

## Common Commands

```bash
npm install
npm run dev
npm run build
npm run start
```

`npm run lint` is defined as `next lint`, but this can be incompatible with newer Next.js versions where `next lint` has been removed. Verify before relying on it.

## Environment

The app reads the Google API key from:

```bash
GOOGLE_API_KEY
```

Current code reads this in `src/app/page.tsx` and passes it to a client component. If changing the API-key flow, be careful: browser-exposed env vars normally require a `NEXT_PUBLIC_` prefix, while secret keys should stay server-side. Do not casually expose production secrets to the browser.

## Important Files

- `src/app/page.tsx`: App shell, background, profile icon, and `LiveAPIProvider`.
- `src/components/meditation/MeditationGuide.tsx`: Main meditation experience, Live API configuration, tool-call handling, timer flow, conversation state, badge modal, progress UI, camera/audio layout.
- `src/components/control-tray/ControlTray.tsx`: Connect/disconnect, mic mute, webcam, and screen-share controls. Streams audio/video frames into the Live API when connected.
- `src/contexts/LiveAPIContext.tsx`: React context wrapper around `useLiveAPI`.
- `src/hooks/use-live-api.ts`: Owns `GenAILiveClient`, connection state, server audio playback, and Live API event subscriptions.
- `src/lib/genai-live-client.ts`: EventEmitter-based wrapper around `GoogleGenAI.live.connect`.
- `src/lib/toolDeclarations.ts`: Function declarations for meditation AI tools.
- `src/lib/audio-recorder.ts`, `src/lib/audio-streamer.ts`, `src/lib/worklets/*`: Browser audio capture/playback pipeline.
- `src/lib/breathing-analyzer.ts`, `src/lib/pose-analyzer.ts`, `src/lib/meditation-session.ts`: Domain helpers for future wellness/session analysis.

## Live API Tool Flow

Meditation tool declarations live in `src/lib/toolDeclarations.ts`.

The expected tool order is encoded in the system instruction in `MeditationGuide.tsx`:

1. `recommend_duration`
2. `set_meditation_duration`
3. `begin_meditation_timer`
4. `end_meditation_feedback`

When editing this flow:

- Keep the declarations and the system instruction synchronized.
- Keep the UI state machine in `sessionState.step` synchronized with tool names.
- Always send `client.sendToolResponse(...)` after processing tool calls.
- Keep timer start/end behavior local to React unless deliberately moving it to another layer.
- Avoid long spoken guidance during the meditation period; current prompting expects short, sparse guidance.

## Frontend Conventions

- This is an app experience, not a marketing landing page. Keep the first screen usable.
- Maintain the existing glassy pastel visual language unless asked to redesign it.
- The current UI uses Tailwind utility classes directly in components.
- Current icons come from `react-icons/fi`; prefer staying with that set for consistency.
- Client components that use browser APIs must keep `"use client"`.
- Media, microphone, `AudioContext`, canvas, and webcam/screen APIs must remain guarded by client-side execution.
- Be careful with responsive layout in `MeditationGuide.tsx`; the main screen is a two-column desktop layout that collapses to one column.

## TypeScript Notes

- The project uses path alias `@/*` -> `./src/*`.
- TypeScript strict mode is enabled.
- Existing code imports `LiveClientOptions` and `StreamingLog` from `../types`, but this repository currently does not include `src/types.ts` or `src/types/index.ts`. A build/typecheck may fail until those types are restored or recreated.
- Prefer adding explicit local types for Live API payloads instead of weakening strictness.

## Known Risks And Caveats

- `GOOGLE_API_KEY` is referenced in client-rendered code. Confirm the intended key exposure model before productionizing.
- There is no test suite currently.
- `npm run lint` may need modernization for Next.js 15.
- Several UI text strings and comments contain emoji. Preserve or remove deliberately; do not mix styles accidentally.
- Audio/video behavior depends on browser permissions and HTTPS/localhost media constraints.
- The Live API model is currently set to `models/gemini-2.0-flash-exp` in `MeditationGuide.tsx` and `use-live-api.ts`; verify model availability before changing related code.

## Change Guidelines For Future Agents

- Read the relevant component/hook before editing; much of the behavior is coupled through Live API events.
- Keep changes narrow. Do not refactor the Live API client, audio pipeline, and UI state machine in the same change unless the task requires it.
- Do not remove `sendToolResponse` handling when touching tool-call logic.
- Do not start microphone or webcam capture before user action unless the product requirement explicitly asks for it.
- When changing media streaming, test at least:
  - Connect/disconnect.
  - Mic mute/unmute.
  - Webcam start/stop.
  - Screen-share start/stop.
  - Timer completion and feedback request.
- When changing UI layout, verify at desktop and mobile widths.
- Avoid adding new dependencies unless they solve a concrete problem and fit the existing stack.

## Verification Checklist

Before handing off meaningful code changes, run the strongest available checks:

```bash
npm run build
```

If working on runtime media or Live API behavior, also run:

```bash
npm run dev
```

Then manually verify the browser flow at `http://localhost:3000`, including connection, permissions, tool-call sequence, timer behavior, and final feedback.
