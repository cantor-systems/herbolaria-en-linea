import 'server-only';

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const DISPATCH_SESSION_COOKIE = 'herbolaria_dispatch_session';
const DISPATCH_SESSION_DURATION_SECONDS = 8 * 60 * 60;
const DISPATCH_SESSION_VERSION = 'v1';

export class DispatchAdminConfigurationError extends Error {}

function configuredPassword() {
  const password = process.env.DISPATCH_ADMIN_PASSWORD;
  return password && password.trim() ? password : null;
}

function sessionKey(password: string) {
  return createHash('sha256')
    .update('herbolaria:dispatch-admin-session:v1\0', 'utf8')
    .update(password, 'utf8')
    .digest();
}

function signSessionPayload(payload: string, password: string) {
  return createHmac('sha256', sessionKey(password))
    .update(payload, 'utf8')
    .digest('base64url');
}

function safeEqualBase64Url(left: string, right: string) {
  try {
    const leftBuffer = Buffer.from(left, 'base64url');
    const rightBuffer = Buffer.from(right, 'base64url');
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  } catch {
    return false;
  }
}

function createSessionToken(password: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + DISPATCH_SESSION_DURATION_SECONDS;
  const nonce = randomBytes(24).toString('base64url');
  const payload = `${DISPATCH_SESSION_VERSION}.${issuedAt}.${expiresAt}.${nonce}`;
  return `${payload}.${signSessionPayload(payload, password)}`;
}

function isValidSessionToken(token: string, password: string) {
  const parts = token.split('.');
  if (parts.length !== 5) return false;

  const [version, issuedAtValue, expiresAtValue, nonce, signature] = parts;
  if (
    version !== DISPATCH_SESSION_VERSION ||
    !/^\d{10}$/.test(issuedAtValue) ||
    !/^\d{10}$/.test(expiresAtValue) ||
    !/^[A-Za-z0-9_-]{32}$/.test(nonce)
  ) {
    return false;
  }

  const issuedAt = Number(issuedAtValue);
  const expiresAt = Number(expiresAtValue);
  const now = Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(issuedAt) ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt - issuedAt !== DISPATCH_SESSION_DURATION_SECONDS ||
    issuedAt > now + 60 ||
    expiresAt <= now
  ) {
    return false;
  }

  const payload = `${version}.${issuedAtValue}.${expiresAtValue}.${nonce}`;
  return safeEqualBase64Url(signature, signSessionPayload(payload, password));
}

export function isDispatchAdminConfigured() {
  return configuredPassword() !== null;
}

export function isDispatchAdminPasswordValid(candidate: string) {
  const password = configuredPassword();
  if (!password || candidate.length > 1024) return false;

  const expectedDigest = createHash('sha256')
    .update('herbolaria:dispatch-admin-password:v1\0', 'utf8')
    .update(password, 'utf8')
    .digest();
  const candidateDigest = createHash('sha256')
    .update('herbolaria:dispatch-admin-password:v1\0', 'utf8')
    .update(candidate, 'utf8')
    .digest();

  return timingSafeEqual(expectedDigest, candidateDigest);
}

export async function createDispatchAdminSession() {
  const password = configuredPassword();
  if (!password) {
    throw new DispatchAdminConfigurationError(
      'El acceso administrativo no está configurado.'
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(DISPATCH_SESSION_COOKIE, createSessionToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DISPATCH_SESSION_DURATION_SECONDS,
  });
}

export async function clearDispatchAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(DISPATCH_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function hasValidDispatchAdminSession() {
  const password = configuredPassword();
  if (!password) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(DISPATCH_SESSION_COOKIE)?.value;
  return token ? isValidSessionToken(token, password) : false;
}

export async function requireDispatchAdminSession() {
  if (!(await hasValidDispatchAdminSession())) {
    redirect('/operaciones/login');
  }
}
