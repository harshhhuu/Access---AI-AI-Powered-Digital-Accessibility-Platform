import jwt from "jsonwebtoken";

function secret(): string {
  return process.env.SECRET_KEY ?? "changeme";
}

function algorithm(): jwt.Algorithm {
  const a = process.env.ALGORITHM ?? "HS256";
  if (a !== "HS256") {
    throw new Error(`Unsupported ALGORITHM: ${a} (use HS256)`);
  }
  return "HS256";
}

function expireMinutes(): number {
  return parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? "1440", 10);
}

/** JWT access token: `sub` is string user id, `exp` from UTC now + minutes (legacy FastAPI parity). */
export function createAccessToken(payload: { sub: string }): string {
  return jwt.sign(payload, secret(), {
    algorithm: algorithm(),
    expiresIn: expireMinutes() * 60,
  });
}

export function verifyAccessToken(token: string): { sub: string } {
  const decoded = jwt.verify(token, secret(), { algorithms: [algorithm()] }) as jwt.JwtPayload;
  const sub = decoded.sub;
  if (sub === undefined || sub === null) {
    throw new Error("Invalid token payload");
  }
  return { sub: String(sub) };
}
