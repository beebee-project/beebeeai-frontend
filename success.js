const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://beebeeai-backend-production.up.railway.app";

const urlParams = new URLSearchParams(window.location.search);
const paymentKey = urlParams.get("paymentKey");
const orderId = urlParams.get("orderId");
const amount = Number(urlParams.get("amount"));

const paymentKeyElement = document.getElementById("paymentKey");
const orderIdElement = document.getElementById("orderId");
const amountElement = document.getElementById("amount");

paymentKeyElement.textContent = paymentKey;
orderIdElement.textContent = orderId;
amountElement.textContent = `${amount}원`;

const confirmLoadingSection = document.querySelector(".confirm-loading");
const confirmSuccessSection = document.querySelector(".confirm-success");

async function confirmPayment() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
    return;
  }
  if (!paymentKey || !orderId || !amount) {
    alert("결제 정보가 올바르지 않습니다. 다시 시도해주세요.");
    return;
  }
  const response = await fetch(`${API_BASE}/api/payments/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    alert(err.error || "결제 승인에 실패했습니다.");
    return;
  }

  confirmLoadingSection.style.display = "none";
  confirmSuccessSection.style.display = "flex";

  // ✅ 구독 완료 플래그 저장 (원래 페이지에서 읽어서 UI 갱신)
  localStorage.setItem("justSubscribed", "1");
  localStorage.setItem("justSubscribedAt", String(Date.now()));

  // ✅ 1~2초 후 원래 페이지로 이동 (원하는 경로로 바꿔도 됨)
  setTimeout(() => {
    window.location.href = "/?subscribed=1";
  }, 1200);
}

// ✅ 자동 승인
confirmPayment();
