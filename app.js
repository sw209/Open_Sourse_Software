window.addEventListener("DOMContentLoaded", () => {

  const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

  let expectedDeathTime = null;
  let timerId = null;
  let lastSurveyData = null;

  // ---- 공통 DOM ----
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

  // FUN 카드
  const funMoney      = document.getElementById("fun-money");
  const funBooks      = document.getElementById("fun-books");
  const funSleepDays  = document.getElementById("fun-sleep-days");
  const funSleepSub   = document.getElementById("fun-sleep-sub");
  const funKoreaWalks = document.getElementById("fun-korea-walks");
  const funWorldTrips = document.getElementById("fun-world-trips");

  // 신체 건강(BMI)
  const healthBMI          = document.getElementById("health-bmi");
  const healthBMICategory  = document.getElementById("health-bmi-category");
  const healthWeightRange  = document.getElementById("health-weight-range");
  const healthComment      = document.getElementById("health-comment");

  // 워라벨(밸런스) 표시
  const balanceSleep      = document.getElementById("balance-sleep");
  const balanceWork       = document.getElementById("balance-work");
  const balanceSelf       = document.getElementById("balance-self");
  const balanceLeisure    = document.getElementById("balance-leisure");
  const balanceSleepBar   = document.getElementById("balance-sleep-bar");
  const balanceWorkBar    = document.getElementById("balance-work-bar");
  const balanceSelfBar    = document.getElementById("balance-self-bar");
  const balanceLeisureBar = document.getElementById("balance-leisure-bar");
  const balanceComment    = document.getElementById("balance-comment");

  // 생활습관 랭킹
  const rankSmokingEl   = document.getElementById("rank-smoking");
  const rankAlcoholEl   = document.getElementById("rank-alcohol");
  const rankSleepEl     = document.getElementById("rank-sleep");
  const rankExerciseEl  = document.getElementById("rank-exercise");
  const rankSmokingBar  = document.getElementById("rank-smoking-bar");
  const rankAlcoholBar  = document.getElementById("rank-alcohol-bar");
  const rankSleepBar    = document.getElementById("rank-sleep-bar");
  const rankExerciseBar = document.getElementById("rank-exercise-bar");

  const debug = document.getElementById("survey-debug");
  const form  = document.getElementById("lifestyle-form");

  // ---- 생명표 ----
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

  // ---- 유틸 ----
  function formatDetailedDuration(ms) {
    if (ms < 0) ms = 0;

    const yearMs  = MS_PER_YEAR;
    const monthMs = MS_PER_YEAR / 12;
    const dayMs   = 86400000;
    const hourMs  = 3600000;
    const minMs   = 60000;
    const secMs   = 1000;

    let rest = ms;

    const years   = Math.floor(rest / yearMs);  rest -= years * yearMs;
    const months  = Math.floor(rest / monthMs); rest -= months * monthMs;
    const days    = Math.floor(rest / dayMs);   rest -= days * dayMs;
    const hours   = Math.floor(rest / hourMs);  rest -= hours * hourMs;
    const minutes = Math.floor(rest / minMs);   rest -= minutes * minMs;
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
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age;
  }

  // ---- 생활습관 점수(0~100, 높을수록 좋음) ----
  const scoreSmoking = (x) =>
    x === "none"   ? 100 :
    x === "rare"   ? 70 :
    x === "light"  ? 50 :
    x === "medium" ? 30 :
    x === "heavy"  ? 10 : null;

  const scoreAlcohol = (x) =>
    x === "none"   ? 100 :
    x === "rare"   ? 70 :
    x === "weekly" ? 50 :
    x === "often"  ? 20 : null;

  function scoreSleep(hours, age) {
    if (!hours || !age) return null;
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

  const scoreExercise = (hours) =>
    hours < 1 ? 20 :
    hours < 3 ? 50 :
    hours < 5 ? 70 :
    hours < 7 ? 85 : 95;

  // 점수 → 상위 % (낮을수록 좋음)
  function scoreToUpperPercent(score) {
    if (score == null) return null;
    const upper = 101 - score; // 점수 100 → 상위 1%
    return Math.max(1, Math.min(99, Math.round(upper)));
  }

  // ---- 타이머 ----
  function startTimer() {
    if (timerId) clearInterval(timerId);

    const birthStr = birthInput.value;
    if (!birthStr) return;

    const birth = new Date(birthStr + "T00:00:00");
    const now = new Date();

    const ageMs = now - birth;
    const ageYears = ageMs / MS_PER_YEAR;
    const exYears  = lookupRemainingYears(ageYears);

    expectedDeathTime = new Date(now.getTime() + exYears * MS_PER_YEAR);

    tick();
    timerId = setInterval(tick, 1000);
  }

  function tick() {
    const birthStr = birthInput.value;
    if (!birthStr || !expectedDeathTime) return;

    const now   = new Date();
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

  // ---- FUN 카드 ----
  function updateFunCards(remainMs) {
    const remainHours = remainMs / 3600000;
    const remainDays  = remainMs / 86400000;

    if (remainMs <= 0) {
      funMoney.textContent      = "-";
      funBooks.textContent      = "-";
      funSleepDays.textContent  = "-";
      funKoreaWalks.textContent = "-";
      funWorldTrips.textContent = "-";
      funSleepSub.textContent   = "";
      return;
    }

    // 1) 최저시급
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

    // 2) 책 (1권=6시간)
    const books = Math.floor(remainHours / 6);
    funBooks.textContent = `${books.toLocaleString("ko-KR")} 권`;

    // 3) 꿀잠
    if (lastSurveyData && lastSurveyData.sleep_hours) {
      const s = lastSurveyData.sleep_hours;
      const sleepDays = remainDays * (s / 24);
      funSleepDays.textContent = `${Math.floor(sleepDays)} 일`;
      funSleepSub.textContent  = `하루 ${s}시간 수면 기준`;
    } else {
      funSleepDays.textContent = "-";
      funSleepSub.textContent  = "설문 수면시간 기준";
    }

    // 4) 국토대장정 = 20일
    const koreaWalk = Math.floor(remainDays / 20);
    funKoreaWalks.textContent = `${koreaWalk} 회`;

    // 5) 세계일주 = 90일
    const worldTrip = Math.floor(remainDays / 90);
    funWorldTrips.textContent = `${worldTrip} 회`;
  }

  // ---- 신체 건강: BMI ----
  function updatePhysicalHealth(data) {
    const h = data.height;
    const w = data.weight;

    if (!h || !w) {
      healthBMI.textContent         = "-";
      healthBMICategory.textContent = "";
      healthWeightRange.textContent = "-";
      healthComment.textContent     = "";
      return;
    }

    const m = h / 100;
    const bmi = w / (m * m);
    healthBMI.textContent = bmi.toFixed(1);

    let category, comment;
    if (bmi < 18.5) {
      category = "저체중";
      comment  = "영양 상태와 체중을 조금 더 늘릴 필요가 있을 수 있습니다.";
    } else if (bmi < 23) {
      category = "정상 범위";
      comment  = "신체 건강 측면에서는 좋은 범위입니다. 이 상태를 유지해보세요!";
    } else if (bmi < 25) {
      category = "과체중(주의)";
      comment  = "약간 높은 편입니다. 식습관과 활동량을 점검해보는 것도 좋습니다.";
    } else if (bmi < 30) {
      category = "비만 1단계";
      comment  = "건강 위험이 증가할 수 있는 구간입니다. 체중 관리 전략을 고민해보세요.";
    } else {
      category = "비만 2단계 이상";
      comment  = "의료진과 상의하여 체중/생활습관 관리를 하는 것을 권장합니다.";
    }

    healthBMICategory.textContent = category;
    healthComment.textContent     = comment;

    // 정상 BMI(18.5~23) 기준 체중 범위
    const minW = 18.5 * m * m;
    const maxW = 23.0 * m * m;
    healthWeightRange.textContent =
      `${minW.toFixed(1)} ~ ${maxW.toFixed(1)} kg`;
  }

  // ---- 삶의 밸런스(워라벨) ----
  function updateBalance(data) {
    const sleep   = data.sleep_hours;
    const work    = data.work_hours_per_day;
    const selfdev = data.selfdev_hours_per_day;
    const leisure = data.leisure_hours_per_day;

    const arr = [sleep, work, selfdev, leisure];
    if (arr.some(v => v == null || isNaN(v))) {
      balanceSleep.textContent   = "-";
      balanceWork.textContent    = "-";
      balanceSelf.textContent    = "-";
      balanceLeisure.textContent = "-";
      balanceSleepBar.style.width   =
      balanceWorkBar.style.width    =
      balanceSelfBar.style.width    =
      balanceLeisureBar.style.width = "0%";
      balanceComment.textContent = "";
      return;
    }

    const total = sleep + work + selfdev + leisure;
    if (total <= 0) {
      return;
    }

    const pSleep   = Math.round((sleep   / total) * 100);
    const pWork    = Math.round((work    / total) * 100);
    const pSelf    = Math.round((selfdev / total) * 100);
    const pLeisure = Math.round((leisure / total) * 100);

    balanceSleep.textContent   = `${pSleep}%`;
    balanceWork.textContent    = `${pWork}%`;
    balanceSelf.textContent    = `${pSelf}%`;
    balanceLeisure.textContent = `${pLeisure}%`;

    balanceSleepBar.style.width   = `${pSleep}%`;
    balanceWorkBar.style.width    = `${pWork}%`;
    balanceSelfBar.style.width    = `${pSelf}%`;
    balanceLeisureBar.style.width = `${pLeisure}%`;

    // 코멘트: 대략적인 기준
    const totalWithSleep = sleep + work + selfdev + leisure;
    let comment = "";

    if (Math.abs(totalWithSleep - 24) > 2) {
      comment += `입력된 총 시간이 ${totalWithSleep.toFixed(1)}시간으로, 24시간과 꽤 차이가 있습니다. (상대 비율만 참고하세요)\n`;
    }

    if (pWork >= 50) {
      comment += "일/학업 비중이 매우 높습니다. 여가와 휴식을 조금 더 확보하는 것을 고려해봐도 좋겠습니다.\n";
    } else if (pLeisure < 10) {
      comment += "여가/휴식 시간이 상당히 적습니다. 최소 하루 1~2시간 정도의 완전한 휴식도 중요합니다.\n";
    } else if (pSleep < 25) {
      comment += "수면 비율이 다소 낮은 편입니다. 수면 시간을 조금 늘리는 것을 고려해보세요.\n";
    } else {
      comment += "전반적으로 균형 잡힌 하루 구조에 가깝습니다. 이 패턴을 유지하면 좋겠어요.";
    }

    balanceComment.textContent = comment.trim();
  }

  // ---- 설문 Submit ----
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    data.height = Number(data.height);
    data.weight = Number(data.weight);
    data.exercise_hours_per_week = Number(data.exercise_hours_per_week);
    data.sleep_hours            = Number(data.sleep_hours);
    data.work_hours_per_day     = Number(data.work_hours_per_day);
    data.selfdev_hours_per_day  = Number(data.selfdev_hours_per_day);
    data.leisure_hours_per_day  = Number(data.leisure_hours_per_day);

    lastSurveyData = data;

    const age = getAge(data.birth);

    // 생활습관 점수
    const sSmoking   = scoreSmoking(data.smoking);
    const sAlcohol   = scoreAlcohol(data.alcohol);
    const sSleep     = scoreSleep(data.sleep_hours, age);
    const sExercise  = scoreExercise(data.exercise_hours_per_week);

    const uSmoking   = scoreToUpperPercent(sSmoking);
    const uAlcohol   = scoreToUpperPercent(sAlcohol);
    const uSleep     = scoreToUpperPercent(sSleep);
    const uExercise  = scoreToUpperPercent(sExercise);

    // 랭킹 텍스트
    rankSmokingEl.textContent  = uSmoking  != null ? `상위 ${uSmoking}%`  : "-";
    rankAlcoholEl.textContent  = uAlcohol  != null ? `상위 ${uAlcohol}%`  : "-";
    rankSleepEl.textContent    = uSleep    != null ? `상위 ${uSleep}%`    : "-";
    rankExerciseEl.textContent = uExercise != null ? `상위 ${uExercise}%` : "-";

    // 랭킹 막대 (점수 기준, 높을수록 길게)
    if (sSmoking  != null) rankSmokingBar.style.width  = `${sSmoking}%`;
    if (sAlcohol  != null) rankAlcoholBar.style.width  = `${sAlcohol}%`;
    if (sSleep    != null) rankSleepBar.style.width    = `${sSleep}%`;
    if (sExercise != null) rankExerciseBar.style.width = `${sExercise}%`;

    // 신체 건강 / 워라벨 업데이트
    updatePhysicalHealth(data);
    updateBalance(data);

    // 타이머 갱신
    startTimer();

    debug.textContent = JSON.stringify(data, null, 2);
  });

});
