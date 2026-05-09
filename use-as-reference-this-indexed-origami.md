# MindfulLive → A2UI + AG-UI + CopilotKit refactor (voice-first hybrid)

## Context

The current MindfulLive app at [./](./) is a Next.js 15 / React 19 client-side wellness app that talks directly to Google's Gemini Live API for voice-driven meditation guidance. Its architecture is tightly coupled: `MeditationGuide.tsx` (~500 LOC) does tool-call dispatch, state, and rendering all in one component. Tool results mutate local state directly; the AI cannot emit dynamic UI.

The user wants the project to align with the architecture of `/Users/juanegido/src/tries/2026-05-09-anuidev8-energy` — a CopilotKit v2 reference using `@copilotkit/react-core/v2`, `@copilotkit/runtime/v2`, `@copilotkit/a2ui-renderer`, declarative A2UI surface contracts, reducer-driven shared state, frontend HITL tools, and a runtime route.

Direction confirmed with the user:
- **Voice-first.** Keep Gemini Live API (`gemini-3.1-flash-live-preview`, voice "Aoede") as the sole conversational brain. No CopilotKit text-chat UI.
- **CopilotKit "puppet" runtime.** Mount `<CopilotKit>` + `/api/copilotkit` with a minimal `BuiltInAgent` that does not drive conversation. Use `copilotkit.runTool({ followUp: false })` from a Live-API bridge to fire CopilotKit-registered `useFrontendTool`/`useHumanInTheLoop` tools. A2UI surfaces are emitted by these tools; `createA2UIMessageRenderer` handles rendering.
- **3 wellness activities:** meditation, breathing, focus. Activate the unused `BreathingAnalyzer` (FFT) and `PoseAnalyzer` (MediaPipe).
- **localStorage persistence** for session history (real streak / completion stats, not hardcoded).
- **3-phase flow:**
  1. **Plan** — Live API proposes a session via tool call → A2UI approval card surfaces (HITL) → voice "yes" or click → response goes back to Live API.
  2. **Execute** — activity-specific gen UI widget runs (breathing visualizer / focus timer / meditation guide). Live API can update widget state in real time via tool calls.
  3. **Analysis** — multiple dynamic A2UI widgets (mood/insight summary, streak/progress, next-session recommendation) driven by tool calls + persisted history.

The end-state is a Plan→Execute→Analysis loop where the Live API agent's voice is the conversation channel and A2UI surfaces (rendered through CopilotKit's renderer) are the visual channel, kept in sync via a shared reducer.

## Architecture

### Two-agent hybrid: Live API (brain) ↔ CopilotKit (renderer)

```
User speaks ──► Live API (Gemini Live)
                  │
                  ├──► audio out (existing AudioStreamer pipeline)
                  │
                  └──► tool call (e.g. propose_wellness_plan)
                              │
                              ▼
                  WellnessLiveBridge — Listens to client.on("toolcall")
                              │
                              ├──► dispatch reducer action (state)
                              │
                              ├──► copilotkit.runTool({ name, args, followUp: false })
                              │       │
                              │       ▼
                              │   CopilotKit useFrontendTool / useHumanInTheLoop
                              │       │
                              │       ▼
                              │   A2UI surface renders (createA2UIMessageRenderer
                              │   + ad-hoc local primitives where renderer is inert)
                              │
                              └──► sendToolResponse back to Live API
                                  ({ status: "ok" } or { status: "awaiting_user_input" })

User clicks Accept on approval card
  │
  ▼
respond({approved: true}) — CopilotKit callback
  │
  ▼
WellnessLiveBridge — sends client.send({ text: "User approved plan {id}" })
  │
  ▼
Live API calls confirm_wellness_plan({approved:true, proposalId})
  │
  ▼
Reducer applies plan; phase transitions to "executing"
```

### Why "puppet" CopilotKit
- The CopilotKit `BuiltInAgent` registered at `/api/copilotkit` exists to satisfy the runtime. It's never user-prompted. Its prompt is empty / minimal; its only role is to make `useFrontendTool`/`useHumanInTheLoop` and `createA2UIMessageRenderer` operable from `runTool` invocations.
- This honors the user's intent of literally using `@copilotkit/*` packages while keeping voice-first conversation in Live API.
- Risk: `copilotkit.runTool` semantics in v2 may not perfectly support HITL roundtrips when no agent loop is active. If we hit a wall, fall back to rendering A2UI surfaces directly with plain React shaped after the energy contract — the patterns survive without the package.

