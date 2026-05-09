"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AudioPulse from "@/components/audio-pulse/AudioPulse";
import ControlTray from "@/components/control-tray/ControlTray";
import { AnalysisPhase } from "@/components/phases/analysis-phase";
import { ExecutePhase } from "@/components/phases/execute-phase";
import { PlanPhase } from "@/components/phases/plan-phase";
import { WellnessLiveBridge } from "@/components/wellness-live-bridge";
import { useLiveAPIContext } from "@/contexts/LiveAPIContext";
import { useWellness } from "@/context/wellness-context";
import { FiActivity, FiUser } from "react-icons/fi";

export function WellnessShell() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const { client, connected, volume } = useLiveAPIContext();
  const { state, approveProposal, rejectProposal, dispatch } = useWellness();

  useEffect(() => {
    if (!state.activityRuntime || state.phase !== "executing") return;

    if (state.activityRuntime.timerSeconds <= 0) {
      dispatch({
        type: "COMPLETE_ACTIVITY",
        completionQuality: "completed",
        notes: "Local timer completed.",
      });
      client.send({
        text: "The wellness activity timer has completed. Please analyze the session now.",
      });
      return;
    }

    const interval = window.setInterval(() => {
      dispatch({ type: "TICK_ACTIVITY" });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [client, dispatch, state.activityRuntime, state.phase]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  const approve = () => {
    if (!state.pendingProposal) return;
    approveProposal(state.pendingProposal.id);
    dispatch({
      type: "START_ACTIVITY",
      activityType: state.pendingProposal.activityType,
      durationSeconds: state.pendingProposal.durationSeconds,
    });
    client.send({
      text: `User approved plan ${state.pendingProposal.id}. Start the approved ${state.pendingProposal.activityType} session.`,
    });
  };

  const reject = () => {
    if (!state.pendingProposal) return;
    rejectProposal(state.pendingProposal.id);
    client.send({ text: `User declined plan ${state.pendingProposal.id}.` });
  };

  const revise = () => {
    if (!state.pendingProposal) return;
    client.send({
      text: `User wants to revise plan ${state.pendingProposal.id}. Ask one short question or propose a better version.`,
    });
  };

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.1fr)] lg:px-8">
      <WellnessLiveBridge />

      <section className="flex flex-col justify-center gap-5">
        <div className="flex items-center justify-between text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
              MindfulLive
            </p>
            <h1 className="mt-2 text-4xl font-bold">Voice wellness studio</h1>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/25 shadow-lg backdrop-blur-xl">
            <FiUser className="text-2xl" />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/20 shadow-2xl backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {videoStream ? (
              <motion.video
                key="video"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                ref={videoRef}
                autoPlay
                playsInline
                className="h-[360px] w-full object-cover"
              />
            ) : (
              <motion.div
                key="audio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-[360px] flex-col items-center justify-center gap-5 text-white"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
                  <FiActivity className="text-4xl text-cyan-100" />
                </div>
                <AudioPulse active={connected} volume={volume} />
                <p className="text-sm text-white/70">
                  {connected ? "Listening through Gemini Live" : "Connect to begin"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ControlTray
          videoRef={videoRef}
          supportsVideo
          onVideoStreamChange={setVideoStream}
          enableEditingSettings
        />
      </section>

      <section className="flex flex-col justify-center gap-5">
        <PhaseRail phase={state.phase} />

        {state.phase === "executing" &&
        state.activeActivity &&
        state.activityRuntime ? (
          <ExecutePhase
            activityType={state.activeActivity}
            runtime={state.activityRuntime}
          />
        ) : state.phase === "analyzing" ? (
          <AnalysisPhase widgets={state.analysisWidgets} />
        ) : (
          <PlanPhase
            proposal={state.pendingProposal}
            onApprove={approve}
            onReject={reject}
            onRevise={revise}
          />
        )}

        {state.lastError && (
          <div className="rounded-xl border border-red-200/40 bg-red-500/20 p-4 text-sm text-white">
            {state.lastError.message}
          </div>
        )}
      </section>
    </main>
  );
}

function PhaseRail({ phase }: { phase: string }) {
  const phases = ["planning", "executing", "analyzing"];

  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/25 bg-white/15 p-2 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur-xl">
      {phases.map((item) => (
        <div
          key={item}
          className={`rounded-xl px-3 py-3 text-center ${
            phase === item ? "bg-white text-slate-900" : "text-white/60"
          }`}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
