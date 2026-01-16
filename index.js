// --- 전역 변수 ---
let uploadedFiles = [];
let lastSelectedFile = null;
let selectedConversionType = null;
let lastUserMessage = "";
let originalSendButtonHtml = null;

const API_BASE_URL = "https://beebeeai-backend-production.up.railway.app";

const CONVERSION_TYPE_OFFICE_SCRIPT = "Excel Office Scripts";
const CONVERSION_TYPE_APPS_SCRIPT = "Google Apps Script";

// 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", () => {
  updateSubscriptionBadge();
  initializeAuth();
  initializePopups();
  initializeLayout();
  initializeChat();
  initializeFileUpload();
  updateLoginState();
});

// ==========================================
// 초기화 함수 그룹
// ==========================================
function initializeAuth() {
  // URL에 토큰이 있는지 확인 (소셜 로그인 콜백 처리)
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get("token");
  const authError = urlParams.get("authError");
  const untilFromUrl = urlParams.get("until");

  if (tokenFromUrl) {
    localStorage.setItem("token", tokenFromUrl);
    window.history.replaceState({}, document.title, window.location.pathname);
    window.dispatchEvent(
      new CustomEvent("auth:changed", { detail: { isLoggedIn: true } })
    );
    alert("소셜 로그인이 완료되었습니다.");
  }

  // 소셜 로그인 실패/차단 UX
  if (authError) {
    window.history.replaceState({}, document.title, window.location.pathname);

    if (authError === "REJOIN_BLOCKED") {
      const until = untilFromUrl
        ? new Date(untilFromUrl).toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
          })
        : null;
      const msg = until
        ? `탈퇴한 계정은 30일 동안 재가입이 불가능합니다.\n재가입 가능 시점: ${until}`
        : "탈퇴한 계정은 30일 동안 재가입이 불가능합니다.";

      alert(msg);
      // 로그인 모달 띄우기
      document.getElementById("login-modal-overlay")?.classList.add("active");
      // 로그인 탭으로 전환
      document.getElementById("login-tab")?.click();
    } else {
      alert("소셜 로그인에 실패했습니다. 다시 시도해주세요.");
    }
  }

  // 소셜 로그인 버튼 이벤트
  document.getElementById("google-btn")?.addEventListener("click", () => {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  });
  document.getElementById("naver-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = `${API_BASE_URL}/api/auth/naver`;
  });
}