## Folder structure (new files in **bold**)

```
src/
├── app/
│   ├── api/
│   │   └── copilotkit/[[...slug]]/route.ts          ★ NEW (Hono + minimal CopilotRuntime)
│   ├── layout.tsx                                   ✎ wrap with CopilotShell + WellnessProvider
│   ├── page.tsx                                     ✎ swap MeditationGuide → WellnessShell (gated by ?wellness=v2 during migration)
│   └── globals.css
├── components/
│   ├── copilot-shell.tsx                            ★ NEW <CopilotKit> provider
│   ├── wellness-shell.tsx                           ★ NEW 3-phase top-level shell
│   ├── wellness-live-bridge.tsx                     ★ NEW Live API tool-call dispatcher → reducer + runTool
│   ├── wellness-copilot-bridge.tsx                  ★ NEW CopilotKit useFrontendTool/useHumanInTheLoop registrations
│   ├── phases/
│   │   ├── plan-phase.tsx                           ★ NEW
│   │   ├── execute-phase.tsx                        ★ NEW
│   │   └── analysis-phase.tsx                       ★ NEW
│   ├── activities/
│   │   ├── breathing-activity.tsx                   ★ NEW (uses existing BreathingVisualizer + BreathingAnalyzer)
│   │   ├── focus-activity.tsx                       ★ NEW (uses Timer + lazy PoseAnalyzer)
│   │   └── meditation-activity.tsx                  ★ NEW (wraps existing meditation visuals)
│   ├── widgets/
│   │   ├── plan-approval-card.tsx                   ★ NEW HITL card (registered via useHumanInTheLoop)
│   │   ├── analysis-summary-widget.tsx              ★ NEW
│   │   ├── analysis-progress-widget.tsx             ★ NEW (reads SessionRecord history)
│   │   └── analysis-recommendation-widget.tsx       ★ NEW
│   ├── meditation/                                  KEEP existing files
│   │   ├── MeditationGuide.tsx                      KEEP for one cycle as fallback (?wellness=v1)
│   │   ├── BreathingVisualizer.tsx                  REUSE in breathing-activity
│   │   ├── ProgressTracker.tsx                      REUSE in analysis-progress-widget
│   │   └── BadgeRewardModal.tsx                     REUSE in analysis-summary-widget
│   ├── control-tray/ControlTray.tsx                 KEEP unchanged
│   ├── audio-pulse/AudioPulse.tsx                   KEEP unchanged
│   └── Timer.tsx                                    KEEP — reused in execute-phase + focus
├── context/
│   └── wellness-context.tsx                         ★ NEW reducer + provider, SSR-safe localStorage hydration
├── contexts/
│   └── LiveAPIContext.tsx                           KEEP unchanged
├── hooks/
│   ├── use-live-api.ts                              KEEP (memoize setConfig — see risks)
│   ├── use-webcam.ts                                KEEP
│   ├── use-screen-capture.ts                        KEEP
│   └── use-media-stream-mux.ts                      KEEP
├── lib/
│   ├── a2ui/
│   │   └── wellness-ui-contract.ts                  ★ NEW surface schemas (informs system prompt)
│   ├── tool-declarations/
│   │   ├── plan-tools.ts                            ★ NEW propose / revise / cancel / confirm
│   │   ├── execute-tools.ts                         ★ NEW start / update / complete / cancel
│   │   ├── analysis-tools.ts                        ★ NEW emit_summary / streak / next_recommendation
│   │   └── index.ts                                 ★ NEW aggregate FunctionDeclaration[]
│   ├── system-instruction.ts                        ★ NEW composes role + 3-phase rules + tool list + contract JSON
│   ├── wellness-storage.ts                          ★ NEW localStorage with SSR-safe two-phase hydration
│   ├── activities/
│   │   ├── breathing-runtime.ts                     ★ NEW local interval driver (inhale/hold/exhale)
│   │   └── focus-runtime.ts                         ★ NEW timer + lazy pose-analyzer integration
│   ├── genai-live-client.ts                         KEEP unchanged
│   ├── breathing-analyzer.ts                        ACTIVATE (already exists, currently unused)
│   ├── pose-analyzer.ts                             ACTIVATE LAZILY (~10MB MediaPipe model)
│   ├── meditation-session.ts                        REUSE (5 session-type definitions)
│   ├── audio-recorder.ts                            KEEP — share MediaStream with breathing analyzer
│   ├── audio-streamer.ts                            KEEP
│   ├── utils.ts                                     KEEP
│   ├── audioworklet-registry.ts                     KEEP
│   └── worklets/                                    KEEP
├── types.ts                                         ✎ extend with WellnessState, SurfaceMessage, SessionRecord
└── public/
```

