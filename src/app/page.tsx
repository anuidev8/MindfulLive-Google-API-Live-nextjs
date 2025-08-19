"use client";

import { useEffect, useRef, useState } from "react";
import { LiveAPIProvider } from "../contexts/LiveAPIContext";
import SidePanel from "../components/side-panel/SidePanel";

import ControlTray from "../components/control-tray/ControlTray";
import WellnessGuide from "../components/meditation/MeditationGuide";
import cn from "classnames";
import { LiveClientOptions } from "../types";
import {
  FunctionDeclaration,
  LiveServerToolCall,
  Modality,
  Type,
} from "@google/genai";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveAPIContext } from "../contexts/LiveAPIContext";
import { CircularCountdown } from "@/components/Timer";
import MeditationGuide from "../components/meditation/MeditationGuide";
import { FiUser } from "react-icons/fi";


const API_KEY = "AIzaSyDC0iV_N65TnzPnBEuMTOziLchLV-IbnJE";

const apiOptions: LiveClientOptions = {
  apiKey: API_KEY,
};




export default function Home() {
 

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#38bdf8]/70 via-[#22d3ee]/60 to-[#4ade80]/70 z-0 pointer-events-none opacity-70" />
      <div className="relative z-10">
        <LiveAPIProvider options={apiOptions}>
           {/* Profile/User Icon */}
      <div className="absolute top-0 right-0 m-4">
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/30 backdrop-blur-xl shadow-lg border border-white/30">
          <FiUser className="text-2xl text-white" />
        </div>
      </div>
         <MeditationGuide />
        </LiveAPIProvider>
      </div>
    </div>
  );
}
