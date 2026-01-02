// ===== config =====
const TOSS_CLIENT_KEY = "test_gck_26DlbXAaV0779WzGYRxd3qY50Q9R";

const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://beebeeai-backend-production.up.railway.app";

// ===== widget state =====
let __widgetsInited = false;
let __widgets = null;

async function openTossWidget() {
  console.log("[openTossWidget] clicked");

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");

  if (!token) {
    alert("구독은 로그인 후 이용 가능합니다.");
    document.getElementById("login-modal-overlay")?.classList.add("active");
    return;
  }

  const startRes = await fetch(API_BASE + "/api/payments/subscription/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const start = await startRes.json().catch(() => ({}));
  console.log("[openTossWidget] start:", startRes.status, start);

  if (!startRes.ok) {
    alert(start.error || "구독 시작 실패");
    return;
  }

  const { customerKey, successUrl, failUrl } = start;
  localStorage.setItem("pendingSubscription", JSON.stringify({ customerKey }));

  const tossPayments = TossPayments(TOSS_CLIENT_KEY);
  const payment = tossPayments.payment({ customerKey });

  try {
    await payment.requestBillingAuth({
      method: "CARD",
      successUrl,
      failUrl,
      windowTarget: "self", // ✅ 추천 (멈춤/차단 줄임)
    });
  } catch (err) {
    console.error("BillingAuth error:", err);
    alert(
      `카드 자동결제 인증 오류\ncode:${err?.code || "-"}\nmsg:${
        err?.message || "-"
      }`
    );
  }
}

function bindSubscribeButton() {
  const btn = document.getElementById("payment-request-button");
  if (!btn) return;

  btn.disabled = false; // 🔥 정기결제에서는 항상 활성화
  btn.innerText = "구독 등록하기"; // 선택
  btn.onclick = openTossWidget; // 🔥 바로 호출
}

// ===== UI wiring =====
function initSubscribeButton() {
  const proStartBtn = document.querySelector(
    "#pricing-modal-overlay .pro-button"
  );
  const pricingModal = document.getElementById("pricing-modal-overlay");
  const tossOverlay = document.getElementById("toss-widget-overlay");
  const tossClose = document.getElementById("toss-widget-close");

  proStartBtn?.addEventListener("click", async (e) => {
    e.preventDefault();

    // pricing 모달 닫고 → 위젯 모달 열기
    pricingModal?.classList.remove("active");
    tossOverlay?.classList.add("active");
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      openTossWidget();
    });
  });

  tossClose?.addEventListener("click", () => {
    tossOverlay?.classList.remove("active");
    document.body.style.overflow = "";
  });

  // overlay 바깥 클릭 시 닫기(선택)
  tossOverlay?.addEventListener("click", (e) => {
    if (e.target === tossOverlay) {
      tossOverlay.classList.remove("active");
      document.body.style.overflow = "";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSubscribeButton();
  bindSubscribeButton();
});
