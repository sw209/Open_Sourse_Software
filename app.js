// 전체 코드를 DOMContentLoaded 안에 넣어서
// 스크립트 위치와 무관하게 안전하게 동작하게 한다.
window.addEventListener("DOMContentLoaded", () => {
  const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

  let expectedDeathTime = null;
  let timerId = null;
  let lastSurveyData = null;

  // ===== DOM 요소 =====
  const birthInput = document.getElementById("survey-birth");

  // 타이머
  const livedMain   = document.getElementById("lived-main");
  const livedDays   = document.getElementById("lived-days");
  const livedHours  = document.getElementById("lived-hours");
  const livedMins   = document.getElementById("lived-mins");
  const livedSecs   = document.getElementById("lived-secs");
  const livedYears  = document.getElementById("lived-years");

  const remainMain   = document.getElementById("remain-main");
  const remainYears  = document.getElementById("remain-years");
  const remainDays   = document.getElementById("remain-days");
  const remainHours  = document.getElementById("remain-hours");
  const expDeathDate = document.getElementById("expected-death-date");

  // 요약 카드
  const summaryLivedDays   = document.getElementById("summary-lived-days");
  const summaryLivedHours  = document.getElementById("summary-lived-hours");
  const summaryRemainYears = document.getElementById("summary-remain-years");
  const summaryRemainDays  = document.getElementById("summary-remain-days");
  const summaryHealthRank  = document.getElementById("summary-health-rank");
  const summaryHealthText  = document.getElementById("summary-health-text");

  // 랭킹 카드
  const rankSmokingEl   = document.getElementById("rank-smoking");
  const rankAlcoholEl   = document.getElementById("rank-alcohol");
  const rankSleepEl     = document.getElementById("rank-sleep");
  const rankExerciseEl  = document.getElementById("rank-exercise");

  const rankSmokingText   = document.getElementById("rank-smoking-text");
  const rankAlcoholText   = document.getElementById("rank-alcohol-text");
  const rankSleepText     = document.getElementById("rank-sleep-text");
  const rankExerciseText  = document.getElementById("rank-exercise-text");

  // 재미 카드
  const funMoney     = document.getElementById("fun-money");
  const funBooks     = document.getElementById("fun-books");
  const funSleepDays = document.getElementById("fun-sleep-days");

  // 디버그
  const debug = document.getElementById("survey-debug");

  // 폼
  const form = document.getElementById("lifestyle-form");

  // ===== 생명표 =====
  const lifeTable = [
    { age: 0, ex: 83.5 }, { age: 1, ex: 82.7 }, { age: 5, ex: 78.7 },
    { age: 10, ex: 73.8 }, { age: 15, ex: 68.8 }, { age: 20, ex: 63.9 },
    { age: 25, ex: 59.0 }, { age: 30, ex: 54.1 }, { age: 35, ex: 49.3 },
    { age: 40, ex: 44.4 }, { age: 45, ex: 39.7 }, { age: 50, ex: 35.0 },
    { age: 55, ex: 30.4 }, { age: 60, ex: 25.9 }, { age: 65, ex: 21.5 },
    { age: 70, ex: 17.2 }, { age: 75, ex: 13.2 }, { age: 80, ex: 9.7 },
    { age: 85, ex: 6.8 }, { age: 90, ex: 4.7 }, { age: 95, ex: 3.2 },
    { age: 100, ex: 2.2 }
  ];

  function lookupRemainingYears(ageYears) {
    const n = lifeTable.length;
    if (ageYears <= 0) return lifeTable[0].ex;
    for (let i = 0; i < n - 1; i++) {
      const a = lifeTable[i], b = lifeTable[i + 1];
      if (ageYears >= a.age && ageYears < b.age) {
        const t = (ageYears - a.age) / (b.age - a.age);
        return a.ex + (b.ex - a.ex) * t;
      }
    }
    return lifeTable[n - 1].ex;
  }

  // ===== 유틸 =====
  function getAge(birthStr) {
    if (!birthStr) return null;
    const b = new Date(birthStr + "T00:00:00");
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age;
  }

  // ===== 랭킹 함수 =====
  function rankSmoking(code) {
    switch (code) {
      case "none":   return 100;
      case "rare":   return 40;
      case "light":  return 30;
      case "medium": return 20;
      case "heavy":  return 10;
      default:       return null;
    }
  }

  function rankAlcohol(code) {
    switch (code) {
      case "none":   return 100;
      case "rare":   return 48;
      case "weekly": return 30;
      case "often":  return 13;
      default:       return null;
    }
  }

  function rankSleep(hours, age) {
    if (hours == null || age == null) return null;
    const avg =
      age < 20 ? 8.39 :
      age < 30 ? 8.17 :
      age < 40 ? 8.07 :
      age < 50 ? 7.54 :
      age < 60 ? 7.42 : 8.05;

    const diff = Math.abs(hours - avg);
    if (diff <= 0.5) return 90;
    if (diff <= 1.0) return 75;
    if (diff <= 2.0) return 55;
    if (diff <= 3.0) return 35;
    return 20;
  }

  function rankExercise(hours, gender) {
    if (hours == null) return null;
    if (hours < 1)  return 20;
    if (hours < 3)  return 50;
    if (hours < 5)  return 65;
    if (hours < 7)  return 80;
    return 90;
  }

  // ===== 타이머 =====
  function startTimer() {
    if (timerId) clearInterval(timerId);

    const birthStr = birthInput.value;
    if (!birthStr) {
      livedMain.textContent  = "생년월일을 입력하세요.";
      remainMain.textContent = "생년월일을 입력하세요.";
      return;
    }

    const birthDate = new Date(birthStr + "T00:00:00");
    const now = new Date();
    const ageMs = Math.max(0, now.getTime() - birthDate.getTime());
    const ageYears = ageMs / MS_PER_YEAR;
    const exYears = lookupRemainingYears(ageYears);

    expectedDeathTime = new Date(now.getTime() + exYears * MS_PER_YEAR);

    tick();
    timerId = setInterval(tick, 1000);
  }

  function tick() {
    const birthStr = birthInput.value;
    if (!birthStr || !expectedDeathTime) return;

    const birthDate = new Date(birthStr + "T00:00:00");
    const now = new Date();

    const livedMs  = Math.max(0, now.getTime() - birthDate.getTime());
    const remainMs = Math.max(0, expectedDeathTime.getTime() - now.getTime());

    updateLivedView(livedMs);
    updateRemainView(remainMs);
    updateSummaryCards(livedMs, remainMs);
    updateFunCards(remainMs);
  }

  birthInput.addEventListener("change", startTimer);
  startTimer(); // 초기 호출

  function updateLivedView(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours   = Math.floor(totalMinutes / 60);
    const totalDays    = Math.floor(totalHours / 24);
    const approxYears  = (ms / MS_PER_YEAR).toFixed(6);

    livedMain.textContent = `${totalDays.toLocaleString("ko-KR")}일`;
    livedDays.textContent = totalDays.toLocaleString("ko-KR");
    livedHours.textContent = totalHours.toLocaleString("ko-KR");
    livedMins.textContent  = totalMinutes.toLocaleString("ko-KR");
    livedSecs.textContent  = totalSeconds.toLocaleString("ko-KR");
    livedYears.textContent = `${approxYears} 년`;
  }

  function updateRemainView(ms) {
    const days  = Math.floor(ms / 86400000);
    const hours = Math.floor(ms / 3600000);
    const years = ms / MS_PER_YEAR;

    remainMain.textContent  =
      `${days.toLocaleString("ko-KR")}일 남음`;
    remainDays.textContent  = days.toLocaleString("ko-KR");
    remainHours.textContent = hours.toLocaleString("ko-KR");
    remainYears.textContent = years.toFixed(1);

    const d = new Date(expectedDeathTime);
    expDeathDate.textContent =
      `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  function updateSummaryCards(livedMs, remainMs) {
    const livedDaysVal  = Math.floor(livedMs / 86400000);
    const livedHoursVal = Math.floor(livedMs / 3600000);

    summaryLivedDays.textContent  =
      `${livedDaysVal.toLocaleString("ko-KR")} 일`;
    summaryLivedHours.textContent =
      `${livedHoursVal.toLocaleString("ko-KR")} 시간`;

    const remainYearsVal = remainMs / MS_PER_YEAR;
    const remainDaysVal  = Math.floor(remainMs / 86400000);

    summaryRemainYears.textContent =
      `${remainYearsVal.toFixed(1)} 년`;
    summaryRemainDays.textContent  =
      `${remainDaysVal.toLocaleString("ko-KR")} 일`;

    if (!lastSurveyData) return;

    const pSmoking  = rankSmoking(lastSurveyData.smoking);
    const pAlcohol  = rankAlcohol(lastSurveyData.alcohol);
    const ageYears  = getAge(lastSurveyData.birth);
    const pSleep    = rankSleep(lastSurveyData.sleep_hours, ageYears);
    const pExercise =
      rankExercise(lastSurveyData.exercise_hours_per_week,
                   lastSurveyData.gender);

    const arr = [pSmoking, pAlcohol, pSleep, pExercise]
      .filter(v => typeof v === "number");
    if (!arr.length) return;

    const avg = Math.round(
      arr.reduce((a, b) => a + b, 0) / arr.length
    );

    summaryHealthRank.textContent = `상위 ${avg}%`;
    if (avg >= 70) {
      summaryHealthRank.classList.add("rank-good");
      summaryHealthRank.classList.remove("rank-bad");
      summaryHealthText.textContent =
        "전반적으로 꽤 건강한 생활습관입니다. 👍";
    } else if (avg <= 30) {
      summaryHealthRank.classList.add("rank-bad");
      summaryHealthRank.classList.remove("rank-good");
      summaryHealthText.textContent =
        "몇 가지 습관만 조정해도 건강 랭킹이 확 올라갈 수 있어요.";
    } else {
      summaryHealthRank.classList.remove("rank-good", "rank-bad");
      summaryHealthText.textContent = "평균적인 수준입니다.";
    }
  }

  function updateFunCards(remainMs) {
    const remainHours = remainMs / 3600000;
    const remainDays  = remainMs / 86400000;

    const moneyWon = remainHours * 10000;
    const man = moneyWon / 10000;
    if (man >= 10000) {
      const eok = Math.floor(man / 10000);
      const restMan = Math.floor(man % 10000);
      funMoney.textContent =
        `약 ${eok}억 ${restMan.toLocaleString("ko-KR")}만 원`;
    } else {
      funMoney.textContent =
        `약 ${Math.floor(man).toLocaleString("ko-KR")}만 원`;
    }

    const books = Math.floor(remainHours / 6);
    funBooks.textContent = `${books.toLocaleString("ko-KR")} 권`;

    if (lastSurveyData && typeof lastSurveyData.sleep_hours === "number") {
      const sleepDays =
        remainDays * (lastSurveyData.sleep_hours / 24);
      funSleepDays.textContent =
        `${Math.floor(sleepDays).toLocaleString("ko-KR")} 일`;
    } else {
      funSleepDays.textContent = "-";
    }
  }

  // ===== 설문 submit 처리 =====
  form.addEventListener("submit", (e) => {
    e.preventDefault();          // ❗ 이게 있어서 새로고침 안 됨

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    data.height = Number(data.height);
    data.weight = Number(data.weight);
    data.exercise_hours_per_week = Number(data.exercise_hours_per_week);
    data.sleep_hours = Number(data.sleep_hours);

    lastSurveyData = data;

    const ageYears = getAge(data.birth);

    const pSmoking  = rankSmoking(data.smoking);
    const pAlcohol  = rankAlcohol(data.alcohol);
    const pSleep    = rankSleep(data.sleep_hours, ageYears);
    const pExercise =
      rankExercise(data.exercise_hours_per_week, data.gender);

    rankSmokingEl.textContent   =
      pSmoking  != null ? `상위 ${pSmoking}%`  : "-";
    rankAlcoholEl.textContent   =
      pAlcohol  != null ? `상위 ${pAlcohol}%`  : "-";
    rankSleepEl.textContent     =
      pSleep    != null ? `상위 ${pSleep}%`    : "-";
    rankExerciseEl.textContent  =
      pExercise != null ? `상위 ${pExercise}%` : "-";

    rankSmokingText.textContent =
      pSmoking === 100 ? "비흡연자 그룹입니다." :
      pSmoking <= 20   ? "흡연이 건강에 큰 부담이 될 수 있어요." : "";

    rankAlcoholText.textContent = "";
    rankSleepText.textContent   = "";
    rankExerciseText.textContent = "";

    // 생년월일이 설문에서도 바뀔 수 있으니 다시 타이머 시작
    startTimer();

    debug.textContent = JSON.stringify(data, null, 2);
  });

  console.log("app.js loaded");  // 개발자도구 콘솔에서 이 줄 보이면 스크립트 정상 로드
});
