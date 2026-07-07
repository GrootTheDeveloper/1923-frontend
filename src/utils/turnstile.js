const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
let loadingPromise = null;
const widgetIds = new Map();

function actionKey(action) {
  return (action || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function ensureContainer(action) {
  const key = actionKey(action);
  let container = document.getElementById(`turnstile-container-${key}`);
  if (!container) {
    container = document.createElement("div");
    container.id = `turnstile-container-${key}`;
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
    return "";
  }
  const turnstile = await loadTurnstile();
  if (!turnstile) return "";

  const widgetKey = actionKey(action);

  return new Promise((resolve, reject) => {
    const container = ensureContainer(action);
    const previousWidgetId = widgetIds.get(widgetKey);
    if (previousWidgetId !== undefined && typeof turnstile.remove === "function") {
      turnstile.remove(previousWidgetId);
      widgetIds.delete(widgetKey);
    }
    container.replaceChildren();

    let currentWidgetId;
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Turnstile phản hồi quá lâu. Vui lòng tải lại trang và thử lại."));
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
      "error-callback": finish(() => reject(new Error("Turnstile không xác minh được hostname này. Nếu đang chạy qua tunnel, hãy thêm domain tunnel vào Cloudflare Turnstile hoặc tắt site key ở môi trường dev."))),
      "expired-callback": () => {
        if (currentWidgetId !== undefined) turnstile.reset(currentWidgetId);
      },
    };

    currentWidgetId = turnstile.render(container, options);
    widgetIds.set(widgetKey, currentWidgetId);
    turnstile.execute(currentWidgetId);
  });
}
