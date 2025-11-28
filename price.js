const TOSS_CLIENT_KEY = "YOUR_TOSS_CLIENT_KEY_HERE";

// 같은 도메인에서 API를 쓰면 "" 그대로 두면 되고,
// API Gateway 등 /prod 같은 prefix가 있으면 "/prod" 로 맞춰줘.
const API_BASE = "";

// =========================
// [1] Pro 시작하기 버튼 클릭 핸들러 등록
// =========================
function initializePriceButtons() {
  const proStartBtn = document.querySelector(
    "#pricing-modal-overlay .pro-button"
  );
  proStartBtn?.addEventListener("click", async () => {
    await startProPlanCheckout();
  });
}

// =========================
// [2] 결제 세션 생성 → Toss 결제창 호출
// =========================
async function startProPlanCheckout() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("로그인이 필요합니다.");
    // 여기서 로그인 모달 열고 싶으면 custom 이벤트 날리면 됨
    // window.dispatchEvent(new CustomEvent("auth:open"));
    return;
  }

  if (!window.TossPayments) {
    alert("결제 스크립트 로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  try {
    // 1) 우리 서버에서 결제 세션 생성 (금액/주문명/성공URL/실패URL 등)
    const r = await fetch(API_BASE + "/api/payments/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan: "PRO" }), // 금액은 서버가 결정
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error("checkout error:", err);
      alert(err.error || "결제 생성에 실패했습니다.");
      return;
    }

    // 서버에서 내려주는 세션 정보
    // { provider:'toss', orderId, amount, currency, orderName, customerName, successUrl, failUrl }
    const info = await r.json();
    console.log("checkout session:", info);

    if (info.provider !== "toss") {
      alert("결제 제공자가 올바르지 않습니다. (toss가 아님)");
      return;
    }

    const tossPayments = TossPayments(TOSS_CLIENT_KEY);

    // 2) 토스 결제창 띄우기
    // v1/payment SDK 기준 requestPayment 사용 :contentReference[oaicite:3]{index=3}
    await tossPayments
      .requestPayment("카드", {
        amount: info.amount,
        orderId: info.orderId,
        orderName: info.orderName || "BeeBee AI PRO (월 정기 결제)",
        customerName: info.customerName || "",
        // 서버에서 내려준 successUrl / failUrl 사용
        successUrl:
          info.successUrl || `${location.origin}?pg=success&provider=toss`,
        failUrl: info.failUrl || `${location.origin}?pg=fail&provider=toss`,
      })
      .catch(function (error) {
        if (error.code === "USER_CANCEL") {
          // 사용자가 결제창 닫은 경우
          console.log("사용자가 결제를 취소했습니다.");
          return;
        } else {
          console.error("Toss requestPayment error:", error);
          alert("결제창 호출 중 오류가 발생했습니다.");
        }
      });

    // requestPayment 호출 이후에는 토스가 알아서 successUrl 또는 failUrl로 이동
  } catch (e) {
    console.error("startProPlanCheckout error:", e);
    alert("결제 생성 중 오류가 발생했습니다.");
  }
}

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
    paymentNextBtn.addEventListener("click", () => {
      if (paymentNextBtn.disabled) return;

      // TODO: 여기서 카드번호/유효기간 값 읽고 유효성 검사한 뒤,
      // 백엔드에 결제 요청 or TossPayments.requestPayment 호출
      // 일단 테스트용 알림만 띄워둠
      alert("토스 결제 연동 로직 실행 위치");
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

// =========================
// [7] 최초 로드
// =========================
document.addEventListener("DOMContentLoaded", () => {
  initializePriceButtons();
  setUsageCardVisible(isLoggedIn());
  handleReturnIfNeeded();
  if (isLoggedIn()) loadUsage();
});
