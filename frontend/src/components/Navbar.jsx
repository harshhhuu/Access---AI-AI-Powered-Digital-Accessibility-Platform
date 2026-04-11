import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAccessibility } from "../context/AccessibilityContext";
import { useVoiceNav } from "../hooks/useVoiceNav";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Eye,
  Settings,
  Zap,
  Menu,
    X,
    Brain,
  Hand,
  Mic,
  ImageIcon,
  FileText,
  Phone,
} from "lucide-react";

const NAV_LINKS = [
    { label: "Home", path: "/" },
    { label: "Profiles", path: "/profiles", icon: Settings },
  { label: "Sign Language", path: "/sign", icon: Hand },
  { label: "Voice Nav", path: "/voice", icon: Mic },
  { label: "Simplifier", path: "/simplify", icon: FileText },
  { label: "Image AI", path: "/image", icon: ImageIcon },
  { label: "Sign Call", path: "/call", icon: Phone },
];

const FONT_OPTIONS = [
    { label: "S", value: "14" },
    { label: "M", value: "16" },
    { label: "L", value: "20" },
    { label: "XL", value: "24" },
];

export default function Navbar() {
    const location = useLocation();
    const {
        fontSize,
        setFontSize,
        highContrast,
        setHighContrast,
        priyaMode,
        togglePriyaMode,
        colourBlind,
        setColourBlind,
        ttsSpeed,
        setTtsSpeed,
        resetAccessibilitySettings,
    } = useAccessibility();
    const { isListening, supported, toggleListening } = useVoiceNav();

    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        .navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          width: 100%;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          font-family: 'DM Sans', sans-serif;
          backdrop-filter: blur(12px);
          background: rgba(255,255,255,0.9);
          transition: background 0.3s ease;
        }

        .high-contrast .navbar {
          background: rgba(0,0,0,0.95);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .navbar-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 1.5rem;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          flex-shrink: 0;
        }
        .logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .logo-text {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.25rem;
          color: var(--text-primary, #0f172a);
          letter-spacing: -0.02em;
        }
        .logo-text span { color: #7c3aed; }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .nav-link {
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--text-secondary, #64748b);
          padding: 0.35rem 0.6rem;
          border-radius: 8px;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .nav-link:hover {
          color: var(--text-primary, #0f172a);
          background: #f1f5f9;
        }
        .nav-link.active {
          color: #7c3aed;
          background: #f3f0ff;
          font-weight: 600;
        }
        .high-contrast .nav-link:hover { background: #333; }
        .high-contrast .nav-link.active { background: #2d1f5e; }

        .nav-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .contrast-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--border-color, #e2e8f0);
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary, #64748b);
          transition: all 0.15s ease;
        }
        .contrast-btn:hover {
          background: #f1f5f9;
          color: var(--text-primary, #0f172a);
        }
        .contrast-btn.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .voice-toggle-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--border-color, #e2e8f0);
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary, #64748b);
          transition: all 0.15s ease;
        }
        .voice-toggle-btn:hover {
          background: #f1f5f9;
          color: var(--text-primary, #0f172a);
        }
        .voice-toggle-btn.active {
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: #ffffff;
          border-color: #7c3aed;
          box-shadow: 0 4px 18px rgba(124, 58, 237, 0.35);
        }
        .voice-toggle-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .priya-btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 1rem;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          border: none;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: white;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .priya-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
        }
        .priya-btn.active {
          animation: priyaGlow 1.8s ease-in-out infinite;
        }
        @keyframes priyaGlow {
          0%   { box-shadow: 0 0 0 0 rgba(124,58,237,0.7), 0 4px 20px rgba(124,58,237,0.4); }
          50%  { box-shadow: 0 0 0 12px rgba(124,58,237,0), 0 4px 30px rgba(124,58,237,0.6); }
          100% { box-shadow: 0 0 0 0 rgba(124,58,237,0), 0 4px 20px rgba(124,58,237,0.4); }
        }
        .priya-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #86efac;
          display: inline-block;
        }
        .priya-btn.active .priya-dot {
          animation: dotPulse 1s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }

        .mobile-menu-btn {
          display: none;
          width: 36px; height: 36px;
          border-radius: 8px;
          border: 1px solid var(--border-color, #e2e8f0);
          background: transparent;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          color: var(--text-primary, #0f172a);
        }

        .mobile-drawer {
          position: fixed; inset: 0;
          z-index: 100; pointer-events: none;
        }
        .mobile-drawer.open { pointer-events: all; }
        .mobile-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.4);
          opacity: 0; transition: opacity 0.25s ease;
        }
        .mobile-drawer.open .mobile-overlay { opacity: 1; }
        .mobile-panel {
          position: absolute; top: 0; right: 0;
          width: 280px; height: 100%;
          background: var(--bg-primary, #fff);
          transform: translateX(100%);
          transition: transform 0.25s ease;
          padding: 1.5rem;
          display: flex; flex-direction: column; gap: 0.5rem;
          overflow-y: auto;
        }
        .mobile-drawer.open .mobile-panel { transform: translateX(0); }
        .mobile-nav-link {
          display: flex; align-items: center; gap: 0.6rem;
          text-decoration: none; font-size: 1rem; font-weight: 500;
          color: var(--text-primary, #0f172a);
          padding: 0.7rem 1rem; border-radius: 10px;
          transition: background 0.15s;
        }
        .mobile-nav-link:hover, .mobile-nav-link.active {
          background: #f3f0ff; color: #7c3aed;
        }

        /* Settings rows */
        .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 0;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }
        .setting-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary, #0f172a);
        }
        .setting-desc {
          font-size: 0.75rem;
          color: var(--text-secondary, #64748b);
          margin-top: 0.15rem;
        }

        @media (max-width: 900px) {
          .nav-links { display: none; }
          .mobile-menu-btn { display: flex; }
        }
        @media (max-width: 640px) {
          .font-select { display: none; }
        }
      `}</style>

            <nav className="navbar">
                <div className="navbar-inner">
                    {/* Logo */}
                    <Link to="/" className="logo">
                        <div className="logo-icon">
                            <Brain size={18} />
                        </div>
                        <span className="logo-text">
                            Access<span>AI</span>
                        </span>
                    </Link>

                    {/* Desktop nav links */}
                    <ul className="nav-links">
                        {NAV_LINKS.map(({ label, path }) => (
                            <li key={path}>
                                <Link
                                    to={path}
                                    className={`nav-link ${location.pathname === path ? "active" : ""}`}
                                >
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {/* Controls */}
                    <div className="nav-controls">

                        {/* Font size select */}
                        <div className="font-select">
                            <Select
                                value={String(fontSize)}
                                onValueChange={(v) => setFontSize(Number(v))}
                            >
                                <SelectTrigger className="h-9 w-[72px] text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent
                                    position="popper"
                                    side="bottom"
                                    avoidCollisions={false}
                                    style={{
                                        backgroundColor: "var(--bg-primary, #fff)",
                                        color: "var(--text-primary, #0f172a)",
                                        border: "1px solid var(--border-color, #e2e8f0)",
                                        borderRadius: "8px",
                                        zIndex: 99999,
                                    }}
                                >
                                    {FONT_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* High contrast toggle */}
                        <button
                            className={`contrast-btn ${highContrast ? "active" : ""}`}
                            onClick={() => setHighContrast(!highContrast)}
                            title="Toggle high contrast"
                        >
                            <Eye size={16} />
                        </button>

                        <button
                            className={`voice-toggle-btn ${isListening ? "active" : ""}`}
                            onClick={toggleListening}
                            disabled={!supported}
                            title={isListening ? "Stop voice navigation" : "Start voice navigation"}
                        >
                            <Mic size={16} />
                        </button>

                        {/* Settings sheet */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <button className="contrast-btn" title="Accessibility settings">
                                    <Settings size={16} />
                                </button>
                            </SheetTrigger>
                            <SheetContent
                                side="right"
                                className="w-[320px]"
                                style={{
                                    backgroundColor: "var(--bg-primary, #ffffff)",
                                    color: "var(--text-primary, #0f172a)",
                                    borderLeft: "1px solid var(--border-color, #e2e8f0)",
                                }}
                            >
                                <SheetHeader>
                                    <SheetTitle
                                        className="flex items-center gap-2"
                                        style={{ color: "var(--text-primary, #0f172a)" }}
                                    >
                                        <Settings size={18} className="text-purple-600" />
                                        Accessibility Settings
                                    </SheetTitle>
                                </SheetHeader>

                                <div style={{ marginTop: "1.5rem", padding: "0 1rem" }}>

                                    {/* High Contrast */}
                                    <div className="setting-row">
                                        <div>
                                            <div className="setting-label">High Contrast</div>
                                            <div className="setting-desc">Black background, white text</div>
                                        </div>
                                        <Switch
                                            checked={highContrast}
                                            onCheckedChange={setHighContrast}
                                        />
                                    </div>

                                    {/* Font size */}
                                    <div className="setting-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.75rem" }}>
                                        <div className="setting-label">
                                            Font Size — {fontSize}px
                                        </div>
                                        <Slider
                                            min={14}
                                            max={28}
                                            step={2}
                                            value={[fontSize]}
                                            onValueChange={([v]) => setFontSize(v)}
                                            className="w-full"
                                        />
                                    </div>

                                    {/* Colour blind mode */}
                                    <div className="setting-row">
                                        <div className="setting-label">Colour Blind Mode</div>
                                        <Select value={colourBlind} onValueChange={setColourBlind}>
                                            <SelectTrigger className="w-[140px] text-sm h-8"
                                                style={{ color: "var(--text-primary, #0f172a)" }}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent
                                                position="popper"
                                                side="bottom"
                                                avoidCollisions={false}
                                                style={{
                                                    backgroundColor: "var(--bg-primary, #ffffff)",
                                                    color: "var(--text-primary, #0f172a)",
                                                    border: "1px solid var(--border-color, #e2e8f0)",
                                                    borderRadius: "8px",
                                                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                                                    zIndex: 99999,
                                                }}
                                            >
                                                <SelectItem value="none">None</SelectItem>
                                                <SelectItem value="protanopia">Protanopia</SelectItem>
                                                <SelectItem value="deuteranopia">Deuteranopia</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* TTS Speed */}
                                    <div className="setting-row">
                                        <div className="setting-label">TTS Speed</div>
                                        <Select
                                            value={String(ttsSpeed)}
                                            onValueChange={(v) => setTtsSpeed(Number(v))}
                                        >
                                            <SelectTrigger className="w-[90px] text-sm h-8"
                                                style={{ color: "var(--text-primary, #0f172a)" }}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent
                                                position="popper"
                                                side="bottom"
                                                avoidCollisions={false}
                                                style={{
                                                    backgroundColor: "var(--bg-primary, #ffffff)",
                                                    color: "var(--text-primary, #0f172a)",
                                                    border: "1px solid var(--border-color, #e2e8f0)",
                                                    borderRadius: "8px",
                                                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                                                    zIndex: 99999,
                                                }}
                                            >
                                                <SelectItem value="0.5">0.5×</SelectItem>
                                                <SelectItem value="1">1×</SelectItem>
                                                <SelectItem value="1.5">1.5×</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Reset */}
                                    <div style={{ marginTop: "1.25rem" }}>
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            style={{
                                                color: "var(--text-primary, #0f172a)",
                                                borderColor: "var(--border-color, #e2e8f0)",
                                                backgroundColor: "transparent",
                                            }}
                                            onClick={resetAccessibilitySettings}
                                        >
                                            Reset to Defaults
                                        </Button>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>

                        {/* Priya Mode */}
                        <button
                            className={`priya-btn ${priyaMode ? "active" : ""}`}
                            onClick={togglePriyaMode}
                        >
                            <Zap size={15} />
                            {priyaMode ? (
                                <>
                                    <span className="priya-dot" />
                                    Priya ON
                                </>
                            ) : (
                                "Priya Mode"
                            )}
                        </button>

                        {/* Mobile menu */}
                        <button
                            className="mobile-menu-btn"
                            onClick={() => setMobileOpen(true)}
                        >
                            <Menu size={18} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile drawer */}
            <div className={`mobile-drawer ${mobileOpen ? "open" : ""}`}>
                <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
                <div className="mobile-panel">
                    <div style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginBottom: "1rem",
                    }}>
                        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>
                            Menu
                        </span>
                        <button className="contrast-btn" onClick={() => setMobileOpen(false)}>
                            <X size={16} />
                        </button>
                    </div>
                    {NAV_LINKS.map(({ label, path, icon: Icon }) => (
                        <Link
                            key={path}
                            to={path}
                            className={`mobile-nav-link ${location.pathname === path ? "active" : ""}`}
                            onClick={() => setMobileOpen(false)}
                        >
                            {Icon && <Icon size={17} />}
                            {label}
                        </Link>
                    ))}
                    <div style={{ marginTop: "1rem" }}>
                        <button
                            className={`priya-btn ${priyaMode ? "active" : ""}`}
                            onClick={() => { togglePriyaMode(); setMobileOpen(false); }}
                            style={{ width: "100%", justifyContent: "center" }}
                        >
                            <Zap size={15} />
                            {priyaMode ? "Priya Mode ON" : "Priya Mode"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
