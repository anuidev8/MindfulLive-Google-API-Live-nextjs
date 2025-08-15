"use client";

import { useRef, useState } from "react";
import { LiveAPIProvider } from "../contexts/LiveAPIContext";
import SidePanel from "../components/side-panel/SidePanel";
import { Altair } from "../components/altair/Altair";
import ControlTray from "../components/control-tray/ControlTray";
import WellnessGuide from "../components/meditation/MeditationGuide";
import cn from "classnames";
import { LiveClientOptions } from "../types";

const API_KEY = "AIzaSyDC0iV_N65TnzPnBEuMTOziLchLV-IbnJE";

const apiOptions: LiveClientOptions = {
  apiKey: API_KEY,
};

export default function Home() {
  // this video reference is used for displaying the active stream, whether that is the webcam or screen capture
  // feel free to style as you see fit
  const videoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "wellness">("chat");

  return (
    <div className="App">
      <div className="streaming-console">
        
        <main>
        <LiveAPIProvider options={apiOptions}>
                <WellnessGuide />
              </LiveAPIProvider>

         
        </main>
      </div>
    </div>
  );
}
