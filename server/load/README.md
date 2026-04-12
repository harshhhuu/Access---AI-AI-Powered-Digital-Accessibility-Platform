# Optional load / smoke scripts

Requires [k6](https://k6.io/) (`brew install k6` on macOS).

Start the Node API first (`cd server && pnpm dev` with `PORT=8001`). For `/api/simplify`, set `HF_API_TOKEN` or expect **502** when HF is unavailable — the script accepts both for smoke.

```bash
k6 run load/k6-simplify-smoke.js
```

Adjust the URL in the script if you use another host or port.
