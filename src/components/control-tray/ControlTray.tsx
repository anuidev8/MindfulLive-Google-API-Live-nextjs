"use client";

import cn from "classnames";
import { memo, ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { useWebcam } from "../../hooks/use-webcam";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiMonitor, FiUser, FiPlay, FiPause } from "react-icons/fi";

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
  enableEditingSettings?: boolean;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  start: () => Promise<any>;
  stop: () => any;
};

const MediaStreamButton = memo(
  ({ isStreaming, onIcon, offIcon, start, stop }: MediaStreamButtonProps) =>
    isStreaming ? (
      <button
        className="p-4 rounded-full bg-white/30 hover:bg-white/50 shadow-lg transition"
        onClick={stop}
        aria-label="media-stream-on"
      >
        {onIcon}
      </button>
    ) : (
      <button
        className="p-4 rounded-full bg-white/30 hover:bg-white/50 shadow-lg transition"
        onClick={start}
        aria-label="media-stream-off"
      >
        {offIcon}
      </button>
    )
);

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
}: ControlTrayProps) {
  const videoStreams = [useWebcam(), useScreenCapture()];
  const [activeVideoStream, setActiveVideoStream] =
    useState<MediaStream | null>(null);
  const [webcam, screenCapture] = videoStreams;
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

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
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

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
      if (canvas.width + canvas.height > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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

  const changeStreams = (next?: UseMediaStreamResult) => async () => {
    if (next) {
      const mediaStream = await next.start();
      setActiveVideoStream(mediaStream);
      onVideoStreamChange(mediaStream);
    } else {
      setActiveVideoStream(null);
      onVideoStreamChange(null);
    }

    videoStreams.filter((msr) => msr !== next).forEach((msr) => msr.stop());
  };

  return (
    <section className="w-full flex flex-col items-center gap-4 mt-6 relative">
     
      <canvas style={{ display: "none" }} ref={renderCanvasRef} />

      {/* Actions Row */}
      <nav
        className={cn(
          "flex items-center justify-center gap-6 p-4 bg-white/30 rounded-2xl shadow-2xl border border-white/30",
         
        )}
      >
        {/* Mic Toggle */}
        <button
          className={cn("p-4 rounded-full bg-white/30 hover:bg-white/50 shadow-lg transition", {
            "opacity-50 pointer-events-none": !connected
          })}
          onClick={() => setMuted(!muted)}
          aria-label="Toggle microphone"
        >
          {muted ? (
            <FiMicOff className="text-2xl" style={{ color: "#f87171" }} />
          ) : (
            <FiMic className="text-2xl" style={{ color: "#38bdf8" }} />
          )}
        </button>

       

        {/* Video controls */}
        {supportsVideo && (
          <>
           <MediaStreamButton
  isStreaming={screenCapture.isStreaming}
  start={changeStreams(screenCapture)}
  stop={changeStreams()}
  onIcon={<FiMonitor className="text-2xl text-blue-400" />}
  offIcon={<FiMonitor className="text-2xl text-blue-400" />}
/>
            <MediaStreamButton
              isStreaming={webcam.isStreaming}
              start={changeStreams(webcam)}
              stop={changeStreams()}
              onIcon={<FiVideoOff className="text-2xl text-blue-400" />}
              offIcon={<FiVideo className="text-2xl text-blue-400" />}
            />
          </>
        )}
          {/* Connection Section */}
      <div className="flex flex-col items-center gap-2">
        <button
          ref={connectButtonRef}
          className={cn(
            "w-16 h-16 flex items-center justify-center rounded-full shadow-xl transition-all duration-200 ",
            connected
              ? "bg-gradient-to-br from-cyan-400 to-blue-600  hover:ring-4 hover:ring-cyan-200"
              : "bg-gradient-to-br from-pink-400 to-red-600  hover:ring-4 hover:ring-pink-200"
          )}
          onClick={connected ? disconnect : connect}
          aria-label={connected ? "Disconnect" : "Connect"}
        >
          {connected ? (
            <FiPause className="text-3xl text-white" />
          ) : (
            <FiPlay className="text-3xl text-white" />
          )}
        </button>
      </div>
      <span className="text-sm font-medium text-gray-600">
          {connected ? "Streaming" : "Disconnected"}
        </span>
        {children}
      </nav>
     
    
    </section>
  );
}

export default memo(ControlTray);
