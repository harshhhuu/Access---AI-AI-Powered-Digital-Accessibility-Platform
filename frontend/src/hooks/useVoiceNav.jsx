import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAccessibility } from "../context/AccessibilityContext";

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

const VoiceNavContext = createContext(null);

// Each entry: { keywords, description, category, action }
// action receives (navigate, accessibilityContext) and returns a feedback string
export const COMMANDS = [
  {
    keywords: ["scroll down", "go down", "move down", "page down"],
    description: "Scroll down the page",
    category: "navigation",
    action: () => {
      window.scrollBy({ top: 300, behavior: "smooth" });
      return "Scrolling down";
    },
  },
  {
    keywords: ["scroll up", "go up", "move up", "page up"],
    description: "Scroll up the page",
    category: "navigation",
    action: () => {
      window.scrollBy({ top: -300, behavior: "smooth" });
      return "Scrolling up";
    },
  },
  {
    keywords: ["scroll to top", "go to top", "top of page", "beginning"],
    description: "Jump to top of page",
    category: "navigation",
    action: () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return "Going to top";
    },
  },
  {
    keywords: ["scroll to bottom", "go to bottom", "end of page", "bottom"],
    description: "Jump to bottom of page",
    category: "navigation",
    action: () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      return "Going to bottom";
    },
  },
  {
    keywords: ["go back", "go backward", "previous page", "back"],
    description: "Go to previous page",
    category: "navigation",
    action: (navigate) => {
      navigate(-1);
      return "Going back";
    },
  },
  {
    keywords: ["go home", "open home", "home page", "go to home"],
    description: "Open home page",
    category: "navigation",
    action: (navigate) => {
      navigate("/");
      return "Opening home";
    },
  },
  {
    keywords: ["open sign language", "sign language", "go to sign", "open sign"],
    description: "Open Sign Language page",
    category: "navigation",
    action: (navigate) => {
      navigate("/sign");
      return "Opening Sign Language";
    },
  },
  {
    keywords: ["open voice", "voice navigator", "go to voice"],
    description: "Open Voice Navigator",
    category: "navigation",
    action: (navigate) => {
      navigate("/voice");
      return "Opening Voice Navigator";
    },
  },
  {
    keywords: ["open simplifier", "text simplifier", "simplify", "go to simplify"],
    description: "Open Text Simplifier",
    category: "navigation",
    action: (navigate) => {
      navigate("/simplify");
      return "Opening Simplifier";
    },
  },
  {
    keywords: ["open image", "image describer", "describe image", "go to image"],
    description: "Open Image Describer",
    category: "navigation",
    action: (navigate) => {
      navigate("/image");
      return "Opening Image Describer";
    },
  },
  {
    keywords: ["open call", "sign call", "video call", "call page"],
    description: "Open Sign Call",
    category: "navigation",
    action: (navigate) => {
      navigate("/call");
      return "Opening Sign Call";
    },
  },
  {
    keywords: ["help", "what can i say", "commands"],
    description: "Read available voice commands",
    category: "navigation",
    action: (_, ctx) => {
      ctx.speak(
        "You can say open sign, open voice, open image, open simplify, open call, scroll down, scroll up, read page, or go home."
      );
      return "Reading available voice commands";
    },
  },
  {
    keywords: ["increase text", "bigger text", "larger text", "increase font", "zoom in"],
    description: "Increase font size",
    category: "accessibility",
    action: (_, ctx) => {
      ctx.setFontSize((previous) => Math.min(previous + 2, 28));
      return "Text size increased";
    },
  },
  {
    keywords: ["decrease text", "smaller text", "reduce text", "decrease font", "zoom out"],
    description: "Decrease font size",
    category: "accessibility",
    action: (_, ctx) => {
      ctx.setFontSize((previous) => Math.max(previous - 2, 14));
      return "Text size decreased";
    },
  },
  {
    keywords: ["high contrast", "contrast on", "dark mode", "enable contrast"],
    description: "Enable high contrast",
    category: "accessibility",
    action: (_, ctx) => {
      ctx.setHighContrast(true);
      return "High contrast enabled";
    },
  },
  {
    keywords: ["disable contrast", "contrast off", "light mode", "normal mode"],
    description: "Disable high contrast",
    category: "accessibility",
    action: (_, ctx) => {
      ctx.setHighContrast(false);
      return "High contrast disabled";
    },
  },
  {
    keywords: ["priya mode", "enable priya", "activate priya", "priya on"],
    description: "Toggle Priya Mode",
    category: "accessibility",
    action: (_, ctx) => {
      ctx.togglePriyaMode();
      return "Priya Mode toggled";
    },
  },
  {
    keywords: ["read page", "read this", "read aloud", "speak page", "read everything"],
    description: "Read page content aloud",
    category: "reading",
    action: (_, ctx) => {
      const text = document.body.innerText.slice(0, 3000);
      ctx.speak(text);
      return "Reading page aloud";
    },
  },
  {
    keywords: ["stop reading", "stop speaking", "stop", "quiet", "silence"],
    description: "Stop reading",
    category: "reading",
    action: () => {
      window.speechSynthesis?.cancel();
      return "Stopped reading";
    },
  },
  {
    keywords: ["read heading", "read title", "what is this page"],
    description: "Read page heading",
    category: "reading",
    action: (_, ctx) => {
      const heading = document.querySelector("h1")?.innerText || "No heading found";
      ctx.speak(heading);
      return `Reading: "${heading}"`;
    },
  },
];

