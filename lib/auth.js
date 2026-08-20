import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_COOKIE = "resellai_session";

function secret() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not set - add it to your environment variables.");
  }
  return process.env.SESSION_SECRET;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function createSessionToken(userId) {
  return jwt.sign({ userId }, secret(), { expiresIn: "7d" });
}

export function verifySessionToken(token) {
  try {
    return jwt.verify(token, secret());
  } catch (e) {
    return null;
  }
}

export function setSessionCookie(token) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

export function getSessionUserId() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifySessionToken(token);
  return payload ? payload.userId : null;
}

// Fetches the current session's full user record fresh from the database,
// so admin status is always current (never trusted from an old token).
export async function getSessionUser() {
  const userId = getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}
