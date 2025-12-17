import "./style.css";

const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://beebeeai-backend-production.up.railway.app";

const urlParams = new URLSearchParams(window.location.search);
const paymentKey = urlParams.get("paymentKey");
const orderId = urlParams.get("orderId");
let amount = urlParams.get("amount");

// ✅ amount가 없으면 localStorage에서 복구
if (!amount && orderId) {
  try {
    const pending = JSON.parse(
      localStorage.getItem("pendingPayment") || "null"
    );
    if (pending && pending.orderId === orderId && pending.amount != null) {
      amount = String(pending.amount);
    }
  } catch (e) {}
}

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

  if (!amount) {
    alert("결제 금액(amount)을 확인할 수 없습니다. 결제를 다시 시도해주세요.");
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
