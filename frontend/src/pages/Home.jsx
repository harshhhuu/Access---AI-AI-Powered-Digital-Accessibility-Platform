import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccessibility } from "../context/AccessibilityContext";
import { useVoiceNav } from "../hooks/useVoiceNav";
import {
  ArrowRight,
  Brain,
  Eye,
  FileText,
  Globe,
  Hand,
  ImageIcon,
  Mic,
  Phone,
  Play,
  Users,
  Zap,
} from "lucide-react";

const STATS = [
  {
    number: "1.3B",
    label: "People with disabilities worldwide",
    icon: Globe,
    color: "#6d28d9",
    bg: "#ede9fe",
    darkBg: "rgba(109,40,217,0.15)",
  },
  {
    number: "70M",
    label: "Deaf and hard of hearing",
    icon: Hand,
    color: "#0891b2",
    bg: "#e0f2fe",
    darkBg: "rgba(8,145,178,0.15)",
  },
  {
    number: "253M",
    label: "Visually impaired",
    icon: Eye,
    color: "#059669",
    bg: "#d1fae5",
    darkBg: "rgba(5,150,105,0.15)",
  },
  {
    number: "200M",
    label: "Cognitive disabilities",
    icon: Brain,
    color: "#d97706",
    bg: "#fef3c7",
    darkBg: "rgba(217,119,6,0.15)",
  },
];

const SECTIONS = [
  {
    id: "sign",
    route: "/sign",
    icon: Hand,
    label: "Deaf / Hard of Hearing",
    desc: "Sign to the camera. AI converts to text and speech instantly.",
    tags: ["Sign Language", "Real-time", "Private"],
    accent: "#0891b2",
    speech:
      "Section for deaf and hard of hearing users. Show your hand signs to the camera and our AI converts them to text and speech instantly. Everything runs in your browser. Click or press Enter to open.",
  },
  {
    id: "voice",
    route: "/voice",
    icon: Mic,
    label: "Motor Disability",
    desc: "Full website control using only your voice. No mouse needed.",
    tags: ["Voice Navigator", "Hands-free"],
    accent: "#059669",
    speech:
      "Section for users with motor disabilities. Speak commands like scroll down, read page, or go back and the website responds instantly. No keyboard or mouse required. Click or press Enter to open.",
  },
  {
    id: "simplify",
    route: "/simplify",
    icon: FileText,
    label: "Cognitive / Dyslexia - Text",
    desc: "Paste any complex text. AI rewrites it in simple words instantly.",
    tags: ["Text Simplifier", "Grade 3 / 5 / 8"],
    accent: "#d97706",
    speech:
      "Section for users with cognitive disabilities or dyslexia. Paste any complex text and our AI rewrites it in plain simple language in seconds. Click or press Enter to open.",
  },
  {
    id: "image",
    route: "/image",
    icon: ImageIcon,
    label: "Cognitive / Visual Processing",
    desc: "Do not understand an image? AI explains it in simple words.",
    tags: ["Image Explainer", "Simple Language", "Dyslexia-friendly"],
    accent: "#d97706",
    speech:
      "Section for users who struggle to understand complex images like charts, diagrams, scans, or infographics. Upload any image and our AI explains it in simple plain language. Click or press Enter to open.",
  },
  {
    id: "call",
    route: "/call",
    icon: Phone,
    label: "Sign Call",
    desc: "Start a live video call and share sign-language captions with another person.",
    tags: ["Video Call", "Live Captions", "Sign Sharing"],
    accent: "#7c3aed",
    speech:
      "Sign Call lets two people open a live video session and share detected sign-language captions in real time. Click or press Enter to open.",
  },
];

const VOICE_COMMANDS = ["open sign", "open voice", "open image", "open simplify", "open call", "help"];

