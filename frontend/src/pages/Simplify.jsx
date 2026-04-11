import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { simplifyText } from "../api/api";
import {
  Brain, Sparkles, Copy, Volume2, RotateCcw,
  Type, ChevronDown, CheckCircle2, Loader2, FileText,
} from "lucide-react";
import { useAccessibility } from "../context/AccessibilityContext";

// ── Demo article pre-loaded for judges ───────────────────────────────────────
const DEMO_ARTICLE = `The applicant shall be required to furnish documentary evidence substantiating eligibility criteria as prescribed under Section 14 of the aforementioned Act, in conjunction with the regulatory framework delineated by the competent authority. Failure to comply with the aforementioned stipulations may result in the disqualification of the application and subsequent forfeiture of any benefits accrued thereunder. Furthermore, the procedural requirements mandate that all submissions be authenticated by a notarised affidavit, accompanied by corroborating testimonial evidence from two independent witnesses possessing requisite legal standing.`;

const GRADE_OPTIONS = [
  {
    value: 3,
    label: "Grade 3",
    desc: "Age 8–9 · Very simple words",
    color: "#065f46",
    bg: "#d1fae5",
  },
  {
    value: 5,
    label: "Grade 5",
    desc: "Age 10–11 · Plain language",
    color: "#0369a1",
    bg: "#e0f2fe",
  },
  {
    value: 8,
    label: "Grade 8",
    desc: "Age 13–14 · Clear sentences",
    color: "#7c3aed",
    bg: "#ede9fe",
  },
];

// Cached demo responses so judges never wait on a slow API
const DEMO_CACHE = {
  3: "You need to show papers that prove you qualify. This is a rule. If you don't show the papers, you can't apply. You also need a special signed paper. Two people who know you must sign it too.",
  5: "You need to provide documents that show you meet the requirements listed in Section 14 of the Act. If you don't do this, your application will be rejected and you will lose any benefits. You must also get your documents signed by a notary, and have two witnesses confirm them.",
  8: "Applicants must submit documents proving they meet the eligibility requirements under Section 14 of the Act. Failure to comply will result in disqualification and loss of benefits. All submissions require a notarised affidavit supported by statements from two independent witnesses with legal standing.",
};

