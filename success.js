import "./style.css";

const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://beebeeai-backend-production.up.railway.app";

const urlParams = new URLSearchParams(window.location.search);
const paymentKey = urlParams.get("paymentKey");
const orderId = urlParams.get("orderId");
const amount = urlParams.get("amount");

document.getElementById("paymentKey").textContent = paymentKey || "";
document.getElementById("orderId").textContent = orderId || "";
document.getElementById("amount").textContent = amount ? `${amount}원` : "";

const confirmLoadingSection = document.querySelector(".confirm-loading");
const confirmSuccessSection = document.querySelector(".confirm-success");

async function confirmPayment() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");

  if (!token) {
    alert("로그인이 필요합니다.");
    window.location.href = "/"; // 또는 로그인 모달 오픈
    return;
  }

  const res = await fetch(`${API_BASE}/api/payments/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount: Number(amount),
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    alert(json.error || `결제 승인 실패 (status ${res.status})`);
    return;
  }

  confirmLoadingSection.style.display = "none";
  confirmSuccessSection.style.display = "flex";
}

document
  .getElementById("confirmPaymentButton")
  ?.addEventListener("click", confirmPayment);
