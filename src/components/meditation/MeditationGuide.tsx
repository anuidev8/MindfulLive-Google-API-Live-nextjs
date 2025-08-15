"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useWebcam } from "../../hooks/use-webcam";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { AudioRecorder } from "../../lib/audio-recorder";
import { MediaResolution, Modality, Type } from "@google/genai";
import { MeditationSession } from "../../lib/meditation-session";
import ProgressTracker from "./ProgressTracker";
import cn from "classnames";
import AudioPulse from "../audio-pulse/AudioPulse";
import BreathingVisualizer from "./BreathingVisualizer";
import ControlTray from "../control-tray/ControlTray";

// Define PoseData interface locally
interface PoseData {
  landmarks: PoseLandmark[];
  posture: PostureAnalysis;
  confidence: number;
  timestamp: number;
}

interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

interface PostureAnalysis {
  spineAlignment: 'good' | 'fair' | 'poor';
  shoulderLevel: 'even' | 'uneven' | 'unknown';
  headPosition: 'neutral' | 'forward' | 'backward';
  overallScore: number;
  recommendations: string[];
}

interface WellnessState {
  isActive: boolean;
  sessionType: "posture" | "mindfulness" | "exercise";
  duration: number;
  currentPhase: "preparation" | "active" | "closing";
  postureScore: number;
  spineAlignment: 'good' | 'fair' | 'poor';
  shoulderLevel: 'even' | 'uneven' | 'unknown';
  headPosition: 'neutral' | 'forward' | 'backward';
  confidence: number;
}

interface WellnessProgress {
  date: string;
  duration: number;
  type: string;
  postureImprovement: number;
  sessionQuality: number;
}

