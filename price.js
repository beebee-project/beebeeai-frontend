// [1] Pro 시작하기 버튼 클릭 핸들러 등록
function initializePriceButtons() {
  const proStartBtn = document.querySelector(
    "#pricing-modal-overlay .pro-button"
  );
  proStartBtn?.addEventListener("click", async () => {
    await startProPlanCheckout();
  });
}

// [2] 결제 세션 생성 → 스프라이트 결제창 호출
async function startProPlanCheckout() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }
  const r = await fetch("/api/payments/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan: "PRO" }), // 금액은 서버가 결정
  });
  if (!r.ok) {
    alert("결제 생성 실패");
    return;
  }
  const info = await r.json(); // { provider:'sprite', orderId, checkoutUrl, ... }

  // 성공 후 confirm에 사용할 orderId 임시 저장
  localStorage.setItem("pending_order_id", info.orderId);

  // 스프라이트 호스티드 체크아웃으로 이동
  window.location.href = info.checkoutUrl;
}

// DOM
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
  card.hidden = !visible; // display: none
  card.setAttribute("aria-hidden", String(!visible));
}

// 로그인 여부
function isLoggedIn() {
  return !!localStorage.getItem("token");
}

// 사용 현황 로드 (기존 함수에 보강)
async function loadUsage() {
  const token = localStorage.getItem("token");
  if (!token) {
    setUsageCardVisible(false);
    return;
  }

  try {
    const res = await fetch(`/api/payments/usage`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // 401 등
      setUsageCardVisible(false);
      return;
    }

    const data = await res.json();
    setUsageCardVisible(true); // 로그인 + 정상 응답일 때만 보이기
    renderUsageCard(data); // 기존 렌더 함수
  } catch (e) {
    console.error(e);
    setUsageCardVisible(false);
  }
}

// 전역 로그인 상태 변경 이벤트(아래 2) 참고)
window.addEventListener("auth:changed", (e) => {
  const on = !!e.detail?.isLoggedIn;
  setUsageCardVisible(on);
  if (on) loadUsage();
});

// 2) 카드 UI 업데이트
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

// 3) 결제 성공 후에도 즉시 갱신
async function handleReturnIfNeeded() {
  const p = new URLSearchParams(location.search);
  const pg = p.get("pg");
  const provider = p.get("provider");

  // 실패 리다이렉트
  if (pg === "fail") {
    history.replaceState({}, document.title, location.pathname);
    alert("결제가 취소/실패되었습니다.");
    return;
  }

  // 성공 리다이렉트 (Sprite)
  if (pg === "success" && (provider === "sprite" || !p.get("paymentKey"))) {
    const token = localStorage.getItem("token");
    const orderId = localStorage.getItem("pending_order_id");
    if (!token || !orderId) return;

    const r = await fetch("/api/payments/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ provider: "sprite", orderId }),
    });
    const data = await r.json();

    // 주소창 정리 & 상태 갱신
    history.replaceState({}, document.title, location.pathname);
    localStorage.removeItem("pending_order_id");

    if (!r.ok) {
      alert(data.error || "결제 승인 실패");
      return;
    }
    await loadUsage();
    alert("PRO 플랜 활성화 완료! 🎉");
  }
}

// 최초 로드
document.addEventListener("DOMContentLoaded", () => {
  initializePriceButtons();
  setUsageCardVisible(isLoggedIn());
  handleReturnIfNeeded();
  if (isLoggedIn()) loadUsage();
});
