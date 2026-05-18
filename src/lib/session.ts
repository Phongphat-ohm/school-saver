import { cookies } from "next/headers";
import { cache } from "react";

const COOKIE_NAME = "school_saver_session";
const RESTORE_COOKIE_NAME = "school_saver_restore_session";
const MAX_AGE = 60 * 60 * 24 * 30;
const RESTORE_MAX_AGE = 60 * 15;

export type SessionPayload = {
  userId: string;
  currentWorkspaceId: string | null;
};

function encodeSession(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeSession(value?: string): SessionPayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof parsed.userId === "string") {
      return {
        userId: parsed.userId,
        currentWorkspaceId: typeof parsed.currentWorkspaceId === "string" ? parsed.currentWorkspaceId : null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, workspaceId: string | null) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSession({ userId, currentWorkspaceId: workspaceId }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function createRestoreSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(RESTORE_COOKIE_NAME, encodeSession({ userId, currentWorkspaceId: null }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RESTORE_MAX_AGE,
  });
}

export const getSession = cache(async function getSession() {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(COOKIE_NAME)?.value);
});

export async function getRestoreSession() {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(RESTORE_COOKIE_NAME)?.value);
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function destroyRestoreSession() {
  const cookieStore = await cookies();
  cookieStore.delete(RESTORE_COOKIE_NAME);
}

export async function setCurrentWorkspace(workspaceId: string | null) {
  const session = await getSession();
  if (!session) return;
  await createSession(session.userId, workspaceId);
}

export async function getCurrentWorkspaceId() {
  return (await getSession())?.currentWorkspaceId ?? null;
}
