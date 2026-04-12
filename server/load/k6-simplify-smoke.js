/**
 * Optional smoke load for POST /api/simplify.
 * Prerequisites: Node API running; HF may be absent (502 is treated as ok for smoke).
 */
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 2,
  duration: "10s",
};

const BASE = __ENV.K6_BASE_URL || "http://127.0.0.1:8001";

export default function () {
  const res = http.post(
    `${BASE}/api/simplify`,
    JSON.stringify({ text: "Hello world this is a short test.", grade_level: 5 }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(res, {
    "2xx or 502": (r) => (r.status >= 200 && r.status < 300) || r.status === 502,
  });
  sleep(0.25);
}
