import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

/** Matches Python `bcrypt.hashpw(..., bcrypt.gensalt())` default cost. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
