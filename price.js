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

  // 1) 결제 세션 생성(서버)
  const checkoutRes = await fetch(API_BASE + "/api/payments/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const session = await checkoutRes.json().catch(() => ({}));
  if (!checkoutRes.ok) {
    alert(session.error || "결제 준비(checkout) 실패");
    return;
  }

  localStorage.setItem(
    "pendingPayment",
    JSON.stringify({
      orderId: session.orderId,
      amount: session.amount,
    })
  );

  // 2) 위젯 초기화/렌더 (1회)
  if (!__widgetsInited) {
    if (typeof TossPayments !== "function") {
      alert("TossPayments SDK(v2)가 로드되지 않았습니다.");
      return;
    }

    const tossPayments = TossPayments(TOSS_CLIENT_KEY);

    __widgets = tossPayments.widgets({
      customerKey: session.customerKey || "ANONYMOUS",
    });

    await __widgets.setAmount({ currency: "KRW", value: session.amount });

    const [paymentMethodWidget] = await Promise.all([
      __widgets.renderPaymentMethods({
        selector: "#payment-method",
        variantKey: "DEFAULT",
      }),
      __widgets.renderAgreement({
        selector: "#agreement",
        variantKey: "AGREEMENT",
      }),
    ]);

    // 결제수단 선택 시 결제 버튼 활성화
    paymentMethodWidget.on("paymentMethodSelect", () => {
      const btn = document.getElementById("payment-request-button");
      if (btn) btn.disabled = false;
    });

    __widgetsInited = true;
  } else {
    // 금액만 갱신
    await __widgets.setAmount({ currency: "KRW", value: session.amount });
  }

  // 3) 결제 버튼 → requestPayment (onclick은 한 번만 설정)
  const btn = document.getElementById("payment-request-button");
  if (!btn) {
    alert("결제 버튼(#payment-request-button)을 찾을 수 없습니다.");
    return;
  }

  btn.disabled = true; // 결제수단 선택 전까지 비활성(원하면 유지)
  btn.onclick = async () => {
    try {
      await __widgets.requestPayment({
        orderId: session.orderId,
        orderName: session.orderName,
        successUrl: session.successUrl,
        failUrl: session.failUrl,
        customerName: session.customerName,
      });
    } catch (e) {
      console.error(e);
      alert("결제 요청 중 오류가 발생했습니다.");
    }
  };
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