function useVoiceNavController() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [lastAction, setLastAction] = useState(null);
  const [supported, setSupported] = useState(true);
  const [transcriptLog, setTranscriptLog] = useState([]);

  const recognitionRef = useRef(null);
  const navigate = useNavigate();
  const ctx = useAccessibility();

  useEffect(() => {
    if (!getSpeechRecognitionConstructor()) {
      setSupported(false);
    }
  }, []);

  const matchCommand = useCallback((text) => {
    const lower = text.toLowerCase().trim();
    for (const command of COMMANDS) {
      for (const keyword of command.keywords) {
        if (lower.includes(keyword)) {
          return command;
        }
      }
    }
    return null;
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setIsListening(false);
    setInterimText("");
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition || recognitionRef.current || isListening) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setSupported(true);
      setIsListening(true);
      setLastAction({
        text: "Voice navigation is active across the site",
        success: true,
        ts: Date.now(),
      });
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript;
        if (event.results[index].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      setInterimText(interim);

      if (!final) {
        return;
      }

      const trimmedFinal = final.trim();
      setTranscript(trimmedFinal);
      setTranscriptLog((previous) =>
        [{ text: trimmedFinal, ts: Date.now() }, ...previous].slice(0, 20)
      );

      const command = matchCommand(trimmedFinal);
      if (command) {
        try {
          const feedback = command.action(navigate, ctx);
          setLastAction({ text: feedback, success: true, ts: Date.now() });
        } catch {
          setLastAction({ text: "Command failed", success: false, ts: Date.now() });
        }
      } else {
        setLastAction({
          text: `"${trimmedFinal}" - no command matched`,
          success: false,
          ts: Date.now(),
        });
      }

      setInterimText("");
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        return;
      }

      setLastAction({ text: `Error: ${event.error}`, success: false, ts: Date.now() });
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setLastAction({
        text: "Microphone start was blocked. Use the mic button to try again.",
        success: false,
        ts: Date.now(),
      });
    }
  }, [ctx, isListening, matchCommand, navigate]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }

    startListening();
  }, [isListening, startListening, stopListening]);

  const clearLog = useCallback(() => {
    setTranscriptLog([]);
    setTranscript("");
    setLastAction(null);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimText,
    lastAction,
    supported,
    transcriptLog,
    toggleListening,
    startListening,
    stopListening,
    clearLog,
    COMMANDS,
  };
}

export function VoiceNavProvider({ children }) {
  const value = useVoiceNavController();
  return <VoiceNavContext.Provider value={value}>{children}</VoiceNavContext.Provider>;
}

export function useVoiceNav() {
  const context = useContext(VoiceNavContext);

  if (!context) {
    throw new Error("useVoiceNav must be used inside VoiceNavProvider");
  }

  return context;
}
