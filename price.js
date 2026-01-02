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

  // 1️⃣ 구독 시작 (billing 등록 준비)
  const startRes = await fetch(API_BASE + "/api/payments/subscription/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const start = await startRes.json().catch(() => ({}));
  if (!startRes.ok) {
    alert(start.error || "구독 시작에 실패했습니다.");
    return;
  }

  const { customerKey, successUrl, failUrl } = start;

  if (!customerKey || !successUrl || !failUrl) {
    alert("구독 시작 정보가 올바르지 않습니다.");
    return;
  }

  // subscription-success 페이지에서 재사용
  localStorage.setItem("pendingSubscription", JSON.stringify({ customerKey }));

  // 2️⃣ Toss SDK 로드 확인
  if (typeof TossPayments !== "function") {
    alert("TossPayments SDK가 로드되지 않았습니다.");
    return;
  }

  const tossPayments = TossPayments(TOSS_CLIENT_KEY);

  // 3️⃣ ✅ 카드 자동결제(빌링) 인증 요청
  // - 결제 ❌
  // - 카드 등록 인증 ⭕
  // - 성공 시 successUrl로 authKey 리다이렉트
  try {
    await tossPayments.requestBillingAuth("CARD", {
      customerKey,
      successUrl, // ex) /subscription-success.html
      failUrl, // ex) /subscription-fail.html
    });
  } catch (err) {
    console.error(err);
    alert("카드 자동결제 인증 중 오류가 발생했습니다.");
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
