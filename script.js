// ==========================
// 1. 공통 유틸리티 함수 (전역)
// ==========================

// 텍스트 영역의 내용을 기반으로 높이를 자동 조절합니다.
function autoResizeTextarea(textarea) {
  if (textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }
}

// ==========================
// 2. API 호출 함수 (전역)
// ==========================

// 백엔드 API에 요청.
async function requestFormula(prompt, type) {
  try {
    const response = await fetch("https://backend.beebeeai.kr/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, type }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API 요청 실패: ${response.status} ${response.statusText} - ${
          errorData.error || "알 수 없는 오류"
        }`
      );
    }

    const data = await response.json();
    return data.formula; // 백엔드가 'formula'를 반환하므로 'data.formula' 사용
  } catch (error) {
    console.error("API 호출 중 오류 발생:", error);
    alert(`오류: ${error.message}`); // 사용자에게 오류 메시지 알림
    return "API 호출 실패"; // 오류 발생 시 undefined 대신 오류 메시지 반환
  }
}

// ==========================
// 3. DOMContentLoaded 이벤트 리스너 (모든 DOM 조작 및 이벤트 연결)
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  // 데모 그룹 요소들
  const excelDemoGroup = document.querySelector(".excel-demo-group");
  const sqlDemoGroup = document.querySelector(".sql-demo-group");
  const notionDemoGroup = document.querySelector(".notion-demo-group");
  const centerTextGroup = document.querySelector(".center-text-group"); // 초기 화면 글귀 그룹

  // 상단 내비게이션 링크 요소들
  const navLinks = document.querySelectorAll(".header-nav a");

  // 모바일 메뉴 요소들
  const menuIcon = document.querySelector(".menu-icon");
  const popupOverlay = document.getElementById("popup-overlay");
  const popupClose = document.getElementById("popup-close");
  const popupNavLinks = document.querySelectorAll(
    "#popup-overlay .popup-menu a"
  ); // 팝업 내 링크

  // ======================================
  // 3.1. 데모 그룹 전환 및 활성 링크 업데이트 함수
  // ======================================
  function hideAllDemoGroups() {
    centerTextGroup.style.display = "none";
    excelDemoGroup.style.display = "none";
    sqlDemoGroup.style.display = "none";
    notionDemoGroup.style.display = "none";
  }

  function updateActiveNavLink(currentText) {
    navLinks.forEach((link) => {
      link.classList.remove("active"); // 모든 내비게이션 링크에서 active 클래스 제거
      if (link.textContent.trim() === currentText) {
        link.classList.add("active");
      }
    });
  }

  // 내비게이션 클릭 핸들러
  function handleNavigationClick(linkText) {
    hideAllDemoGroups(); // 모든 데모 그룹 숨김
    updateActiveNavLink(linkText); // 활성 링크 업데이트

    if (linkText === "엑셀/구글시트") {
      excelDemoGroup.style.display = "flex";
    } else if (linkText === "SQL쿼리") {
      sqlDemoGroup.style.display = "flex";
    } else if (linkText === "Notion수식") {
      // HTML 내비게이션 텍스트에 맞춰 Notion수식으로 변경 (이전 Notion함수 -> Notion수식)
      notionDemoGroup.style.display = "flex";
    }
  }

  // ======================================
  // 3.2. 초기 화면 설정 (글귀만 보이도록)
  // ======================================
  // 페이지 로드 시에는 중앙 텍스트 그룹 (글귀)만 표시하고, 다른 데모 그룹은 숨김.
  hideAllDemoGroups(); // 일단 모든 데모 그룹 숨김 (centerTextGroup도 포함됨)
  if (centerTextGroup) {
    // centerTextGroup 요소가 존재하는지 확인
    centerTextGroup.style.display = "flex"; // '글귀'만 보이도록 설정
  }
  updateActiveNavLink(""); // 초기에는 어떤 내비게이션 링크도 'active' 상태가 아니도록 한다.

  // ======================================
  // 3.3. 상단 내비게이션 링크 이벤트 연결
  // (HTML의 onclick 속성은 반드시 제거되어야 합니다!)
  // ======================================
  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault(); // 기본 링크 동작 방지
      const linkText = event.target.textContent.trim();
      handleNavigationClick(linkText);
    });
  });

  // 팝업 메뉴 내 링크에도 동일하게 이벤트 연결
  popupNavLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const linkText = event.target.textContent.trim();
      handleNavigationClick(linkText);
      if (popupOverlay) popupOverlay.style.display = "none"; // 메뉴 클릭 시 팝업 닫기
    });
  });

  // ======================================
  // 3.4. 텍스트 영역 자동 크기 조절 기능 연결
  // ======================================
  const textareas = document.querySelectorAll("textarea"); // 모든 textarea에 적용
  textareas.forEach((textarea) => {
    textarea.addEventListener("input", () => autoResizeTextarea(textarea));
  });

  // ======================================
  // 3.5. 모바일 메뉴 (팝업) 기능 연결
  // ======================================
  menuIcon?.addEventListener("click", () => {
    popupOverlay.style.display = "flex";
  });

  popupClose?.addEventListener("click", () => {
    popupOverlay.style.display = "none";
  });

  popupOverlay?.addEventListener("click", (e) => {
    if (e.target === popupOverlay) {
      popupOverlay.style.display = "none";
    }
  });

  // ======================================
  // 3.6. Excel 데모 그룹 버튼 기능 연결
  // ======================================
  const excelInputField = document.querySelector(".excel-input-field");
  const excelOutputField = document.getElementById("excel-formula-output"); // <p> 태그이므로 .textContent 사용
  // const excelEditButton = document.querySelector(".excel-edit-button"); // '수정' 버튼 제거
  const excelGenerateButton = document.querySelector(".excel-preview-button");
  const excelCopyButton = document.querySelector(".excel-copy-button");

  // Excel 수정 버튼 (제거됨)
  // excelEditButton?.addEventListener("click", async () => { /* ... */ });

  // Excel 생성 버튼
  excelGenerateButton?.addEventListener("click", async () => {
    const userInput = excelInputField.value.trim();
    if (!userInput) {
      excelOutputField.textContent = "수식을 입력해 주세요."; // <p> 태그이므로 .textContent 사용
      return;
    }
    try {
      const formulaText = await requestFormula(userInput, "generate_excel");
      excelOutputField.textContent = formulaText; // <p> 태그이므로 .textContent 사용
    } catch (error) {
      console.error("수식 생성 중 오류:", error);
      excelOutputField.textContent = "오류 발생: " + error.message;
    }
  });

  // Excel 복사 버튼
  excelCopyButton?.addEventListener("click", () => {
    const formulaText = excelOutputField.textContent; // <p> 태그이므로 .textContent 사용
    if (
      !formulaText ||
      formulaText === "수식을 입력해 주세요." ||
      formulaText === "오류 발생: API 호출 실패"
    )
      return;
    navigator.clipboard
      .writeText(formulaText)
      .then(() => alert("수식이 복사되었습니다!"))
      .catch((err) => console.error("복사 실패:", err));
  });

  // ======================================
  // 3.7. SQL 데모 그룹 버튼 기능 연결
  // ======================================
  const sqlInputField = document.querySelector(".sql-input-field");
  const sqlOutputField = document.getElementById("sql-formula-output"); // <p> 태그로 가정
  // const sqlEditButton = document.querySelector(".sql-edit-button"); // '수정' 버튼 제거
  const sqlGenerateButton = document.querySelector(".sql-preview-button");
  const sqlCopyButton = document.querySelector(".sql-copy-button");

  // SQL 수정 버튼 (제거됨)
  // sqlEditButton?.addEventListener("click", async () => { /* ... */ });

  // SQL 생성 버튼
  sqlGenerateButton?.addEventListener("click", async () => {
    const userInput = sqlInputField.value.trim();
    if (!userInput) {
      sqlOutputField.textContent = "쿼리를 입력해 주세요."; // <p> 태그이므로 .textContent 사용
      return;
    }
    try {
      const queryText = await requestFormula(userInput, "generate_sql");
      sqlOutputField.textContent = queryText; // <p> 태그이므로 .textContent 사용
    } catch (error) {
      console.error("쿼리 생성 중 오류:", error);
      sqlOutputField.textContent = "오류 발생: " + error.message;
    }
  });

  // SQL 복사 버튼
  sqlCopyButton?.addEventListener("click", () => {
    const queryText = sqlOutputField.textContent; // <p> 태그이므로 .textContent 사용
    if (
      !queryText ||
      queryText === "쿼리를 입력해 주세요." ||
      queryText === "오류 발생: API 호출 실패"
    )
      return;
    navigator.clipboard
      .writeText(queryText)
      .then(() => alert("쿼리가 복사되었습니다!"))
      .catch((err) => console.error("복사 실패:", err));
  });

  // ======================================
  // 3.8. Notion 데모 그룹 버튼 기능 연결
  // ======================================
  const notionInputField = document.querySelector(".notion-input-field");
  const notionOutputField = document.getElementById("notion-formula-output"); // <p> 태그로 가정
  // const notionEditButton = document.querySelector(".notion-edit-button"); // '수정' 버튼 제거
  const notionGenerateButton = document.querySelector(".notion-preview-button");
  const notionCopyButton = document.querySelector(".notion-copy-button");

  // Notion 수정 버튼 (제거됨)
  // notionEditButton?.addEventListener("click", async () => { /* ... */ });

  // Notion 생성 버튼
  notionGenerateButton?.addEventListener("click", async () => {
    const userInput = notionInputField.value.trim();
    if (!userInput) {
      notionOutputField.textContent = "수식을 입력해 주세요."; // <p> 태그이므로 .textContent 사용
      return;
    }
    try {
      const funcText = await requestFormula(userInput, "generate_notion");
      notionOutputField.textContent = funcText; // <p> 태그이므로 .textContent 사용
    } catch (error) {
      console.error("함수 생성 중 오류:", error);
      notionOutputField.textContent = "오류 발생: " + error.message;
    }
  });

  // Notion 복사 버튼
  notionCopyButton?.addEventListener("click", () => {
    const funcText = notionOutputField.textContent; // <p> 태그이므로 .textContent 사용
    if (
      !funcText ||
      funcText === "수식을 입력해 주세요." ||
      funcText === "오류 발생: API 호출 실패"
    )
      return;
    navigator.clipboard
      .writeText(funcText)
      .then(() => alert("함수가 복사되었습니다!"))
      .catch((err) => console.error("복사 실패:", err));
  });
});