function initializePopups() {
  // 1. 로그인 / 회원가입 팝업
  const loginModalOverlay = document.getElementById("login-modal-overlay");
  const closeLoginModal = () => loginModalOverlay?.classList.remove("active");

  // 로그인 모달 닫기 버튼
  document
    .getElementById("login-close-btn")
    ?.addEventListener("click", closeLoginModal);

  // 오버레이 클릭 시 닫기
  loginModalOverlay?.addEventListener("click", (e) => {
    if (e.target === loginModalOverlay) closeLoginModal();
  });

  // 로그인 / 회원가입 공용 폼 submit
  document
    .getElementById("auth-form")
    ?.addEventListener("submit", handleAuthFormSubmit);

  // 2. 탭 전환 로직
  const loginTab = document.getElementById("login-tab");
  const signupTab = document.getElementById("signup-tab");
  const mainActionBtn = document.getElementById("main-action-btn");
  const nameGroup = document.querySelector(".form-group:has(#name)");
  const passwordHint = document.getElementById("password-hint");
  const forgotPasswordLink = document.getElementById("forgot-password-link");
  const passwordInput = document.getElementById("password");
  const passwordToggleBtn = document.getElementById("password-toggle");

  const showLogin = () => {
    loginTab?.classList.add("active");
    signupTab?.classList.remove("active");

    if (mainActionBtn) mainActionBtn.textContent = "로그인";
    if (nameGroup) nameGroup.style.display = "none";

    // 로그인 탭에서는 비밀번호 힌트 숨김
    if (passwordHint) {
      passwordHint.style.display = "none";
      passwordHint.style.color = "#888"; // 기본값으로 초기화
    }

    if (forgotPasswordLink) forgotPasswordLink.style.display = "block";
  };

  const showSignup = () => {
    signupTab?.classList.add("active");
    loginTab?.classList.remove("active");

    if (mainActionBtn) mainActionBtn.textContent = "회원가입";
    if (nameGroup) nameGroup.style.display = "block";

    // 회원가입 탭에서만 비밀번호 힌트 표시
    if (passwordHint) {
      passwordHint.style.display = "block";
      passwordHint.style.color = "#888"; // 기본 색상으로 리셋
    }

    if (forgotPasswordLink) forgotPasswordLink.style.display = "none";
  };

  loginTab?.addEventListener("click", showLogin);
  signupTab?.addEventListener("click", showSignup);

  // 기본은 로그인 탭
  showLogin();

  // 2-1. 비밀번호 보기/숨기기 토글
  if (passwordInput && passwordToggleBtn) {
    passwordToggleBtn.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";

      // 아이콘/상태 변경
      passwordToggleBtn.textContent = isHidden ? "👁" : "👁";
      passwordToggleBtn.classList.toggle("active", isHidden);
      passwordToggleBtn.setAttribute(
        "aria-label",
        isHidden ? "비밀번호 숨기기" : "비밀번호 표시"
      );
    });
  }

  // 3. 비밀번호 유효성 실시간 검사
  if (passwordInput && passwordHint) {
    // 영어, 숫자, 특수문자 포함 8자리 이상
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_\-+\[\]{};:'",.<>/?\\|`~]).{8,}$/;

    passwordInput.addEventListener("input", () => {
      const value = passwordInput.value;

      // 아무것도 입력 안 했을 때는 기본 회색으로 복귀
      if (value.length === 0) {
        passwordHint.style.color = "#888";
        return;
      }

      // 조건 충족 / 미충족에 따라 색상 변경
      if (passwordRegex.test(value)) {
        passwordHint.style.color = "#2ECC71";
      } else {
        passwordHint.style.color = "#E74C3C";
      }
    });
  }

  // 4. 구독 팝업
  const pricingModalOverlay = document.getElementById("pricing-modal-overlay");
  const openPricingModal = (event) => {
    event.preventDefault();
    pricingModalOverlay?.classList.add("active");
  };
  const closePricingModal = () =>
    pricingModalOverlay?.classList.remove("active");

  document
    .getElementById("desktop-pricing-link")
    ?.addEventListener("click", openPricingModal);
  document
    .getElementById("mobile-pricing-link")
    ?.addEventListener("click", openPricingModal);
  document
    .getElementById("pricing-close-btn")
    ?.addEventListener("click", closePricingModal);

  pricingModalOverlay?.addEventListener("click", (e) => {
    if (e.target === pricingModalOverlay) closePricingModal();
  });
}

// 5. 가이드 투어
const guideModalOverlay = document.getElementById("guide-modal-overlay");
const guideOverlay = document.getElementById("guide-overlay");

const guideSteps = [
  {
    el: document.querySelector(".conversion-type-selector"),
    text: "1단계: 여기에서 변환할 타입을 선택합니다.",
  },
  {
    el: document.getElementById("attach-button"),
    text: "2단계: + 버튼을 눌러 파일을 업로드할 수 있습니다.",
  },
  {
    el: document.querySelector(".chat-input-area"),
    text: "3단계: 이 영역에서 BeeBee AI에게 변환 요청을 입력합니다.",
  },
];
let currentGuideStep = 0;

function clearGuideHighlight() {
  document
    .querySelectorAll(".guide-highlight")
    .forEach((el) => el.classList.remove("guide-highlight"));
  document.querySelectorAll(".guide-tooltip").forEach((t) => t.remove());
  document.querySelectorAll(".guide-info-box").forEach((b) => b.remove());
}