export default function Home() {
  const navigate = useNavigate();
  const { priyaMode, speak, togglePriyaMode } = useAccessibility();
  const { isListening, lastAction, startListening, supported, transcript } = useVoiceNav();

  const [hoveredCard, setHoveredCard] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState("Starting voice navigator...");
  const introStartedRef = useRef(false);

  const dark = priyaMode;

  useEffect(() => {
    if (introStartedRef.current) {
      return undefined;
    }

    introStartedRef.current = true;

    const welcomeTimer = setTimeout(() => {
      speak(
        "Welcome to AccessAI. Voice Navigator can guide you through this homepage. Say open voice, open sign, open image, open simplify, open call, or help. You can also hover over any card to hear what it does."
      );
    }, 400);

    const startTimer = setTimeout(() => {
      if (supported && !isListening) {
        startListening();
      }
    }, 5000);

    return () => {
      clearTimeout(welcomeTimer);
      clearTimeout(startTimer);
    };
  }, [isListening, speak, startListening, supported]);

  useEffect(() => {
    if (!supported) {
      setVoiceStatus("Voice not supported - please use Chrome or Edge");
      return;
    }

    if (transcript) {
      setVoiceStatus(`Heard: "${transcript}"`);
      return;
    }

    if (isListening) {
      setVoiceStatus("Listening... say a command");
      return;
    }

    if (lastAction?.text) {
      setVoiceStatus(lastAction.text);
      return;
    }

    setVoiceStatus("Starting voice navigator...");
  }, [isListening, lastAction, supported, transcript]);

  const handleEnter = useCallback(
    (route) => {
      navigate(route);
    },
    [navigate]
  );

  const theme = {
    bg: dark ? "#080c14" : "#ffffff",
    surface: dark ? "#0d1117" : "#f8fafc",
    card: dark ? "#111827" : "#ffffff",
    border: dark ? "rgba(255,255,255,0.07)" : "#e2e8f0",
    text: dark ? "#f1f5f9" : "#0f172a",
    textSub: dark ? "#94a3b8" : "#64748b",
    heroBadgeBg: dark ? "rgba(0,212,255,0.08)" : "rgba(124,58,237,0.08)",
    heroBadgeBorder: dark ? "rgba(0,212,255,0.25)" : "rgba(124,58,237,0.25)",
    heroBadgeText: dark ? "#00d4ff" : "#7c3aed",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=Instrument+Serif:ital@1&family=DM+Sans:wght@400;500;600&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          from { background-position: 200% center; }
          to { background-position: -200% center; }
        }
        @keyframes orb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.1); }
        }
        @keyframes orb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 30px) scale(0.95); }
        }
        @keyframes pulseDot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(52,211,153,0); }
        }
        @keyframes priyaGlow {
          0% { box-shadow: 0 0 0 0 rgba(124,58,237,0.7), 0 4px 20px rgba(124,58,237,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(124,58,237,0), 0 4px 30px rgba(124,58,237,0.6); }
          100% { box-shadow: 0 0 0 0 rgba(124,58,237,0), 0 4px 20px rgba(124,58,237,0.4); }
        }

        .home-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          transition: background 0.4s ease, color 0.4s ease;
        }
        .hero-section {
          position: relative;
          text-align: center;
          padding: 4.5rem 1.5rem 3.5rem;
          overflow: hidden;
        }
        .orb-wrap {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.25;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.3rem 1rem;
          border-radius: 100px;
          border: 1px solid;
          margin-bottom: 1.5rem;
          animation: fadeUp 0.5s ease both;
        }
        .hero-title {
          font-family: 'Syne', sans-serif;
          font-weight: 900;
          font-size: clamp(2.4rem, 6vw, 4.5rem);
          letter-spacing: -0.04em;
          line-height: 1.05;
          margin: 0 0 0.5rem;
          animation: fadeUp 0.5s 0.1s ease both;
        }
        .hero-title-grad {
          background: linear-gradient(135deg, #7c3aed 0%, #0891b2 50%, #059669 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .hero-italic {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          color: inherit;
        }
        .hero-sub {
          font-size: 1.1rem;
          line-height: 1.7;
          max-width: 560px;
          margin: 1rem auto 2rem;
          animation: fadeUp 0.5s 0.2s ease both;
        }
        .hero-ctas {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          animation: fadeUp 0.5s 0.3s ease both;
        }
        .cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.7rem 1.5rem;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: #ffffff;
          box-shadow: 0 4px 20px rgba(124,58,237,0.35);
          transition: all 0.2s ease;
        }
        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(124,58,237,0.5);
        }
        .cta-primary.priya-active {
          animation: priyaGlow 1.8s ease-in-out infinite;
        }
        .cta-secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.7rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          background: transparent;
          transition: all 0.2s ease;
        }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 3rem;
          animation: fadeUp 0.5s 0.35s ease both;
        }
        .stat-card {
          border-radius: 16px;
          padding: 1.25rem;
          border: 1px solid;
          text-align: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card:hover {
          transform: translateY(-3px);
        }
        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 0.6rem;
        }
        .stat-number {
          font-family: 'Syne', sans-serif;
          font-weight: 900;
          font-size: 1.8rem;
          letter-spacing: -0.04em;
        }
        .stat-label {
          font-size: 0.75rem;
          margin-top: 0.2rem;
          line-height: 1.4;
        }
        .voice-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
          animation: fadeUp 0.5s 0.4s ease both;
        }
        .voice-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 1.4rem;
          border-radius: 50px;
          border: 1px solid;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.4s ease;
        }
        .voice-btn-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #34d399;
          animation: pulseDot 1.5s ease infinite;
          flex-shrink: 0;
        }
        .voice-hint {
          font-size: 0.78rem;
          text-align: center;
          max-width: 460px;
          line-height: 1.5;
        }
        .voice-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          justify-content: center;
          margin-top: 0.2rem;
        }
        .voice-chip {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 20px;
          font-family: monospace;
          background: rgba(52,211,153,0.1);
          border: 1px solid rgba(52,211,153,0.25);
          color: #34d399;
        }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          max-width: 760px;
          margin: 0 auto 3rem;
          animation: fadeUp 0.5s 0.45s ease both;
        }
        .feat-card {
          border-radius: 18px;
          padding: 1.75rem 1.5rem;
          cursor: pointer;
          outline: none;
          border: 1.5px solid;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .feat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--accent);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.25s ease;
        }
        .feat-card:hover::before,
        .feat-card:focus::before {
          transform: scaleX(1);
        }
        .feat-card:hover {
          transform: translateY(-4px);
        }
        .feat-icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.8rem;
          background: rgba(255,255,255,0.08);
        }
        .feat-label {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          margin-bottom: 0.35rem;
        }
        .feat-desc {
          font-size: 0.82rem;
          line-height: 1.55;
          margin-bottom: 0.875rem;
        }
        .feat-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
        .feat-tag {
          font-size: 0.65rem;
          font-weight: 600;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .feat-arrow {
          position: absolute;
          bottom: 1.25rem;
          right: 1.25rem;
          opacity: 0;
          transition: opacity 0.2s ease, transform 0.2s ease;
          transform: translateX(-4px);
        }
        .feat-card:hover .feat-arrow {
          opacity: 1;
          transform: translateX(0);
        }
        .closing-strip {
          border-radius: 20px;
          padding: 2.5rem 2rem;
          text-align: center;
          margin-bottom: 2rem;
          animation: fadeUp 0.5s 0.5s ease both;
        }
        .closing-title {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(1.4rem, 3vw, 2rem);
          letter-spacing: -0.03em;
          margin-bottom: 0.6rem;
        }
        .closing-sub {
          font-size: 0.9rem;
          line-height: 1.65;
          opacity: 0.75;
        }
        .footer-bar {
          text-align: center;
          font-size: 0.8rem;
          opacity: 0.5;
          padding-bottom: 1rem;
        }
        @media (max-width: 640px) {
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .feature-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="home-root" style={{ background: theme.bg, color: theme.text }}>
        <section className="hero-section">
          <div className="orb-wrap">
            <div
              className="orb"
              style={{
                width: 500,
                height: 500,
                background: dark ? "#7c3aed" : "#a78bfa",
                top: -150,
                right: -100,
                animation: "orb1 8s ease-in-out infinite",
              }}
            />
            <div
              className="orb"
              style={{
                width: 400,
                height: 400,
                background: dark ? "#0891b2" : "#67e8f9",
                bottom: -100,
                left: -80,
                animation: "orb2 10s ease-in-out infinite",
              }}
            />
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              className="hero-badge"
              style={{
                background: theme.heroBadgeBg,
                borderColor: theme.heroBadgeBorder,
                color: theme.heroBadgeText,
              }}
            >
              Accessibility-First AI Platform
            </div>

            <h1 className="hero-title" style={{ color: theme.text }}>
              The web, <span className="hero-title-grad">accessible</span>
              <br />
              <span className="hero-italic">to everyone.</span>
            </h1>

            <p className="hero-sub" style={{ color: theme.textSub }}>
              AI tools for deaf, motor-disabled, and cognitive users - all in your browser, free, with no download needed.
              Visually impaired users can hover over any image for an instant AI description.
            </p>

            <div className="hero-ctas">
              <button
                className={`cta-primary ${priyaMode ? "priya-active" : ""}`}
                onClick={togglePriyaMode}
              >
                <Zap size={15} />
                {priyaMode ? "Priya Mode ON" : "Meet Priya"}
              </button>
              <button
                className="cta-secondary"
                style={{ border: `1.5px solid ${theme.border}`, color: theme.text }}
                onClick={() => navigate("/sign")}
              >
                <Play size={15} />
                See Live Demo
              </button>
            </div>
          </div>
        </section>

        <div style={{ padding: "0 1.5rem", maxWidth: 1100, margin: "0 auto" }}>
          <div className="stats-row">
            {STATS.map((item) => (
              <div
                key={item.number}
                className="stat-card"
                style={{
                  background: dark ? item.darkBg : item.bg,
                  borderColor: dark ? "rgba(255,255,255,0.08)" : item.bg,
                }}
              >
                <div className="stat-icon" style={{ background: dark ? "rgba(255,255,255,0.07)" : "#ffffff" }}>
                  <item.icon size={18} style={{ color: item.color }} />
                </div>
                <div className="stat-number" style={{ color: item.color }}>
                  {item.number}
                </div>
                <div className="stat-label" style={{ color: theme.textSub }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          <div className="voice-bar">
            <div
              className="voice-status-pill"
              style={{
                borderColor: isListening ? "rgba(52,211,153,0.4)" : theme.border,
                background: isListening ? "rgba(52,211,153,0.07)" : "transparent",
                color: isListening ? "#34d399" : theme.textSub,
              }}
              aria-live="polite"
            >
              {isListening && <span className="voice-btn-dot" />}
              <span>{isListening ? "Voice Ready" : "Voice Idle"}</span>
              <span>{voiceStatus}</span>
            </div>

            {supported && (
              <div className="voice-chips">
                {VOICE_COMMANDS.map((command) => (
                  <span key={command} className="voice-chip">
                    "{command}"
                  </span>
                ))}
              </div>
            )}

            <p className="voice-hint" style={{ color: theme.textSub }}>
              {supported
                ? isListening
                  ? "Voice Navigator is active across the site. Speak any command above."
                  : "Voice Navigator is starting. If the browser blocks it, use the mic button in the navbar."
                : "Voice recognition is not available in this browser."}
            </p>
          </div>

          <div className="feature-grid">
            {SECTIONS.map((section) => (
              <div
                key={section.id}
                className="feat-card"
                tabIndex={0}
                role="button"
                aria-label={`${section.label} section`}
                style={{
                  "--accent": section.accent,
                  background: theme.card,
                  borderColor: hoveredCard === section.id ? section.accent : theme.border,
                  boxShadow:
                    hoveredCard === section.id ? `0 8px 32px ${section.accent}25` : "none",
                }}
                onClick={() => handleEnter(section.route)}
                onMouseEnter={() => {
                  setHoveredCard(section.id);
                  speak(section.speech);
                }}
                onMouseLeave={() => setHoveredCard(null)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    handleEnter(section.route);
                  }
                }}
              >
                <div className="feat-icon-wrap" style={{ color: section.accent }}>
                  <section.icon size={24} />
                </div>
                <div className="feat-label" style={{ color: theme.text }}>
                  {section.label}
                </div>
                <p className="feat-desc" style={{ color: theme.textSub }}>
                  {section.desc}
                </p>
                <div className="feat-tags">
                  {section.tags.map((tag) => (
                    <span
                      key={tag}
                      className="feat-tag"
                      style={{
                        background: dark ? "rgba(255,255,255,0.07)" : `${section.accent}15`,
                        color: section.accent,
                        border: `1px solid ${section.accent}30`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="feat-arrow">
                  <ArrowRight size={18} style={{ color: section.accent }} />
                </div>
              </div>
            ))}
          </div>

          <div
            className="closing-strip"
            style={{
              background: dark
                ? "linear-gradient(135deg, #1e1b4b, #0f172a)"
                : "linear-gradient(135deg, #1e1b4b, #312e81)",
              color: "#e0e7ff",
            }}
          >
            <div className="closing-title">Built for the 1.3 billion people the web forgets.</div>
            <p className="closing-sub">
              AccessAI gives deaf, visually impaired, motor-disabled, and cognitive users the tools they deserve - free, instant, and private.
              No account. No download. Just access.
            </p>
          </div>

          <p className="footer-bar" style={{ color: theme.textSub }}>
            Free - No account - No download - Works on any device
          </p>
        </div>
      </div>
    </>
  );
}