Files to delete after migration cycle: `src/lib/toolDeclarations.ts` (replaced by `tool-declarations/`), `src/components/meditation/MeditationGuide.tsx` (replaced by `WellnessShell`).

## Key files to modify or create

- [src/app/layout.tsx](./src/app/layout.tsx) — wrap children with `<CopilotShell><WellnessProvider><LiveAPIProvider>…`
- [src/app/page.tsx](./src/app/page.tsx) — read `?wellness=v2` query param; render `WellnessShell` or fall back to legacy `MeditationGuide`
- [src/lib/genai-live-client.ts](./src/lib/genai-live-client.ts) — already emits `toolcall` events; no changes needed
- [src/hooks/use-live-api.ts](./src/hooks/use-live-api.ts) — memoize `setConfig` so the system instruction isn't re-uploaded on every re-mount
- [src/components/meditation/MeditationGuide.tsx](./src/components/meditation/MeditationGuide.tsx) — leave intact for one release cycle as `?wellness=v1` fallback

## Reusable functions / utilities (do not rewrite)

- `GenAILiveClient` — existing EventEmitter wrapper at [src/lib/genai-live-client.ts](./src/lib/genai-live-client.ts). Use its `connect`, `sendRealtimeInput`, `sendToolResponse`, `send`, plus `on("toolcall" | "audio" | "interrupted")`.
- `useLiveAPI` and `LiveAPIContext` — already provide the wired-up client. Compose alongside `WellnessProvider`.
- `BreathingVisualizer` — existing canvas animation; mount inside `breathing-activity.tsx`.
- `BadgeRewardModal` — existing fullscreen modal; reuse in `analysis-summary-widget.tsx`.
- `Timer` (CircularCountdown) — existing SVG ring; reuse in `execute-phase.tsx`.
- `BreathingAnalyzer` and `PoseAnalyzer` — existing classes in `src/lib/`; activate behind activity components.
- `MeditationSession` — existing 5-type session definitions in `src/lib/meditation-session.ts`; reuse for activity duration / phase scaffolding.
- `AudioRecorder` / `AudioStreamer` / worklets — keep as-is; share the mic `MediaStream` between Live API and the breathing analyzer via a `MediaStreamAudioSourceNode` fan-out.
- `viewerTheme` from `@copilotkit/a2ui-renderer` — import for CSS tokens / theming consistency.
- `defineTool`, `BuiltInAgent`, `CopilotRuntime`, `createCopilotEndpoint`, `InMemoryAgentRunner` from `@copilotkit/runtime/v2` — used to set up the puppet runtime; pattern from [/Users/juanegido/src/tries/2026-05-09-anuidev8-energy/src/app/api/copilotkit/[[...slug]]/route.ts](/Users/juanegido/src/tries/2026-05-09-anuidev8-energy/src/app/api/copilotkit/%5B%5B...slug%5D%5D/route.ts).
- `useFrontendTool`, `useHumanInTheLoop`, `useCopilotKit` from `@copilotkit/react-core/v2` — pattern from [energy-copilot-bridge.tsx](/Users/juanegido/src/tries/2026-05-09-anuidev8-energy/src/components/energy-copilot-bridge.tsx).

## A2UI surface contract (lib/a2ui/wellness-ui-contract.ts)

Mirrors the structure of [energy-ui-contract.ts](/Users/juanegido/src/tries/2026-05-09-anuidev8-energy/src/lib/a2ui/energy-ui-contract.ts).

