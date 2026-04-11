import axios from "axios";

// ---------------------------------------------------------------------------
// Axios instance — reads base URL from .env
// VITE_API_BASE_URL=http://localhost:8000
// ---------------------------------------------------------------------------
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 30000, // 30 s — HuggingFace can be slow on free tier
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach JWT token automatically
// ---------------------------------------------------------------------------
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessai_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor — global error normalisation
// ---------------------------------------------------------------------------
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "Something went wrong";

    // 401 → clear stale token
    if (error.response?.status === 401) {
      localStorage.removeItem("accessai_token");
    }

    return Promise.reject(new Error(message));
  }
);

// ===========================================================================
// AUTH
// ===========================================================================

/** POST /auth/login  →  { access_token: string, token_type: "bearer" } */
export const loginUser = (email, password) =>
  API.post("/auth/login", { email, password });

/** POST /auth/register  →  { id, email, created_at } */
export const registerUser = ({ email, password }) =>
  API.post("/auth/register", { email, password });

// ===========================================================================
// SIGN LANGUAGE  (WebSocket — not axios, handled in useSignDetection hook)
// WS URL: ws://localhost:8000/ws/sign
// Message sent: JSON.stringify({ landmarks: Float32Array(63) })
// Message received: { sign: string, confidence: number }
// ===========================================================================
export const WS_SIGN_URL =
  (import.meta.env.VITE_WS_URL || "ws://localhost:8000") + "/ws/sign";

// ===========================================================================
// VOICE NAVIGATOR
// ===========================================================================

/**
 * POST /api/voice
 * Used as fallback if browser SpeechRecognition is unavailable.
 * Body: FormData  →  { audio: Blob }
 * Response: { transcript: string }
 */
export const transcribeVoice = (audioBlob) => {
  const fd = new FormData();
  fd.append("audio", audioBlob, "recording.webm");
  return API.post("/api/voice", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ===========================================================================
// COGNITIVE SIMPLIFIER
// ===========================================================================

/**
 * POST /api/simplify
 * Body: { text: string, grade_level: 3 | 5 | 8 }
 * Response: { simplified: string, word_count_before: number, word_count_after: number }
 */
export const simplifyText = (text, gradeLevel = 5) =>
  API.post("/api/simplify", { text, grade_level: gradeLevel });

// ===========================================================================
// IMAGE DESCRIBER
// ===========================================================================

/**
 * POST /api/describe
 * Body: FormData  →  { image: File }
 * Response: { description: string }
 */
export const describeImage = (imageFile) => {
  const fd = new FormData();
  fd.append("image", imageFile);
  return API.post("/api/describe", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/**
 * POST /api/describe/url
 * For hover-to-describe mode — sends a public image URL instead of uploading.
 * Body: { url: string }
 * Response: { description: string }
 */
export const describeImageByUrl = (imageUrl) =>
  API.post("/api/describe/url", { url: imageUrl });

// ===========================================================================
// HEALTH CHECK  — call this before demo to wake up Render free tier
// ===========================================================================

/** GET /health  →  { status: "ok", uptime: number } */
export const healthCheck = () => API.get("/health");

// ===========================================================================
// Export the raw instance for any one-off calls
// ===========================================================================
export default API;
