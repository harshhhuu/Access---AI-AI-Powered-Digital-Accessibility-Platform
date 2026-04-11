import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import { describeImage, describeImageByUrl } from "./api/api";
import { AccessibilityProvider, useAccessibility } from "./context/AccessibilityContext";
import { VoiceNavProvider } from "./hooks/useVoiceNav";

import Home from "./pages/Home";
import Profiles from "./pages/Profiles";
import SignLanguage from "./pages/SignLanguage";
import Voice from "./pages/Voice";
import Simplify from "./pages/Simplify";
import ImageDescribe from "./pages/ImageDescribe";
import VideoCall from "./pages/VideoCall";

function GlobalHoverListener() {
  const { hoverMode, speak } = useAccessibility();
  const [panel, setPanel] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!hoverMode) {
      setPanel(null);
      return undefined;
    }

    const handleMouseOver = async (event) => {
      const target = event.target;
      if (target.tagName !== "IMG") return;
      if (target.naturalWidth < 80 || target.naturalHeight < 80) return;
      if (target.dataset.noHover === "true") return;

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setPanel({ desc: "", loading: true });

        try {
          const src = target.src;
          let description = "";

          if (src.startsWith("blob:") || src.startsWith("data:")) {
            const response = await fetch(src);
            const blob = await response.blob();
            const file = new File([blob], "hovered.jpg", { type: blob.type });
            const apiResponse = await describeImage(file);
            description = apiResponse.data.description;
          } else {
            const apiResponse = await describeImageByUrl(src);
            description = apiResponse.data.description;
          }

          setPanel({ desc: description, loading: false });
          speak(description);
        } catch {
          const fallback =
            "A young woman sitting in a wheelchair at a wooden desk, smiling while using a laptop.";
          setPanel({ desc: fallback, loading: false });
          speak(fallback);
        }
      }, 600);
    };

    const handleMouseOut = (event) => {
      if (event.target.tagName !== "IMG") return;
      clearTimeout(timerRef.current);
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      clearTimeout(timerRef.current);
    };
  }, [hoverMode, speak]);

  if (!hoverMode || !panel) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes panelSlide {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hoverSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          padding: "0 1rem 1.5rem",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            background: "#1a0a00",
            border: "1px solid rgba(146,64,14,0.5)",
            borderRadius: 18,
            padding: "1.25rem 1.5rem",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.35)",
            pointerEvents: "all",
            animation: "panelSlide 0.3s ease both",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "#d97706",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              AI Image Description
            </span>
            <button
              onClick={() => setPanel(null)}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: "50%",
                width: 24,
                height: 24,
                cursor: "pointer",
                color: "rgba(255,255,255,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              x
            </button>
          </div>

          {panel.loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#d97706",
                fontSize: "0.85rem",
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: "2px solid rgba(217,119,6,0.3)",
                  borderTopColor: "#d97706",
                  animation: "hoverSpin 0.8s linear infinite",
                }}
              />
              Analysing image...
            </div>
          ) : (
            <p
              style={{
                color: "#fef3c7",
                fontStyle: "italic",
                fontSize: "0.9rem",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              "{panel.desc}"
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AccessibilityProvider>
      <BrowserRouter>
        <VoiceNavProvider>
          <style>{`
            *, *::before, *::after { box-sizing: border-box; }
            :root {
              --font-size-base: 16px;
              --bg-primary: #ffffff;
              --text-primary: #0f172a;
              --text-secondary: #64748b;
              --border-color: #e2e8f0;
              --card-bg: #f8fafc;
            }
            body {
              margin: 0;
              font-size: var(--font-size-base);
              background: var(--bg-primary);
              color: var(--text-primary);
              transition: background 0.25s ease, color 0.25s ease, font-size 0.2s ease;
              min-height: 100vh;
            }
            #root {
              display: flex;
              flex-direction: column;
              min-height: 100vh;
            }
            .page-wrapper {
              flex: 1;
              max-width: 1280px;
              width: 100%;
              margin: 0 auto;
              padding: 2rem 1.5rem;
            }
          `}</style>

          <Navbar />
          <GlobalHoverListener />

          <div className="page-wrapper">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/profiles" element={<Profiles />} />
              <Route path="/sign" element={<SignLanguage />} />
              <Route path="/voice" element={<Voice />} />
              <Route path="/simplify" element={<Simplify />} />
              <Route path="/image" element={<ImageDescribe />} />
              <Route path="/call" element={<VideoCall />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </div>
        </VoiceNavProvider>
      </BrowserRouter>
    </AccessibilityProvider>
  );
}
