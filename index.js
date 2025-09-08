// --- 전역 변수 ---
let uploadedFiles = [];
let lastSelectedFile = null;
let selectedConversionType = null;
let lastUserMessage = "";
let originalSendButtonHtml = null;

const API_BASE_URL = "";

// --- 페이지 로드 시 실행 ---
document.addEventListener("DOMContentLoaded", () => {
  // 1. 초기화 함수들 호출
  initializeAuth();
  initializePopups();
  initializeSidebarAndLayout();
  initializeChat();
  initializeFileUpload();

  // 2. 페이지 로드 시 로그인 상태 확인 및 UI 업데이트
  updateLoginState();
});

// ==========================================
// 초기화 함수 그룹
// ==========================================

function initializeAuth() {
  // URL에 토큰이 있는지 확인 (소셜 로그인 콜백 처리)
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get("token");

  if (tokenFromUrl) {
    localStorage.setItem("token", tokenFromUrl);
    window.history.replaceState({}, document.title, window.location.pathname);
    window.dispatchEvent(
      new CustomEvent("auth:changed", { detail: { isLoggedIn: true } })
    );
    alert("소셜 로그인이 완료되었습니다.");
  }

  // 소셜 로그인 버튼 이벤트
  document.getElementById("google-btn")?.addEventListener("click", () => {
    window.location.href = `/api/auth/google`;
  });
  document.getElementById("naver-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = `/api/auth/naver`;
  });
}

