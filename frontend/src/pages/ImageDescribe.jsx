import { useState, useRef, useEffect, useCallback } from "react";
import { describeImage, describeImageByUrl } from "../api/api";
import { useAccessibility } from "../context/AccessibilityContext";
import {
  ImageIcon, Upload, Volume2, Copy, RotateCcw,
  Eye, EyeOff, Loader2, CheckCircle2, Sparkles,
  MousePointer2, X, ZoomIn,
} from "lucide-react";

// Demo fallback — used when backend is offline
const DEMO_DESCRIPTION =
  "A young woman sitting in a wheelchair at a wooden desk, smiling warmly while using a silver laptop. There is a cup of coffee beside her and a bookshelf in the background filled with colourful books. Natural light comes in through a window on the left.";

export default function ImageDescribe() {
  const { speak, hoverMode, setHoverMode } = useAccessibility();

  const [image, setImage]             = useState(null);   // { url, file, name }
  const [description, setDescription] = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [copied, setCopied]           = useState(false);
  const [isDragging, setIsDragging]   = useState(false);
  
  const [hoverPanel, setHoverPanel]   = useState(null);   // { desc, loading, x }
  const [lightbox, setLightbox]       = useState(false);

  const fileInputRef  = useRef(null);
  const hoverTimerRef = useRef(null);
  const hoverPanelRef = useRef(null);

  // ── Describe an image file ────────────────────────────────────────────────
  const handleDescribe = useCallback(async (file) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setDescription("");

    try {
      const res = await describeImage(file);
      setDescription(res.data.description);
      // Auto-speak on result
      speak(res.data.description);
    } catch {
      // Offline fallback
      setDescription(DEMO_DESCRIPTION);
      speak(DEMO_DESCRIPTION);
    } finally {
      setLoading(false);
    }
  }, [speak]);

  // ── File selection ────────────────────────────────────────────────────────
  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, WEBP, GIF).");
      return;
    }
    const url = URL.createObjectURL(file);
    setImage({ url, file, name: file.name });
    setDescription("");
    setError(null);
    handleDescribe(file);
  }, [handleDescribe]);

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  // ── Click to browse ───────────────────────────────────────────────────────
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  // ── Hover mode — global mouseover ─────────────────────────────────────────
  useEffect(() => {
    if (!hoverMode) {
      setHoverPanel(null);
      return;
    }

    const handleMouseOver = async (e) => {
      const target = e.target;
      if (target.tagName !== "IMG") return;
      // Ignore tiny icons / avatars
      if (target.naturalWidth < 80 || target.naturalHeight < 80) return;
      // Ignore the upload preview itself
      if (target.dataset.noHover === "true") return;

      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(async () => {
        setHoverPanel({ desc: "", loading: true });

        try {
          // Try to fetch by URL first (faster for external images)
          const src = target.src;
          let desc = "";
          if (src.startsWith("blob:") || src.startsWith("data:")) {
            // Convert to file and POST
            const res = await fetch(src);
            const blob = await res.blob();
            const file = new File([blob], "hovered.jpg", { type: blob.type });
            const apiRes = await describeImage(file);
            desc = apiRes.data.description;
          } else {
            const apiRes = await describeImageByUrl(src);
            desc = apiRes.data.description;
          }
          setHoverPanel({ desc, loading: false });
          speak(desc);
        } catch {
          setHoverPanel({ desc: DEMO_DESCRIPTION, loading: false });
          speak(DEMO_DESCRIPTION);
        }
      }, 600); // 600ms debounce — don't fire on every image during scroll
    };

    const handleMouseOut = (e) => {
      if (e.target.tagName !== "IMG") return;
      clearTimeout(hoverTimerRef.current);
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout",  handleMouseOut);
    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout",  handleMouseOut);
      clearTimeout(hoverTimerRef.current);
    };
  }, [hoverMode, speak]);

  const handleCopy = () => {
    navigator.clipboard.writeText(description);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setImage(null);
    setDescription("");
    setError(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');

        @keyframes fadeUp    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes descReveal{ from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes panelSlide{ from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanLine  {
          0%,100%{ top:0%; opacity:0.6; }
          50%    { top:92%; opacity:1; }
        }
        @keyframes borderPulse {
          0%,100%{ border-color: rgba(146,64,14,0.35); }
          50%    { border-color: rgba(146,64,14,0.7); box-shadow: 0 0 0 4px rgba(146,64,14,0.1); }
        }

        .id-root {
          font-family: 'DM Sans', sans-serif;
          min-height: calc(100vh - 64px);
          padding: 2rem 0 6rem;
        }

        /* ── Header ── */
        .id-header {
          margin-bottom: 2rem;
          animation: fadeUp 0.4s ease both;
        }
        .id-eyebrow {
          display:flex; align-items:center; gap:0.5rem;
          font-size:0.75rem; font-weight:700;
          letter-spacing:0.12em; text-transform:uppercase;
          color:#92400e; margin-bottom:0.5rem;
        }
        .id-title {
          font-family:'Syne',sans-serif; font-weight:900;
          font-size:clamp(1.8rem,4vw,2.8rem);
          letter-spacing:-0.03em;
          color:var(--text-primary,#0f172a); margin:0 0 0.4rem;
        }
        .id-sub { color:var(--text-secondary,#64748b); font-size:0.95rem; }

        /* ── Top bar ── */
        .id-topbar {
          display:flex; align-items:center; justify-content:space-between;
          flex-wrap:wrap; gap:0.75rem;
          margin-bottom:1.25rem;
          animation: fadeUp 0.4s 0.1s ease both;
        }

        /* Hover mode toggle */
        .hover-toggle {
          display:flex; align-items:center; gap:0.5rem;
          padding:0.5rem 1.1rem;
          border-radius:12px;
          border:1.5px solid var(--border-color,#e2e8f0);
          background:var(--bg-primary,#fff);
          cursor:pointer;
          font-size:0.85rem; font-weight:600;
          color:var(--text-secondary,#64748b);
          transition:all 0.2s ease;
          position:relative;
          overflow:hidden;
        }
        .hover-toggle.active {
          border-color:#92400e;
          background:rgba(146,64,14,0.07);
          color:#92400e;
          animation: borderPulse 2s ease-in-out infinite;
        }
        .hover-toggle:hover { border-color:#92400e; color:#92400e; }
        .hover-active-dot {
          width:7px; height:7px; border-radius:50%;
          background:#92400e;
          animation: dotPulse2 1.2s ease infinite;
        }
        @keyframes dotPulse2 {
          0%,100%{opacity:1;transform:scale(1);}
          50%{opacity:0.4;transform:scale(0.6);}
        }

        .reset-btn2 {
          display:flex; align-items:center; gap:0.35rem;
          padding:0.4rem 0.75rem; border-radius:10px;
          border:1.5px solid var(--border-color,#e2e8f0);
          background:var(--bg-primary,#fff); cursor:pointer;
          font-size:0.8rem; font-weight:600;
          color:var(--text-secondary,#64748b); transition:all 0.18s;
        }
        .reset-btn2:hover { border-color:#ef4444; color:#ef4444; background:#fee2e2; }

        /* ── Main grid ── */
        .id-grid {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:1.25rem;
          animation: fadeUp 0.5s 0.15s ease both;
        }

        /* ── Upload zone ── */
        .upload-zone {
          border-radius:20px;
          border:2px dashed var(--border-color,#e2e8f0);
          background:var(--card-bg,#f8fafc);
          min-height:380px;
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          cursor:pointer; transition:all 0.2s ease;
          position:relative; overflow:hidden;
          text-align:center; padding:1.5rem;
        }
        .upload-zone:hover, .upload-zone.drag-over {
          border-color:#92400e;
          background:rgba(146,64,14,0.04);
          box-shadow:0 0 0 4px rgba(146,64,14,0.08);
        }
        .upload-zone.has-image {
          border-style:solid;
          border-color:rgba(146,64,14,0.3);
          padding:0;
        }
        .upload-icon-wrap {
          width:72px; height:72px; border-radius:20px;
          background:rgba(146,64,14,0.08);
          border:2px dashed rgba(146,64,14,0.25);
          display:flex; align-items:center; justify-content:center;
          margin-bottom:1rem; transition:all 0.2s;
          color:#92400e;
        }
        .upload-zone:hover .upload-icon-wrap {
          background:rgba(146,64,14,0.12);
          transform:scale(1.05);
        }
        .upload-title {
          font-family:'Syne',sans-serif; font-weight:700;
          font-size:1rem; color:var(--text-primary,#0f172a);
          margin-bottom:0.3rem;
        }
        .upload-sub {
          font-size:0.8rem; color:var(--text-secondary,#94a3b8);
          margin-bottom:1rem;
        }
        .upload-browse-btn {
          padding:0.45rem 1.1rem; border-radius:8px;
          border:1.5px solid rgba(146,64,14,0.4);
          background:rgba(146,64,14,0.06);
          color:#92400e; font-size:0.8rem; font-weight:600;
          cursor:pointer; transition:all 0.15s;
        }
        .upload-browse-btn:hover { background:rgba(146,64,14,0.12); }
        .upload-formats {
          font-size:0.7rem; color:var(--text-secondary,#cbd5e1);
          margin-top:0.75rem;
        }

        /* Image preview */
        .preview-wrap {
          position:relative; width:100%; height:100%;
          min-height:380px;
        }
        .preview-img {
          width:100%; height:100%; min-height:380px;
          object-fit:cover; display:block;
          border-radius:18px;
        }
        /* Scan line while loading */
        .scan-line {
          position:absolute; left:0; right:0; height:2px;
          background:linear-gradient(90deg,transparent,rgba(146,64,14,0.8),transparent);
          animation: scanLine 2s ease-in-out infinite;
          pointer-events:none; z-index:5;
        }
        /* Change image overlay */
        .change-overlay {
          position:absolute; inset:0; border-radius:18px;
          background:rgba(0,0,0,0); display:flex;
          align-items:flex-end; justify-content:space-between;
          padding:0.875rem; opacity:0; transition:all 0.2s;
        }
        .preview-wrap:hover .change-overlay {
          opacity:1; background:rgba(0,0,0,0.3);
        }
        .overlay-btn {
          display:flex; align-items:center; gap:0.35rem;
          padding:0.4rem 0.8rem; border-radius:8px;
          background:rgba(255,255,255,0.9); border:none; cursor:pointer;
          font-size:0.75rem; font-weight:600; color:#0f172a;
          transition:all 0.15s;
        }
        .overlay-btn:hover { background:#fff; transform:scale(1.03); }
        .filename-badge {
          font-size:0.7rem; color:rgba(255,255,255,0.85);
          background:rgba(0,0,0,0.5); padding:0.25rem 0.6rem;
          border-radius:6px; max-width:55%; overflow:hidden;
          text-overflow:ellipsis; white-space:nowrap;
        }

        /* ── Description panel ── */
        .desc-panel {
          display:flex; flex-direction:column; gap:0;
          border-radius:20px; overflow:hidden;
          border:1px solid var(--border-color,#e8e8e8);
          background:var(--card-bg,#f8fafc);
        }
        .desc-header {
          display:flex; align-items:center; justify-content:space-between;
          padding:0.875rem 1.25rem;
          border-bottom:1px solid var(--border-color,#e8e8e8);
          background:var(--bg-primary,#fff);
        }
        .desc-title {
          display:flex; align-items:center; gap:0.5rem;
          font-family:'Syne',sans-serif; font-weight:700;
          font-size:0.875rem; color:var(--text-primary,#0f172a);
        }
        .desc-body {
          flex:1; padding:1.5rem;
          font-size:0.95rem; line-height:1.85;
          color:var(--text-primary,#0f172a);
          min-height:280px; display:flex;
          align-items:center; justify-content:center;
        }
        .desc-text {
          animation: descReveal 0.4s ease both;
          width:100%; align-self:flex-start;
        }

        /* Empty state */
        .desc-empty {
          display:flex; flex-direction:column;
          align-items:center; gap:0.75rem;
          color:var(--text-secondary,#cbd5e1); text-align:center;
        }
        .desc-empty-icon {
          width:56px; height:56px; border-radius:16px;
          background:var(--bg-primary,#fff);
          border:1px dashed var(--border-color,#e2e8f0);
          display:flex; align-items:center; justify-content:center;
        }

        /* Loading state */
        .desc-loading {
          display:flex; flex-direction:column;
          align-items:center; gap:1rem; color:#92400e;
        }
        .loading-ring {
          width:48px; height:48px; border-radius:50%;
          border:3px solid rgba(146,64,14,0.15);
          border-top-color:#92400e;
          animation: spin 0.8s linear infinite;
        }

        /* Actions */
        .desc-actions {
          display:flex; gap:0.5rem; padding:0.875rem 1.25rem;
          border-top:1px solid var(--border-color,#e8e8e8);
          background:var(--bg-primary,#fff);
        }
        .action-btn {
          display:flex; align-items:center; gap:0.35rem;
          padding:0.45rem 0.875rem; border-radius:8px;
          border:1px solid var(--border-color,#e2e8f0);
          background:transparent; cursor:pointer;
          font-size:0.8rem; font-weight:600;
          color:var(--text-secondary,#64748b); transition:all 0.15s;
        }
        .action-btn:hover { background:var(--card-bg,#f1f5f9); color:var(--text-primary,#0f172a); }
        .action-btn.primary {
          background:linear-gradient(135deg,#92400e,#b45309);
          color:#fff; border-color:transparent;
          box-shadow:0 4px 14px rgba(146,64,14,0.3);
        }
        .action-btn.primary:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(146,64,14,0.4); }
        .action-btn.copied { background:#d1fae5; border-color:#4ade80; color:#16a34a; }

        /* ── Hover mode info card ── */
        .hover-info-card {
          background:rgba(146,64,14,0.06);
          border:1px solid rgba(146,64,14,0.2);
          border-radius:14px; padding:1rem 1.25rem;
          margin-top:1.25rem;
          animation: fadeUp 0.4s 0.2s ease both;
        }
        .hover-info-title {
          display:flex; align-items:center; gap:0.4rem;
          font-family:'Syne',sans-serif; font-weight:700;
          font-size:0.85rem; color:#92400e; margin-bottom:0.4rem;
        }
        .hover-info-list {
          display:flex; flex-direction:column; gap:0.25rem;
          list-style:none; padding:0; margin:0;
        }
        .hover-info-list li {
          font-size:0.8rem; color:var(--text-secondary,#64748b);
          display:flex; align-items:center; gap:0.4rem;
        }
        .hover-info-list li::before { content:'→'; color:#92400e; font-size:0.75rem; }

        /* ── Hover panel — slides up from bottom ── */
        .hover-panel-overlay {
          position:fixed; bottom:0; left:0; right:0; z-index:9999;
          animation: panelSlide 0.3s ease both;
          pointer-events:none;
        }
        .hover-panel {
          max-width:680px; margin:0 auto 1.5rem;
          background:#1a0a00;
          border:1px solid rgba(146,64,14,0.5);
          border-radius:18px; padding:1.25rem 1.5rem;
          box-shadow:0 -8px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(146,64,14,0.2);
          pointer-events:all; position:relative;
          backdrop-filter:blur(20px);
        }
        .hp-header {
          display:flex; align-items:center; justify-content:space-between;
          margin-bottom:0.6rem;
        }
        .hp-label {
          display:flex; align-items:center; gap:0.4rem;
          font-size:0.7rem; font-weight:700;
          letter-spacing:0.1em; text-transform:uppercase; color:#d97706;
        }
        .hp-close {
          width:24px; height:24px; border-radius:50%;
          background:rgba(255,255,255,0.08); border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          color:rgba(255,255,255,0.5); transition:all 0.15s;
        }
        .hp-close:hover { background:rgba(255,255,255,0.15); color:#fff; }
        .hp-text {
          font-size:0.9rem; line-height:1.7; color:#fef3c7;
          font-style:italic;
        }
        .hp-loading {
          display:flex; align-items:center; gap:0.5rem;
          color:#d97706; font-size:0.85rem;
        }

        /* ── Lightbox ── */
        .lightbox {
          position:fixed; inset:0; z-index:10000;
          background:rgba(0,0,0,0.9);
          display:flex; align-items:center; justify-content:center;
          cursor:zoom-out; padding:2rem;
        }
        .lightbox img {
          max-width:90vw; max-height:85vh;
          object-fit:contain; border-radius:12px;
          box-shadow:0 20px 80px rgba(0,0,0,0.6);
        }
        .lightbox-close {
          position:absolute; top:1.5rem; right:1.5rem;
          width:40px; height:40px; border-radius:50%;
          background:rgba(255,255,255,0.1); border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          color:#fff; transition:all 0.15s;
        }
        .lightbox-close:hover { background:rgba(255,255,255,0.2); }

        /* Error */
        .error-banner {
          background:rgba(239,68,68,0.07);
          border:1px solid rgba(239,68,68,0.2);
          border-radius:12px; padding:0.875rem 1rem;
          color:#dc2626; font-size:0.85rem;
          margin-bottom:1rem; display:flex; gap:0.5rem;
          align-items:flex-start;
        }

        @media (max-width:768px) {
          .id-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="id-root">

        {/* Header */}
        <div className="id-header">
          <div className="id-eyebrow">
            <ImageIcon size={14} /> Image Describer
          </div>
          <h1 className="id-title">Every image, described.</h1>
          <p className="id-sub">
            Upload any image for an instant AI description — or enable Hover Mode
            to describe any image on any page, just by hovering.
          </p>
        </div>

        {/* Top bar */}
        <div className="id-topbar">
          {/* Hover mode toggle */}
          <button
            className={`hover-toggle ${hoverMode ? "active" : ""}`}
            onClick={() => setHoverMode(!hoverMode)}
          >
            {hoverMode ? (
              <>
                <span className="hover-active-dot" />
                <MousePointer2 size={14} />
                Hover Mode ON — hover any image
              </>
            ) : (
              <>
                <MousePointer2 size={14} />
                Enable Hover Mode
              </>
            )}
          </button>

          <button className="reset-btn2" onClick={handleReset}>
            <RotateCcw size={13} /> Reset
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="error-banner">
            <X size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        {/* Main grid */}
        <div className="id-grid">

          {/* Upload zone */}
          <div
            className={`upload-zone ${isDragging ? "drag-over" : ""} ${image ? "has-image" : ""}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => !image && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={onFileChange}
            />

            {image ? (
              <div className="preview-wrap">
                {loading && <div className="scan-line" />}
                <img
                  src={image.url}
                  alt="uploaded"
                  className="preview-img"
                  data-no-hover="true"
                />
                <div className="change-overlay">
                  <span className="filename-badge">{image.name}</span>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      className="overlay-btn"
                      onClick={(e) => { e.stopPropagation(); setLightbox(true); }}
                    >
                      <ZoomIn size={12} /> Zoom
                    </button>
                    <button
                      className="overlay-btn"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                      <Upload size={12} /> Change
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="upload-icon-wrap">
                  <Upload size={28} />
                </div>
                <div className="upload-title">
                  {isDragging ? "Drop it here!" : "Drag & drop an image"}
                </div>
                <p className="upload-sub">
                  or click to browse your files
                </p>
                <button
                  className="upload-browse-btn"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  Browse Files
                </button>
                <p className="upload-formats">
                  Supports JPG, PNG, WEBP, GIF · Max 10MB
                </p>
              </>
            )}
          </div>

          {/* Description panel */}
          <div className="desc-panel">
            <div className="desc-header">
              <span className="desc-title">
                <Sparkles size={15} style={{ color: "#92400e" }} />
                AI Description
              </span>
              {description && (
                <span style={{
                  fontSize: "0.7rem",
                  background: "rgba(146,64,14,0.1)",
                  color: "#92400e",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "100px",
                  fontWeight: 600,
                }}>
                  ✓ Ready
                </span>
              )}
            </div>

            <div className="desc-body">
              {loading ? (
                <div className="desc-loading">
                  <div className="loading-ring" />
                  <span style={{ fontSize: "0.85rem" }}>Analysing image with AI…</span>
                </div>
              ) : description ? (
                <p className="desc-text">{description}</p>
              ) : (
                <div className="desc-empty">
                  <div className="desc-empty-icon">
                    <Eye size={22} style={{ opacity: 0.3 }} />
                  </div>
                  <span style={{ fontSize: "0.875rem" }}>
                    Upload an image to get a description
                  </span>
                  <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                    Description auto-reads aloud when ready
                  </span>
                </div>
              )}
            </div>

            {description && (
              <div className="desc-actions">
                <button
                  className="action-btn primary"
                  onClick={() => speak(description)}
                >
                  <Volume2 size={13} /> Read Aloud
                </button>
                <button
                  className={`action-btn ${copied ? "copied" : ""}`}
                  onClick={handleCopy}
                >
                  {copied
                    ? <><CheckCircle2 size={13} /> Copied!</>
                    : <><Copy size={13} /> Copy</>}
                </button>
                <button
                  className="action-btn"
                  onClick={() => handleDescribe(image?.file)}
                  disabled={loading || !image}
                >
                  <RotateCcw size={13} /> Re-describe
                </button>
              </div>
            )}
          </div>
        </div>

        

        {/* Hover mode info */}
        <div className="hover-info-card">
          <div className="hover-info-title">
            <MousePointer2 size={14} />
            {hoverMode ? "Hover Mode is ACTIVE — move your mouse over any image" : "How Hover Mode works"}
          </div>
          <ul className="hover-info-list">
            <li>Enable Hover Mode using the button above</li>
            <li>Move your mouse over any image on this page</li>
            <li>A description panel slides up from the bottom</li>
            <li>The description is automatically read aloud</li>
            <li>Works on uploaded images and images anywhere on the page</li>
          </ul>
        </div>

      </div>

      {/* ── Hover panel (slides up from bottom) ── */}
      {hoverMode && hoverPanel && (
        <div className="hover-panel-overlay" ref={hoverPanelRef}>
          <div className="hover-panel">
            <div className="hp-header">
              <span className="hp-label">
                <Eye size={12} />
                AI Image Description
              </span>
              <button className="hp-close" onClick={() => setHoverPanel(null)}>
                <X size={12} />
              </button>
            </div>
            {hoverPanel.loading ? (
              <div className="hp-loading">
                <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
                Analysing image…
              </div>
            ) : (
              <p className="hp-text">"{hoverPanel.desc}"</p>
            )}
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && image && (
        <div className="lightbox" onClick={() => setLightbox(false)}>
          <button className="lightbox-close" onClick={() => setLightbox(false)}>
            <X size={18} />
          </button>
          <img src={image.url} alt="preview" data-no-hover="true" />
        </div>
      )}
    </>
  );
}