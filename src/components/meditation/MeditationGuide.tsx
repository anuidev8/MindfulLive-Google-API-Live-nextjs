"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useWebcam } from "../../hooks/use-webcam";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { AudioRecorder } from "../../lib/audio-recorder";
import { FunctionDeclaration, LiveServerToolCall, MediaResolution, Modality, Type } from "@google/genai";
import { MeditationSession } from "../../lib/meditation-session";
import ProgressTracker from "./ProgressTracker";
import cn from "classnames";
import AudioPulse from "../audio-pulse/AudioPulse";
import BreathingVisualizer from "./BreathingVisualizer";
import ControlTray from "../control-tray/ControlTray";
import { CircularCountdown } from "../Timer";
import { AnimatePresence, motion } from "framer-motion";
import BadgeRewardModal from "./BadgeRewardModal";
import { FiAward, FiTarget, FiFeather, FiStar, FiRepeat } from "react-icons/fi";
import { toolDeclarations } from "@/lib/toolDeclarations";



export default function WellnessGuide() {
  // Video and stream refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "wellness">("chat");

  const { client, setConfig, setModel } = useLiveAPIContext();

  // FIXED: Session state management
  const [sessionState, setSessionState] = useState<{
    step: "welcome" | "recommendation" | "duration_set" | "intro" | "meditating" | "complete";
    recommendedDuration: number | null;
    selectedDuration: number | null;
    aiRecommendation: string | null;
    finalFeedback: string | null;
  }>({
    step: "welcome",
    recommendedDuration: null,
    selectedDuration: null,
    aiRecommendation: null,
    finalFeedback: null,
  });

  const [conversation, setConversation] = useState<string[]>([]);
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Add state for audio pulse
  const [audioActive, setAudioActive] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  // Add state to track if user has started session
  const [hasStartedSession, setHasStartedSession] = useState(true);

  // Add state for animated progress bar
  const [progressPercent, setProgressPercent] = useState(0);

  // Add state for badge modal
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  // Show badge modal when session completes
  useEffect(() => {
    if (sessionState.step === 'complete') {
      setShowBadgeModal(true);
    }
  }, [sessionState.step]);

  useEffect(() => {
    // Start audio recorder on mount
    const recorder = new AudioRecorder();
    audioRecorderRef.current = recorder;
    recorder.on("volume", (vol: number) => {
      setAudioVolume(vol);
    });
    recorder.start().then(() => setAudioActive(true));
    return () => {
      recorder.stop();
      setAudioActive(false);
    };
  }, []);

  // FIXED: Timer function with proper feedback trigger
  const startMeditationTimer = useCallback((duration: number) => {
    console.log("🧘 Starting meditation timer for", duration, "seconds");
    setTimeLeft(duration);
    setTimerActive(true);
    setSessionState(prev => ({ ...prev, step: "meditating" }));
    
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          setTimerActive(false);
          
          console.log("⏰ Timer completed - requesting AI feedback");
          setSessionState(prevState => ({ ...prevState, step: "complete" }));
          
          // FIXED: Trigger feedback automatically by sending a simple message
          // The AI will recognize the session is complete and call end_meditation_feedback
          client.send({ 
            text: `The ${duration}-second meditation session has completed. Please provide your final feedback now.` 
          });
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [client]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // FIXED: Google API Config with proper system instructions
  useEffect(() => {
    setModel("models/gemini-2.0-flash-exp");
    setConfig({
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } },
      systemInstruction: { 
        parts: [{ 
          text: `You are a Meditation Guide AI. Your role is to guide users through meditation sessions.

IMPORTANT TOOL USAGE RULES:
1. Always respond to tool calls immediately with sendToolResponse
2. Use tools in this exact order: recommend_duration → set_meditation_duration → begin_meditation_timer → end_meditation_feedback
3. When user asks to start meditation, call recommend_duration first
4. After user accepts duration, call set_meditation_duration 
5. Give a brief calming intro, then call begin_meditation_timer
6. When session completes, call end_meditation_feedback

CONVERSATION FLOW:
1. Welcome & Recommendation: Call recommend_duration with suggested seconds
2. Duration Setting: User chooses duration, call set_meditation_duration
3. Intro & Start: Give brief calming words (1-2 sentences max), then call begin_meditation_timer  
4. Meditation: Timer runs - during this time, occasionally provide very short, gentle guidance (5-10 words max, every 15-30 seconds). Say things like "breathe naturally", "stay present", "let thoughts pass", "focus on your breath"
5. Feedback: When timer ends, call end_meditation_feedback immediately

MEDITATION GUIDANCE DURING SESSION:
- Keep all guidance extremely brief (5-10 words maximum)
- Speak softly and slowly
- Use simple, calming phrases
- Examples: "breathe deeply", "relax your shoulders", "stay centered", "be present now"
- Don't interrupt the peaceful silence too much
- Space guidance 15-30 seconds apart
- Focus on breath awareness and presence

Keep all responses calm, supportive, and brief. Focus on creating a peaceful meditation experience.`
        }] 
      },
      tools: [{ functionDeclarations: toolDeclarations }],
    });
  }, [setConfig, setModel]);

  // FIXED: Tool Call Handler Following Google Standards
  useEffect(() => {
    const onToolCall = (toolCall: LiveServerToolCall) => {
      console.log("🛠️ Tool call received:", toolCall);
      
      if (!toolCall.functionCalls) {
        return;
      }
      
      // Process each function call
      toolCall.functionCalls.forEach((fc) => {
        console.log(`📞 Processing function: ${fc.name}`, fc.args);

        switch (fc.name) {
          case "recommend_duration":
            const recommendedSeconds = fc.args?.recommended_seconds as number;
            const reason = fc.args?.reason as string;
            setSessionState(prev => ({
              ...prev,
              step: "recommendation",
              recommendedDuration: recommendedSeconds,
              aiRecommendation: reason
            }));
            setConversation(prev => [...prev, 
              `AI: I recommend ${recommendedSeconds} seconds for meditation. ${reason}`
            ]);
            break;

          case "set_meditation_duration":
            const durationSeconds = fc.args?.duration_seconds as number;
            setSessionState(prev => ({
              ...prev,
              step: "duration_set",
              selectedDuration: durationSeconds
            }));
            setConversation(prev => [...prev, 
              `Duration Set: ${durationSeconds} seconds`
            ]);
            break;

          case "begin_meditation_timer":
            const timerDuration = fc.args?.duration_seconds as number;
            const timerStarted = fc.args?.timer_started as boolean;
            
            if (timerStarted && timerDuration) {
              setConversation(prev => [...prev, 
                `AI: Beginning ${timerDuration}-second meditation. Breathe naturally and be present.`
              ]);
              
              // Start timer after a brief delay to ensure AI has finished speaking
              setTimeout(() => {
                startMeditationTimer(timerDuration);
              }, 2000); // 2 second delay ensures AI audio finishes
            }
            break;

          case "end_meditation_feedback":
            const feedbackMessage = fc.args?.feedback_message as string;
            const nextSuggestion = fc.args?.next_suggestion as string;
            
            setSessionState(prev => ({
      ...prev,
              step: "complete",
              finalFeedback: `${feedbackMessage} ${nextSuggestion}`
            }));
            setConversation(prev => [...prev, 
              `AI: ${feedbackMessage} ${nextSuggestion}`
            ]);
            break;
        }
      });

      // CRITICAL: Send tool response back to AI (Following Google standards)
      setTimeout(() => {
        client.sendToolResponse({
          functionResponses: toolCall.functionCalls?.map((fc) => ({
            response: { 
              output: { 
                success: true,
                message: `${fc.name} executed successfully`
              } 
            },
            id: fc.id,
            name: fc.name,
          })),
        });
        console.log("✅ Tool response sent to AI");
      }, 200);
    };

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client, startMeditationTimer]);

  // FIXED: Start session function
  const startSession = useCallback(() => {
    setSessionState({
      step: "welcome",
      recommendedDuration: null,
      selectedDuration: null,
      aiRecommendation: null,
      finalFeedback: null,
    });
    setConversation([]);
    setTimerActive(false);
    setTimeLeft(0);
    setHasStartedSession(true); // <-- set here
    
    // Send initial message to trigger AI
    client.send({ 
      text: "I want to start a meditation session. Please recommend a duration for me based on my current state." 
    });
  }, [client]);

  // Manual duration selection (if user wants to override AI recommendation)
  const selectDuration = useCallback((seconds: number) => {
    client.send({ 
      text: `I want to meditate for ${seconds} seconds.` 
    });
  }, [client]);

  // Video stream handling
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Animate progress bar as timer runs
  useEffect(() => {
    if (timerActive && sessionState.selectedDuration) {
      setProgressPercent(0);
      const total = sessionState.selectedDuration;
      let frame: number;
      const animate = () => {
        const percent = Math.min(100, ((total - (timeLeft || 0)) / total) * 100);
        setProgressPercent(percent);
        if (percent < 100 && timerActive) {
          frame = requestAnimationFrame(animate);
        }
      };
      frame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frame);
    } else {
      setProgressPercent(0);
    }
  }, [timerActive, sessionState.selectedDuration, timeLeft]);

  // Get status text based on current step
  const getStatusText = () => {
    switch (sessionState.step) {
      case "welcome": return "🤗 Welcome - Getting AI recommendation...";
      case "recommendation": return "💡 AI Recommendation Received";
      case "duration_set": return "✅ Duration Set - Preparing...";
      case "intro": return "🎯 AI is giving intro...";
      case "meditating": return "🧘 Meditation in Progress";
      case "complete": return "✨ Session Complete";
      default: return "🔄 Processing...";
    }
  };

  return (
    <main className="relative grid grid-cols-1 md:grid-cols-2 gap-8">
     
      {/* Left column: Camera, AudioPulse, ControlTray */}
      <div className={`
        ${!hasStartedSession ? 'col-span-2' : 'col-span-1'}
        flex flex-col items-center justify-center min-h-screen gap-8
      `}>
        {/* Camera */}
        <div className="w-full flex justify-center items-center justify-center rounded-3xl bg-white/30 backdrop-blur-xl shadow-2xl  overflow-hidden">
          <AnimatePresence>
            {videoStream && (
              <motion.div
                key="video"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className="w-full flex h-[500px] "
              >
                <video
                  className={cn("stream rounded-2xl w-full  object-cover", {
                    hidden: !videoRef.current || !videoStream,
                  })}
                  ref={videoRef}
                  autoPlay
                  playsInline
                />
              </motion.div>
            )}
          </AnimatePresence>
           {/* AudioPulse */}
        <div className="w-full flex flex-col items-center justify-center">
          <div className="mb-2 text-2xl font-bold text-white text-center drop-shadow-lg">Meditation AI Assistant</div>
          <div className="rounded-2xl bg-white/30 backdrop-blur-xl shadow-xl border border-white/30 p-4 flex items-center justify-center">
            <AudioPulse active={audioActive} volume={audioVolume} />
          </div>
        </div>
        </div>
       
        {/* ControlTray */}
        <div className="w-full flex justify-center items-center">
          <ControlTray
            videoRef={videoRef as React.RefObject<HTMLVideoElement>}
            supportsVideo={true}
            onVideoStreamChange={setVideoStream}
            enableEditingSettings={true}
          />
        </div>
      </div>
      {/* Right column: AI Recommendation, Badges, Progress Sessions */}
      <div className="flex flex-col gap-6 items-center justify-center">
        {/* AI Recommendation */}
        <AnimatePresence>
          {sessionState.step === "recommendation" && sessionState.recommendedDuration && (
            <motion.div
              key="ai-recommendation"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="rounded-2xl w-full bg-white/30 backdrop-blur-xl shadow-xl border border-white/30 p-6 flex flex-col items-center text-center"
            >
              <h3 className="text-blue-200 font-semibold mb-2 text-lg">🤖 AI Recommendation</h3>
              <div className="text-3xl font-bold text-white mb-2">
                {sessionState.recommendedDuration} <span className="text-base font-medium">seconds</span>
              </div>
              <div className="text-blue-100 text-base mb-4">
                {sessionState.aiRecommendation}
              </div>
              <div className="flex gap-2 justify-center mt-2">
                <button 
                  onClick={() => selectDuration(sessionState.recommendedDuration!)}
                  className="px-6 py-2 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 text-white font-bold shadow border border-white/30 hover:scale-105 hover:from-blue-500 hover:to-cyan-500 transition-all duration-150"
                >
                  Accept ({sessionState.recommendedDuration}s)
                </button>
                <button 
                  onClick={() => selectDuration(10)}
                  className="px-6 py-2 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 text-white font-bold shadow border border-white/30 hover:scale-105 hover:from-gray-500 hover:to-gray-600 transition-all duration-150"
                >
                  10s Instead
                </button>
                <button 
                  onClick={() => selectDuration(30)}
                  className="px-6 py-2 rounded-xl bg-gradient-to-br from-green-400 to-teal-400 text-white font-bold shadow border border-white/30 hover:scale-105 hover:from-green-500 hover:to-teal-500 transition-all duration-150"
                >
                  30s Instead
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Timer Display */}
        <AnimatePresence>
          {timerActive && (
            <motion.div
              key="timer"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl bg-white/30 backdrop-blur-xl shadow-xl border border-white/30 p-6 flex flex-col items-center justify-center mb-4"
            >
              <CircularCountdown
                duration={sessionState.selectedDuration || 0}
                timeLeft={timeLeft}
              />
              <div className="mt-4 text-white/80 text-center">
                <div className="text-sm">Stay present • Breathe naturally</div>
                <div className="text-xs">The AI will remain quiet during meditation</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* AnimatePresence for Badges and Progress Sessions */}
        <AnimatePresence>
          {hasStartedSession && (
            <motion.div
              key="badges-progress"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col gap-6"
            >
                {/* Progress Sessions */}
                <div className="rounded-2xl bg-white/30 backdrop-blur-xl shadow-xl border border-white/30 p-6">
                <h2 className="text-xl font-bold text-white mb-2">Progress Sessions</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-white">3</div>
                    <div className="text-white/80">Today's streak</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">12:45</div>
                    <div className="text-white/80">Last session</div>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-xl font-bold text-cyan-300">75%</span>
                  </div>
                </div>
                {/* Animated progress bar */}
                <div className="mt-4 h-8 bg-gradient-to-r from-[#38bdf8] via-[#22d3ee] to-[#4ade80] rounded-full opacity-60 relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3, ease: 'linear' }}
                    className="absolute left-0 top-0 h-full bg-white/70 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              {/* Badges */}
              <div className="rounded-2xl bg-white/30 backdrop-blur-xl shadow-xl border border-white/30 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Badges</h2>
                <div className="flex gap-3 justify-center">
                  <span className="inline-block px-4 py-2 rounded-full bg-yellow-400/20 text-yellow-900 font-semibold text-sm border border-yellow-400/40 flex items-center gap-2"><FiAward className="text-xl" />Streak: 3 Days</span>
                  <span className="inline-block px-4 py-2 rounded-full bg-blue-500/20 text-blue-200 font-semibold text-sm border border-blue-400/40 flex items-center gap-2"><FiTarget className="text-xl" />Focused</span>
                  <span className="inline-block px-4 py-2 rounded-full bg-green-500/20 text-green-200 font-semibold text-sm border border-green-400/40 flex items-center gap-2"><FiFeather className="text-xl" />Relaxed</span>
                  <span className="inline-block px-4 py-2 rounded-full bg-purple-500/20 text-purple-200 font-semibold text-sm border border-purple-400/40 flex items-center gap-2"><FiStar className="text-xl" />First Session</span>
                  <span className="inline-block px-4 py-2 rounded-full bg-pink-500/20 text-pink-200 font-semibold text-sm border border-pink-400/40 flex items-center gap-2"><FiRepeat className="text-xl" />Consistency</span>
                </div>
                <div className="mt-4 text-center text-white/70 text-sm">
                  {sessionState.step === "welcome" ? "Start a session first" : "Earn badges as you progress!"}
                </div>
              </div>
            
            </motion.div>
          )}
        </AnimatePresence>
        {/* Badge Reward Modal */}
        <BadgeRewardModal
          open={showBadgeModal}
          onClose={() => setShowBadgeModal(false)}
          // Pass a custom button style prop if needed, or update the component to use the same style as above
        />
      </div>
    </main>
  );
}