function initializePopups() {
  // 로그인/회원가입 팝업
  const loginModalOverlay = document.getElementById("login-modal-overlay");
  const openLoginModal = (event) => {
    event.preventDefault();
    loginModalOverlay?.classList.add("active");
  };
  const closeLoginModal = () => loginModalOverlay?.classList.remove("active");

  document
    .getElementById("desktop-login-link")
    ?.addEventListener("click", openLoginModal);
  document
    .getElementById("mobile-login-link")
    ?.addEventListener("click", openLoginModal);
  document
    .getElementById("login-close-btn")
    ?.addEventListener("click", closeLoginModal);
  loginModalOverlay?.addEventListener("click", (e) => {
    if (e.target === loginModalOverlay) closeLoginModal();
  });
  document
    .getElementById("auth-form")
    ?.addEventListener("submit", handleAuthFormSubmit);

  // 탭 전환 로직
  const loginTab = document.getElementById("login-tab");
  const signupTab = document.getElementById("signup-tab");
  const mainActionBtn = document.getElementById("main-action-btn");
  const nameGroup = document.querySelector(".form-group:has(#name)");
  const passwordHint = document.getElementById("password-hint");
  const forgotPasswordLink = document.getElementById("forgot-password-link");

  const showLogin = () => {
    loginTab?.classList.add("active");
    signupTab?.classList.remove("active");
    if (mainActionBtn) mainActionBtn.textContent = "로그인";
    if (nameGroup) nameGroup.style.display = "none";
    if (passwordHint) passwordHint.style.display = "none";
    if (forgotPasswordLink) forgotPasswordLink.style.display = "block";
  };

  const showSignup = () => {
    signupTab?.classList.add("active");
    loginTab?.classList.remove("active");
    if (mainActionBtn) mainActionBtn.textContent = "회원가입";
    if (nameGroup) nameGroup.style.display = "block";
    if (passwordHint) passwordHint.style.display = "block";
    if (forgotPasswordLink) forgotPasswordLink.style.display = "none";
  };

  loginTab?.addEventListener("click", showLogin);
  signupTab?.addEventListener("click", showSignup);
  showLogin(); // 기본값으로 로그인 탭 표시

  // 가격 팝업 초기화
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

function initializeSidebarAndLayout() {
  const headerGroup = document.querySelector(".header-group");
  const sidebarContainer = document.getElementById("mainSidebar");
  const mainContent = document.querySelector("main");
  const sidebarToggleBtn = document.querySelector(".sidebar-toggle-btn");
  const menuIcon = document.querySelector(".menu-icon");
  const popupOverlay = document.getElementById("popup-overlay");
  const popupClose = document.getElementById("popup-close");
  const sidebarMenuItems = document.querySelectorAll(".sidebar-menu-item");

  function alignSidebarWithHeader() {
    if (headerGroup && sidebarContainer) {
      const headerRect = headerGroup.getBoundingClientRect();
      const computedStyle = getComputedStyle(headerGroup);
      const headerPaddingLeft = parseFloat(computedStyle.paddingLeft);
      const desiredLeft = headerRect.left + headerPaddingLeft;
      sidebarContainer.style.left = `${desiredLeft}px`;
    }
  }

  function setSidebarStateAndMargin() {
    if (mainContent && sidebarContainer && sidebarToggleBtn) {
      const sidebarRect = sidebarContainer.getBoundingClientRect();
      const sidebarLeft = sidebarRect.left;
      let sidebarWidth;

      if (sidebarContainer.classList.contains("collapsed")) {
        sidebarWidth = 25;
        sidebarToggleBtn.setAttribute("title", "사이드바 열기");
        mainContent.classList.add("collapsed-sidebar");
      } else {
        sidebarWidth = 250;
        sidebarToggleBtn.setAttribute("title", "사이드바 닫기");
        mainContent.classList.remove("collapsed-sidebar");
      }
      mainContent.style.marginLeft = `${sidebarLeft + sidebarWidth}px`;
    }
  }

  if (menuIcon && popupOverlay && popupClose) {
    menuIcon.addEventListener("click", () =>
      popupOverlay.classList.add("active")
    );
    popupClose.addEventListener("click", () =>
      popupOverlay.classList.remove("active")
    );
    popupOverlay.addEventListener("click", (e) => {
      if (e.target === popupOverlay) popupOverlay.classList.remove("active");
    });
  }

  alignSidebarWithHeader();
  setSidebarStateAndMargin();
  window.addEventListener("resize", () => {
    alignSidebarWithHeader();
    setSidebarStateAndMargin();
  });

  sidebarToggleBtn?.addEventListener("click", () => {
    sidebarContainer.classList.toggle("collapsed");
    setSidebarStateAndMargin();
  });

  // 사이드바 메뉴 클릭 이벤트 (SPA 동작)
  sidebarMenuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      // 현재는 chat-content만 존재하므로 이 부분은 추후 확장 가능
    });
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

  conversionTypeSelect.addEventListener("change", (e) => {
    selectedConversionType = e.target.value;
    if (selectedConversionType) {
      addMessage(
        `'${selectedConversionType}' 타입으로 변환을 준비합니다.`,
        "ai"
      );
    }
  });

  addMessage("변환할 타입을 선택해주세요: Excel/Google Sheets, SQL", "ai");
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
      all: ".xlsx,.xls,.csv,.sql",
      xlsx: ".xlsx,.xls",
      csv: ".csv",
      sql: ".sql",
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
    const body = isSignup ? { email, password } : { email, password };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

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
    const response = await fetch(`/api/files`, {
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

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`/api/files/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const updatedFiles = await response.json();
    if (!response.ok) throw new Error(updatedFiles.message);

    uploadedFiles = updatedFiles;
    lastSelectedFile = file.name;
    renderFiles();
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
      `/api/files/${encodeURIComponent(originalName)}`,
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
    if (filterVal === "sql") return ext === "sql";
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
  if (extension === "sql") return "fas fa-database";
  return "fas fa-file";
}

function getConversionTypeFromFileExtension(fileName) {
  const extension = fileName.split(".").pop().toLowerCase();
  if (["xlsx", "csv", "xls"].includes(extension)) return "Excel/Google Sheets";
  if (extension === "sql") return "SQL";
  return "";
}

// ==========================================
// 채팅 관련 함수
// ==========================================

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

function sendApiRequest(message, fileName, conversionType) {
  const userInput = document.getElementById("user-input");
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const payload = {
    message,
    fileName,
    conversionType,
  };

  lastUserMessage = message;
  addMessage(message, "user");

  userInput.value = "";
  userInput.style.height = "24px";
  toggleLoadingState(true);

  fetch(`/api/convert`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (!res.ok) throw new Error("API 응답 오류");
      return res.json();
    })
    .then((data) => {
      addMessage(data.result, "ai", lastUserMessage);
    })
    .catch((error) => {
      console.error("API 호출 중 오류 발생:", error);
      addMessage("죄송합니다. API 호출 중 오류가 발생했습니다.", "ai");
    })
    .finally(() => {
      toggleLoadingState(false);
    });
}

function addMessage(text, sender, userMessageForFeedback) {
  const chatMessages = document.getElementById("chat-messages");
  const messageBubble = document.createElement("div");
  messageBubble.classList.add("message-bubble", sender);

  const isFormula =
    sender === "ai" &&
    (text.trim().startsWith("=") ||
      text.toUpperCase().startsWith("SELECT") ||
      text.includes("prop("));

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

function sendFeedback(
  userMessage,
  aiResponse,
  feedback,
  feedbackText,
  container
) {
  container.innerHTML = `<p class="feedback-thanks">피드백 감사합니다!</p>`;
  fetch(`/api/convert/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userMessage,
      aiResponse,
      feedback,
      feedbackText,
      conversionType: selectedConversionType,
    }),
  });
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
