"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

export default function SidePanel() {
  const { connected, client } = useLiveAPIContext();
  const [textInput, setTextInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (textInput.trim() && connected) {
      client.send([{ text: textInput }]);
      setTextInput("");
      if (inputRef.current) {
        inputRef.current.innerText = "";
      }
    }
  };

  return (
    <div className="side-panel">
      <header className="top">
        <h2>Console</h2>
      </header>
      <section className="indicators">
        <div className={`streaming-indicator ${connected ? 'connected' : ''}`}>
          {connected ? "🔵 Streaming" : "⏸️ Paused"}
        </div>
      </section>
      <div className={`input-container ${!connected ? 'disabled' : ''}`}>
        <div className="input-content">
          <textarea
            className="input-area"
            ref={inputRef}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit();
              }
            }}
            onChange={(e) => setTextInput(e.target.value)}
            value={textInput}
            placeholder="Type something..."
          />
          <button
            className="send-button"
            onClick={handleSubmit}
            disabled={!connected || !textInput.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
} 