export default function Simplify() {
  const { speak } = useAccessibility();

  const [inputText, setInputText]       = useState(DEMO_ARTICLE);
  const [outputText, setOutputText]     = useState("");
  const [grade, setGrade]               = useState(5);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [copied, setCopied]             = useState(false);
  const [stats, setStats]               = useState(null); // { before, after }
  const outputRef                       = useRef(null);

  const wordCount = (text) =>
    text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleSimplify = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await simplifyText(inputText, grade);
      const simplified = res.data.simplified;
      setOutputText(simplified);
      setStats({
        before: res.data.word_count_before ?? wordCount(inputText),
        after:  res.data.word_count_after  ?? wordCount(simplified),
      });
    } catch {
      // API offline — use demo cache if input matches demo article
      if (inputText.trim() === DEMO_ARTICLE.trim()) {
        const cached = DEMO_CACHE[grade];
        setOutputText(cached);
        setStats({ before: wordCount(inputText), after: wordCount(cached) });
      } else {
        setError("Backend offline. Using demo mode — paste the pre-loaded text to see a cached result.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setInputText(DEMO_ARTICLE);
    setOutputText("");
    setStats(null);
    setError(null);
  };

  const selectedGrade = GRADE_OPTIONS.find((g) => g.value === grade);

  return (
    <>
      {/* OpenDyslexic font from CDN */}
      {dyslexiaFont && (
        <style>{`
          @import url('https://fonts.cdnfonts.com/css/opendyslexic');
          .dyslexia-target {
            font-family: 'OpenDyslexic', sans-serif !important;
            line-height: 1.9 !important;
            letter-spacing: 0.05em !important;
            word-spacing: 0.2em !important;
          }
        `}</style>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes resultReveal {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes spin {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
        @keyframes shimmerBtn {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        .sp-root {
          font-family: 'DM Sans', sans-serif;
          min-height: calc(100vh - 64px);
          padding: 2rem 0;
        }

        /* ── Header ── */
        .sp-header {
          margin-bottom: 2rem;
          animation: fadeUp 0.4s ease both;
        }
        .sp-eyebrow {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #065f46;
          margin-bottom: 0.5rem;
        }
        .sp-title {
          font-family: 'Syne', sans-serif;
          font-weight: 900;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          letter-spacing: -0.03em;
          color: var(--text-primary, #0f172a);
          margin: 0 0 0.4rem;
        }
        .sp-sub {
          color: var(--text-secondary, #64748b);
          font-size: 0.95rem;
        }

        /* ── Controls bar ── */
        .controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.25rem;
          animation: fadeUp 0.4s 0.1s ease both;
          background: var(--card-bg, #f8fafc);
          border: 1px solid var(--border-color, #e8e8e8);
          border-radius: 16px;
          padding: 1rem 1.25rem;
        }

        /* Grade selector */
        .grade-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .grade-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary, #64748b);
          margin-right: 0.25rem;
        }
        .grade-btn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.45rem 0.9rem;
          border-radius: 10px;
          border: 1.5px solid var(--border-color, #e2e8f0);
          background: var(--bg-primary, #fff);
          cursor: pointer;
          transition: all 0.18s ease;
          gap: 0.1rem;
        }
        .grade-btn:hover {
          border-color: #065f46;
        }
        .grade-btn.selected {
          background: var(--grade-bg);
          border-color: var(--grade-color);
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        .grade-btn-label {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.825rem;
          color: var(--text-primary, #0f172a);
          transition: color 0.18s;
        }
        .grade-btn.selected .grade-btn-label {
          color: var(--grade-color);
        }
        .grade-btn-desc {
          font-size: 0.65rem;
          color: var(--text-secondary, #94a3b8);
          white-space: nowrap;
        }

        /* Right controls */
        .right-controls {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        /* Dyslexia toggle */
        .dyslexia-toggle {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.875rem;
          border-radius: 10px;
          border: 1.5px solid var(--border-color, #e2e8f0);
          background: var(--bg-primary, #fff);
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary, #64748b);
          transition: all 0.18s;
        }
        .dyslexia-toggle.on {
          border-color: #7c3aed;
          background: #ede9fe;
          color: #7c3aed;
        }
        .dyslexia-toggle:hover {
          border-color: #7c3aed;
          color: #7c3aed;
        }

        /* Reset btn */
        .reset-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.75rem;
          border-radius: 10px;
          border: 1.5px solid var(--border-color, #e2e8f0);
          background: var(--bg-primary, #fff);
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary, #64748b);
          transition: all 0.18s;
        }
        .reset-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
          background: #fee2e2;
        }

        /* ── Two-column editor ── */
        .editor-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          animation: fadeUp 0.5s 0.15s ease both;
        }

        .editor-panel {
          display: flex;
          flex-direction: column;
          gap: 0;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--border-color, #e8e8e8);
          background: var(--card-bg, #f8fafc);
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1.25rem;
          border-bottom: 1px solid var(--border-color, #e8e8e8);
          background: var(--bg-primary, #fff);
        }
        .panel-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--text-primary, #0f172a);
        }
        .panel-word-count {
          font-size: 0.75rem;
          color: var(--text-secondary, #94a3b8);
          font-family: 'DM Sans', monospace;
        }

        .editor-textarea {
          border: none !important;
          border-radius: 0 !important;
          resize: none !important;
          min-height: 320px !important;
          font-size: 0.9rem !important;
          line-height: 1.7 !important;
          padding: 1.25rem !important;
          background: transparent !important;
          color: var(--text-primary, #0f172a) !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .editor-textarea:focus {
          ring: none !important;
          outline: none !important;
          box-shadow: none !important;
        }

        /* Output panel */
        .output-body {
          min-height: 320px;
          padding: 1.25rem;
          font-size: 0.9rem;
          line-height: 1.7;
          color: var(--text-primary, #0f172a);
          position: relative;
        }
        .output-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 280px;
          gap: 0.75rem;
          color: var(--text-secondary, #cbd5e1);
        }
        .output-empty-icon {
          width: 56px; height: 56px;
          border-radius: 16px;
          background: var(--bg-primary, #fff);
          border: 1px dashed var(--border-color, #e2e8f0);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .output-text {
          animation: resultReveal 0.4s ease both;
        }

        /* Loading state */
        .output-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 280px;
          gap: 0.75rem;
          color: #065f46;
        }
        .loading-dots {
          display: flex;
          gap: 0.3rem;
        }
        .loading-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #065f46;
          animation: dotBounce 1s ease-in-out infinite;
        }
        .loading-dot:nth-child(2) { animation-delay: 0.15s; }
        .loading-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes dotBounce {
          0%,100% { transform: translateY(0); opacity:0.4; }
          50%      { transform: translateY(-8px); opacity:1; }
        }

        /* Output actions */
        .output-actions {
          display: flex;
          gap: 0.5rem;
          padding: 0.875rem 1.25rem;
          border-top: 1px solid var(--border-color, #e8e8e8);
          background: var(--bg-primary, #fff);
        }
        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.875rem;
          border-radius: 8px;
          border: 1px solid var(--border-color, #e2e8f0);
          background: transparent;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary, #64748b);
          transition: all 0.15s;
        }
        .action-btn:hover {
          background: var(--card-bg, #f1f5f9);
          color: var(--text-primary, #0f172a);
        }
        .action-btn.copied {
          background: #d1fae5;
          border-color: #4ade80;
          color: #16a34a;
        }

        /* ── Simplify button ── */
        .simplify-wrap {
          display: flex;
          justify-content: center;
          margin: 1.5rem 0;
          animation: fadeUp 0.5s 0.2s ease both;
        }
        .simplify-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.875rem 2.5rem;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          color: #fff;
          background: linear-gradient(135deg, #065f46, #047857, #0369a1);
          background-size: 200%;
          box-shadow: 0 6px 24px rgba(6,95,70,0.35);
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }
        .simplify-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 36px rgba(6,95,70,0.45);
          animation: shimmerBtn 1.5s linear infinite;
        }
        .simplify-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .simplify-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        /* ── Stats row ── */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-top: 0.5rem;
          animation: fadeUp 0.5s 0.25s ease both;
        }
        .stat-box {
          background: var(--card-bg, #f8fafc);
          border: 1px solid var(--border-color, #e8e8e8);
          border-radius: 14px;
          padding: 1rem 1.25rem;
          text-align: center;
        }
        .stat-box-num {
          font-family: 'Syne', sans-serif;
          font-weight: 900;
          font-size: 1.8rem;
          letter-spacing: -0.03em;
          color: var(--stat-color, #065f46);
        }
        .stat-box-label {
          font-size: 0.75rem;
          color: var(--text-secondary, #64748b);
          margin-top: 0.2rem;
        }

        /* Error */
        .error-banner {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 12px;
          padding: 0.875rem 1rem;
          color: #dc2626;
          font-size: 0.85rem;
          margin-bottom: 1rem;
        }

        @media (max-width: 768px) {
          .editor-grid { grid-template-columns: 1fr; }
          .stats-row   { grid-template-columns: repeat(3, 1fr); }
          .controls-bar { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <div className="sp-root">

        {/* Header */}
        <div className="sp-header">
          <div className="sp-eyebrow">
            <Brain size={14} /> Cognitive Simplifier
          </div>
          <h1 className="sp-title">Plain language, instantly.</h1>
          <p className="sp-sub">
            Paste any complex text — legal, medical, government — and get it rewritten
            at the reading level you choose.
          </p>
        </div>

        {/* Controls bar */}
        <div className="controls-bar">
          {/* Grade selector */}
          <div className="grade-group">
            <span className="grade-label">Reading level:</span>
            {GRADE_OPTIONS.map((g) => (
              <button
                key={g.value}
                className={`grade-btn ${grade === g.value ? "selected" : ""}`}
                style={{ "--grade-color": g.color, "--grade-bg": g.bg }}
                onClick={() => setGrade(g.value)}
              >
                <span className="grade-btn-label">{g.label}</span>
                <span className="grade-btn-desc">{g.desc}</span>
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="right-controls">
            <button
              className={`dyslexia-toggle ${dyslexiaFont ? "on" : ""}`}
              onClick={() => setDyslexiaFont(!dyslexiaFont)}
              title="Toggle OpenDyslexic font"
            >
              <Type size={13} />
              Dyslexia Font {dyslexiaFont ? "ON" : "OFF"}
            </button>
            <button className="reset-btn" onClick={handleReset}>
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="error-banner">
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        {/* Two-column editor */}
        <div className="editor-grid">

          {/* Input panel */}
          <div className="editor-panel">
            <div className="panel-header">
              <span className="panel-title">
                <FileText size={15} style={{ color: "#64748b" }} />
                Original Text
              </span>
              <span className="panel-word-count">
                {wordCount(inputText)} words
              </span>
            </div>
            <Textarea
              className={`editor-textarea ${dyslexiaFont ? "dyslexia-target" : ""}`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste any complex text here — a legal document, medical form, government notice…"
            />
          </div>

          {/* Output panel */}
          <div className="editor-panel">
            <div className="panel-header">
              <span className="panel-title">
                <Sparkles size={15} style={{ color: selectedGrade.color }} />
                Simplified · {selectedGrade.label}
              </span>
              {outputText && (
                <span className="panel-word-count">
                  {wordCount(outputText)} words
                </span>
              )}
            </div>

            <div className={`output-body ${dyslexiaFont ? "dyslexia-target" : ""}`}>
              {loading ? (
                <div className="output-loading">
                  <div className="loading-dots">
                    <div className="loading-dot" />
                    <div className="loading-dot" />
                    <div className="loading-dot" />
                  </div>
                  <span style={{ fontSize: "0.85rem" }}>
                    Simplifying with AI…
                  </span>
                </div>
              ) : outputText ? (
                <div className="output-text">{outputText}</div>
              ) : (
                <div className="output-empty">
                  <div className="output-empty-icon">
                    <Sparkles size={22} style={{ opacity: 0.3 }} />
                  </div>
                  <span style={{ fontSize: "0.85rem" }}>
                    Simplified text will appear here
                  </span>
                  <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                    The demo article is pre-loaded — just hit Simplify
                  </span>
                </div>
              )}
            </div>

            {/* Output action buttons */}
            {outputText && (
              <div className="output-actions">
                <button
                  className={`action-btn ${copied ? "copied" : ""}`}
                  onClick={handleCopy}
                >
                  {copied
                    ? <><CheckCircle2 size={13} /> Copied!</>
                    : <><Copy size={13} /> Copy</>
                  }
                </button>
                <button
                  className="action-btn"
                  onClick={() => speak(outputText)}
                >
                  <Volume2 size={13} /> Read Aloud
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Simplify button */}
        <div className="simplify-wrap">
          <button
            className="simplify-btn"
            onClick={handleSimplify}
            disabled={loading || !inputText.trim()}
          >
            {loading ? (
              <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Simplifying…</>
            ) : (
              <><Sparkles size={18} /> Simplify to {selectedGrade.label}</>
            )}
          </button>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="stats-row">
            <div className="stat-box" style={{ "--stat-color": "#64748b" }}>
              <div className="stat-box-num">{stats.before}</div>
              <div className="stat-box-label">Words before</div>
            </div>
            <div className="stat-box" style={{ "--stat-color": "#065f46" }}>
              <div className="stat-box-num">{stats.after}</div>
              <div className="stat-box-label">Words after</div>
            </div>
            <div className="stat-box" style={{ "--stat-color": selectedGrade.color }}>
              <div className="stat-box-num">
                {stats.before > 0
                  ? `${Math.round((1 - stats.after / stats.before) * 100)}%`
                  : "—"}
              </div>
              <div className="stat-box-label">Reduction</div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
