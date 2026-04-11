import { useCallback, useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import {
  Check,
  Copy,
  Hand,
  Link2,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Trash2,
  UserPlus,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import { useAccessibility } from "../context/AccessibilityContext";
import { useSignDetection } from "../hooks/useSignDetection";

const SIGN_BADGES = {
  hello: "HELLO",
  yes: "YES",
  no: "NO",
  thanks: "THANKS",
  help: "HELP",
  stop: "STOP",
  good: "GOOD",
  bad: "BAD",
  water: "WATER",
  more: "MORE",
};

function createRoomId() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function buildCaption(sign, confidence, side) {
  return {
    id: `${Date.now()}-${Math.random()}`,
    sign,
    badge: SIGN_BADGES[sign] || sign.toUpperCase(),
    confidence,
    side,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function VideoCall() {
  const localVideoRef = useRef(null);
  const signVideoRef = useRef({ video: null });
  const canvasRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const callRef = useRef(null);
  const connRef = useRef(null);
  const localStreamRef = useRef(null);
  const timeoutRef = useRef(null);
  const remoteTypingTimerRef = useRef(null);
  const lastCaptionRef = useRef("");
  const callActiveRef = useRef(false);
  const micOnRef = useRef(true);
  const camOnRef = useRef(true);

  const { speak, priyaMode } = useAccessibility();
  const speakRef = useRef(speak);

  const [myId, setMyId] = useState("");
  const [remoteId, setRemoteId] = useState("");
  const [peerStatus, setPeerStatus] = useState("init");
  const [callActive, setCallActive] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [copied, setCopied] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [captions, setCaptions] = useState([]);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const {
    detectedSign,
    confidence,
    modelReady,
    isConnected: wsConnected,
    error: modelError,
    clearHistory,
  } = useSignDetection(signVideoRef, canvasRef, callActive && camOn);

  const attachRemoteStream = useCallback((stream) => {
    if (!remoteVideoRef.current) {
      return;
    }

    remoteVideoRef.current.srcObject = stream;
    setHasRemoteStream(true);
    remoteVideoRef.current.play().catch(() => {});
  }, []);

  const stopLocalStream = useCallback(() => {
    if (!localStreamRef.current) {
      return;
    }

    localStreamRef.current.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  const setLocalVideoElement = useCallback((node) => {
    localVideoRef.current = node;
    signVideoRef.current.video = node;

    if (node && localStreamRef.current && node.srcObject !== localStreamRef.current) {
      node.srcObject = localStreamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  const syncTrackState = useCallback((stream) => {
    stream.getAudioTracks().forEach((track) => {
      track.enabled = micOnRef.current;
    });
    stream.getVideoTracks().forEach((track) => {
      track.enabled = camOnRef.current;
    });
  }, []);

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      const activeTracks = localStreamRef.current
        .getTracks()
        .filter((track) => track.readyState === "live");

      if (activeTracks.length > 0) {
        syncTrackState(localStreamRef.current);
        return localStreamRef.current;
      }

      stopLocalStream();
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    syncTrackState(stream);
    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(() => {});
    }

    return stream;
  }, [stopLocalStream, syncTrackState]);

  const speakText = useCallback((text) => {
    if (text) {
      speakRef.current(text);
    }
  }, []);

  const closeCallResources = useCallback(() => {
    if (callRef.current) {
      callRef.current.close();
      callRef.current = null;
    }

    if (connRef.current) {
      connRef.current.close();
      connRef.current = null;
    }

    stopLocalStream();
    clearTimeout(timeoutRef.current);
    clearTimeout(remoteTypingTimerRef.current);
    timeoutRef.current = null;
    remoteTypingTimerRef.current = null;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setHasRemoteStream(false);
  }, [stopLocalStream]);

  const resetCallState = useCallback(() => {
    callActiveRef.current = false;
    setCallActive(false);
    setPeerStatus("ready");
    setRemoteTyping(false);
    setHasRemoteStream(false);
    setCallDuration(0);
    clearHistory();
    lastCaptionRef.current = "";
  }, [clearHistory]);

  const handleRemotePayload = useCallback(
    (payload) => {
      if (!payload) {
        return;
      }

      if (payload.type === "typing") {
        setRemoteTyping(true);
        clearTimeout(remoteTypingTimerRef.current);
        remoteTypingTimerRef.current = setTimeout(() => setRemoteTyping(false), 2000);
        return;
      }

      if (payload.type !== "caption" || !payload.sign) {
        return;
      }

      setRemoteTyping(false);
      const nextCaption = buildCaption(payload.sign, payload.confidence ?? 0, "remote");
      setCaptions((current) => [...current.slice(-29), nextCaption]);
      speakText(payload.sign);
    },
    [speakText]
  );

  const bindConnection = useCallback(
    (connection) => {
      connRef.current = connection;
      connection.on("data", handleRemotePayload);
    },
    [handleRemotePayload]
  );

  const hangUp = useCallback(
    (announce = true) => {
      closeCallResources();
      resetCallState();
      if (announce) {
        speakText("Call ended.");
      }
    },
    [closeCallResources, resetCallState, speakText]
  );

  const bindCall = useCallback(
    (call, nextRemoteId) => {
      callRef.current = call;
      setRemoteId(nextRemoteId);

      call.on("stream", (remoteStream) => {
        attachRemoteStream(remoteStream);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        callActiveRef.current = true;
        setErrorMessage("");
        setPeerStatus("connected");
        setCallActive(true);
      });

      call.on("close", () => {
        hangUp(false);
      });

      call.on("error", () => {
        setErrorMessage("Call failed. Check the call ID and try again.");
        hangUp(false);
      });
    },
    [attachRemoteStream, hangUp]
  );

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);

  useEffect(() => {
    camOnRef.current = camOn;
  }, [camOn]);

  useEffect(() => {
    const peer = new Peer(createRoomId(), {
      host: "0.peerjs.com",
      port: 443,
      path: "/",
      secure: true,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });

    peerRef.current = peer;

    peer.on("open", (peerId) => {
      setMyId(peerId);
      setPeerStatus("ready");
    });

    peer.on("error", (error) => {
      console.error("PeerJS error", error);
      setPeerStatus("error");
      setErrorMessage("Connection error. Refresh the page and try again.");
    });

    peer.on("connection", (connection) => {
      bindConnection(connection);
    });

    peer.on("call", async (incomingCall) => {
      try {
        const stream = await getLocalStream();
        bindCall(incomingCall, incomingCall.peer);
        incomingCall.answer(stream);
        callActiveRef.current = true;
        setCallActive(true);
        setPeerStatus("connected");
        setErrorMessage("");
        speakText("Incoming call connected. Start signing to send captions.");
      } catch {
        setErrorMessage("Camera or microphone access was denied.");
      }
    });

    return () => {
      closeCallResources();
      peer.destroy();
    };
  }, [bindCall, bindConnection, closeCallResources, getLocalStream, speakText]);

  useEffect(() => {
    callActiveRef.current = callActive;
  }, [callActive]);

  useEffect(() => {
    if (!callActive) {
      setCallDuration(0);
      return undefined;
    }

    const intervalId = setInterval(() => {
      setCallDuration((current) => current + 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [callActive]);

  useEffect(() => {
    if (!callActive || !detectedSign || confidence < 70) {
      return;
    }

    if (detectedSign === lastCaptionRef.current) {
      return;
    }

    lastCaptionRef.current = detectedSign;

    const nextCaption = buildCaption(detectedSign, confidence, "local");
    setCaptions((current) => [...current.slice(-29), nextCaption]);

    if (connRef.current?.open) {
      connRef.current.send({ type: "typing" });
      connRef.current.send({
        type: "caption",
        sign: detectedSign,
        confidence,
      });
    }
  }, [callActive, confidence, detectedSign]);

  useEffect(() => {
    if (!localStreamRef.current) {
      return;
    }

    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = micOn;
    });
  }, [micOn]);

  useEffect(() => {
    if (!localStreamRef.current) {
      return;
    }

    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = camOn;
    });
  }, [camOn]);

  const startCall = useCallback(async () => {
    const nextRemoteId = remoteId.trim().toLowerCase();

    if (!nextRemoteId) {
      setErrorMessage("Enter the other person's call ID first.");
      return;
    }

    if (!peerRef.current) {
      setErrorMessage("Connection is still starting. Wait a moment and try again.");
      return;
    }

    try {
      setPeerStatus("calling");
      setErrorMessage("");
      const stream = await getLocalStream();

      const connection = peerRef.current.connect(nextRemoteId, { reliable: true });
      bindConnection(connection);

      const call = peerRef.current.call(nextRemoteId, stream);
      bindCall(call, nextRemoteId);

      timeoutRef.current = setTimeout(() => {
        if (!callActiveRef.current) {
          hangUp(false);
          setErrorMessage("No answer. Make sure the other person has this page open.");
        }
      }, 20000);
    } catch {
      setPeerStatus("ready");
      setErrorMessage("Camera or microphone access was denied.");
    }
  }, [bindCall, bindConnection, getLocalStream, hangUp, remoteId]);

  const copyMyId = useCallback(async () => {
    if (!myId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(myId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMessage("Copy failed. Select the call ID manually.");
    }
  }, [myId]);

  const repeatLastCaption = useCallback(() => {
    const lastCaption = captions[captions.length - 1];
    if (lastCaption) {
      speakText(lastCaption.sign);
    }
  }, [captions, speakText]);

  const dark = priyaMode;
  const colors = {
    bg: dark ? "#080c14" : "#ffffff",
    surface: dark ? "#0f172a" : "#f8fafc",
    card: dark ? "#111827" : "#ffffff",
    border: dark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
    text: dark ? "#e2e8f0" : "#0f172a",
    textSub: dark ? "#94a3b8" : "#64748b",
    accent: "#7c3aed",
    accentAlt: "#0891b2",
    success: "#22c55e",
    danger: "#ef4444",
  };

  const cardStyle = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 20,
    padding: "1.25rem",
  };

  const secondaryButtonStyle = {
    minHeight: 46,
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.card,
    color: colors.text,
    padding: "0 1rem",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.45rem",
    cursor: "pointer",
  };

  const controlButtonStyle = {
    width: 46,
    height: 46,
    borderRadius: 14,
    border: "none",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  };

  return (
    <>
      <style>{`
        @keyframes sign-call-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          margin: "-2rem -1.5rem",
          padding: "1.5rem 0 3rem",
          background: colors.bg,
          color: colors.text,
          fontFamily: "\"DM Sans\", sans-serif",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(135deg, #7c3aed, #0891b2)",
                  color: "#ffffff",
                }}
              >
                <Hand size={22} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.9rem", fontWeight: 800 }}>Sign Call</h1>
                <p style={{ margin: "0.25rem 0 0", color: colors.textSub, fontSize: "0.95rem" }}>
                  Video calling with live sign-language captions shared between both participants.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.55rem",
                padding: "0.55rem 0.9rem",
                borderRadius: 999,
                border: `1px solid ${
                  callActive ? "rgba(34,197,94,0.2)" : peerStatus === "error" ? "rgba(239,68,68,0.2)" : "rgba(8,145,178,0.2)"
                }`,
                background: callActive
                  ? "rgba(34,197,94,0.08)"
                  : peerStatus === "error"
                    ? "rgba(239,68,68,0.08)"
                    : "rgba(8,145,178,0.08)",
                color: callActive ? colors.success : peerStatus === "error" ? colors.danger : colors.accentAlt,
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: callActive ? colors.success : peerStatus === "error" ? colors.danger : colors.accentAlt,
                }}
              />
              <span>{callActive ? `Connected ${formatDuration(callDuration)}` : peerStatus === "init" ? "Starting" : peerStatus}</span>
            </div>
          </div>

          {!callActive ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div style={cardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", fontWeight: 700 }}>
                    <Link2 size={18} style={{ color: colors.accent }} />
                    <span>Your Call ID</span>
                  </div>
                  <p style={{ margin: "0.75rem 0 0", color: colors.textSub, lineHeight: 1.6 }}>
                    Share this ID with the other person. They paste it below and start the call from their side.
                  </p>

                  <div
                    style={{
                      marginTop: "1rem",
                      minHeight: 56,
                      borderRadius: 14,
                      border: `1px solid ${colors.border}`,
                      background: colors.card,
                      display: "grid",
                      placeItems: "center",
                      fontSize: "1.65rem",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {peerStatus === "init" ? "------" : myId}
                  </div>

                  <button style={{ ...secondaryButtonStyle, width: "100%", marginTop: "1rem" }} onClick={copyMyId} disabled={!myId}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? "Copied" : "Copy My ID"}
                  </button>

                  <p style={{ margin: "0.9rem 0 0", color: colors.textSub, lineHeight: 1.6 }}>
                    Both people need this page open. Send the ID over chat, email, or text.
                  </p>
                </div>

                <div style={cardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", fontWeight: 700 }}>
                    <UserPlus size={18} style={{ color: colors.accentAlt }} />
                    <span>Join a Call</span>
                  </div>
                  <p style={{ margin: "0.75rem 0 0", color: colors.textSub, lineHeight: 1.6 }}>
                    Paste the other person's call ID below and start the call.
                  </p>

                  <input
                    value={remoteId}
                    onChange={(event) => {
                      setRemoteId(event.target.value);
                      setErrorMessage("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        startCall();
                      }
                    }}
                    placeholder="Paste their call ID"
                    disabled={peerStatus === "init" || peerStatus === "calling"}
                    style={{
                      width: "100%",
                      minHeight: 52,
                      borderRadius: 14,
                      border: `1px solid ${colors.border}`,
                      background: colors.card,
                      color: colors.text,
                      padding: "0 1rem",
                      fontSize: "1rem",
                      marginTop: "1rem",
                      outline: "none",
                    }}
                  />

                  <button
                    style={{
                      width: "100%",
                      minHeight: 48,
                      borderRadius: 14,
                      border: "none",
                      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                      color: "#ffffff",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.45rem",
                      marginTop: "1rem",
                      cursor: "pointer",
                    }}
                    onClick={startCall}
                    disabled={!remoteId.trim() || peerStatus === "init" || peerStatus === "calling"}
                  >
                    {peerStatus === "calling" ? (
                      <Loader2 size={16} style={{ animation: "sign-call-spin 0.9s linear infinite" }} />
                    ) : (
                      <Phone size={16} />
                    )}
                    {peerStatus === "calling" ? "Calling" : "Start Call"}
                  </button>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                      marginTop: "1rem",
                      padding: "1rem",
                      borderRadius: 16,
                      border: `1px solid ${colors.border}`,
                      background: colors.card,
                    }}
                  >
                    <div
                      style={{
                        padding: "0.45rem 0.7rem",
                        borderRadius: 999,
                        background: modelReady ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                        color: modelReady ? colors.success : "#f59e0b",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                      }}
                    >
                      {modelReady ? "Sign model ready" : "Loading sign model"}
                    </div>
                    <div
                      style={{
                        padding: "0.45rem 0.7rem",
                        borderRadius: 999,
                        background: wsConnected ? "rgba(34,197,94,0.08)" : "rgba(100,116,139,0.12)",
                        color: wsConnected ? colors.success : colors.textSub,
                        fontSize: "0.78rem",
                        fontWeight: 700,
                      }}
                    >
                      {wsConnected ? "Backend WebSocket live" : "Local prediction mode"}
                    </div>
                  </div>

                  {modelError ? (
                    <p style={{ margin: "0.85rem 0 0", color: colors.danger, lineHeight: 1.6 }}>{modelError}</p>
                  ) : null}
                </div>
              </div>

              {errorMessage ? (
                <div
                  style={{
                    ...cardStyle,
                    marginTop: "1rem",
                    background: "rgba(239,68,68,0.08)",
                    borderColor: "rgba(239,68,68,0.2)",
                    color: colors.danger,
                    fontWeight: 600,
                  }}
                >
                  {errorMessage}
                </div>
              ) : null}
            </>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                alignItems: "flex-start",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: "1 1 640px", minWidth: 0 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      minHeight: 340,
                      borderRadius: 20,
                      overflow: "hidden",
                      border: `1px solid ${colors.border}`,
                      background: "#020617",
                    }}
                  >
                    <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {!hasRemoteStream ? (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "grid",
                          placeItems: "center",
                          padding: "1rem",
                          color: "#cbd5e1",
                          textAlign: "center",
                          background: "linear-gradient(180deg, rgba(2,6,23,0.5), rgba(2,6,23,0.85))",
                        }}
                      >
                        <div>
                          <Phone size={28} style={{ marginBottom: "0.75rem" }} />
                          <div style={{ fontSize: "1rem", fontWeight: 700 }}>Waiting for remote video</div>
                          <div style={{ marginTop: "0.35rem", fontSize: "0.82rem", opacity: 0.8 }}>
                            The other participant needs to answer and allow camera access.
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {remoteTyping ? (
                      <div
                        style={{
                          position: "absolute",
                          top: 14,
                          right: 14,
                          padding: "0.45rem 0.7rem",
                          borderRadius: 12,
                          background: "rgba(8,145,178,0.82)",
                          color: "#ffffff",
                          fontSize: "0.76rem",
                          fontWeight: 700,
                        }}
                      >
                        Remote signer active
                      </div>
                    ) : null}
                    <div
                      style={{
                        position: "absolute",
                        left: 14,
                        right: 14,
                        bottom: 14,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.55rem 0.75rem",
                        borderRadius: 999,
                        background: "rgba(2,6,23,0.78)",
                        color: "#e2e8f0",
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      <span>Remote</span>
                      <span>{remoteId || "peer"}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      position: "relative",
                      minHeight: 340,
                      borderRadius: 20,
                      overflow: "hidden",
                      border: `1px solid ${colors.border}`,
                      background: "#020617",
                    }}
                  >
                    {camOn ? (
                      <>
                        <video
                          ref={setLocalVideoElement}
                          autoPlay
                          playsInline
                          muted
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                        />
                        <canvas
                          ref={canvasRef}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", transform: "scaleX(-1)" }}
                        />
                        {detectedSign && confidence >= 70 ? (
                          <div
                            style={{
                              position: "absolute",
                              top: 14,
                              left: 14,
                              padding: "0.45rem 0.7rem",
                              borderRadius: 12,
                              background: "rgba(15,23,42,0.78)",
                              color: "#ffffff",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                            }}
                          >
                            {(SIGN_BADGES[detectedSign] || detectedSign.toUpperCase())} {confidence}%
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div style={{ height: "100%", display: "grid", placeItems: "center", color: colors.textSub }}>
                        <div style={{ textAlign: "center" }}>
                          <VideoOff size={30} style={{ marginBottom: "0.65rem" }} />
                          <div>Camera is off</div>
                        </div>
                      </div>
                    )}
                    <div
                      style={{
                        position: "absolute",
                        left: 14,
                        right: 14,
                        bottom: 14,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.55rem 0.75rem",
                        borderRadius: 999,
                        background: "rgba(2,6,23,0.78)",
                        color: "#e2e8f0",
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      <span>You</span>
                      <span>{camOn ? "Live preview" : "Camera off"}</span>
                    </div>
                  </div>
                </div>

                <div style={{ ...cardStyle, display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
                  <div
                    style={{
                      padding: "0.45rem 0.7rem",
                      borderRadius: 999,
                      background: modelReady ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                      color: modelReady ? colors.success : "#f59e0b",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    {modelReady ? "Sign model ready" : "Loading sign model"}
                  </div>
                  <div
                    style={{
                      padding: "0.45rem 0.7rem",
                      borderRadius: 999,
                      background: wsConnected ? "rgba(34,197,94,0.08)" : "rgba(100,116,139,0.12)",
                      color: wsConnected ? colors.success : colors.textSub,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    {wsConnected ? "Backend WebSocket live" : "Local prediction mode"}
                  </div>
                </div>

                <div style={{ ...cardStyle, display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
                    <button
                      style={{
                        ...controlButtonStyle,
                        background: micOn ? colors.card : "rgba(239,68,68,0.08)",
                        color: micOn ? colors.text : colors.danger,
                      }}
                      onClick={() => setMicOn((current) => !current)}
                    >
                      {micOn ? <Mic size={18} /> : <MicOff size={18} />}
                    </button>
                    <span style={{ color: colors.textSub }}>{micOn ? "Mute mic" : "Unmute mic"}</span>
                  </div>

                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
                    <button
                      style={{
                        ...controlButtonStyle,
                        background: camOn ? colors.card : "rgba(239,68,68,0.08)",
                        color: camOn ? colors.text : colors.danger,
                      }}
                      onClick={() => setCamOn((current) => !current)}
                    >
                      {camOn ? <Video size={18} /> : <VideoOff size={18} />}
                    </button>
                    <span style={{ color: colors.textSub }}>{camOn ? "Turn camera off" : "Turn camera on"}</span>
                  </div>

                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
                    <button
                      style={{ ...controlButtonStyle, background: colors.card, color: colors.text }}
                      onClick={repeatLastCaption}
                      disabled={!captions.length}
                    >
                      <Volume2 size={18} />
                    </button>
                    <span style={{ color: colors.textSub }}>Repeat last sign</span>
                  </div>

                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
                    <button
                      style={{ ...controlButtonStyle, background: colors.card, color: colors.text }}
                      onClick={() => setCaptions([])}
                    >
                      <Trash2 size={18} />
                    </button>
                    <span style={{ color: colors.textSub }}>Clear captions</span>
                  </div>

                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem", marginLeft: "auto" }}>
                    <button
                      style={{ ...controlButtonStyle, background: colors.danger, color: "#ffffff" }}
                      onClick={() => hangUp(true)}
                    >
                      <PhoneOff size={18} />
                    </button>
                    <span style={{ color: colors.danger }}>End call</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: "1 1 320px", minWidth: 0, maxWidth: 420 }}>
                <div style={{ ...cardStyle, minHeight: 470, display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                      paddingBottom: "0.85rem",
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
                      <MessageSquare size={16} style={{ color: colors.accent }} />
                      <span>Sign Captions</span>
                    </div>
                    <button style={{ ...secondaryButtonStyle, minHeight: 38, width: "auto" }} onClick={() => setCaptions([])}>
                      <Trash2 size={14} />
                      Clear
                    </button>
                  </div>

                  <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.65rem", paddingTop: "1rem" }}>
                    {!captions.length ? (
                      <div style={{ flex: 1, display: "grid", placeItems: "center", textAlign: "center", color: colors.textSub }}>
                        <div>
                          <Hand size={28} style={{ marginBottom: "0.65rem" }} />
                          <div>Detected signs will appear here.</div>
                        </div>
                      </div>
                    ) : null}

                    {captions.map((caption) => (
                      <div
                        key={caption.id}
                        style={{
                          maxWidth: "92%",
                          marginLeft: caption.side === "local" ? "auto" : 0,
                          borderRadius: 16,
                          border: `1px solid ${
                            caption.side === "local" ? "rgba(124,58,237,0.2)" : "rgba(8,145,178,0.2)"
                          }`,
                          background:
                            caption.side === "local" ? "rgba(124,58,237,0.08)" : "rgba(8,145,178,0.08)",
                          padding: "0.8rem 0.9rem",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            marginBottom: "0.3rem",
                            color: caption.side === "local" ? colors.accent : colors.accentAlt,
                          }}
                        >
                          {caption.side === "local" ? "You" : "Remote"}
                        </div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: colors.text }}>{caption.badge}</div>
                        <div style={{ color: colors.textSub, marginTop: "0.25rem", fontSize: "0.86rem" }}>
                          {caption.confidence}% confidence · {caption.time}
                        </div>
                      </div>
                    ))}

                    {remoteTyping ? (
                      <div
                        style={{
                          maxWidth: "92%",
                          borderRadius: 16,
                          border: "1px solid rgba(8,145,178,0.2)",
                          background: "rgba(8,145,178,0.08)",
                          padding: "0.8rem 0.9rem",
                        }}
                      >
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: colors.accentAlt, textTransform: "uppercase", marginBottom: "0.3rem" }}>
                          Remote
                        </div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: colors.text }}>Signing...</div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", fontWeight: 700 }}>
                    <Hand size={18} style={{ color: colors.accent }} />
                    <span>Supported Signs</span>
                  </div>
                  <p style={{ margin: "0.75rem 0 0", color: colors.textSub, lineHeight: 1.6 }}>
                    The current sign model recognizes these labels for live caption sharing.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.9rem" }}>
                    {Object.keys(SIGN_BADGES).map((sign) => (
                      <span
                        key={sign}
                        style={{
                          padding: "0.35rem 0.65rem",
                          borderRadius: 999,
                          border: `1px solid ${colors.border}`,
                          background: colors.card,
                          color: colors.text,
                          fontSize: "0.74rem",
                          fontWeight: 700,
                        }}
                      >
                        {SIGN_BADGES[sign]}
                      </span>
                    ))}
                  </div>
                </div>

                {errorMessage ? (
                  <div
                    style={{
                      ...cardStyle,
                      background: "rgba(239,68,68,0.08)",
                      borderColor: "rgba(239,68,68,0.2)",
                      color: colors.danger,
                      fontWeight: 600,
                    }}
                  >
                    {errorMessage}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