```ts
WELLNESS_UI_CONTRACT = {
  "wellness-plan":                    { requiredDataKeys: ["activityType","durationSeconds","intensity","focusAreas","reasoning"], allowedActions: ["approve_plan","reject_plan","revise_plan"] },
  "wellness-activity-breathing":      { requiredDataKeys: ["currentPhase","timerSeconds","guidance","pattern"],                    allowedActions: ["pause_activity","request_help"] },
  "wellness-activity-focus":          { requiredDataKeys: ["timerSeconds","currentTask","encouragement"],                          allowedActions: ["pause_activity","extend_session"] },
  "wellness-activity-meditation":     { requiredDataKeys: ["timerSeconds","phase","guidance"],                                     allowedActions: ["pause_activity"] },
  "wellness-analysis-summary":        { requiredDataKeys: ["activityType","completionQuality","mood","insights"],                  allowedActions: ["save_to_journal","share_session"] },
  "wellness-analysis-progress":       { requiredDataKeys: ["streakDays","totalSessions","completionRate","totalMinutes"],          allowedActions: ["set_goal"] },
  "wellness-analysis-recommendation": { requiredDataKeys: ["recommendedActivity","reasoning","estimatedMinutes"],                  allowedActions: ["accept_recommendation","request_alternative"] },
};
```

This contract JSON is embedded into the Live API system instruction so the model emits valid surface payloads.

## Tool declarations

