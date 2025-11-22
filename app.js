window.addEventListener("DOMContentLoaded", () => {

  const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

  let expectedDeathTime = null;
  let timerId = null;
  let lastSurveyData = null;

  // DOM
  const birthInput = document.getElementById("survey-birth");

  // 타이머 요소
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

  // 랭킹 카드
  const rankSmokingEl   = document.getElementById("rank-smoking");
  const rankAlcoholEl   = document.getElementById("rank-alcohol");
  const rankSleepEl     = document.getElementById("rank-sleep");
  const rankExerciseEl  = document.getElementById("rank-exercise");

  const rankSmokingBar   = document.getElementById("rank-smoking-bar");
  const rankAlcoholBar   = document.getElementById("rank-alcohol-bar");
  const rankSleepBar     = document.getElementById("rank-sleep-bar");
  const rankExerciseBar  = document.getElementById("rank-exercise-bar");

  const rankSmokingText   = document.getElementById("rank-smoking-text");
  const rankAlcoholText   = document.getElementById("rank-alcohol-text");
  const rankSleepText     = document.getElementById("rank-sleep-text");
  const rankExerciseText  = document.getElementById("rank-exercise-text");

  // FUN 카드
  const funMoney      = document.getElementById("fun-money");
  const funBooks      = document.getElementById("fun-books");
  const funSleepDays  = document.getElementById("fun-sleep-days");
  const funSleepSub   = document.getElementById("fun-sleep-sub");
  const funKoreaWalks = document.getElementById("fun-korea-walks");
  const funWorldTrips = document.getElementById("fun-world-trips");

  // 디버그
  const debug = document.getElementById("survey-debug");

  const form = document.getElementById("lifestyle-form");

  // 생명표
  const lifeTable = [
    { age:0, ex:83.5}, { age:1, ex:82.7}, { age:5, ex:78.7},
    { age:10, ex:73.8}, { age:15, ex:68.8}, { age:20, ex:63.9},
    { age:25, ex:59.0}, { age:30, ex:54.1}, { age:35, ex:49.3},
    { age:40, ex:44.4}, { age:45, ex:39.7}, { age:50, ex:35.0},
    { age:55, ex:30.4}, { age:60, ex:25.9}, { age:65, ex:21.5},
    { age:70, ex:17.2}, { age:75, ex:13.2}, { age:80, ex:9.7},
    { age:85, ex:6.8}, { age:90, ex:4.7}, { age:95, ex:3.2},
    { age:100, ex:2.2}
  ];

  function lookupRemainingYears(age) {
    for (let i = 0; i < lifeTable.length - 1; i++) {
      const a = lifeTable[i], b = lifeTable[i + 1];
      if (age >= a.age && age < b.age) {
        const t = (age - a.age) / (b.age - a.age);
        return a.ex + (b.ex - a.ex) * t;
      }
    }
    return lifeTable[lifeTable.length - 1].ex;
  }

  // ms → 상세 기간 변환
  function formatDetailedDuration(ms) {
    if (ms < 0) ms = 0;

    const yearMs  = MS_PER_YEAR;
    const monthMs = MS_PER_YEAR / 12;
    const dayMs   = 86400000;
    const hourMs  = 3600000;
    const minMs   = 60000;
    const secMs   = 1000;

    let rest = ms;

    const years   = Math.floor(rest / yearMs);
    rest         -= years * yearMs;

    const months  = Math.floor(rest / monthMs);
    rest         -= months * monthMs;

    const days    = Math.floor(rest / dayMs);
    rest         -= days * dayMs;

    const hours   = Math.floor(rest / hourMs);
    rest         -= hours * hourMs;

    const minutes = Math.floor(rest / minMs);
    rest         -= minutes * minMs;

    const seconds = Math.floor(rest / secMs);

    const pad = (n) => String(n).padStart(2, "0");

    return {
      years, months, days, hours, minutes, seconds,
      text: `${years}년 ${months}개월 ${days}일 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    };
  }

  function getAge(birthStr) {
    if (!birthStr) return null;
    const b = new Date(birthStr + "T00:00:00");
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate()))
      age--;
    return age;
  }

  // 랭킹 계산
  const rankSmoking = (x) =>
    x === "none" ? 100 :
    x === "rare" ? 40 :
    x === "light" ? 30 :
    x === "medium" ? 20 :
    x === "heavy" ? 10 : null;

  const rankAlcohol = (x) =>
    x === "none" ? 100 :
    x === "rare" ? 48 :
    x === "weekly" ? 30 :
    x === "often" ? 13 : null;

  function rankSleep(hours, age) {
    if (!hours || !age) return null;
    const avg =
      age < 20 ? 8.39 :
      age < 30 ? 8.17 :
      age < 40 ? 8.07 :
      age < 50 ? 7.54 :
      age < 60 ? 7.42 : 8.05;

    const diff = Math.abs(hours - avg);
    if (diff <= 0.5) return 90;
    if (diff <= 1) return 75;
    if (diff <= 2) return 55;
    if (diff <= 3) return 35;
    return 20;
  }

  const rankExercise = (hours) =>
    hours < 1 ? 20 :
    hours < 3 ? 50 :
    hours < 5 ? 65 :
    hours < 7 ? 80 : 90;

  // ----------------- 타이머 -----------------
  function startTimer() {
    if (timerId) clearInterval(timerId);

    const birthStr = birthInput.value;
    if (!birthStr) return;

    const birth = new Date(birthStr + "T00:00:00");
    const now = new Date();

    const ageMs = now - birth;
    const ageYears = ageMs / MS_PER_YEAR;

    const exYears = lookupRemainingYears(ageYears);
    expectedDeathTime = new Date(now.getTime() + exYears * MS_PER_YEAR);

    tick();
    timerId = setInterval(tick, 1000);
  }

  function tick() {
    const birthStr = birthInput.value;
    if (!birthStr) return;

    const now = new Date();
    const birth = new Date(birthStr + "T00:00:00");

    const livedMs  = now - birth;
    const remainMs = expectedDeathTime - now;

    updateLivedView(livedMs);
    updateRemainView(remainMs);
    updateFunCards(remainMs);
  }

  birthInput.addEventListener("change", startTimer);
  startTimer();

  function updateLivedView(ms) {
    const d = formatDetailedDuration(ms);
    livedMain.textContent = `지금까지 ${d.text}`;

    const totalSeconds = Math.floor(ms / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours   = Math.floor(totalMinutes / 60);
    const totalDays    = Math.floor(totalHours / 24);
    const approxYears  = (ms / MS_PER_YEAR).toFixed(6);

    livedDays.textContent  = totalDays.toLocaleString("ko-KR");
    livedHours.textContent = totalHours.toLocaleString("ko-KR");
    livedMins.textContent  = totalMinutes.toLocaleString("ko-KR");
    livedSecs.textContent  = totalSeconds.toLocaleString("ko-KR");
    livedYears.textContent = `${approxYears} 년`;
  }

  function updateRemainView(ms) {
    const d = formatDetailedDuration(ms);
    remainMain.textContent = `앞으로 ${d.text}`;

    const days  = Math.floor(ms / 86400000);
    const hours = Math.floor(ms / 3600000);
    const years = ms / MS_PER_YEAR;

    remainDays.textContent  = days.toLocaleString("ko-KR");
    remainHours.textContent = hours.toLocaleString("ko-KR");
    remainYears.textContent = years.toFixed(1);

    const dt = new Date(expectedDeathTime);
    expDeathDate.textContent =
      `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`;
  }

  // ---------------- FUN Cards -----------------
  function updateFunCards(remainMs) {
    const remainHours = remainMs / 3600000;
    const remainDays  = remainMs / 86400000;

    if (remainMs <= 0) {
      funMoney.textContent      = "-";
      funBooks.textContent      = "-";
      funSleepDays.textContent  = "-";
      funKoreaWalks.textContent = "-";
      funWorldTrips.textContent = "-";
      return;
    }

    // (1) 최저시급 돈
    const wage = 10030;
    const moneyWon = remainHours * wage;
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

    // (2) 책
    const books = Math.floor(remainHours / 6);
    funBooks.textContent = `${books.toLocaleString("ko-KR")} 권`;

    // (3) 꿀잠
    if (lastSurveyData && lastSurveyData.sleep_hours) {
      const s = lastSurveyData.sleep_hours;
      const sleepDays = remainDays * (s / 24);
      funSleepDays.textContent = `${Math.floor(sleepDays)} 일`;
      funSleepSub.textContent = `하루 ${s}시간 수면 기준`;
    } else {
      funSleepDays.textContent = "-";
      funSleepSub.textContent  = "설문 수면시간 기준";
    }

    // (4) 국토대장정 = 20일
    const koreaWalk = Math.floor(remainDays / 20);
    funKoreaWalks.textContent = `${koreaWalk} 회`;

    // (5) 세계일주 = 90일
    const worldTrip = Math.floor(remainDays / 90);
    funWorldTrips.textContent = `${worldTrip} 회`;
  }

  // ---------------- 설문 Submit -----------------

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    data.height = Number(data.height);
    data.weight = Number(data.weight);
    data.exercise_hours_per_week = Number(data.exercise_hours_per_week);
    data.sleep_hours = Number(data.sleep_hours);

    lastSurveyData = data;

    const age = getAge(data.birth);

    const pSmoking  = rankSmoking(data.smoking);
    const pAlcohol  = rankAlcohol(data.alcohol);
    const pSleep    = rankSleep(data.sleep_hours, age);
    const pExercise = rankExercise(data.exercise_hours_per_week);

    rankSmokingEl.textContent   = pSmoking  != null ? `상위 ${pSmoking}%` : "-";
    rankAlcoholEl.textContent   = pAlcohol  != null ? `상위 ${pAlcohol}%` : "-";
    rankSleepEl.textContent     = pSleep    != null ? `상위 ${pSleep}%`  : "-";
    rankExerciseEl.textContent  = pExercise != null ? `상위 ${pExercise}%`: "-";

    if (pSmoking  != null) rankSmokingBar.style.width   = `${pSmoking}%`;
    if (pAlcohol  != null) rankAlcoholBar.style.width   = `${pAlcohol}%`;
    if (pSleep    != null) rankSleepBar.style.width     = `${pSleep}%`;
    if (pExercise != null) rankExerciseBar.style.width  = `${pExercise}%`;

    startTimer();
    debug.textContent = JSON.stringify(data, null, 2);
  });

});
