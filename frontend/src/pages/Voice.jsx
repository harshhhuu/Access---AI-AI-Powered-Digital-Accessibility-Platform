import { useVoiceNav, COMMANDS } from "../hooks/useVoiceNav";
import {
  Mic, MicOff, Volume2, Trash2,
  Navigation, Type, BookOpen, AlertCircle,
  CheckCircle2, XCircle, ChevronRight,
} from "lucide-react";

const CATEGORY_META = {
  navigation:   { label: "Navigation",    color: "#0369a1", bg: "#e0f2fe", icon: Navigation },
  accessibility:{ label: "Accessibility", color: "#7c3aed", bg: "#ede9fe", icon: Type       },
  reading:      { label: "Reading",       color: "#065f46", bg: "#d1fae5", icon: BookOpen    },
};

export default function Voice() {
  const {
    isListening,
    transcript,
    interimText,
    lastAction,
    supported,
    transcriptLog,
    toggleListening,
    clearLog,
  } = useVoiceNav();

  const categories = ["navigation", "accessibility", "reading"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=JetBrains+Mono:wght@400;600&family=DM+Sans:wght@400;500;600&display=swap');

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* Mic rings */
        @keyframes ring1 {
          0%,100% { transform:scale(1);   opacity:0.5; }
          50%      { transform:scale(1.35); opacity:0; }
        }
        @keyframes ring2 {
          0%,100% { transform:scale(1);   opacity:0.35; }
          50%      { transform:scale(1.6);  opacity:0; }
        }
        @keyframes ring3 {
          0%,100% { transform:scale(1);   opacity:0.2; }
          50%      { transform:scale(1.85); opacity:0; }
        }
        @keyframes micGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.6), 0 8px 32px rgba(124,58,237,0.4); }
          50%      { box-shadow: 0 0 0 16px rgba(124,58,237,0), 0 8px 48px rgba(124,58,237,0.7); }
        }
        @keyframes waveBar {
          0%,100% { height: 8px; }
          50%      { height: 32px; }
        }
        @keyframes actionSlide {
          from { opacity:0; transform:translateX(-12px); }
          to   { opacity:1; transform:translateX(0); }
        }

        .vn-root {
          font-family: 'DM Sans', sans-serif;
          min-height: calc(100vh - 64px);
          padding: 2rem 0;
        }

        /* ── Header ── */
        .vn-header {
          margin-bottom: 2.5rem;
          animation: fadeUp 0.4s ease both;
        }
        .vn-eyebrow {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #0369a1;
          margin-bottom: 0.5rem;
        }
        .vn-title {
          font-family: 'Syne', sans-serif;
          font-weight: 900;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          letter-spacing: -0.03em;
          color: var(--text-primary, #0f172a);
          margin: 0 0 0.4rem;
        }
        .vn-sub {
          color: var(--text-secondary, #64748b);
          font-size: 0.95rem;
        }

        /* ── Layout ── */
        .vn-layout {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 1.5rem;
          align-items: start;
        }

        /* ── Left col ── */
        .vn-left {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          animation: fadeUp 0.5s 0.1s ease both;
        }

        /* Mic card */
        .mic-card {
          background: var(--card-bg, #f8fafc);
          border: 1px solid var(--border-color, #e8e8e8);
          border-radius: 24px;
          padding: 2.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .mic-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #0369a1, #7c3aed, #0369a1);
          background-size: 200%;
          animation: shimmerBar 3s linear infinite;
        }
        @keyframes shimmerBar {
          0%   { background-position: 0%; }
          100% { background-position: 200%; }
        }

        /* Mic button + rings */
        .mic-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 120px;
          height: 120px;
        }
        .mic-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid rgba(124,58,237,0.4);
          pointer-events: none;
        }
        .mic-ring-1 { animation: ring1 1.6s ease-in-out infinite; }
        .mic-ring-2 { animation: ring2 1.6s 0.2s ease-in-out infinite; }
        .mic-ring-3 { animation: ring3 1.6s 0.4s ease-in-out infinite; }

        .mic-btn {
          position: relative;
          z-index: 2;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s ease;
          background: linear-gradient(135deg, #1e3a5f, #1e40af);
          color: #fff;
          box-shadow: 0 8px 32px rgba(3,105,161,0.4);
        }
        .mic-btn.listening {
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          animation: micGlow 1.5s ease-in-out infinite;
        }
        .mic-btn:hover {
          transform: scale(1.07);
        }
        .mic-btn:active {
          transform: scale(0.96);
        }

        /* Sound wave bars */
        .wave-bars {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 36px;
        }
        .wave-bar {
          width: 4px;
          border-radius: 4px;
          background: #7c3aed;
          height: 8px;
          transition: height 0.1s;
        }
        .wave-bar.active:nth-child(1) { animation: waveBar 0.6s 0.0s ease-in-out infinite; }
        .wave-bar.active:nth-child(2) { animation: waveBar 0.6s 0.1s ease-in-out infinite; }
        .wave-bar.active:nth-child(3) { animation: waveBar 0.6s 0.05s ease-in-out infinite; }
        .wave-bar.active:nth-child(4) { animation: waveBar 0.6s 0.15s ease-in-out infinite; }
        .wave-bar.active:nth-child(5) { animation: waveBar 0.6s 0.08s ease-in-out infinite; }
        .wave-bar.inactive {
          background: var(--border-color, #e2e8f0);
          height: 8px;
        }

        .mic-status-text {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-primary, #0f172a);
        }
        .mic-status-sub {
          font-size: 0.8rem;
          color: var(--text-secondary, #94a3b8);
          margin-top: 0.2rem;
        }

        /* Unsupported */
        .unsupported-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 12px;
          padding: 0.875rem 1rem;
          color: #ef4444;
          font-size: 0.85rem;
          font-weight: 500;
        }

        /* Transcript box */
        .transcript-card {
          background: var(--card-bg, #f8fafc);
          border: 1px solid var(--border-color, #e8e8e8);
          border-radius: 18px;
          padding: 1.25rem;
        }
        .transcript-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.875rem;
        }
        .transcript-title {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--text-primary, #0f172a);
        }
        .clear-btn {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary, #94a3b8);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          transition: all 0.15s;
        }
        .clear-btn:hover { background: #fee2e2; color: #ef4444; }

        .transcript-live {
          min-height: 56px;
          background: var(--bg-primary, #fff);
          border: 1px solid var(--border-color, #e8e8e8);
          border-radius: 10px;
          padding: 0.75rem 1rem;
          margin-bottom: 0.75rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          color: var(--text-primary, #0f172a);
          position: relative;
        }
        .transcript-interim {
          color: var(--text-secondary, #94a3b8);
          font-style: italic;
        }
        .transcript-cursor {
          display: inline-block;
          width: 2px;
          height: 14px;
          background: #7c3aed;
          margin-left: 2px;
          vertical-align: middle;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0;} }

        .transcript-log {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          max-height: 160px;
          overflow-y: auto;
        }
        .log-item {
          font-size: 0.78rem;
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-secondary, #64748b);
          padding: 0.3rem 0.5rem;
          border-radius: 6px;
          background: var(--bg-primary, #fff);
          border-left: 2px solid var(--border-color, #e8e8e8);
        }
        .log-item:first-child {
          border-left-color: #7c3aed;
          color: var(--text-primary, #0f172a);
        }

        /* Last action feedback */
        .action-feedback {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          animation: actionSlide 0.3s ease both;
          background: var(--card-bg, #f8fafc);
          border: 1px solid var(--border-color, #e8e8e8);
        }
        .action-feedback.success {
          background: rgba(74,222,128,0.1);
          border-color: rgba(74,222,128,0.3);
          color: #16a34a;
        }
        .action-feedback.fail {
          background: rgba(239,68,68,0.08);
          border-color: rgba(239,68,68,0.2);
          color: #dc2626;
        }

        /* ── Right col — command list ── */
        .vn-right {
          animation: fadeUp 0.5s 0.2s ease both;
        }
        .commands-card {
          background: var(--card-bg, #f8fafc);
          border: 1px solid var(--border-color, #e8e8e8);
          border-radius: 20px;
          overflow: hidden;
        }
        .commands-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-color, #e8e8e8);
        }
        .commands-title {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1rem;
          color: var(--text-primary, #0f172a);
          margin-bottom: 0.25rem;
        }
        .commands-sub {
          font-size: 0.78rem;
          color: var(--text-secondary, #94a3b8);
        }

        .category-block {
          border-bottom: 1px solid var(--border-color, #e8e8e8);
        }
        .category-block:last-child { border-bottom: none; }

        .cat-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem 0.5rem;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .cat-icon {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cmd-list {
          padding: 0 1rem 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .cmd-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          border-radius: 9px;
          transition: background 0.15s;
          cursor: default;
        }
        .cmd-item:hover {
          background: var(--bg-primary, #fff);
        }
        .cmd-arrow {
          flex-shrink: 0;
          opacity: 0.4;
        }
        .cmd-desc {
          font-size: 0.825rem;
          color: var(--text-primary, #0f172a);
          font-weight: 500;
          flex: 1;
        }
        .cmd-keywords {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }
        .cmd-kw {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          background: var(--bg-primary, #fff);
          border: 1px solid var(--border-color, #e2e8f0);
          color: var(--text-secondary, #64748b);
        }

        @media (max-width: 900px) {
          .vn-layout { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="vn-root">

        {/* Header */}
        <div className="vn-header">
          <div className="vn-eyebrow">
            <Mic size={14} /> Voice Navigator
          </div>
          <h1 className="vn-title">Control with your voice.</h1>
          <p className="vn-sub">
            Start once here or from the navbar, then keep navigating the whole site hands-free.
          </p>
        </div>

        {!supported && (
          <div className="unsupported-banner" style={{ marginBottom: "1.5rem" }}>
            <AlertCircle size={18} />
            Your browser doesn't support SpeechRecognition. Please use Chrome or Edge.
          </div>
        )}

        <div className="vn-layout">

          {/* ── LEFT ── */}
          <div className="vn-left">

            {/* Mic card */}
            <div className="mic-card">
              <div className="mic-wrap">
                {isListening && (
                  <>
                    <div className="mic-ring mic-ring-1" />
                    <div className="mic-ring mic-ring-2" />
                    <div className="mic-ring mic-ring-3" />
                  </>
                )}
                <button
                  className={`mic-btn ${isListening ? "listening" : ""}`}
                  onClick={toggleListening}
                  disabled={!supported}
                  title={isListening ? "Stop listening" : "Start listening"}
                >
                  {isListening
                    ? <Mic size={32} />
                    : <MicOff size={32} />
                  }
                </button>
              </div>

              {/* Wave bars */}
              <div className="wave-bars">
                {[1,2,3,4,5].map((i) => (
                  <div
                    key={i}
                    className={`wave-bar ${isListening ? "active" : "inactive"}`}
                  />
                ))}
              </div>

              <div>
                <div className="mic-status-text">
                  {isListening ? "Listening…" : "Microphone Off"}
                </div>
                <div className="mic-status-sub">
                  {isListening
                    ? "Voice Nav stays active while you move through the site"
                    : "Click the mic to start"
                  }
                </div>
              </div>
            </div>

            {/* Last action feedback */}
            {lastAction && (
              <div
                key={lastAction.ts}
                className={`action-feedback ${lastAction.success ? "success" : "fail"}`}
              >
                {lastAction.success
                  ? <CheckCircle2 size={16} />
                  : <XCircle size={16} />
                }
                {lastAction.text}
              </div>
            )}

            {/* Transcript card */}
            <div className="transcript-card">
              <div className="transcript-header">
                <span className="transcript-title">Live Transcript</span>
                <button className="clear-btn" onClick={clearLog}>
                  <Trash2 size={12} /> Clear
                </button>
              </div>

              {/* Live box */}
              <div className="transcript-live">
                {interimText ? (
                  <span className="transcript-interim">{interimText}</span>
                ) : transcript ? (
                  transcript
                ) : (
                  <span style={{ color: "var(--text-secondary, #cbd5e1)", fontSize: "0.8rem" }}>
                    Waiting for speech…
                  </span>
                )}
                {isListening && <span className="transcript-cursor" />}
              </div>

              {/* Log */}
              {transcriptLog.length > 0 && (
                <div className="transcript-log">
                  {transcriptLog.map((l) => (
                    <div key={l.ts} className="log-item">
                      {l.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Command reference ── */}
          <div className="vn-right">
            <div className="commands-card">
              <div className="commands-header">
                <div className="commands-title">Available Commands</div>
                <div className="commands-sub">
                  Speak any of these phrases naturally
                </div>
              </div>

              {categories.map((cat) => {
                const meta  = CATEGORY_META[cat];
                const cmds  = COMMANDS.filter((c) => c.category === cat);
                const Icon  = meta.icon;
                return (
                  <div key={cat} className="category-block">
                    <div className="cat-label" style={{ color: meta.color }}>
                      <span
                        className="cat-icon"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        <Icon size={13} />
                      </span>
                      {meta.label}
                    </div>
                    <div className="cmd-list">
                      {cmds.map((cmd, i) => (
                        <div key={i} className="cmd-item">
                          <ChevronRight size={13} className="cmd-arrow" style={{ color: meta.color }} />
                          <span className="cmd-desc">{cmd.description}</span>
                          <div className="cmd-keywords">
                            {cmd.keywords.slice(0, 2).map((kw) => (
                              <span key={kw} className="cmd-kw">{kw}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