function highlightElement(el, text) {
  if (!el || !guideOverlay) return;

  clearGuideHighlight();
  guideOverlay.classList.add("active");
  el.classList.add("guide-highlight");

  const rect = el.getBoundingClientRect();

  // 공통 툴팁 생성
  const tooltip = document.createElement("div");
  tooltip.className = "guide-tooltip";
  tooltip.textContent = text;
  document.body.appendChild(tooltip);

  const tooltipRect = tooltip.getBoundingClientRect();
  let top = rect.bottom + 12;
  let left = rect.left;

  if (top + tooltipRect.height > window.innerHeight - 16)
    top = rect.top - tooltipRect.height - 12;
  if (left + tooltipRect.width > window.innerWidth - 16)
    left = window.innerWidth - tooltipRect.width - 16;

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;

  // --------------- 추가 정보 안내 (단계별 조건)
  // 단계별 안내 문구
  let infoHTML = "";
  let position = "bottom";
  if (currentGuideStep === 1) {
    infoHTML = `
      <div class="guide-info-content">
        <strong>💡 다이렉트 함수</strong><br />
        파일 업로드 없이도 <b>다이렉트 함수</b>를 통해<br />
        간단한 수식을 바로 생성할 수 있습니다.<br />
        ex) <b>A1부터 A10까지의 평균</b>
      </div>`;
    position = "bottom";
  } else if (currentGuideStep === 2) {
    infoHTML = `
      <div class="guide-info-row">
        <div class="guide-info-content">
          <strong>⚙️ 자동 변환</strong><br />
          파일을 업로드하면 자동으로 타입이 <b>변환</b>됩니다.
        </div>
        <div class="guide-info-content">
          <strong>📁 업로드 제한</strong><br />
          파일 업로드는 최대 <b>5개</b> 까지만 가능합니다.
        </div>
      </div>`;
    position = "top";
  }

  if (infoHTML) {
    const infoBox = document.createElement("div");
    infoBox.className = "guide-info-box";
    infoBox.innerHTML = infoHTML;
    document.body.appendChild(infoBox);

    const infoRect = infoBox.getBoundingClientRect();

    if (position === "bottom") {
      infoBox.style.top = `${top + tooltipRect.height + 10}px`;
    } else {
      const tooltipTop = parseFloat(tooltip.style.top);
      const spacing = 14;
      infoBox.style.top = `${tooltipTop - infoRect.height - spacing}px`;
    }

    infoBox.style.left = `${left}px`;
  }
}

function startGuideTour() {
  currentGuideStep = 0;
  guideModalOverlay.classList.add("active");
  guideOverlay.classList.add("active");
  nextGuideStep();
}

function nextGuideStep() {
  if (currentGuideStep >= guideSteps.length) {
    endGuideTour();
    return;
  }
  const step = guideSteps[currentGuideStep];
  currentGuideStep += 1;
  highlightElement(step.el, step.text);
}

function endGuideTour() {
  guideModalOverlay.classList.remove("active");
  guideOverlay.classList.remove("active");
  clearGuideHighlight();
}

// 가이드 메뉴 클릭 시 시작
document
  .getElementById("desktop-guide-link")
  ?.addEventListener("click", (e) => {
    e.preventDefault();
    startGuideTour();
  });
document.getElementById("mobile-guide-link")?.addEventListener("click", (e) => {
  e.preventDefault();
  startGuideTour();
});

// 클릭으로 다음 단계 진행
guideOverlay?.addEventListener("click", nextGuideStep);

function initializeLayout() {
  const menuIcon = document.querySelector(".menu-icon");
  const popupOverlay = document.getElementById("popup-overlay");
  const popupClose = document.getElementById("popup-close");

  if (!menuIcon || !popupOverlay) return;

  // 모바일 햄버거 메뉴 열기
  menuIcon.addEventListener("click", () => {
    popupOverlay.classList.add("active");
  });
  // 닫기 버튼
  if (popupClose) {
    popupClose.addEventListener("click", () => {
      popupOverlay.classList.remove("active");
    });
  }
  // 오버레이 영역 클릭 시 닫기
  popupOverlay.addEventListener("click", (e) => {
    if (e.target === popupOverlay) {
      popupOverlay.classList.remove("active");
    }
  });
}

function initializeChat() {
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const conversionTypeSelect = document.getElementById(
    "conversion-type-select"
  );

  originalSendButtonHtml = sendButton.innerHTML;
  sendButton.disabled = true;

  userInput.addEventListener("input", () => {
    sendButton.disabled = userInput.value.trim() === "";
    userInput.style.height = "24px";
    userInput.style.height = `${userInput.scrollHeight}px`;
  });

  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleUserInput();
    }
  });

  sendButton.addEventListener("click", handleUserInput);

  // 변환 타입 선택 로직
  conversionTypeSelect.addEventListener("change", (e) => {
    selectedConversionType = e.target.value || null;
    if (selectedConversionType) {
      addMessage(`'${selectedConversionType}' 타입이 선택되었습니다.`, "ai");
    }
  });

  // 처음 안내 문구
  addMessage("변환할 타입을 선택해 주세요 : ", "ai");
}

