// ==========================
// 1. 공통 유틸리티 함수 (전역)
// ==========================

// 텍스트 영역의 내용을 기반으로 높이를 자동 조절합니다.
function autoResizeTextarea(textarea) {
  if (textarea) {
    // 요소가 존재하는지 확인
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }
}

// ==========================
// 2. API 호출 함수 (전역)
// ==========================

// 백엔드 API에 요청을 보냅니다.
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
    // 백엔드가 `{"formula": "..."}`를 보내므로 `data.formula`를 반환합니다.
    return data.formula; // 수정된 부분
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
  // 데모 그룹 요소들 (초기화 시 숨김)
  const excelDemoGroup = document.querySelector(".excel-demo-group");
  const sqlDemoGroup = document.querySelector(".sql-demo-group");
  const notionDemoGroup = document.querySelector(".notion-demo-group");
  const centerTextGroup = document.querySelector(".center-text-group");

  // 상단 내비게이션 링크 요소들
  const navLinks = document.querySelectorAll(".header-nav a");

  // 모바일 메뉴 요소들
  const menuIcon = document.querySelector(".menu-icon");
  const popupOverlay = document.getElementById("popup-overlay");
  const popupClose = document.getElementById("popup-close");

  // ======================================
  // 3.1. 데모 그룹 전환 함수 (DOMContentLoaded 내부 정의)
  // ======================================
  function hideAllDemoGroups() {
    centerTextGroup.style.display = "none";
    excelDemoGroup.style.display = "none";
    sqlDemoGroup.style.display = "none";
    notionDemoGroup.style.display = "none";
  }

  function updateActiveNavLink(currentText) {
    navLinks.forEach((link) => {
      if (link.textContent.trim() === currentText) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  // 초기 로딩 시 엑셀 데모 표시 및 활성 링크 설정
  hideAllDemoGroups();
  excelDemoGroup.style.display = "flex"; // 초기에는 Excel 데모만 표시
  updateActiveNavLink("엑셀/구글시트");

  // ======================================
  // 3.2. 상단 내비게이션 링크 이벤트 연결
  // ======================================
  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault(); // 기본 링크 동작 방지
      const linkText = event.target.textContent.trim();

      hideAllDemoGroups(); // 모든 데모 그룹 숨김
      updateActiveNavLink(linkText); // 활성 링크 업데이트

      if (linkText === "엑셀/구글시트") {
        excelDemoGroup.style.display = "flex";
      } else if (linkText === "SQL쿼리") {
        sqlDemoGroup.style.display = "flex";
      } else if (linkText === "Notion함수") {
        notionDemoGroup.style.display = "flex";
      }
      // 모바일 팝업 메뉴도 닫기 (있다면)
      if (popupOverlay) popupOverlay.style.display = "none";
    });
  });

  // ======================================
  // 3.3. 텍스트 영역 자동 크기 조절 기능 연결
  // ======================================
  const textareas = document.querySelectorAll("textarea"); // 모든 textarea에 적용
  textareas.forEach((textarea) => {
    textarea.addEventListener("input", () => autoResizeTextarea(textarea));
  });

  // ======================================
  // 3.4. 모바일 메뉴 (팝업) 기능 연결
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
  // 3.5. Excel 데모 그룹 버튼 기능 연결
  // ======================================
  const excelInputField = document.querySelector(".excel-input-field");
  const excelOutputField = document.getElementById("excel-formula-output");
  const excelEditButton = document.querySelector(".excel-edit-button");
  const excelGenerateButton = document.querySelector(".excel-preview-button");
  const excelCopyButton = document.querySelector(".excel-copy-button");

  // Excel 수정 버튼
  excelEditButton?.addEventListener("click", async () => {
    const userInput = excelInputField.value.trim();
    if (!userInput) return;
    try {
      const responseText = await requestFormula(userInput, "edit");
      excelInputField.value = responseText;
      autoResizeTextarea(excelInputField);
    } catch (error) {
      console.error("수정 중 오류:", error);
      excelInputField.value = "오류 발생: " + error.message;
    }
  });

  // Excel 생성 버튼
  excelGenerateButton?.addEventListener("click", async () => {
    const userInput = excelInputField.value.trim();
    if (!userInput) {
      excelOutputField.value = "수식을 입력해 주세요.";
      return;
    }
    try {
      const formulaText = await requestFormula(userInput, "generate_excel");
      excelOutputField.value = formulaText;
    } catch (error) {
      console.error("수식 생성 중 오류:", error);
      excelOutputField.value = "오류 발생: " + error.message;
    }
  });

  // Excel 복사 버튼
  excelCopyButton?.addEventListener("click", () => {
    const formulaText = excelOutputField.value; // .value 사용
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
  // 3.6. SQL 데모 그룹 버튼 기능 연결
  // ======================================
  const sqlInputField = document.querySelector(".sql-input-field");
  const sqlOutputField = document.getElementById("sql-formula-output");
  const sqlEditButton = document.querySelector(".sql-edit-button");
  const sqlGenerateButton = document.querySelector(".sql-preview-button");
  const sqlCopyButton = document.querySelector(".sql-copy-button");

  // SQL 수정 버튼
  sqlEditButton?.addEventListener("click", async () => {
    const userInput = sqlInputField.value.trim();
    if (!userInput) return;
    try {
      const responseText = await requestFormula(userInput, "edit");
      sqlInputField.value = responseText;
      autoResizeTextarea(sqlInputField);
    } catch (error) {
      console.error("수정 중 오류:", error);
      sqlInputField.value = "오류 발생: " + error.message;
    }
  });

  // SQL 생성 버튼
  sqlGenerateButton?.addEventListener("click", async () => {
    const userInput = sqlInputField.value.trim();
    if (!userInput) {
      sqlOutputField.value = "쿼리를 입력해 주세요."; // .value 사용
      return;
    }
    try {
      const queryText = await requestFormula(userInput, "generate_sql");
      sqlOutputField.value = queryText;
    } catch (error) {
      console.error("쿼리 생성 중 오류:", error);
      sqlOutputField.value = "오류 발생: " + error.message;
    }
  });

  // SQL 복사 버튼
  sqlCopyButton?.addEventListener("click", () => {
    const queryText = sqlOutputField.value; // .value 사용
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
  // 3.7. Notion 데모 그룹 버튼 기능 연결
  // ======================================
  const notionInputField = document.querySelector(".notion-input-field");
  const notionOutputField = document.getElementById("notion-formula-output");
  const notionEditButton = document.querySelector(".notion-edit-button");
  const notionGenerateButton = document.querySelector(".notion-preview-button");
  const notionCopyButton = document.querySelector(".notion-copy-button");

  // Notion 수정 버튼
  notionEditButton?.addEventListener("click", async () => {
    const userInput = notionInputField.value.trim();
    if (!userInput) return;
    try {
      const responseText = await requestFormula(userInput, "edit");
      notionInputField.value = responseText;
      autoResizeTextarea(notionInputField);
    } catch (error) {
      console.error("수정 중 오류:", error);
      notionInputField.value = "오류 발생: " + error.message;
    }
  });

  // Notion 생성 버튼
  notionGenerateButton?.addEventListener("click", async () => {
    const userInput = notionInputField.value.trim();
    if (!userInput) {
      notionOutputField.value = "함수를 입력해 주세요."; // .value 사용
      return;
    }
    try {
      const funcText = await requestFormula(userInput, "generate_notion");
      notionOutputField.value = funcText;
    } catch (error) {
      console.error("함수 생성 중 오류:", error);
      notionOutputField.value = "오류 발생: " + error.message;
    }
  });

  // Notion 복사 버튼
  notionCopyButton?.addEventListener("click", () => {
    const funcText = notionOutputField.value; // .value 사용
    if (
      !funcText ||
      funcText === "함수를 입력해 주세요." ||
      funcText === "오류 발생: API 호출 실패"
    )
      return;
    navigator.clipboard
      .writeText(funcText)
      .then(() => alert("함수가 복사되었습니다!"))
      .catch((err) => console.error("복사 실패:", err));
  });
});
