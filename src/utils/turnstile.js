const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
let loadingPromise = null;
let widgetId = null;

function ensureContainer() {
  let container = document.getElementById("turnstile-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "turnstile-container";
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    document.body.appendChild(container);
  }
  return container;
}

function loadTurnstile() {
  if (!siteKey) return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile || null);
    script.onerror = () => reject(new Error("Could not load bot challenge."));
    document.head.appendChild(script);
  });
  return loadingPromise;
}

export async function getTurnstileToken(action = "upload_cv") {
  if (!siteKey) {
    if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return "";
    throw new Error("Turnstile ch?a ???c c?u h?nh cho b?n production.");
  }
  const turnstile = await loadTurnstile();
  if (!turnstile) return "";

  return new Promise((resolve, reject) => {
    const container = ensureContainer();
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Turnstile ph?n h?i qu? l?u. Vui l?ng t?i l?i trang v? th? l?i."));
    }, 15000);
    const finish = (callback) => (value) => {
      window.clearTimeout(timeoutId);
      callback(value);
    };
    const options = {
      sitekey: siteKey,
      action,
      size: "invisible",
      callback: finish(resolve),
      "error-callback": finish(() => reject(new Error("Turnstile kh?ng x?c minh ???c hostname n?y. Vui l?ng th? l?i."))),
      "expired-callback": () => {
        if (widgetId !== null) turnstile.reset(widgetId);
      },
    };
    if (widgetId === null) {
      widgetId = turnstile.render(container, options);
    } else {
      turnstile.reset(widgetId);
    }
    turnstile.execute(widgetId);
  });
}