function initializeFileUpload() {
  const uploadPopupOverlay = document.getElementById("upload-popup-overlay");
  const attachButton = document.getElementById("attach-button");
  const uploadButton = document.getElementById("upload-button");
  const uploadFileInput = document.getElementById("upload-file-input");
  const uploadArea = document.querySelector(".upload-area");
  const startUploadBtn = document.getElementById("start-upload-btn");
  const cancelUploadBtn = document.getElementById("cancel-upload-btn");
  const fileTypeSelect = document.getElementById("file-type-select");
  const hiddenAttachInput = document.getElementById("file-input");

  const applyAcceptFromFilter = (value) => {
    const map = {
      all: ".xlsx,.xls,.csv",
      xlsx: ".xlsx,.xls",
      csv: ".csv",
    };
    uploadFileInput?.setAttribute("accept", map[value] || map.all);
    hiddenAttachInput?.setAttribute("accept", map[value] || map.all);
  };

  attachButton.addEventListener("click", () => {
    uploadPopupOverlay.classList.add("active");
    loadUserFiles();
    applyAcceptFromFilter(fileTypeSelect?.value || "all");
  });

  fileTypeSelect?.addEventListener("change", () => {
    applyAcceptFromFilter(fileTypeSelect.value);
    renderFiles(); // 목록 필터 반영
  });

  cancelUploadBtn.addEventListener("click", () => {
    uploadPopupOverlay.classList.remove("active");
  });

  uploadButton.addEventListener("click", () => uploadFileInput.click());

  uploadFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
    e.target.value = "";
  });

  startUploadBtn.addEventListener("click", () => {
    if (lastSelectedFile) {
      addMessage(
        `'${lastSelectedFile}' 파일이 선택되었습니다. 이제 관련된 질문을 입력해주세요.`,
        "ai"
      );
      const type = getConversionTypeFromFileExtension(lastSelectedFile);
      document.getElementById("conversion-type-select").value = type;
      selectedConversionType = type;
      uploadPopupOverlay.classList.remove("active");
    }
  });

  uploadArea.addEventListener("click", (e) => {
    const target = e.target;
    const fileDisplay = target.closest(".uploaded-file-display");
    if (!fileDisplay) return;

    const fileName = fileDisplay.dataset.filename;

    if (target.closest(".delete-icon")) {
      handleFileDelete(fileName);
    } else if (target.closest(".download-icon")) {
      handleFileDownload(fileName);
    } else if (target.matches(".file-checkbox")) {
      if (target.checked) {
        lastSelectedFile = fileName;
        uploadArea.querySelectorAll(".file-checkbox").forEach((box) => {
          if (box !== target) box.checked = false;
        });
      } else {
        lastSelectedFile = null;
      }
      updateStartButtonState();
    }
  });
}

// ==========================================
// 인증 관련 함수
// ==========================================

async function handleAuthFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.querySelector("#email").value;
  const password = form.querySelector("#password").value;
  const isSignup = document
    .getElementById("signup-tab")
    .classList.contains("active");
  const actionButton = document.getElementById("main-action-btn");
  const originalButtonText = actionButton.textContent;

  actionButton.disabled = true;
  actionButton.textContent = "처리 중...";

  try {
    const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
    const body = { email, password };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      if (data?.code === "REJOIN_BLOCKED") {
        const until = data?.purgeAt
          ? new Date(data.purgeAt).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
            })
          : null;
        const msg = until
          ? `탈퇴한 계정은 30일 동안 재가입이 불가능합니다.\n재가입 가능 시점: ${until}`
          : "탈퇴한 계정은 30일 동안 재가입이 불가능합니다.";
        throw new Error(msg);
      }
      throw new Error(data?.message || "요청 처리 중 오류가 발생했습니다.");
    }

    if (isSignup) {
      alert(data.message);
    } else {
      localStorage.setItem("token", data.token);
      window.dispatchEvent(
        new CustomEvent("auth:changed", { detail: { isLoggedIn: true } })
      );
      alert(data.message);
    }
    document.getElementById("login-modal-overlay")?.classList.remove("active");
    updateLoginState();
  } catch (error) {
    alert(error.message);
  } finally {
    actionButton.disabled = false;
    actionButton.textContent = originalButtonText;
  }
}