Replaces the 4 in `src/lib/toolDeclarations.ts`. Each tool exists in two forms:
1. As `FunctionDeclaration` in Live API config (the model's vocabulary).
2. As CopilotKit `useFrontendTool` / `useHumanInTheLoop` registration in `wellness-copilot-bridge.tsx` (so `runTool` can fire it).

**Plan phase** (`tool-declarations/plan-tools.ts`)
- `propose_wellness_plan({ activityType, durationSeconds, intensity, focusAreas, reasoning })` — HITL approval
- `revise_wellness_plan({ proposalId, ...patch })`
- `cancel_plan_proposal({ proposalId })`
- `confirm_wellness_plan({ proposalId, approved })` — funnel for both voice-yes and click-yes

**Execute phase** (`tool-declarations/execute-tools.ts`)
- `start_wellness_activity({ activityType, durationSeconds })`
- `update_activity_widget({ currentPhase, timerSeconds?, guidance?, encouragement? })` — qualitative updates only; ticking is local
- `complete_wellness_activity({ completionQuality, notes })`
- `cancel_wellness_activity({ reason })` — voice "stop" path; required from day 1

**Analysis phase** (`tool-declarations/analysis-tools.ts`)
- `emit_analysis_summary({ activityType, mood, insights, suggestions })`
- `emit_streak_update({ streakDays, totalSessions, completionRate })`
- `emit_next_recommendation({ recommendedActivity, reasoning, estimatedMinutes })`

All tool args validated with `zod` in the bridge before dispatch.

## State (context/wellness-context.tsx)

```ts
type WellnessState = {
  phase: "idle" | "planning" | "executing" | "analyzing";
  activeActivity: "meditation" | "breathing" | "focus" | null;
  pendingProposal: PlanProposal | null;
  pendingConfirmId: string | null;          // race guard: voice yes + click yes
  approvedPlan: ApprovedPlan | null;
  activityRuntime: { timerSeconds: number; phase: string; guidance: string; encouragement?: string } | null;
  analysisWidgets: Record<string, { surfaceId: string; data: any }>;   // keyed by surface id (avoid duplicate emit dupes)
  sessionHistory: SessionRecord[];           // hydrated from localStorage post-mount
  currentSession: SessionRecord | null;
  audioStream: MediaStream | null;           // shared between Live API + BreathingAnalyzer
  lastError: { code: string; message: string; at: number } | null;
  activityLog: { type: string; payload: any; at: number }[];   // tool-call telemetry (mirrors energy)
};
```

Hydration: SSR initializes with empty history; `useEffect` reads `localStorage`, dispatches `HYDRATE_HISTORY`.

## HITL approval flow (the trickiest part)

When Live API calls `propose_wellness_plan(args)`:

1. `WellnessLiveBridge` validates args with zod → dispatches `SET_PENDING_PROPOSAL`.
2. **Immediately** sends `client.sendToolResponse({ output: { status: "awaiting_user_input", proposalId } })` so the Live API state machine doesn't stall.
3. Calls `copilotkit.runTool({ name: "render_plan_approval", args, followUp: false })` — fires the `useHumanInTheLoop`-registered `PlanApprovalCard`.
4. System instruction tells the model: "After `propose_wellness_plan`, wait silently. Do not assume approval."

When user approves:
- **Voice path:** model hears "yes" → calls `confirm_wellness_plan({ approved: true, proposalId })` → bridge dispatches `APPLY_PROPOSAL` → `client.send({ text: "Plan approved. Starting now." })` to nudge the model into execute phase.
- **Click path:** card's onClick → dispatch `APPLY_PROPOSAL` directly → `client.send({ text: "User clicked Accept on proposal {proposalId}." })` → model calls `confirm_wellness_plan` and continues. `pendingConfirmId` blocks double-confirm.

## Live API system instruction (lib/system-instruction.ts)

Composed from constant blocks:
1. Role + voice/tone (~80 tokens)
2. 3-phase flow rules: ordering, "stay silent after `propose_wellness_plan`", "always emit at least `emit_analysis_summary` after completion" (~250 tokens)
3. Tool list with one-line when-to-use guidance (~400 tokens)
4. `JSON.stringify(WELLNESS_UI_CONTRACT, null, 2)` embedded — contract grammar (~600 tokens)
5. HITL discipline (~120 tokens)
6. Activity-specific guidance: "during silent meditation phases keep audio under 8 words; for breathing emit `update_activity_widget` only on phase change, never per second" (~120 tokens)

Total ~1500 tokens, comparable to energy reference.

## Implementation sequence (incremental, gated by `?wellness=v2`)

**Day 1 — foundation, zero behavior change**
- Add `wellness-context.tsx` reducer + provider; mount in `app/layout.tsx` above `LiveAPIProvider`
- Add `wellness-ui-contract.ts`, `wellness-storage.ts` (SSR-safe), `system-instruction.ts` skeleton
- Install `@copilotkit/react-core@^1.56.5`, `@copilotkit/runtime@^1.56.5`, `@copilotkit/a2ui-renderer@^1.56.5`, `hono@^4.12.16`, `zod@^4`

**Day 2 — CopilotKit puppet runtime**
- Create `src/app/api/copilotkit/[[...slug]]/route.ts` — Hono + `CopilotRuntime` with empty agent
- Create `copilot-shell.tsx` — `<CopilotKit runtimeUrl="/api/copilotkit" useSingleEndpoint={false} renderActivityMessages={[a2uiRenderer]} a2ui={{theme: viewerTheme}}>`
- Wrap `app/layout.tsx` with `<CopilotShell>`
- Verify `<CopilotKit>` mounts cleanly with no console errors

**Day 3 — widgets & activities (props only, no Live API yet)**
- Build `breathing-activity.tsx`, `focus-activity.tsx`, `meditation-activity.tsx` accepting props
- Build `plan-approval-card.tsx`, the three `analysis-*-widget.tsx` widgets
- Add temporary `/wellness-v2` route rendering each surface with hardcoded data — visual QA without an LLM

**Day 4 — tool declarations + bridges**
- Create `tool-declarations/{plan,execute,analysis}-tools.ts` + `index.ts`
- Build `system-instruction.ts` composer — produces full prompt with embedded contract
- Build `wellness-copilot-bridge.tsx` — registers all tools via `useFrontendTool` / `useHumanInTheLoop`, with renders pointing at the widgets from Day 3
- Build `wellness-live-bridge.tsx` — subscribes `client.on("toolcall")`, validates with zod, dispatches reducer actions, calls `copilotkit.runTool({ followUp: false })` to fire the registered tools, sends `sendToolResponse`
- Build `wellness-shell.tsx`; gate via `?wellness=v2` in `app/page.tsx`

**Day 5 — plan-phase HITL flow**
- Wire `propose_wellness_plan` → `awaiting_user_input` ack → `runTool("render_plan_approval")` → card visible
- Voice path: `confirm_wellness_plan` from voice → reducer applies → `client.send` synthetic text turn
- Click path: card onClick → reducer applies → synthetic text turn back to model
- Test rejection / revision paths

**Day 6 — execute phase**
- Wire `start_wellness_activity` → mount the right activity component
- Wire `update_activity_widget` for qualitative coaching updates
- Activate `BreathingAnalyzer` for breathing activity using a fan-out from the Live API mic stream (single `getUserMedia` call)
- Activate `PoseAnalyzer` lazily for focus activity (`dynamic(() => import(...))`)
- Wire `complete_wellness_activity` + `cancel_wellness_activity`
- Local interval driver in `breathing-runtime.ts` ticks the visualizer; model only intervenes on phase change

**Day 7 — analysis phase + persistence**
- Wire `emit_analysis_*` tools to widgets
- On `complete_wellness_activity`: persist `SessionRecord` via `wellness-storage.ts`
- Streak/progress widget reads real history from `state.sessionHistory`

**Day 8 — polish & swap**
- Telemetry: `activityLog` mirroring energy's pattern; debug overlay if `?debug=1`
- Swap `app/page.tsx` default to `WellnessShell`; keep legacy under `?wellness=v1` for one cycle
- Delete `src/lib/toolDeclarations.ts` after the cycle

Each day ends with a manual end-to-end voice test: connect → plan proposal → approve → activity runs → analysis surfaces appear → reload preserves history.

## Risks and mitigations

- **`copilotkit.runTool` HITL semantics in v2 may not perfectly support the no-agent puppet pattern.** If we hit a wall on Day 5 where `respond` callbacks don't fire correctly, fall back to rendering A2UI surfaces with plain React components shaped after the contract — patterns survive without the renderer. Re-evaluate Day 5 morning before pushing forward.
- **Live API tool call stalls audio if response is delayed.** Mitigated by immediate `awaiting_user_input` ack on HITL tools; sub-200ms RTT for ack tools.
- **Mic contention between AudioRecorder (Live API) and BreathingAnalyzer.** Resolve by sharing a single `MediaStream` via `MediaStreamAudioSourceNode` fan-out in `wellness-context` (`audioStream` field).
- **MediaPipe pose model is ~10MB.** Lazy-import the focus activity via `next/dynamic`.
- **`framer-motion` v12 + React 19 strict-mode can flicker AnimatePresence on tool-driven mounts.** Use stable surface-keyed keys; mirror energy's `recentlyChangedBlockIds` pattern.
- **localStorage SSR.** Two-phase hydration: empty initial state → `HYDRATE_HISTORY` on mount.
- **Tool-arg validation gap today.** Adopt `zod` schemas in the bridge; surface validation errors via `lastError` and a debug toast.
- **Live API system instruction re-upload.** Memoize / move config to module scope so re-mounts don't re-send the prompt.
- **`gemini-3.1-flash-live-preview` is preview.** Pin model; expose feature flag for `gemini-2.5-flash-live` fallback.
- **Voice "stop" mid-activity.** Add `cancel_wellness_activity` from day 1 — adding it later strands in-session users.

## Verification

End-to-end test (manual, browser-driven, repeated after each day):

1. `npm install` (after Day 1 dep additions) → `npm run dev`
2. Open `http://localhost:3000/?wellness=v2`
3. Confirm `<CopilotKit>` mounts without console errors and no failing `/api/copilotkit` calls.
4. Click connect → microphone permission → speak: *"I want to do a 10-minute breathing session, I'm a bit anxious."*
5. **Plan**: Verify Live API speaks reasoning AND the `wellness-plan` A2UI approval card renders with the proposed activity / duration / intensity.
6. Try the voice path: say *"yes"* → activity should start, card disappears.
7. Reload, repeat, but click the **Accept** button instead → same result via the click path. Confirm `pendingConfirmId` blocks a double-fire.
8. **Execute**: breathing visualizer animates locally on a 4-7-8 pattern (or whichever the model suggested). Live API speaks short cues; widget updates show encouragement updates from `update_activity_widget`.
9. Mid-activity, say *"stop"* → `cancel_wellness_activity` fires, timers stop, phase returns to idle.
10. Run a full session through to completion. **Analysis**: 3 widgets render — summary, progress (with real streak after at least 2 sessions), recommendation.
11. Reload the page → progress widget retains streak from `localStorage`.
12. Repeat for the focus activity (pose analyzer loads lazily, focus card renders, posture cues fire) and the meditation activity.
13. Toggle `?wellness=v1` → legacy `MeditationGuide` still works as fallback.

Automated checks:
- `npm run build` passes (Next.js 15 production build catches SSR issues with `localStorage`)
- TypeScript compiles with no errors
- No tool-arg validation errors in `state.lastError` during a clean run
- `state.activityLog` contains the expected sequence (`propose_wellness_plan` → `confirm_wellness_plan` → `start_wellness_activity` → `update_activity_widget` × N → `complete_wellness_activity` → `emit_analysis_summary` → `emit_streak_update` → `emit_next_recommendation`)
