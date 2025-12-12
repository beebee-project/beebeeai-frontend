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
}

// ✅ 자동 승인
confirmPayment();
