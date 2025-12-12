const TOSS_CLIENT_KEY = "test_gck_26DlbXAaV0779WzGYRxd3qY50Q9R";

const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://beebeeai-backend-production.up.railway.app";

// =========================
// [1] Pro 시작하기 버튼 클릭 핸들러 등록
// =========================
function initializePriceButtons() {
  const proStartBtn = document.querySelector(
    "#pricing-modal-overlay .pro-button"
  );
  const pricingModal = document.getElementById("pricing-modal-overlay");
  const paymentModal = document.getElementById("payment-modal-overlay");

  proStartBtn?.addEventListener("click", (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    // ① 로그인 안 된 상태라면 → 로그인 모달 열고 종료
    if (!token) {
      alert("구독은 로그인 후 이용 가능합니다.");
      document.getElementById("login-modal-overlay")?.classList.add("active");
      return;
    }

    // ② 로그인 된 상태라면 → 결제창으로 진행
    pricingModal?.classList.remove("active");
    paymentModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  });
}

// =========================
// [2] 결제 세션 생성 → Toss 결제창 호출
// =========================

// =========================
// [3] 사용량 카드 관련 DOM
// =========================
const planBadgeEl = document.getElementById("planBadge");
const planNameEl = document.getElementById("planName");
const formulaCountEl = document.getElementById("formulaCount");
const formulaLimitEl = document.getElementById("formulaLimit");
const uploadCountEl = document.getElementById("uploadCount");
const uploadLimitEl = document.getElementById("uploadLimit");
const resetHintEl = document.getElementById("resetHint");

// ===== 플랜 카드 표시/비표시 유틸 =====
function setUsageCardVisible(visible) {
  const card = document.getElementById("usageCard");
  if (!card) return;
  card.hidden = !visible;
  card.setAttribute("aria-hidden", String(!visible));
}

// 로그인 여부
function isLoggedIn() {
  return !!localStorage.getItem("token");
}

// =========================
// [4] 사용 현황 로드
// =========================
async function loadUsage() {
  const token = localStorage.getItem("token");
  if (!token) {
    setUsageCardVisible(false);
    return;
  }

  try {
    const res = await fetch(API_BASE + `/api/payments/usage`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      setUsageCardVisible(false);
      return;
    }

    const data = await res.json();
    setUsageCardVisible(true);
    renderUsageCard(data);
  } catch (e) {
    console.error(e);
    setUsageCardVisible(false);
  }
}

// 전역 로그인 상태 변경 이벤트
window.addEventListener("auth:changed", (e) => {
  const on = !!e.detail?.isLoggedIn;
  setUsageCardVisible(on);
  if (on) loadUsage();
});

// =========================
// [5] 카드 UI 업데이트
// =========================
function renderUsageCard({ plan, usage, limits }) {
  if (!planBadgeEl) return;

  planBadgeEl.textContent = plan === "PRO" ? "PRO" : "FREE";
  planBadgeEl.classList.toggle("is-pro", plan === "PRO");
  planNameEl.textContent = plan === "PRO" ? "Pro 플랜" : "무료 플랜";

  const fCur = usage?.formulaConversions ?? 0;
  const fMax = limits?.formulaConversions ?? "∞";
  const uCur = usage?.fileUploads ?? 0;
  const uMax = limits?.fileUploads ?? "∞";

  formulaCountEl.textContent = fCur;
  formulaLimitEl.textContent = fMax;
  uploadCountEl.textContent = uCur;
  uploadLimitEl.textContent = uMax;

  resetHintEl.textContent = "월 사용량은 매월 1일에 재설정됩니다.";
}

// =========================
// [6] Toss 리다이렉트 처리
// =========================
async function handleReturnIfNeeded() {
  const p = new URLSearchParams(location.search);
  const pg = p.get("pg");
  const provider = p.get("provider");

  // 실패 리다이렉트
  if (pg === "fail" && provider === "toss") {
    const message =
      p.get("message") || p.get("msg") || "결제가 취소되었거나 실패했습니다.";
    alert(message);

    // ?pg=... 쿼리 제거
    history.replaceState({}, document.title, location.pathname);
    return;
  }

  // 성공 리다이렉트 (Toss)
  const paymentKey = p.get("paymentKey");
  const orderId = p.get("orderId");
  const amount = p.get("amount");

  // 토스 성공 시: ?pg=success&provider=toss&paymentKey=...&orderId=...&amount=... 형태 :contentReference[oaicite:4]{index=4}
  if (
    pg === "success" &&
    provider === "toss" &&
    paymentKey &&
    orderId &&
    amount
  ) {
    const token = localStorage.getItem("token");
    if (!token) {
      alert(
        "로그인 정보가 만료되었습니다. 다시 로그인 후 결제를 확인해주세요."
      );
      history.replaceState({}, document.title, location.pathname);
      return;
    }

    try {
      const r = await fetch(API_BASE + "/api/payments/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });

      const data = await r.json();

      // 주소창 쿼리 정리
      history.replaceState({}, document.title, location.pathname);

      if (!r.ok || !data.ok) {
        console.error("confirm error:", data);
        alert(data.error || "결제 승인에 실패했습니다.");
        return;
      }

      // 사용량 / 플랜 다시 로드
      await loadUsage();
      alert("PRO 플랜 활성화 완료! 🎉");
    } catch (err) {
      console.error("confirmPayment error:", err);
      alert("결제 승인 중 오류가 발생했습니다.");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const pricingModal = document.getElementById("pricing-modal-overlay");
  const paymentModal = document.getElementById("payment-modal-overlay");

  const subscribeBtn = document.getElementById("subscribe-btn");
  const paymentCloseBtn = document.getElementById("payment-close-btn");

  const termsCheckbox = document.getElementById("terms-checkbox");
  const paymentNextBtn = document.getElementById("payment-next-btn");

  // 1) 구독 버튼 → 결제창 열기
  if (subscribeBtn) {
    subscribeBtn.addEventListener("click", () => {
      // 구독 모달 숨기고
      pricingModal.style.display = "none";
      // 결제 모달 보이기
      paymentModal.style.display = "flex"; // modal-overlay가 flex면 이렇게
      document.body.style.overflow = "hidden";
    });
  }

  // 2) 결제창 닫기 버튼
  if (paymentCloseBtn) {
    paymentCloseBtn.addEventListener("click", () => {
      paymentModal.style.display = "none";
      document.body.style.overflow = "";
    });
  }

  // 3) 약관 체크 여부에 따라 '다음' 버튼 활성/비활성
  if (termsCheckbox && paymentNextBtn) {
    termsCheckbox.addEventListener("change", () => {
      paymentNextBtn.disabled = !termsCheckbox.checked;
    });
  }

  // 4) '다음' 버튼 클릭 시 실제 토스 결제 연동 자리
  if (paymentNextBtn) {
    paymentNextBtn.addEventListener("click", async () => {
      if (paymentNextBtn.disabled) return;

      // 실제 결제 요청
      openTossWidget();
    });
  }

  // (선택) 카드 타입 탭 토글
  const cardTypeBtns = document.querySelectorAll(".card-type-btn");
  cardTypeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      cardTypeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
});

function openTossWidget() {
  const overlay = document.getElementById("toss-widget-overlay");
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

// =========================
// [7] 최초 로드
// =========================
document.addEventListener("DOMContentLoaded", () => {
  initializePriceButtons();
  setUsageCardVisible(isLoggedIn());
  handleReturnIfNeeded();
  if (isLoggedIn()) loadUsage();
});
