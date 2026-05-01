// @ts-nocheck
// Lightweight analytics: fire-and-forget event tracking tied to the connected wallet.
// All events are POSTed to /api/activity-events. Failures are swallowed.

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const STORAGE_KEY = "monerorig:session_id";

const newSessionId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const getSessionId = () => {
  if (typeof window === "undefined") return "ssr";
  let id = window.sessionStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = newSessionId();
    window.sessionStorage.setItem(STORAGE_KEY, id);
  }
  return id;
};

let _wallet = null;
export const setTrackingWallet = (addr) => {
  _wallet = addr ? String(addr).toLowerCase() : null;
};

export const trackEvent = (eventType, page, payload = {}) => {
  if (!eventType) return;
  const body = JSON.stringify({
    wallet: _wallet,
    session_id: getSessionId(),
    event_type: eventType,
    page: page || null,
    payload,
  });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(`${API}/activity-events`, blob);
      return;
    }
    fetch(`${API}/activity-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch (_) {}
};
