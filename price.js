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
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");

  if (!token) {
    alert("구독은 로그인 후 이용 가능합니다.");
    document.getElementById("login-modal-overlay")?.classList.add("active");
    return;
  }

  // 1) subscription/start
  const startRes = await fetch(API_BASE + "/api/payments/subscription/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const start = await startRes.json().catch(() => ({}));
  if (!startRes.ok) {
    alert(start.error || "구독 시작 실패");
    return;
  }

  const { customerKey, successUrl, failUrl } = start;
  localStorage.setItem("pendingSubscription", JSON.stringify({ customerKey }));

  // 2) ✅ v2 standard: payment() 인스턴스 생성 후 requestBillingAuth()
  const tossPayments = TossPayments(TOSS_CLIENT_KEY);
  const payment = tossPayments.payment({ customerKey }); // 중요

  try {
    await payment.requestBillingAuth({
      method: "CARD",
      successUrl,
      failUrl,
      // 선택: customerName, customerEmail 등
      // windowTarget: "iframe" (PC 기본) / "self"(모바일)
    });
  } catch (err) {
    console.error("BillingAuth error:", err);
    alert(
      `카드 자동결제 인증 중 오류가 발생했습니다.\n` +
        `code: ${err?.code || "-"}\nmessage: ${err?.message || "-"}`
    );
  }
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
});
