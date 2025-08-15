"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLiveAPI } from "../hooks/use-live-api";
import { MediaResolution, Modality } from "@google/genai";
import { AudioRecorder } from "../lib/audio-recorder";

interface Message {
  role: "assistant" | "user";
  text: string;
}

// Simple AudioPulse component
function AudioPulse({ active, volume }: { active: boolean; volume: number }) {
  const lines = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    let timeout: number | null = null;
    const update = () => {
      lines.current.forEach(
        (line, i) =>
        (line.style.height = `${Math.min(
          24,
          4 + volume * (i === 1 ? 400 : 60),
        )}px`),
      );
      timeout = window.setTimeout(update, 100);
    };

    update();

    return () => clearTimeout((timeout as number)!);
  }, [volume]);

  return (
    <div className={`flex gap-1 items-end h-6 ${active ? 'opacity-100' : 'opacity-50'}`}>
      {Array(3)
        .fill(null)
        .map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              if (el) lines.current[i] = el;
            }}
            className="w-1 bg-blue-500 rounded-full transition-all duration-100"
            style={{ animationDelay: `${i * 133}ms` }}
          />
        ))}
    </div>
  );
}

export default function GeminiLive() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [activeVideoStream, setActiveVideoStream] = useState<MediaStream | null>(null);
  const [textInput, setTextInput] = useState("");
  
  // Video elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Audio recorder
  const [audioRecorder] = useState(() => new AudioRecorder());
  
  // Use the official hook
  const {
    client,
    setConfig,
    setModel,
    connected,
    connect,
    disconnect,
    volume
  } = useLiveAPI({ apiKey: "AIzaSyDC0iV_N65TnzPnBEuMTOziLchLV-IbnJE" });

  // Set up the configuration - EXACT SAME AS WORKING APP
  useEffect(() => {
    console.log("🔧 Setting up configuration...");
    setModel("models/gemini-2.0-flash-exp");
    const config = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { 
          prebuiltVoiceConfig: { 
            voiceName: "Aoede" 
          } 
        },
      },
      systemInstruction: {
        parts: [
          {
            text: 'You are my helpful assistant. Respond to my questions and requests in a conversational way. Always respond with voice.',
          },
        ],
      },
      tools: [
        // Add Google Search tool like in the working example
        { googleSearch: {} },
      ],
    };
    console.log("📋 Config:", config);
    setConfig(config);
  }, [setConfig, setModel]);

  // Handle content responses
  useEffect(() => {
    const onContent = (content: any) => {
      console.log("📝 Received content from Gemini:", content);
      if (content.modelTurn?.parts) {
        const text = content.modelTurn.parts[0]?.text;
        if (text) {
          console.log("📝 Received text from Gemini:", text);
          setMessages(prev => [...prev, { role: "assistant", text }]);
        }
      }
    };

    const onError = (error: ErrorEvent) => {
      console.error("❌ Gemini Live API error:", error.message);
      setError(error.message);
    };

    const onClose = (event: CloseEvent) => {
      console.log("🔌 Gemini Live API connection closed:", event.reason);
    };

    const onAudio = (data: ArrayBuffer) => {
      console.log("🎵 Received audio data from Gemini:", data.byteLength, "bytes");
    };

    client
      .on("content", onContent)
      .on("error", onError)
      .on("close", onClose)
      .on("audio", onAudio);

    return () => {
      client
        .off("content", onContent)
        .off("error", onError)
        .off("close", onClose)
        .off("audio", onAudio);
    };
  }, [client]);

  // Handle audio recording - EXACT SAME PATTERN AS WORKING VERSION
  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };
    if (connected && !muted && audioRecorder) {
      audioRecorder.on("data", onData).start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off("data", onData);
    };
  }, [connected, client, muted, audioRecorder]);

  // Handle video stream - EXACT SAME PATTERN AS WORKING VERSION
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
        client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
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

  // Start webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 }
        }
      });
      setActiveVideoStream(stream);
    } catch (err: any) {
      console.error('Error starting webcam:', err);
      setError(err.message);
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    if (activeVideoStream) {
      activeVideoStream.getTracks().forEach(track => track.stop());
      setActiveVideoStream(null);
    }
  };

  // Handle text message submission
  const handleSubmit = () => {
    if (textInput.trim() && connected) {
      console.log("📤 Sending message:", textInput);
      client.send([{ text: textInput }]);
      setMessages(prev => [...prev, { role: "user", text: textInput }]);
      setTextInput("");
      console.log("✅ Message sent successfully");
    } else {
      console.log("❌ Cannot send message:", { 
        hasText: !!textInput.trim(), 
        connected 
      });
    }
  };

  // Handle connection
  const handleConnect = async () => {
    if (!connected) {
      try {
        await connect();
        setError(null);
      } catch (error) {
        console.error("❌ Failed to connect:", error);
        setError("Failed to connect to Gemini Live API");
      }
    } else {
      disconnect();
    }
  };

  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">🎤 Talk to Gemini Live</h1>
      
      {/* Connection Status */}
      <div className="mb-4">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
        <div className="text-xs text-gray-600 mt-1">
          {connected ? 'Ready to start recording' : 'Click connect to start'}
        </div>
        {error && (
          <div className="text-xs text-red-600 mt-1">Error: {error}</div>
        )}
      </div>

      {/* Video Preview */}
      <div className="flex justify-center mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-64 h-48 border rounded-lg bg-black"
        />
      </div>

      {/* Hidden canvas for video capture */}
      <canvas
        ref={renderCanvasRef}
        style={{ display: 'none' }}
      />

      {/* Controls */}
      <div className="flex justify-center gap-4 mb-4">
        {/* Connect/Disconnect Button */}
        <button
          className={`px-4 py-2 rounded-lg transition-colors ${
            connected ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'
          }`}
          onClick={handleConnect}
        >
          {connected ? '⏸️ Disconnect' : '▶️ Connect'}
        </button>

        {/* Mute/Unmute Button */}
        <button
          className={`px-4 py-2 rounded-lg transition-colors ${
            muted ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}
          onClick={() => setMuted(!muted)}
          disabled={!connected}
        >
          {muted ? '🔇 Unmute' : '🎤 Mute'}
        </button>

        {/* Webcam Button */}
        <button
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeVideoStream ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          onClick={activeVideoStream ? stopWebcam : startWebcam}
          disabled={!connected}
        >
          {activeVideoStream ? '📹 Stop Camera' : '📹 Start Camera'}
        </button>
      </div>

      {/* Audio Pulse Indicator */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-4">
          <AudioPulse active={connected} volume={volume} />
          <span className="text-xs text-gray-600">Audio Output</span>
        </div>
      </div>

      {/* Text Input - Like the working app */}
      <div className="flex justify-center mb-4">
        <div className="flex gap-2 max-w-md w-full">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Type a message and press Enter..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!connected}
          />
          <button
            onClick={handleSubmit}
            disabled={!connected || !textInput.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="border p-4 rounded-lg max-w-lg mx-auto text-left h-60 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center">
            {connected ? 'Connected! Start speaking to begin the conversation.' : 'Connect to start talking with Gemini Live!'}
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`mb-2 p-2 rounded ${
                m.role === "assistant" 
                  ? "text-blue-600 bg-blue-50" 
                  : "text-gray-800 bg-gray-50"
              }`}
            >
              {m.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
} 