import { initializeStore } from "./store.js";

const TOKEN_KEY = "yourbite_auth_token";
const USER_KEY = "yourbite_auth_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);

  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function login(email, password) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPass = String(password || "").trim();

  if (!cleanEmail || !cleanPass) {
    throw new Error("Please enter both email and password.");
  }

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Invalid email or password.");
    }

    setSession(data.token, data.user);
    await initializeStore();
    return data.user;
  } catch (err) {
    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      throw new Error("Unable to connect to authentication server. Please check your network connection.");
    }
    throw err;
  }
}

export async function checkAuth() {
  const token = getToken();
  if (!token) return null;

  try {
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      clearSession();
      return null;
    }

    const data = await response.json();
    setSession(token, data.user);
    return data.user;
  } catch {
    // If network fails temporarily, retain existing session user if available
    return getStoredUser();
  }
}

export async function logout() {
  const token = getToken();
  if (token) {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch {
      /* ignore */
    }
  }
  clearSession();
  await initializeStore();
}

export async function changeCredentials({ currentPassword, newEmail, newPassword }) {
  const token = getToken();
  if (!token) throw new Error("You must be logged in.");

  const response = await fetch("/api/auth/change-credentials", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ currentPassword, newEmail, newPassword }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Failed to update security credentials.");
  }

  if (data.user) {
    setSession(token, data.user);
  }
  return data.user;
}
