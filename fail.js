const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://beebeeai-backend-production.up.railway.app";

const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get("code");
const message = urlParams.get("message");

const codeEl = document.getElementById("error-code");
const msgEl = document.getElementById("error-message");

if (codeEl) codeEl.textContent = code || "-";
if (msgEl) msgEl.textContent = message || "구독 등록이 취소되었습니다.";

// ✅ 정기결제 등록 실패면 pendingSubscription 정리
try {
  localStorage.removeItem("pendingSubscription");
} catch (e) {
  // ignore
}