function handleLogout(event) {
  event.preventDefault();
  localStorage.removeItem("token");
  window.dispatchEvent(
    new CustomEvent("auth:changed", { detail: { isLoggedIn: false } })
  );
  alert("로그아웃 되었습니다.");
  updateLoginState();
}

function updateLoginState() {
  const token = localStorage.getItem("token");
  const desktopLoginLink = document.getElementById("desktop-login-link");
  const mobileLoginLink = document.getElementById("mobile-login-link");

  const setupLink = (link, isLoggedIn) => {
    if (!link) return;
    // 이벤트 리스너를 매번 새로 등록하기 전에 기존 것을 확실히 제거
    const newLink = link.cloneNode(true);
    link.parentNode.replaceChild(newLink, link);

    if (isLoggedIn) {
      newLink.textContent = "로그아웃";
      newLink.addEventListener("click", handleLogout);
    } else {
      newLink.textContent = "로그인";
      newLink.addEventListener("click", openLoginModal);
    }
  };

  setupLink(desktopLoginLink, !!token);
  setupLink(mobileLoginLink, !!token);
}

// ==========================================
// 파일 관리 API 호출 함수
// ==========================================

async function loadUserFiles() {
  const token = localStorage.getItem("token");
  if (!token) {
    uploadedFiles = [];
    renderFiles();
    return;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/files`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.dispatchEvent(
          new CustomEvent("auth:changed", { detail: { isLoggedIn: false } })
        );
        updateLoginState();
      }
      throw new Error("파일 목록 로딩 실패");
    }
    uploadedFiles = await response.json();
    renderFiles();
  } catch (error) {
    console.error(error.message);
    uploadedFiles = [];
    renderFiles();
  }
}

async function handleFileUpload(file) {
  const token = localStorage.getItem("token");
  if (!token) return alert("로그인이 필요합니다.");

  if (uploadedFiles.length >= 5) {
    alert(
      "파일은 최대 5개까지만 업로드할 수 있습니다.\n기존 파일을 삭제한 후 다시 시도해주세요."
    );
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }

    if (!response.ok) {
      // 1) 사용량 초과(429) 메시지
      if (
        response.status === 429 &&
        (data?.code === "LIMIT_EXCEEDED" || data?.code === "LIMIT_EXCEEDED")
      ) {
        const field = data?.field ?? data?.meta?.field;
        const used = data?.used ?? data?.meta?.used;
        const limit = data?.limit ?? data?.meta?.limit;

        const label =
          field === "fileUploads"
            ? "파일 업로드"
            : field === "formulaConversions"
            ? "AI 변환"
            : "사용량";

        alert(
          `${label} 한도를 초과했습니다. (${used}/${limit})\n구독 후 무제한으로 이용할 수 있어요.`
        );
        return;
      }

      // 2) 일반 오류
      const msg =
        data?.message || data?.error || "업로드 중 오류가 발생했습니다.";
      alert(msg);
      return;
    }

    // ✅ 성공 처리
    uploadedFiles = data; // data가 updatedFiles 역할
    lastSelectedFile = file.name;
    renderFiles();
    await updateSubscriptionBadge();
  } catch (error) {
    alert(error.message);
  }
}

async function handleFileDownload(originalName) {
  const token = localStorage.getItem("token");
  if (!token) return alert("로그인이 필요합니다.");
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/files/download/${encodeURIComponent(originalName)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) throw new Error("다운로드 실패");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = originalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message);
  }
}

async function handleFileDelete(originalName) {
  const token = localStorage.getItem("token");
  if (!token) return alert("로그인이 필요합니다.");
  if (!confirm(`'${originalName}' 파일을 정말 삭제하시겠습니까?`)) return;
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/files/${encodeURIComponent(originalName)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const updatedFiles = await response.json();
    if (!response.ok) throw new Error(updatedFiles.message);
    uploadedFiles = updatedFiles;
    if (lastSelectedFile === originalName) {
      lastSelectedFile = null;
    }
    renderFiles();
  } catch (error) {
    alert(error.message);
  }
}

// ==========================================
// UI 렌더링 및 동적 처리 함수
// ==========================================

function renderFiles() {
  const uploadArea = document.querySelector(".upload-area");
  if (!uploadArea) return;

  const filterSelect = document.getElementById("file-type-select");
  const filterVal = filterSelect ? filterSelect.value : "all";
  const list = uploadedFiles.filter((f) => {
    const ext = f.originalName.split(".").pop().toLowerCase();
    if (filterVal === "all") return true;
    if (filterVal === "xlsx") return ["xlsx", "xls"].includes(ext);
    if (filterVal === "csv") return ext === "csv";
    return true;
  });

  if (list.length === 0) {
    uploadArea.innerHTML = `
      <svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-4H8l4-4 4 4h-3v4z"/>
      </svg>
      <p>시작하려면 파일을 추가하세요</p>
    `;
    uploadArea.classList.remove("has-file");
  } else {
    uploadArea.innerHTML = list
      .map((file) => {
        const isChecked =
          lastSelectedFile === file.originalName ? "checked" : "";

        return `
        <div class="uploaded-file-display" data-filename="${file.originalName}">
          <div class="file-details">
            <input type="checkbox" class="file-checkbox" ${isChecked} />
            <i class="${getFileIconClass(file.originalName)} file-icon"></i>
            <span class="file-name">${file.originalName}</span>
          </div>
          <div class="file-actions">
            <button class="action-icon delete-icon" title="파일 삭제"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      `;
      })
      .join("");
    uploadArea.classList.add("has-file");
  }
  updateStartButtonState();
}

function updateStartButtonState() {
  const startUploadBtn = document.getElementById("start-upload-btn");
  if (startUploadBtn) {
    startUploadBtn.disabled = !lastSelectedFile;
  }
}

function getFileIconClass(fileName) {
  const extension = fileName.split(".").pop().toLowerCase();
  if (["xlsx", "csv", "xls"].includes(extension)) return "fas fa-file-excel";
  return "fas fa-file";
}

function getConversionTypeFromFileExtension(fileName) {
  const extension = fileName.split(".").pop().toLowerCase();
  if (["xlsx", "csv", "xls"].includes(extension)) return "Excel/Google Sheets";
  return "";
}

// ==========================================
// 채팅 관련 함수
// ==========================================
async function sendApiRequest(message, fileName, conversionType) {
  const userInput = document.getElementById("user-input");
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  // ✅ 매크로 타겟 매핑
  let macroTarget = null;
  if (conversionType === CONVERSION_TYPE_OFFICE_SCRIPT)
    macroTarget = "officeScript";
  else if (conversionType === CONVERSION_TYPE_APPS_SCRIPT)
    macroTarget = "appsScript";

  const payload = macroTarget
    ? { prompt: message, target: macroTarget }
    : { message, fileName, conversionType };

  lastUserMessage = message;
  addMessage(message, "user");

  userInput.value = "";
  userInput.style.height = "24px";
  toggleLoadingState(true);

  try {
    const endpoint = macroTarget ? "/api/macro/generate" : "/api/convert";
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        addMessage("로그인이 필요합니다. 로그인 후 다시 시도해주세요.", "ai");
        document.getElementById("login-modal-overlay")?.classList.add("active");
        document.getElementById("login-tab")?.click();
        return;
      }
      addMessage(
        data?.message ||
          data?.error ||
          "죄송합니다. API 호출 중 오류가 발생했습니다.",
        "ai"
      );
      return;
    }

    // ✅ 매크로 응답은 { result } or { script } 형태일 수 있어 방어
    const resultText =
      data?.code ??
      data?.result ??
      data?.script ??
      data?.output ??
      data?.message ??
      "";

    addMessage(
      resultText || "결과를 생성하지 못했습니다.",
      "ai",
      lastUserMessage
    );

    // 실시간 반영
    await updateSubscriptionBadge();
  } catch (error) {
    console.error("API 호출 중 오류 발생:", error);
    addMessage(
      data?.message ||
        data?.error ||
        "죄송합니다. API 호출 중 오류가 발생했습니다.",
      "ai"
    );
  } finally {
    toggleLoadingState(false);
  }
}

function handleUserInput() {
  const userInput = document.getElementById("user-input");
  const messageText = userInput.value.trim();
  if (!messageText) return;

  if (!selectedConversionType) {
    addMessage("변환할 타입을 먼저 선택해주세요.", "ai");
    return;
  }

  sendApiRequest(messageText, lastSelectedFile, selectedConversionType);
}

function addMessage(text, sender, userMessageForFeedback) {
  const chatMessages = document.getElementById("chat-messages");
  const messageBubble = document.createElement("div");
  messageBubble.classList.add("message-bubble", sender);

  const isFormula =
    sender === "ai" &&
    (text.trim().startsWith("=") ||
      text.toUpperCase().startsWith("SELECT") ||
      text.includes("prop(") ||
      text.includes("ExcelScript.Workbook") ||
      text.includes("function main(") ||
      text.includes("function myFunction("));

  if (isFormula) {
    messageBubble.innerHTML = `
        <div class="code-block">
            <pre>${text.trim()}</pre>
            <button class="copy-button" title="클립보드에 복사">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M16 1H6c-1.1 0-2 .9-2 2v12h2V3h10V1zm3 4H10c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H10V7h9v14z"/>
                </svg>
            </button>
        </div>
        <div class="feedback-container"></div>
    `;

    const copyBtn = messageBubble.querySelector(".copy-button");
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(text.trim()).then(() => {
        copyBtn.innerHTML = `<i class="fas fa-check"></i>`;
        setTimeout(() => {
          copyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M16 1H6c-1.1 0-2 .9-2 2v12h2V3h10V1zm3 4H10c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H10V7h9v14z"/>
                </svg>`;
        }, 2000);
      });
    });

    // 피드백 UI 렌더링
    renderFeedbackUI(
      messageBubble.querySelector(".feedback-container"),
      userMessageForFeedback,
      text
    );
  } else {
    messageBubble.textContent = text;
  }

  chatMessages.appendChild(messageBubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderFeedbackUI(container, userMessage, aiResponse) {
  container.innerHTML = `
        <p>이 답변이 정확한가요?</p>
        <button class="feedback-btn feedback-correct">정확함</button>
        <button class="feedback-btn feedback-incorrect">수정 필요</button>
    `;

  container.querySelector(".feedback-correct").addEventListener("click", () => {
    sendFeedback(userMessage, aiResponse, "correct", "", container);
  });

  container
    .querySelector(".feedback-incorrect")
    .addEventListener("click", () => {
      container.innerHTML = `
            <div class="feedback-form">
                <textarea class="feedback-textarea" placeholder="어떤 부분이 잘못되었는지 알려주세요."></textarea>
                <div class="feedback-actions">
                    <button class="feedback-submit-btn">제출</button>
                    <button class="feedback-cancel-btn">취소</button>
                </div>
            </div>
        `;
      container
        .querySelector(".feedback-submit-btn")
        .addEventListener("click", () => {
          const feedbackText =
            container.querySelector(".feedback-textarea").value;
          sendFeedback(
            userMessage,
            aiResponse,
            "incorrect",
            feedbackText,
            container
          );
        });
      container
        .querySelector(".feedback-cancel-btn")
        .addEventListener("click", () => {
          renderFeedbackUI(container, userMessage, aiResponse); // 초기 상태로 복원
        });
    });
}

async function sendFeedback(
  userMessage,
  aiResponse,
  feedback,
  feedbackText,
  container
) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("로그인이 필요합니다.");
    document.getElementById("login-modal-overlay")?.classList.add("active");
    document.getElementById("login-tab")?.click();
    return;
  }

  // 로딩 UI (성공/실패 확인 전에는 '감사합니다'를 띄우지 않음)
  container.innerHTML = `<p class="feedback-thanks">저장 중...</p>`;

  try {
    const res = await fetch(`${API_BASE_URL}/api/convert/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: userMessage,
        result: aiResponse,
        feedback,
        feedbackText,
        conversionType: selectedConversionType,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        // 토큰 만료/무효 처리
        localStorage.removeItem("token");
        window.dispatchEvent(
          new CustomEvent("auth:changed", { detail: { isLoggedIn: false } })
        );
        updateLoginState();

        alert("로그인이 필요합니다. 다시 로그인해주세요.");
        document.getElementById("login-modal-overlay")?.classList.add("active");
        document.getElementById("login-tab")?.click();

        // UI 복구(다시 피드백 가능하게)
        renderFeedbackUI(container, userMessage, aiResponse);
        return;
      }

      // 기타 오류: 메시지 보여주고 UI 복구
      alert(data?.message || data?.error || "피드백 저장에 실패했습니다.");
      renderFeedbackUI(container, userMessage, aiResponse);
      return;
    }

    // ✅ 성공
    container.innerHTML = `<p class="feedback-thanks">피드백 감사합니다!</p>`;
  } catch (e) {
    alert("네트워크 오류로 피드백 저장에 실패했습니다.");
    renderFeedbackUI(container, userMessage, aiResponse);
  }
}

function toggleLoadingState(isLoading) {
  const sendButton = document.getElementById("send-button");
  sendButton.disabled = isLoading;
  if (isLoading) {
    sendButton.innerHTML = `<svg class="spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>`;
  } else {
    sendButton.innerHTML = originalSendButtonHtml;
  }
}

