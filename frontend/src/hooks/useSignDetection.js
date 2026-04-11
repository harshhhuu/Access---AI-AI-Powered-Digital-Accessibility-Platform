import { useCallback, useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import { WS_SIGN_URL } from "../api/api";

// Alphabetical order to match the trained model / sklearn LabelEncoder output.
const SIGN_LABELS = ["bad", "good", "hello", "help", "more", "no", "stop", "thanks", "water", "yes"];

/*
  Training used MediaPipe normalized x/y coordinates relative to the wrist,
  with z forced to 0. The frontend must keep the same preprocessing or the
  local TF.js model and backend H5 model will disagree.
*/
function extractLandmarks(hand) {
  const wristX = hand[0].x;
  const wristY = hand[0].y;
  const values = hand.flatMap(({ x, y }) => [x - wristX, y - wristY, 0]);
  return values.some(Number.isNaN) ? null : values;
}

function speakText(text) {
  if (!text || !window.speechSynthesis) {
    return;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

export function useSignDetection(webcamRef, canvasRef, isActive) {
  const [detectedSign, setDetectedSign] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [history, setHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [error, setError] = useState(null);

  const handsRef = useRef(null);
  const tfModelRef = useRef(null);
  const wsRef = useRef(null);
  const rafRef = useRef(null);
  const lastSignRef = useRef("");
  const lastSentRef = useRef(0);
  const latestResultsRef = useRef(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    let cancelled = false;

    async function loadModels() {
      try {
        const { Hands } = await import("@mediapipe/hands");

        const hands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results) => {
          latestResultsRef.current = results;
        });

        await hands.initialize();
        handsRef.current = hands;

        await tf.setBackend("webgl");
        await tf.ready();

        try {
          tfModelRef.current = await tf.loadGraphModel("/models/sign_model/model.json");
          const dummy = tf.zeros([1, 63]);
          const warmup = tfModelRef.current.predict(dummy);
          warmup.dispose();
          dummy.dispose();
        } catch (modelError) {
          console.warn("Local TF.js sign model unavailable, using backend WebSocket fallback.", modelError);
        }

        if (!cancelled) {
          setModelReady(true);
          setError(null);
        }
      } catch (loadError) {
        console.error("Failed to load sign detection models.", loadError);
        if (!cancelled) {
          setError("Failed to load hand detection.");
          setModelReady(false);
        }
      }
    }

    loadModels();

    return () => {
      cancelled = true;
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    let reconnectTimer = null;

    function connect() {
      try {
        const ws = new WebSocket(WS_SIGN_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          setIsConnected(false);
        };

        ws.onmessage = (event) => {
          try {
            const { sign, confidence: rawConfidence } = JSON.parse(event.data);
            const confidencePercent = Math.round((rawConfidence ?? 0) * 100);

            if (sign && confidencePercent > 55 && sign !== lastSignRef.current) {
              lastSignRef.current = sign;
              setDetectedSign(sign);
              setConfidence(confidencePercent);
              setHistory((previous) =>
                [{ sign, conf: confidencePercent, ts: Date.now() }, ...previous].slice(0, 10)
              );
              speakText(sign);
            }
          } catch {
            // Ignore malformed frames.
          }
        };
      } catch {
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      setIsConnected(false);
    };
  }, [isActive]);

  const detect = useCallback(async () => {
    if (!isRunningRef.current) {
      return;
    }

    const video = webcamRef.current?.video;
    const canvas = canvasRef.current;

    if (!video || !canvas || !handsRef.current || video.readyState !== 4) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    try {
      await handsRef.current.send({ image: video });
    } catch {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    const results = latestResultsRef.current;
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = Math.round(rect.width) || 640;
    const canvasHeight = Math.round(rect.height) || 480;

    if (canvas.width !== canvasWidth) {
      canvas.width = canvasWidth;
    }
    if (canvas.height !== canvasHeight) {
      canvas.height = canvasHeight;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (results?.multiHandLandmarks?.length > 0) {
      const hand = results.multiHandLandmarks[0];
      drawLandmarks(ctx, hand, canvasWidth, canvasHeight);

      const landmarks = extractLandmarks(hand);

      if (landmarks && tfModelRef.current) {
        try {
          const tensor = tf.tensor2d([landmarks], [1, 63]);
          const prediction = tfModelRef.current.predict(tensor);
          const probabilities = await prediction.data();

          tensor.dispose();
          prediction.dispose();

          const bestIndex = Array.from(probabilities).indexOf(Math.max(...probabilities));
          const sign = SIGN_LABELS[bestIndex];
          const confidencePercent = Math.round(probabilities[bestIndex] * 100);

          if (sign && confidencePercent > 55 && sign !== lastSignRef.current) {
            lastSignRef.current = sign;
            setDetectedSign(sign);
            setConfidence(confidencePercent);
            setHistory((previous) =>
              [{ sign, conf: confidencePercent, ts: Date.now() }, ...previous].slice(0, 10)
            );
            speakText(sign);
          }
        } catch (predictionError) {
          console.warn("Local sign prediction failed.", predictionError);
        }
      }

      if (landmarks) {
        const now = Date.now();
        if (wsRef.current?.readyState === WebSocket.OPEN && now - lastSentRef.current > 200) {
          wsRef.current.send(JSON.stringify({ landmarks }));
          lastSentRef.current = now;
        }
      }
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [canvasRef, webcamRef]);

  useEffect(() => {
    if (isActive && modelReady) {
      isRunningRef.current = true;
      rafRef.current = requestAnimationFrame(detect);
    }

    return () => {
      isRunningRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [detect, isActive, modelReady]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setDetectedSign("");
    setConfidence(0);
    lastSignRef.current = "";
  }, []);

  const speakSign = useCallback((text) => {
    speakText(text);
  }, []);

  return {
    detectedSign,
    confidence,
    history,
    isConnected,
    modelReady,
    error,
    clearHistory,
    speakSign,
    SIGN_LABELS,
  };
}

function drawLandmarks(ctx, hand, canvasWidth, canvasHeight) {
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17],
  ];

  ctx.strokeStyle = "rgba(124,58,237,0.9)";
  ctx.lineWidth = 2.5;

  for (const [start, end] of connections) {
    if (!hand[start] || !hand[end]) {
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(hand[start].x * canvasWidth, hand[start].y * canvasHeight);
    ctx.lineTo(hand[end].x * canvasWidth, hand[end].y * canvasHeight);
    ctx.stroke();
  }

  hand.forEach((point, index) => {
    const isFingerTip = [4, 8, 12, 16, 20].includes(index);
    ctx.beginPath();
    ctx.arc(point.x * canvasWidth, point.y * canvasHeight, isFingerTip ? 7 : 4, 0, 2 * Math.PI);
    ctx.fillStyle = isFingerTip ? "rgba(167,243,208,0.95)" : "rgba(196,181,253,0.9)";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}
