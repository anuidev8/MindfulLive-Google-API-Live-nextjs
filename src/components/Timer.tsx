
function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }
export function CircularCountdown({ duration, timeLeft }: { duration: number; timeLeft: number }) {
    const radius = 90;
    const stroke = 10;
    const normalizedRadius = radius - stroke / 2;
    const circumference = 2 * Math.PI * normalizedRadius;
    const progress = duration > 0 ? timeLeft / duration : 0;
    const offset = circumference * (1 - progress);
  
    return (
      <div
        style={{
          position: "relative",
          width: 2 * radius,
          height: 2 * radius,
          background: "rgba(255,255,255,0.18)",
          borderRadius: "50%",
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.18)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "2px solid rgba(255,255,255,0.25)",
        }}
      >
        <svg width={2 * radius} height={2 * radius} style={{ position: "absolute", top: 0, left: 0 }}>
          <circle
            stroke="#e0e7ef"
            fill="none"
            strokeWidth={stroke}
            cx={radius}
            cy={radius}
            r={normalizedRadius}
          />
          <circle
            stroke="url(#timer-gradient)"
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
          <defs>
            <linearGradient id="timer-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
          </defs>
        </svg>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.8rem",
            fontWeight: 700,
            color: "#fff",
            textShadow: "0 2px 16px #38bdf8, 0 1px 2px #0008",
            userSelect: "none",
            letterSpacing: 2,
          }}
        >
          {formatTime(timeLeft)}
        </div>
      </div>
    );
  }