// openLoginModal 함수 정의 (updateLoginState에서 사용)
const openLoginModal = (event) => {
  event.preventDefault();
  document.getElementById("login-modal-overlay")?.classList.add("active");
};

function applyBetaLocks(betaMode) {
  document.querySelectorAll("[data-beta-lock]").forEach((el) => {
    el.classList.toggle("beta-disabled", betaMode);
  });
} // false로 변경 시 제거

async function applyBetaLocksFromPlans() {
  try {
    const r = await fetch(`${API_BASE_URL}/api/payments/plans`);
    const data = await r.json().catch(() => ({}));
    const betaMode = Boolean(data?.betaMode);
    applyBetaLocks(betaMode);
  } catch (e) {
    // 네트워크 오류 시 잠금 처리 스킵 (원하면 기본 잠금으로 바꿔도 됨)
  }
} // false로 변경 시 제거

async function updateSubscriptionBadge() {
  const subBadge = document.getElementById("subscription-badge");
  const usageBadge = document.getElementById("usage-badge");
  if (!subBadge) return;

  const token = localStorage.getItem("token");
  if (!token) {
    subBadge.style.display = "none";
    if (usageBadge) usageBadge.style.display = "none";
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/payments/usage`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    // 기본 숨김 처리
    subBadge.style.display = "none";
    if (usageBadge) usageBadge.style.display = "none";

    if (!res.ok) return;

    // PRO: Active 배지 표시
    if (data.plan === "PRO") {
      subBadge.style.display = "inline-flex";
      return;
    }

    // FREE(비구독): 사용량 표시
    // 서버 응답 필드명에 맞춰 안전하게 처리 (둘 중 하나로 올 수 있어서 방어)
    const formulaUsed =
      data.usage?.formulaConversions ?? data.formulaConversions ?? 0;
    const fileUsed = data.usage?.fileUploads ?? data.fileUploads ?? 0;

    // 비구독 한도: 수식 10회, 업로드 1회
    const formulaLimit = 10;
    const fileLimit = 1;

    if (usageBadge) {
      usageBadge.innerHTML = `
        <div class="usage-line">AI 변환 ${formulaUsed}/${formulaLimit}</div>
        <div class="usage-line">파일 업로드 ${fileUsed}/${fileLimit}</div>
      `;
      usageBadge.style.display = "inline-block";
    }
  } catch (e) {
    subBadge.style.display = "none";
    if (usageBadge) usageBadge.style.display = "none";
  }
}

window.addEventListener("auth:changed", updateSubscriptionBadge);
window.addEventListener("auth:changed", applyBetaLocksFromPlans); // false로 변경 시 제거
document.addEventListener("DOMContentLoaded", applyBetaLocksFromPlans); // false로 변경 시 제거
