import { useState } from "react";
import {
  CheckCircle2,
  Eye,
  MousePointer2,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Type,
  Volume2,
} from "lucide-react";
import { useAccessibility } from "../context/AccessibilityContext";

function SettingChip({ label, value }) {
  return (
    <div
      style={{
        padding: "0.55rem 0.8rem",
        borderRadius: 12,
        border: "1px solid var(--border-color, #e2e8f0)",
        background: "var(--bg-primary, #fff)",
      }}
    >
      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary, #64748b)" }}>{label}</div>
      <div style={{ fontWeight: 700, color: "var(--text-primary, #0f172a)" }}>{value}</div>
    </div>
  );
}

export default function Profiles() {
  const {
    fontSize,
    highContrast,
    priyaMode,
    hoverMode,
    colourBlind,
    ttsSpeed,
    savedProfiles,
    builtInProfiles,
    applyAccessibilityProfile,
    saveCurrentProfile,
    deleteAccessibilityProfile,
    resetAccessibilitySettings,
    speak,
  } = useAccessibility();

  const [profileName, setProfileName] = useState("");
  const [feedback, setFeedback] = useState("");

  const currentSummary = [
    { label: "Font Size", value: `${fontSize}px` },
    { label: "Contrast", value: highContrast ? "High" : "Standard" },
    { label: "Read Aloud Speed", value: `${ttsSpeed}x` },
    { label: "Hover Descriptions", value: hoverMode ? "On" : "Off" },
    { label: "Colour Filter", value: colourBlind === "none" ? "None" : colourBlind },
    { label: "Priya Mode", value: priyaMode ? "Enabled" : "Off" },
  ];

  const announceCurrentSetup = () => {
    speak(
      `Current setup: font size ${fontSize} pixels, ${
        highContrast ? "high contrast on" : "standard contrast"
      }, read aloud speed ${ttsSpeed} times, hover descriptions ${
        hoverMode ? "enabled" : "disabled"
      }, colour filter ${colourBlind}, Priya mode ${priyaMode ? "enabled" : "disabled"}.`
    );
  };

  const handleSave = () => {
    const result = saveCurrentProfile(profileName, "Saved from the Accessibility Profiles page.");
    setFeedback(result.message || `Saved profile "${profileName.trim()}"`);
    if (result.ok) {
      setProfileName("");
    }
  };

  const handleApply = (profile) => {
    applyAccessibilityProfile(profile);
    setFeedback(`Applied "${profile.name}"`);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .profiles-root {
          font-family: 'DM Sans', sans-serif;
          min-height: calc(100vh - 64px);
          padding: 2rem 0 4rem;
        }

        .profiles-header {
          margin-bottom: 1.75rem;
          animation: fadeUp 0.35s ease both;
        }

        .profiles-eyebrow {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7c3aed;
          margin-bottom: 0.5rem;
        }

        .profiles-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(1.9rem, 4vw, 2.8rem);
          line-height: 1.05;
          letter-spacing: -0.03em;
          margin: 0 0 0.45rem;
          color: var(--text-primary, #0f172a);
        }

        .profiles-sub {
          color: var(--text-secondary, #64748b);
          font-size: 0.98rem;
          line-height: 1.7;
          max-width: 720px;
        }

        .profiles-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 1.25rem;
          align-items: start;
        }

        .panel {
          border: 1px solid var(--border-color, #e2e8f0);
          background: var(--card-bg, #f8fafc);
          border-radius: 22px;
          padding: 1.4rem;
          animation: fadeUp 0.4s ease both;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          color: var(--text-primary, #0f172a);
        }

        .panel-copy {
          color: var(--text-secondary, #64748b);
          font-size: 0.85rem;
          line-height: 1.65;
        }

        .chip-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .action-row {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 1rem;
        }

        .primary-btn,
        .ghost-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border-radius: 12px;
          padding: 0.7rem 1rem;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .primary-btn {
          border: none;
          color: #fff;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          box-shadow: 0 12px 30px rgba(124, 58, 237, 0.22);
        }

        .primary-btn:hover {
          transform: translateY(-1px);
        }

        .ghost-btn {
          border: 1px solid var(--border-color, #e2e8f0);
          background: var(--bg-primary, #fff);
          color: var(--text-primary, #0f172a);
        }

        .ghost-btn:hover {
          border-color: #7c3aed;
          color: #7c3aed;
        }

        .save-box {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .save-input {
          width: 100%;
          border-radius: 14px;
          border: 1px solid var(--border-color, #d8dee6);
          background: var(--bg-primary, #fff);
          color: var(--text-primary, #0f172a);
          padding: 0.85rem 1rem;
          font-size: 0.95rem;
          outline: none;
        }

        .save-input:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
        }

        .notice {
          margin-top: 0.9rem;
          border-radius: 12px;
          padding: 0.8rem 0.9rem;
          background: rgba(124, 58, 237, 0.08);
          color: #6d28d9;
          font-size: 0.85rem;
          border: 1px solid rgba(124, 58, 237, 0.15);
        }

        .profile-stack {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .profile-card {
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 18px;
          background: var(--bg-primary, #fff);
          padding: 1rem;
        }

        .profile-card h3 {
          margin: 0 0 0.35rem;
          font-family: 'Syne', sans-serif;
          font-size: 1rem;
          color: var(--text-primary, #0f172a);
        }

        .profile-card p {
          margin: 0;
          color: var(--text-secondary, #64748b);
          font-size: 0.85rem;
          line-height: 1.6;
        }

        .profile-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin: 0.85rem 0 0.95rem;
        }

        .profile-meta span {
          padding: 0.28rem 0.55rem;
          border-radius: 999px;
          background: var(--card-bg, #f8fafc);
          border: 1px solid var(--border-color, #e2e8f0);
          color: var(--text-secondary, #64748b);
          font-size: 0.75rem;
        }

        .profile-actions {
          display: flex;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .empty-state {
          border-radius: 18px;
          border: 1px dashed var(--border-color, #d8dee6);
          background: var(--bg-primary, #fff);
          padding: 1.2rem;
          color: var(--text-secondary, #64748b);
          font-size: 0.9rem;
          line-height: 1.65;
        }

        @media (max-width: 980px) {
          .profiles-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .chip-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .save-box {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="profiles-root">
        <div className="profiles-header">
          <div className="profiles-eyebrow">
            <Settings size={14} />
            Accessibility Profiles
          </div>
          <h1 className="profiles-title">Save the setup that works for you.</h1>
          <p className="profiles-sub">
            Accessibility needs change from task to task. Save the current setup, switch between
            presets quickly, and come back to the combination that feels comfortable without
            rebuilding everything every time.
          </p>
        </div>

        <div className="profiles-grid">
          <div style={{ display: "grid", gap: "1.2rem" }}>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    <Sparkles size={18} color="#7c3aed" />
                    Current Setup
                  </div>
                  <div className="panel-copy">
                    This is the accessibility state that will be saved into a custom profile.
                  </div>
                </div>
              </div>

              <div className="chip-grid">
                <SettingChip label="Font" value={`${fontSize}px`} />
                <SettingChip label="Contrast" value={highContrast ? "High" : "Standard"} />
                <SettingChip label="TTS Speed" value={`${ttsSpeed}x`} />
                <SettingChip label="Hover Mode" value={hoverMode ? "On" : "Off"} />
                <SettingChip label="Filter" value={colourBlind === "none" ? "None" : colourBlind} />
                <SettingChip label="Priya Mode" value={priyaMode ? "On" : "Off"} />
              </div>

              <div className="action-row">
                <button className="primary-btn" onClick={announceCurrentSetup}>
                  <Volume2 size={16} />
                  Read Current Setup
                </button>
                <button className="ghost-btn" onClick={resetAccessibilitySettings}>
                  <CheckCircle2 size={16} />
                  Reset to Defaults
                </button>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    <Save size={18} color="#0369a1" />
                    Save a Custom Profile
                  </div>
                  <div className="panel-copy">
                    Give the current setup a name like "Exam Reading", "Low Vision", or "Quiet Focus".
                  </div>
                </div>
              </div>

              <div className="save-box">
                <input
                  className="save-input"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder="Profile name"
                />
                <button className="primary-btn" onClick={handleSave}>
                  <Save size={16} />
                  Save Profile
                </button>
              </div>

              {feedback && <div className="notice">{feedback}</div>}
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    <Settings size={18} color="#065f46" />
                    Built-In Presets
                  </div>
                  <div className="panel-copy">
                    Start with a ready-made support setup, then tweak it if needed.
                  </div>
                </div>
              </div>

              <div className="profile-stack">
                {builtInProfiles.map((profile) => (
                  <article key={profile.id} className="profile-card">
                    <h3>{profile.name}</h3>
                    <p>{profile.description}</p>
                    <div className="profile-meta">
                      <span><Type size={12} style={{ verticalAlign: "middle", marginRight: 4 }} /> {profile.settings.fontSize}px</span>
                      <span><Eye size={12} style={{ verticalAlign: "middle", marginRight: 4 }} /> {profile.settings.highContrast ? "High contrast" : "Standard contrast"}</span>
                      <span><MousePointer2 size={12} style={{ verticalAlign: "middle", marginRight: 4 }} /> {profile.settings.hoverMode ? "Hover on" : "Hover off"}</span>
                    </div>
                    <div className="profile-actions">
                      <button className="primary-btn" onClick={() => handleApply(profile)}>
                        <CheckCircle2 size={15} />
                        Apply
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">
                  <Save size={18} color="#92400e" />
                  Saved Profiles
                </div>
                <div className="panel-copy">
                  Custom profiles are stored locally in this browser so you can switch quickly later.
                </div>
              </div>
            </div>

            {savedProfiles.length === 0 ? (
              <div className="empty-state">
                No custom profiles yet. Save the setup you are using now and it will appear here.
              </div>
            ) : (
              <div className="profile-stack">
                {savedProfiles.map((profile) => (
                  <article key={profile.id} className="profile-card">
                    <h3>{profile.name}</h3>
                    <p>{profile.description}</p>
                    <div className="profile-meta">
                      <span>{profile.settings.fontSize}px text</span>
                      <span>{profile.settings.highContrast ? "High contrast" : "Standard contrast"}</span>
                      <span>{profile.settings.hoverMode ? "Hover descriptions" : "No hover descriptions"}</span>
                      <span>{profile.settings.colourBlind === "none" ? "No filter" : profile.settings.colourBlind}</span>
                    </div>
                    <div className="profile-actions">
                      <button className="primary-btn" onClick={() => handleApply(profile)}>
                        <CheckCircle2 size={15} />
                        Apply
                      </button>
                      <button className="ghost-btn" onClick={() => deleteAccessibilityProfile(profile.id)}>
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
