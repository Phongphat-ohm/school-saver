import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import type { AppSessionKind } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "school_saver_session";
const RESTORE_COOKIE_NAME = "school_saver_restore_session";
const SUPPORT_COOKIE_NAME = "school_saver_support_session";
const MAX_AGE = 60 * 60 * 24 * 30;
const RESTORE_MAX_AGE = 60 * 15;
const TOKEN_BYTES = 32;

export type SessionPayload = {
  userId: string;
  currentWorkspaceId: string | null;
};

function createSessionToken() {
  return `ss_${randomBytes(TOKEN_BYTES).toString("base64url")}`;
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isSessionToken(value?: string): value is string {
  return !!value && value.startsWith("ss_") && value.length >= 32;
}

async function revokeCookieSession(cookieName: string, kind: AppSessionKind) {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (isSessionToken(token)) {
    await prisma.appSession.updateMany({
      where: { tokenHash: hashSessionToken(token), kind, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(cookieName);
}

async function createCookieSession({
  cookieName,
  kind,
  userId,
  currentWorkspaceId,
  maxAge,
}: {
  cookieName: string;
  kind: AppSessionKind;
  userId: string;
  currentWorkspaceId: string | null;
  maxAge: number;
}) {
  const cookieStore = await cookies();
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + maxAge * 1000);

  await prisma.appSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      kind,
      userId,
      currentWorkspaceId,
      expiresAt,
    },
  });

  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

async function readCookieSession(cookieName: string, kind: AppSessionKind): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!isSessionToken(token)) {
    if (token) cookieStore.delete(cookieName);
    return null;
  }
  const sessionToken = token;

  const session = await prisma.appSession.findFirst({
    where: {
      tokenHash: hashSessionToken(sessionToken),
      kind,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      userId: true,
      currentWorkspaceId: true,
    },
  });
  if (!session) {
    cookieStore.delete(cookieName);
    return null;
  }

  return {
    userId: session.userId,
    currentWorkspaceId: session.currentWorkspaceId,
  };
}

export async function createSession(userId: string, workspaceId: string | null) {
  await revokeCookieSession(COOKIE_NAME, "AUTH");
  await createCookieSession({
    cookieName: COOKIE_NAME,
    kind: "AUTH",
    userId,
    currentWorkspaceId: workspaceId,
    maxAge: MAX_AGE,
  });
}

export async function createRestoreSession(userId: string) {
  await revokeCookieSession(RESTORE_COOKIE_NAME, "RESTORE");
  await createCookieSession({
    cookieName: RESTORE_COOKIE_NAME,
    kind: "RESTORE",
    userId,
    currentWorkspaceId: null,
    maxAge: RESTORE_MAX_AGE,
  });
}

export const getSession = cache(async function getSession() {
  return readCookieSession(COOKIE_NAME, "AUTH");
});

export async function getRestoreSession() {
  return readCookieSession(RESTORE_COOKIE_NAME, "RESTORE");
}

export async function destroySession() {
  await revokeCookieSession(COOKIE_NAME, "AUTH");
  const cookieStore = await cookies();
  cookieStore.delete(SUPPORT_COOKIE_NAME);
}

export async function destroyRestoreSession() {
  await revokeCookieSession(RESTORE_COOKIE_NAME, "RESTORE");
}

export async function setCurrentWorkspace(workspaceId: string | null) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!isSessionToken(token)) return;
  const sessionToken = token;

  await prisma.appSession.updateMany({
    where: {
      tokenHash: hashSessionToken(sessionToken),
      kind: "AUTH",
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { currentWorkspaceId: workspaceId },
  });
}

export async function getCurrentWorkspaceId() {
  return (await getSession())?.currentWorkspaceId ?? null;
}

export async function setSupportSessionId(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SUPPORT_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
}

export async function getSupportSessionId() {
  const cookieStore = await cookies();
  return cookieStore.get(SUPPORT_COOKIE_NAME)?.value ?? null;
}

export async function clearSupportSessionId() {
  const cookieStore = await cookies();
  cookieStore.delete(SUPPORT_COOKIE_NAME);
}