export default function WellnessGuide() {
  // Use the LiveAPI context (same as ControlTray.tsx)
  const { 
    client, 
    connected, 
    connect, 
    disconnect, 
    volume,
    setConfig,
    setModel
  } = useLiveAPIContext();

  // Set up configuration for wellness sessions
  useEffect(() => {
    if (setConfig && setModel) {
      console.log("🔧 Setting up wellness configuration...");
      setModel("models/gemini-2.0-flash-exp");
      setConfig({
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }
        },
        systemInstruction: {
          parts: [{
            text: `You are an AI Wellness & Posture Coach. Your role is to:

1. **Real-time Posture Analysis**: Monitor the user's posture through camera input and provide immediate, encouraging feedback.

2. **Wellness Guidance**: Offer meditation, breathing exercises, and mindfulness techniques based on the user's current state.

3. **Voice Coaching**: Respond with clear, calming voice guidance that helps users improve their posture and overall wellness.

4. **Real-time Feedback**: Provide immediate corrections and suggestions as the user moves or changes position.

5. **Encouraging Tone**: Always maintain a supportive, encouraging tone that motivates users to continue their wellness practice.

Key Instructions:
- Respond in real-time as the user's posture changes
- Use voice responses for immediate guidance
- Keep feedback positive and actionable
- Focus on spine alignment, shoulder position, and head posture
- Provide breathing and relaxation techniques when needed
- Be concise but thorough in your guidance

Remember: You are helping users develop better posture habits and mindfulness practices through real-time coaching.`
          }]
        },
        tools: [{
          functionDeclarations: [{
            name: "analyze_posture",
            description: "Analyze the user's current posture and provide feedback",
            parameters: {
              type: Type.OBJECT,
              properties: {
                posture_score: {
                  type: Type.NUMBER,
                  description: "Overall posture score from 0-100"
                },
                feedback: {
                  type: Type.STRING,
                  description: "Specific feedback about the current posture"
                },
                suggestions: {
                  type: Type.STRING,
                  description: "Actionable suggestions to improve posture"
                }
              }
            }
          }]
        }]
      });
      console.log("✅ Wellness configuration set successfully");
    }
  }, [setConfig, setModel]);

  // Media stream hooks (same as ControlTray.tsx)
  const videoStreams = [useWebcam(), useScreenCapture()];
  const [activeVideoStream, setActiveVideoStream] = useState<MediaStream | null>(null);
  const [webcam, screenCapture] = videoStreams;
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Connection state management
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false);

  const [wellnessState, setWellnessState] = useState<WellnessState>({
    isActive: false,
    sessionType: "posture",
    duration: 300, // 5 minutes default
    currentPhase: "preparation",
    postureScore: 85,
    spineAlignment: 'fair',
    shoulderLevel: 'even',
    headPosition: 'neutral',
    confidence: 0.8,
  });

  const [sessionLog, setSessionLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<WellnessProgress[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  
  // Refs for media elements
  const videoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Audio recorder and pose analyzer
  const [meditationSession] = useState(() => new MeditationSession());
  
  // Simple MediaPipe state
  const [mediaPipePose, setMediaPipePose] = useState<any>(null);
  const [isPoseReady, setIsPoseReady] = useState(false);
  const [poseTrackingActive, setPoseTrackingActive] = useState(false);
  
  // Voice response state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [analysisCards, setAnalysisCards] = useState<Array<{
    id: string;
    type: 'posture' | 'feedback' | 'improvement';
    title: string;
    message: string;
    timestamp: Date;
    severity: 'good' | 'warning' | 'error';
  }>>([]);

  // Add analysis card
  const addAnalysisCard = useCallback((type: 'posture' | 'feedback' | 'improvement', title: string, message: string, severity: 'good' | 'warning' | 'error' = 'good') => {
    const newCard = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date(),
      severity
    };
    
    setAnalysisCards(prev => [newCard, ...prev.slice(0, 4)]); // Keep only 5 cards
  }, []);
  
  // Debug connection state changes
  useEffect(() => {
    console.log("🔍 Connection state changed:", { connected, isConnecting, hasAttemptedConnection });
  }, [connected, isConnecting, hasAttemptedConnection]);

  // Connection stability check - prevent rapid toggling
  useEffect(() => {
    if (connected && !isConnecting) {
      console.log("🔒 Connection stabilized - preventing rapid toggling");
      
      // Set a minimum connection duration
      const connectionTimer = setTimeout(() => {
        if (connected) {
          console.log("✅ Connection stable for minimum duration");
        }
      }, 2000); // 2 second minimum connection time
      
      return () => clearTimeout(connectionTimer);
    }
  }, [connected, isConnecting]);

  // Simple MediaPipe initialization with multiple fallback strategies
  const initMediaPipe = async () => {
    try {
      console.log('🎯 Starting MediaPipe...');
      
      let PoseClass: any = null;
      
      // Strategy 1: Try dynamic import from @mediapipe/pose
      try {
        const mediaPipeModule = await import('@mediapipe/pose');
        
        // Check all possible export patterns based on web research
        if (mediaPipeModule.Pose && typeof mediaPipeModule.Pose === 'function') {
          PoseClass = mediaPipeModule.Pose;
          console.log('✅ Strategy 1: Direct Pose import successful');
        } else if (mediaPipeModule.default && typeof mediaPipeModule.default === 'function') {
          PoseClass = mediaPipeModule.default;
          console.log('✅ Strategy 1: Default export successful');
        } else if (mediaPipeModule.default?.Pose && typeof mediaPipeModule.default.Pose === 'function') {
          PoseClass = mediaPipeModule.default.Pose;
          console.log('✅ Strategy 1: Default.Pose successful');
        } else {
          console.log('⚠️ Strategy 1: All import patterns failed');
          console.log('Available exports:', Object.keys(mediaPipeModule));
          console.log('Pose type:', typeof mediaPipeModule.Pose);
          console.log('Default type:', typeof mediaPipeModule.default);
        }
      } catch (importError) {
        if (importError instanceof Error) {
          console.log('⚠️ Strategy 1 failed:', importError.message);
        } else {
          console.log('⚠️ Strategy 1 failed:', importError);
        }
      }
      
      // Strategy 2: Check if MediaPipe is loaded via script tags
      if (!PoseClass && typeof window !== 'undefined') {
        if ((window as any).Pose && typeof (window as any).Pose === 'function') {
          PoseClass = (window as any).Pose;
          console.log('✅ Strategy 2: Script tag import successful');
        } else if ((window as any).MediaPipe && (window as any).MediaPipe.Pose) {
          PoseClass = (window as any).MediaPipe.Pose;
          console.log('✅ Strategy 2: MediaPipe namespace successful');
        }
      }
      
      // Strategy 3: Load MediaPipe via script tag dynamically
      if (!PoseClass) {
        console.log('🔄 Strategy 3: Loading MediaPipe via script tag...');
        try {
          await loadMediaPipeScript();
          
          // Wait a bit for script to initialize
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if ((window as any).Pose && typeof (window as any).Pose === 'function') {
            PoseClass = (window as any).Pose;
            console.log('✅ Strategy 3: Dynamic script loading successful');
          } else if ((window as any).MediaPipe && (window as any).MediaPipe.Pose) {
            PoseClass = (window as any).MediaPipe.Pose;
            console.log('✅ Strategy 3: MediaPipe namespace from script successful');
          }
        } catch (scriptError) {
          if (scriptError instanceof Error) {
            console.log('⚠️ Strategy 3 failed:', scriptError.message);
          } else {
            console.log('⚠️ Strategy 3 failed:', scriptError);
          }
        }
      }
      
      // Final validation based on web research
      if (!PoseClass) {
        throw new Error('Pose class not available from any strategy');
      }
      
      if (typeof PoseClass !== 'function') {
        throw new Error(`Pose class is not a constructor. Type: ${typeof PoseClass}, Value: ${PoseClass}`);
      }
      
      console.log('✅ Pose class found, creating instance...');
      
      // Create pose instance with proper configuration from web research
      const pose = new PoseClass({
        locateFile: (file: string) => {
          // Use multiple CDN sources for reliability
          const cdnSources = [
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
            `https://unpkg.com/@mediapipe/pose/${file}`,
            `https://cdn.skypack.dev/@mediapipe/pose/${file}`
          ];
          console.log(`📁 Loading MediaPipe file: ${file}`);
          return cdnSources[0]; // Start with jsdelivr
        }
      });
      
      // Wait for pose to be ready (critical from web research)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set options with proper error handling
      try {
        await pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        console.log('✅ MediaPipe options set successfully');
      } catch (optionsError) {
        console.warn('⚠️ Failed to set MediaPipe options:', optionsError);
        // Continue anyway - some options might not be supported
      }
      
      // Set up results callback with error handling
      pose.onResults((results: any) => {
        if (results.poseLandmarks && canvasRef.current) {
          drawPose(results.poseLandmarks);
          updatePostureAnalysis(results.poseLandmarks);
        }
      });
      
      // Add error callback based on web research
      if (pose.onError) {
        pose.onError((error: any) => {
          console.error('MediaPipe Pose error:', error);
        });
      }
      
      setMediaPipePose(pose);
      setIsPoseReady(true);
      console.log('✅ MediaPipe ready!');
      console.log('Pose instance:', pose);
      console.log('Pose methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(pose)));
      addToSessionLog('✅ Real MediaPipe pose tracking initialized');
      
    } catch (error) {
      console.error('❌ All MediaPipe strategies failed:', error);
      console.log('🎭 Using simple mock mode');
      setIsPoseReady(true); // Still ready, just with mock
      addToSessionLog('🎭 Using mock pose tracking (MediaPipe unavailable)');
    }
  };
  
  // Mock pose tracking for development/fallback
  const startMockPoseTracking = () => {
    const mockTrackingInterval = setInterval(() => {
      if (!wellnessState.isActive) {
        clearInterval(mockTrackingInterval);
        return;
      }
      
      // Generate mock landmarks and analysis
      const mockLandmarks = generateMockLandmarks();
      if (canvasRef.current) {
        drawPose(mockLandmarks);
        updatePostureAnalysis(mockLandmarks);
      }
    }, 100); // Update every 100ms
  };
  
  // Generate realistic mock landmarks
  const generateMockLandmarks = () => {
    const landmarks = [];
    const time = Date.now() / 1000;
    
    // Add slight movement for realism
    const sway = Math.sin(time * 0.5) * 0.02;
    const breathe = Math.sin(time * 2) * 0.01;
    
    // Key landmarks with slight variations
    const keyPoints = [
      { x: 0.5 + sway, y: 0.2 + breathe, z: 0, visibility: 0.9 },    // 0: Nose
      null, null, null, null, null, null, null, null, null, null,    // 1-10: Other face points
      { x: 0.45 + sway, y: 0.25 + breathe, z: 0, visibility: 0.9 },  // 11: Left shoulder
      { x: 0.55 + sway, y: 0.25 + breathe, z: 0, visibility: 0.9 },  // 12: Right shoulder
      null, null, null, null, null, null, null, null, null,          // 13-22: Arms
      { x: 0.45 + sway, y: 0.4, z: 0, visibility: 0.9 },           // 23: Left hip
      { x: 0.55 + sway, y: 0.4, z: 0, visibility: 0.9 },           // 24: Right hip
      { x: 0.45, y: 0.6, z: 0, visibility: 0.9 },                  // 25: Left knee
      { x: 0.55, y: 0.6, z: 0, visibility: 0.9 },                  // 26: Right knee
      { x: 0.45, y: 0.8, z: 0, visibility: 0.9 },                  // 27: Left ankle
      { x: 0.55, y: 0.8, z: 0, visibility: 0.9 },                  // 28: Right ankle
    ];
    
    // Fill in all 33 landmarks
    for (let i = 0; i < 33; i++) {
      if (keyPoints[i]) {
        landmarks.push(keyPoints[i]);
      } else {
        landmarks.push({
          x: 0.5 + (Math.random() - 0.5) * 0.3,
          y: 0.3 + (Math.random() - 0.5) * 0.4,
          z: 0,
          visibility: 0.7
        });
      }
    }
    
    return landmarks;
  };
  
  // Helper function to load MediaPipe via script tag
  const loadMediaPipeScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).Pose) {
        resolve();
        return;
      }
      
      // Try multiple script sources based on web research
      const scriptSources = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
        'https://unpkg.com/@mediapipe/pose/pose.js',
        'https://cdn.skypack.dev/@mediapipe/pose/pose.js'
      ];
      
      let currentSourceIndex = 0;
      
      const tryNextSource = () => {
        if (currentSourceIndex >= scriptSources.length) {
          reject(new Error('All MediaPipe script sources failed'));
          return;
        }
        
        const script = document.createElement('script');
        script.src = scriptSources[currentSourceIndex];
        script.async = true;
        script.type = 'text/javascript';
        
        script.onload = () => {
          console.log(`✅ MediaPipe script loaded from: ${scriptSources[currentSourceIndex]}`);
          
          // Wait for MediaPipe to initialize
          const checkMediaPipe = () => {
            if ((window as any).Pose || (window as any).MediaPipe?.Pose) {
              resolve();
            } else {
              setTimeout(checkMediaPipe, 100);
            }
          };
          
          checkMediaPipe();
        };
        
        script.onerror = () => {
          console.warn(`⚠️ Failed to load MediaPipe from: ${scriptSources[currentSourceIndex]}`);
          currentSourceIndex++;
          tryNextSource();
        };
        
        document.head.appendChild(script);
      };
      
      tryNextSource();
    });
  };

  // Real-time AI Voice Coaching with Gemini Live (using same voice system)
  const sendPostureUpdateToAI = useCallback(async (postureData: any) => {
    if (!connected || !wellnessState.isActive || !client) return;

    try {
      // Create a meditation-focused prompt for the AI wellness coach
      const prompt = `You are an AI meditation and wellness coach. The user is currently in a ${wellnessState.sessionType} meditation session.

Current posture analysis:
- Posture Score: ${postureData.postureScore}/100
- Spine Alignment: ${postureData.spineAlignment}
- Shoulder Level: ${postureData.shoulderLevel}
- Head Position: ${postureData.headPosition}

Provide gentle, meditation-focused voice guidance (max 1 sentence) to help them maintain mindful posture. 
Focus on:
- Gentle corrections with calming language
- Mindfulness and body awareness
- Encouraging presence and focus
- Maintaining the meditative state

Keep your tone calm, supportive, and meditative. Help them stay present with their body.`;

      // Send text input to Gemini Live API (same as GeminiLive component)
      client.send({ text: prompt });
      
      // Add analysis card for visual feedback
      const aiResponse = `Maintain your mindful posture. Feel the gentle alignment of your spine, the balance of your shoulders, and the natural position of your head.`;
      
      addAnalysisCard(
        'feedback', 
        'AI Meditation Coach', 
        aiResponse, 
        postureData.postureScore >= 80 ? 'good' : 'warning'
      );
    } catch (error) {
      console.log('AI coaching error:', error);
    }
  }, [connected, wellnessState.isActive, client, addAnalysisCard, wellnessState.sessionType]);

  // Track last AI response time for debouncing
  const lastAIResponseRef = useRef<number>(0);

  // Enhanced posture analysis with meditation-focused AI coaching
  const updatePostureAnalysis = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length < 33) return;

    // Filter out null landmarks and ensure they exist
    const validLandmarks = landmarks.filter(landmark => landmark !== null);
    if (validLandmarks.length < 33) return;

    // Calculate posture metrics
    const nose = validLandmarks[0];
    const leftShoulder = validLandmarks[11];
    const rightShoulder = validLandmarks[12];
    const leftHip = validLandmarks[23];
    const rightHip = validLandmarks[24];

    // Spine alignment (nose to midpoint between hips)
    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };
    
    const spineAngle = Math.atan2(
      Math.abs(nose.x - hipMidpoint.x),
      Math.abs(nose.y - hipMidpoint.y)
    ) * (180 / Math.PI);

    // Shoulder level
    const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    const shoulderLevel = shoulderDiff < 0.05 ? 'even' : 'uneven';

    // Head position
    const headPosition = nose.y < 0.3 ? 'forward' : nose.y > 0.7 ? 'backward' : 'neutral';

    // Calculate posture score
    let postureScore = 100;
    let feedback = '';
    let severity: 'good' | 'warning' | 'error' = 'good';

    // Spine alignment check
    if (spineAngle > 15) {
      postureScore -= 20;
      feedback = 'Gently straighten your spine. Feel the natural curve of your back.';
      severity = 'warning';
    }

    // Shoulder level check
    if (shoulderLevel === 'uneven') {
      postureScore -= 15;
      feedback = 'Relax your shoulders. Let them find their natural, balanced position.';
      severity = 'warning';
    }

    // Head position check
    if (headPosition !== 'neutral') {
      postureScore -= 10;
      feedback = headPosition === 'forward' 
        ? 'Bring your head back gently. Let it rest naturally on your spine.' 
        : 'Lift your chin slightly. Find the middle ground between up and down.';
      severity = 'warning';
    }

    // Update wellness state
    setWellnessState(prev => ({
      ...prev,
      postureScore: Math.max(0, postureScore),
      spineAlignment: spineAngle > 15 ? 'poor' : spineAngle > 8 ? 'fair' : 'good',
      shoulderLevel: shoulderLevel,
      headPosition: headPosition,
      confidence: 0.8
    }));

    // Generate immediate feedback cards for posture issues
    if (feedback && wellnessState.isActive) {
      addAnalysisCard('posture', 'Meditation Posture', feedback, severity);
    }

    // Positive reinforcement for good meditation posture (less frequent)
    if (postureScore >= 90 && wellnessState.isActive && Math.random() < 0.03) { // 3% chance
      const positiveMessage = 'Beautiful posture. You are finding your center. Stay present with this feeling.';
      addAnalysisCard('feedback', 'Mindful Posture', positiveMessage, 'good');
    }

    // Real-time meditation coaching every 3 seconds during active tracking (debounced)
    if (wellnessState.isActive) {
      const now = Date.now();
      if (now - lastAIResponseRef.current > 3000) {
        lastAIResponseRef.current = now;
        sendPostureUpdateToAI({
          postureScore,
          spineAlignment: spineAngle > 15 ? 'poor' : spineAngle > 8 ? 'fair' : 'good',
          shoulderLevel,
          headPosition
        });
      }
    }
  }, [wellnessState.isActive, addAnalysisCard, sendPostureUpdateToAI]);

  // Simple pose drawing
  const drawPose = (landmarks: any[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw simple circles for key points
    ctx.fillStyle = '#00FF00';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    
    // Draw nose, shoulders, hips
    const keyPoints = [0, 11, 12, 23, 24];
    keyPoints.forEach(index => {
      if (landmarks[index]) {
        const x = landmarks[index].x * canvas.width;
        const y = landmarks[index].y * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    });
    
    // Draw spine line
    if (landmarks[0] && landmarks[23]) {
      const x1 = landmarks[0].x * canvas.width;
      const y1 = landmarks[0].y * canvas.height;
      const x2 = landmarks[23].x * canvas.width;
      const y2 = landmarks[23].y * canvas.height;
      
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  };

  // Remove the separate configuration useEffect to prevent loops

  // Handle Gemini Live voice responses (same as working app)
  useEffect(() => {
    const onContent = (content: any) => {
      console.log("📝 Received wellness content from Gemini:", content);
      if (content.modelTurn?.parts) {
        const text = content.modelTurn.parts[0]?.text;
        if (text) {
          console.log("📝 Received wellness text from Gemini:", text);
          // Add AI response to analysis cards
          addAnalysisCard('feedback', 'AI Coach Response', text, 'good');
        }
      }
    };

    const onAudio = (data: ArrayBuffer) => {
      console.log("🎵 Received wellness audio from Gemini:", data.byteLength, "bytes");
      // The audio will automatically play through the existing audio system
    };

    const onError = (error: ErrorEvent) => {
      console.error("❌ Wellness Gemini Live API error:", error.message);
    };

    client
      .on("content", onContent)
      .on("audio", onAudio)
      .on("error", onError);

    return () => {
      client
        .off("content", onContent)
        .off("audio", onAudio)
        .off("error", onError);
    };
  }, [client, addAnalysisCard]);

  // Handle pose analysis during wellness session
  useEffect(() => {
    const onPoseData = (poseData: PoseData) => {
      if (wellnessState.isActive) {
        const { posture, confidence } = poseData;
        
        setWellnessState(prev => ({
          ...prev,
          postureScore: posture.overallScore,
          spineAlignment: posture.spineAlignment,
          shoulderLevel: posture.shoulderLevel,
          headPosition: posture.headPosition,
          confidence,
        }));

        // Provide real-time posture feedback
        if (posture.overallScore < 60) {
          addToSessionLog("⚠️ Poor posture detected - providing guidance");
          requestPostureGuidance("posture_correction");
        } else if (posture.spineAlignment === 'poor') {
          addToSessionLog("🦴 Spine misalignment detected - adjusting guidance");
          requestPostureGuidance("spine_alignment");
        } else if (posture.headPosition === 'forward') {
          addToSessionLog("👤 Forward head detected - correcting position");
          requestPostureGuidance("head_position");
        }
      }
    };

    const onPoseError = (error: any) => {
      console.error('❌ Pose tracking error:', error);
      addToSessionLog("⚠️ Pose tracking error - continuing with AI guidance");
    };

    if (connected && wellnessState.isActive && videoRef.current && canvasRef.current) {
      try {
        // poseAnalyzer.on("pose", onPoseData); // Removed PoseAnalyzer
        // poseAnalyzer.on("error", onPoseError); // Removed PoseAnalyzer
        
        // Start pose tracking with error handling
        // poseAnalyzer.start(videoRef.current, canvasRef.current).then(() => { // Removed PoseAnalyzer
        //   addToSessionLog("🎯 Pose tracking started successfully"); // Removed PoseAnalyzer
        // }).catch(error => { // Removed PoseAnalyzer
        //   console.error('❌ Failed to start pose tracking:', error); // Removed PoseAnalyzer
        //   if (error.message.includes('mock') || error.message.includes('fallback')) { // Removed PoseAnalyzer
        //     addToSessionLog("🎭 Using mock pose detection for development"); // Removed PoseAnalyzer
        //   } else { // Removed PoseAnalyzer
        //     addToSessionLog("⚠️ Pose tracking unavailable - using AI guidance only"); // Removed PoseAnalyzer
        //     setError("Pose tracking unavailable, but AI coaching will continue"); // Removed PoseAnalyzer
        //   } // Removed PoseAnalyzer
        // }); // Removed PoseAnalyzer
        setPoseTrackingActive(true); // Set pose tracking active state
        addToSessionLog("🎯 Pose tracking started successfully");
      } catch (error) {
        console.error('❌ Error setting up pose tracking:', error);
        addToSessionLog("⚠️ Pose tracking setup failed - continuing with AI guidance");
      }
    } else {
      setPoseTrackingActive(false); // Ensure it's false when not active
    }

    return () => {
      // poseAnalyzer.off("pose", onPoseData); // Removed PoseAnalyzer
      // poseAnalyzer.off("error", onPoseError); // Removed PoseAnalyzer
    };
  }, [connected, wellnessState.isActive]);

  // Add messages to session log
  const addToSessionLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setSessionLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Request specific posture guidance from AI
  const requestPostureGuidance = async (guidanceType: string) => {
    if (connected) {
      const prompt = `Provide immediate posture guidance for ${guidanceType}. 
        Current posture score: ${wellnessState.postureScore}/100
        Spine alignment: ${wellnessState.spineAlignment}
        Head position: ${wellnessState.headPosition}
        Keep it encouraging and specific with actionable steps.`;
      
      client.send([{ text: prompt }]);
    }
  };

  // Start wellness session with automatic media activation
  const startWellnessSession = async () => {
    try {
      console.log("🧘 Starting wellness session...");

      // Initialize MediaPipe first
      await initMediaPipe();

      // Start pose tracking
      await startPoseTracking();

      // Auto-connect to Gemini Live API if not connected
      if (!connected) {
        console.log("🔌 Auto-connecting to Gemini Live API for wellness session...");
        await connect();
      }

      // DO NOT start audioRecorder or webcam/screenCapture here!
      // Media activation is now manual via ControlTray

      // Start the meditation session
      await meditationSession.start(wellnessState.sessionType, wellnessState.duration);

      setWellnessState(prev => ({ ...prev, isActive: true }));
      addToSessionLog("🧘 Wellness session started successfully");
      addToSessionLog("🎤 Voice and camera: please activate manually using the controls below");

    } catch (error) {
      if (error instanceof Error) {
        console.error("❌ Failed to start wellness session:", error);
        addToSessionLog(`❌ Error: ${error.message}`);
      } else {
        console.error("❌ Failed to start wellness session:", error);
        addToSessionLog(`❌ Error: ${String(error)}`);
      }
    }
  };

  // Stop wellness session and deactivate media
  const stopWellnessSession = async () => {
    try {
      console.log("🧘 Stopping wellness session...");
      
      // Stop pose tracking
      stopPoseTracking();
      
      // Stop audio recording
      if (audioRecorder) {
        audioRecorder.stop();
        console.log("🎤 Audio recording stopped");
      }
      
      // Stop video stream
      if (activeVideoStream) {
        webcam.stop();
        screenCapture.stop();
        setActiveVideoStream(null);
        console.log("📹 Video stream stopped");
      }
      
      // Stop meditation session
      meditationSession.stop();
      
      setWellnessState(prev => ({ ...prev, isActive: false }));
      addToSessionLog("🧘 Wellness session ended");
      addToSessionLog("🎤 Voice and camera deactivated");
      
    } catch (error) {
      if (error instanceof Error) {
        console.error("❌ Failed to stop wellness session:", error);
        addToSessionLog(`❌ Error: ${error.message}`);
      } else {
        console.error("❌ Failed to stop wellness session:", error);
        addToSessionLog(`❌ Error: ${String(error)}`);
      }
    }
  };

  // Simple pose tracking start
  const startPoseTracking = async () => {
    try {
      if (!videoRef.current || !canvasRef.current) return;
      
      // Try to get camera stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          }
        });
        
        // Set video
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });
        
        // Set canvas size
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
        
        addToSessionLog("📹 Camera started successfully");
        console.log('📹 Camera stream ready:', stream);
        console.log('📹 Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
        
      } catch (cameraError) {
        console.warn('Camera access failed:', cameraError);
        addToSessionLog("⚠️ Camera access denied - using mock video");
        
        // Set default canvas size for mock mode
        if (canvasRef.current) {
          canvasRef.current.width = 640;
          canvasRef.current.height = 480;
        }
      }
      
      // Start pose detection loop
      if (mediaPipePose && videoRef.current?.srcObject) {
        console.log('🎯 Starting real MediaPipe pose detection loop...');
        
        const detectPose = async () => {
          if (videoRef.current && mediaPipePose && wellnessState.isActive) {
            try {
              // CRITICAL: pose.send() must be the first line (from web research)
              await mediaPipePose.send({ image: videoRef.current });
              
              // Continue the loop
              requestAnimationFrame(detectPose);
            } catch (error) {
              console.warn('Pose detection error:', error);
              // Continue loop even on error
              requestAnimationFrame(detectPose);
            }
          }
        };
        
        // Start the detection loop
        detectPose();
        addToSessionLog("🎯 Real MediaPipe pose tracking active");
        
      } else {
        console.log('⚠️ MediaPipe or camera not available, using mock mode');
        console.log('MediaPipe available:', !!mediaPipePose);
        console.log('Camera stream available:', !!videoRef.current?.srcObject);
        
        // Start mock pose tracking
        startMockPoseTracking();
        addToSessionLog("🎭 Mock pose tracking active (MediaPipe or camera unavailable)");
      }
      
    } catch (error) {
      console.error('Pose tracking setup error:', error);
      addToSessionLog("⚠️ Using fallback mock tracking");
      
      // Fallback to mock tracking
      if (canvasRef.current) {
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
      }
      startMockPoseTracking();
    }
  };

  // Stop pose tracking
  const stopPoseTracking = () => {
    setPoseTrackingActive(false);
    addToSessionLog("🎯 Pose tracking stopped");
  };

  // Change session type
  const changeSessionType = (type: "posture" | "mindfulness" | "exercise") => {
    setWellnessState(prev => ({
      ...prev,
      sessionType: type,
    }));
  };

  // Change session duration
  const changeDuration = (minutes: number) => {
    setWellnessState(prev => ({
      ...prev,
      duration: minutes * 60,
    }));
  };

  // Media stream controls (same as ControlTray.tsx)
  useEffect(() => {
    const onData = (base64: string) => {
      if (client && connected) {
        client.sendRealtimeInput([
          {
            mimeType: "audio/pcm;rate=16000",
            data: base64,
          },
        ]);
      }
    };
    
    if (connected && !muted && audioRecorder && client) {
      // Initialize audio recorder (same as ControlTray.tsx)
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }
    
    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  // Remove manual audio initialization - context handles this automatically

  // Video stream handling (same as ControlTray)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
    }

    let timeoutId = -1;

    function sendVideoFrame() {
      const video = videoRef.current;
      const canvas = renderCanvasRef.current;

      if (!video || !canvas) {
        return;
      }

      const ctx = canvas.getContext("2d")!;
      canvas.width = video.videoWidth * 0.25;
      canvas.height = video.videoHeight * 0.25;
      if (canvas.width + canvas.height > 0 && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 1.0);
        const data = base64.slice(base64.indexOf(",") + 1, Infinity);
        if (client && connected) {
          client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
        }
      }
      if (connected) {
        timeoutId = window.setTimeout(sendVideoFrame, 1000 / 0.5);
      }
    }
    if (connected && activeVideoStream !== null) {
      requestAnimationFrame(sendVideoFrame);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connected, activeVideoStream, client, videoRef]);

  // Stream switching (same as ControlTray)
  const changeStreams = (next?: UseMediaStreamResult) => async () => {
    if (next) {
      const mediaStream = await next.start();
      setActiveVideoStream(mediaStream);
    } else {
      setActiveVideoStream(null);
    }

    videoStreams.filter((msr) => msr !== next).forEach((msr) => msr.stop());
  };

  // Manual retry connection function
  const retryConnection = useCallback(async () => {
    if (isConnecting) return;
    
    console.log("🔄 Manual retry connection...");
    setIsConnecting(true);
    
    try {
      await connect();
      console.log("✅ Retry connection successful");
    } catch (error) {
      console.error("❌ Retry connection failed:", error);
      setHasAttemptedConnection(false); // Allow another retry
    } finally {
      setIsConnecting(false);
    }
  }, [connect, isConnecting]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-primary">
        🎯 AI Wellness & Posture Coach
      </h1>

      {/* Media Controls for Camera/Mic */}
      <div className="mb-6">
        <ControlTray
          videoRef={videoRef}
          supportsVideo={true}
          onVideoStreamChange={setVideoStream}
          enableEditingSettings={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Session Setup & Monitoring */}
        <div className="lg:col-span-2 space-y-6">
          {/* Session Configuration */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-primary">Session Setup</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Session Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Type
                </label>
                <select
                  value={wellnessState.sessionType}
                  onChange={(e) => changeSessionType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  disabled={wellnessState.isActive}
                >
                  <option value="posture">Posture Correction</option>
                  <option value="mindfulness">Mindfulness & Wellness</option>
                  <option value="exercise">Exercise Form</option>
                </select>
              </div>

              {/* Session Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <select
                  value={wellnessState.duration / 60}
                  onChange={(e) => changeDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  disabled={wellnessState.isActive}
                >
                  <option value={2}>2 minutes</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                </select>
              </div>
            </div>
            {/* REMOVE: Control Buttons for connect/disconnect, only keep Start/End Wellness Session */}
            <div className="flex justify-center gap-4">
              {!wellnessState.isActive ? (
                <button
                  onClick={startWellnessSession}
                  disabled={!connected}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  🎯 Start Wellness Session
                </button>
              ) : (
                <button
                  onClick={stopWellnessSession}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  ⏹️ End Session
                </button>
              )}
            </div>
          </div>

          {/* Real-Time Posture Monitoring */}
          {wellnessState.isActive && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-4 text-primary">Posture Monitoring</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Posture Score */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {wellnessState.postureScore}
                  </div>
                  <div className="text-sm text-gray-600">Posture Score</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${wellnessState.postureScore}%` }}
                    ></div>
                  </div>
                </div>

                {/* Spine Alignment */}
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    wellnessState.spineAlignment === 'good' ? 'text-accent' :
                    wellnessState.spineAlignment === 'fair' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {wellnessState.spineAlignment === 'good' ? '✅' :
                     wellnessState.spineAlignment === 'fair' ? '⚠️' : '❌'}
                  </div>
                  <div className="text-sm text-gray-600">Spine</div>
                  <div className="text-xs text-gray-500 mt-1 capitalize">
                    {wellnessState.spineAlignment}
                  </div>
                </div>

                {/* Shoulder Level */}
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    wellnessState.shoulderLevel === 'even' ? 'text-accent' : 'text-red-600'
                  }`}>
                    {wellnessState.shoulderLevel === 'even' ? '✅' : '❌'}
                  </div>
                  <div className="text-sm text-gray-600">Shoulders</div>
                  <div className="text-xs text-gray-500 mt-1 capitalize">
                    {wellnessState.shoulderLevel}
                  </div>
                </div>

                {/* Head Position */}
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    wellnessState.headPosition === 'neutral' ? 'text-accent' : 'text-red-600'
                  }`}>
                    {wellnessState.headPosition === 'neutral' ? '✅' : '❌'}
                  </div>
                  <div className="text-sm text-gray-600">Head</div>
                  <div className="text-xs text-gray-500 mt-1 capitalize">
                    {wellnessState.headPosition}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pose Tracking Visualization */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-primary">Pose Tracking</h2>
            
            <div className="relative">
              {/* Video element for pose tracking */}
              <video
                ref={videoRef}
                className="w-full h-64 bg-gray-900 rounded-lg"
                autoPlay
                playsInline
                muted
                style={{ display: wellnessState.isActive ? 'block' : 'none' }}
              />
              
              {/* Canvas overlay for pose landmarks */}
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-64 rounded-lg pointer-events-none"
                style={{ display: wellnessState.isActive ? 'block' : 'none' }}
              />
              
              {/* Placeholder when not active */}
              {!wellnessState.isActive && (
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-4xl mb-2">📹</div>
                    <p>Start a wellness session to see pose tracking</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pose Tracking */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pose Tracking
            </label>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              {wellnessState.isActive ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">Active</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {poseTrackingActive ? 
                      "Real-time pose analysis" : 
                      "🎭 Mock mode (development)"
                    }
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">
                  Start a wellness session to see pose tracking
                </div>
              )}
            </div>
          </div>

          {/* Pose Tracking Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold mb-3 text-primary">
              🧘 Meditation Session & AI Voice Coaching Status
            </h3>
            
            {/* Manual Connection Control */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">🔌 Connection Control</span>
                <button
                  onClick={() => {
                    if (!connected && !isConnecting) {
                      retryConnection();
                    } else if (connected) {
                      console.log("🔌 Manual disconnect...");
                      disconnect();
                    }
                  }}
                  disabled={isConnecting}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : connected ? 'Disconnect' : 'Connect to AI'}
                </button>
              </div>
              <div className="text-xs text-blue-600">
                {!hasAttemptedConnection ? 'Click to connect to Gemini Live API' : 
                 isConnecting ? 'Connecting...' : 
                 connected ? 'Connected successfully!' : 
                 'Connection failed. Click to retry.'}
              </div>
            </div>
            
            {/* Connection Status Debug */}
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">🔍 Connection Debug Info</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-medium">Context Connected:</span>
                  <span className={connected ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                    {connected ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Is Connecting:</span>
                  <span className={isConnecting ? 'text-blue-600 ml-1' : 'text-gray-600 ml-1'}>
                    {isConnecting ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Has Attempted:</span>
                  <span className={hasAttemptedConnection ? 'text-blue-600 ml-1' : 'text-gray-600 ml-1'}>
                    {hasAttemptedConnection ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Client Available:</span>
                  <span className={client ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                    {client ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs text-yellow-700">
                💡 If connection disconnects immediately, check the console for errors
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span>🎯 Pose Tracking:</span>
                <span className={poseTrackingActive ? 'text-green-600 font-medium' : 'text-red-600'}>
                  {poseTrackingActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span>🤖 AI Coach:</span>
                <span className={connected ? 'text-green-600 font-medium' : 'text-red-600'}>
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span>🎵 Voice System:</span>
                <span className={connected ? 'text-green-600 font-medium' : 'text-red-600'}>
                  {connected ? 'Gemini Live Active' : 'Not Connected'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span>📊 Analysis:</span>
                <span className={wellnessState.isActive ? 'text-green-600 font-medium' : 'text-gray-600'}>
                  {wellnessState.isActive ? 'Live' : 'Paused'}
                </span>
              </div>
            </div>
            
            {/* Media Status during Session */}
            {wellnessState.isActive && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <span>🎤</span>
                  <span>Voice and camera automatically activated for wellness session</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
                  <span>📹</span>
                  <span>Webcam: {activeVideoStream ? 'Active' : 'Starting...'}</span>
                  <span>•</span>
                  <span>Audio: {!muted ? 'Recording' : 'Muted'}</span>
                  <span>•</span>
                  <span>Volume: {Math.round(inVolume * 100)}%</span>
                </div>
              </div>
            )}
            
            <p className="text-sm text-gray-600 mt-3">
              💡 The AI provides continuous meditation guidance every 6 seconds while tracking your pose. 
              Pose analysis works continuously during meditation sessions, even while the AI is speaking.
            </p>
          </div>

          {/* Session Log */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-primary">Session Log</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto">
              {sessionLog.length === 0 ? (
                <p className="text-gray-500 text-center">
                  {wellnessState.isActive 
                    ? 'Session active - guidance will appear here...' 
                    : 'Start a wellness session to see guidance and feedback'}
                </p>
              ) : (
                sessionLog.map((log, index) => (
                  <div key={index} className="text-sm text-gray-700 mb-2 p-2 bg-white rounded border-l-4 border-blue-500">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Progress Tracking */}
        <div className="space-y-6">
          <ProgressTracker
            progress={progress}
            currentStreak={currentStreak}
            totalSessions={totalSessions}
            totalMinutes={totalMinutes}
          />
        </div>
      </div>

      {/* Hidden audio element for wellness guidance */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Analysis Cards */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-primary">
          🎯 Real-time Analysis & AI Voice Feedback
          {connected && <span className="ml-2 text-accent">🤖 AI Coach Active</span>}
        </h3>
        
        <div className="space-y-3">
          {analysisCards.map((card) => (
            <div
              key={card.id}
              className={`p-4 rounded-lg border-l-4 shadow-sm ${
                card.severity === 'good' 
                  ? 'border-accent bg-green-50' 
                  : card.severity === 'warning'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-red-500 bg-red-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {card.type === 'posture' && '📐'}
                    {card.type === 'feedback' && '✅'}
                    {card.type === 'improvement' && '💡'}
                    {' '}{card.title}
                  </h4>
                  <p className="text-gray-700 text-sm">{card.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {card.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {analysisCards.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🎯</div>
              <p>Start a wellness session to see real-time posture analysis and voice feedback!</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for video processing */}
      <canvas style={{ display: "none" }} ref={renderCanvasRef} />
      {/* Camera/Mic status warning */}
      {wellnessState.isActive && (!activeVideoStream || muted) && (
        <div className="mb-4 p-3 bg-red-100 rounded-lg border border-red-300 text-red-700 text-center">
          <strong>Warning:</strong> Please activate your camera and microphone using the controls below for full AI coaching experience.
        </div>
      )}
    </div>
  );
}
