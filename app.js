// ============================
// 전역 상태
// ============================
let lifestyleModel = [];
let healthModel = {};
let lifeDonutChart = null;
let liveTimerInterval = null;
let lifeExpectTimerInterval = null;

// ============================
// JSON 모델 로드
// ============================
async function loadModels() {
    try {
        lifestyleModel = await fetch("lifestyle_model.json").then(r => r.json());
    } catch (e) {
        console.warn("lifestyle_model.json 로드 실패", e);
        lifestyleModel = [];
    }
    try {
        healthModel = await fetch("health_score_model.json").then(r => r.json());
    } catch (e) {
        console.warn("health_score_model.json 로드 실패", e);
        healthModel = { bias: 0, Age: 0, BMI: 0, weekly_hours: 0 };
    }
}

// ============================
// 유틸 함수
// ============================
function calcBMI(weight, heightM) {
    if (!weight || !heightM) return NaN;
    return weight / (heightM * heightM);
}

// 두 Date 사이 경과 시각을 구성요소로 반환
function diffComponents(start, end) {
    let delta = end - start;
    if (delta < 0) delta = 0;

    const totalSeconds = Math.floor(delta / 1000);

    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    const totalDays = Math.floor(totalHours / 24);

    const years = Math.floor(totalDays / 365.25);
    const daysLeft = totalDays - Math.floor(years * 365.25);
    const months = Math.floor(daysLeft / 30.4);
    const days = Math.floor(daysLeft - months * 30.4);

    return { years, months, days, hours, minutes, seconds, totalDays, totalHours };
}

function formatDiff(dc) {
    return `${dc.years}년 ${dc.months}개월 ${dc.days}일 ` +
           `${String(dc.hours).padStart(2, "0")}:${String(dc.minutes).padStart(2, "0")}:${String(dc.seconds).padStart(2, "0")}`;
}

// 기대수명(한국) – 대략적인 값
function getLifeExpectancyYears(gender) {
    // 아주 단순한 값 (필요하면 통계청 표 기반으로 조정 가능)
    return gender === "female" ? 86 : 80;
}

// ============================
// 라이프스타일 타입 분석
// ============================
function getLifestyleType(userBMI, weeklyHours) {
    if (!lifestyleModel || lifestyleModel.length === 0 || isNaN(userBMI)) {
        return null;
    }
    let best = null;
    let bestDist = Infinity;

    lifestyleModel.forEach(c => {
        const d1 = userBMI - c.BMI;
        const d2 = weeklyHours - c.weekly_hours;
        const dist = Math.sqrt(d1*d1 + d2*d2);
        if (dist < bestDist) {
            bestDist = dist;
            best = c;
        }
    });

    return best;
}

const lifestyleDescriptions = {
    0: {
        name: "슬림 활동형",
        desc: "가벼운 체형과 적당한 활동량을 가진 타입입니다. 근력 강화와 충분한 영양 섭취가 도움이 됩니다."
    },
    1: {
        name: "밸런스 활동형",
        desc: "가장 이상적인 패턴에 가까운 타입입니다. 지금 습관을 꾸준히 유지하는 것이 가장 중요합니다."
    },
    2: {
        name: "운동하는 고BMI형",
        desc: "BMI는 높지만 운동을 꾸준히 하는 타입입니다. 식단 조절과 수면 개선이 체중 관리에 큰 도움이 됩니다."
    },
    3: {
        name: "고위험 비만형",
        desc: "장기적인 건강을 위해 라이프스타일 변경이 필요한 타입입니다. 작은 변화부터 시작해 보는 걸 추천합니다."
    }
};

// ============================
// AI 건강 점수
// ============================
function computeAIHealthScore(age, bmi, weeklyHours) {
    if (!healthModel) return 0;
    const pred =
        healthModel.bias +
        healthModel.Age * age +
        healthModel.BMI * bmi +
        healthModel.weekly_hours * weeklyHours;

    // 대략 0~5 사이의 rating으로 가정하고 0~100으로 스케일링
    let score = pred * 20;
    score = Math.max(0, Math.min(100, score));
    return Math.round(score);
}

// 생활 습관 점수 → 0~100
function scoreSleep(hours) {
    if (!hours && hours !== 0) return 0;
    const ideal = 8;
    const diff = Math.abs(hours - ideal);
    let s = 100 - diff * 15;
    if (hours <= 4 || hours >= 12) s -= 20;
    return Math.max(0, Math.min(100, s));
}

function scoreExercise(weeklyHours) {
    if (!weeklyHours && weeklyHours !== 0) return 0;
    if (weeklyHours <= 0) return 10;
    if (weeklyHours >= 7) return 95;
    return 40 + weeklyHours * 8; // 1h →48, 5h→80 정도
}

function scoreSmoking(smoking) {
    switch (smoking) {
        case "none": return 95;
        case "rare": return 80;
        case "light": return 60;
        case "medium": return 40;
        case "heavy": return 20;
        default: return 50;
    }
}

function scoreAlcohol(alcohol) {
    switch (alcohol) {
        case "none": return 95;
        case "rare": return 80;
        case "weekly": return 60;
        case "often": return 35;
        default: return 50;
    }
}

// 점수 → "상위/하위" 문자열
function rankText(score) {
    const upper = 100 - score;
    if (score >= 80) return `상위 ${Math.max(1, Math.round(upper / 2))}%`;
    if (score >= 60) return `상위 ${Math.round(upper)}%`;
    if (score >= 40) return `하위 ${Math.round(100 - upper / 2)}%`;
    return `하위 ${Math.round(100 - score)}%`;
}

// ============================
// 삶의 밸런스
// ============================
function updateBalanceChart(work, leisure, rest) {
    const container = document.getElementById("balance-chart");
    const descEl = document.getElementById("balance-desc");

    container.innerHTML = "";

    const total = (work || 0) + (leisure || 0) + (rest || 0);
    if (!total) {
        descEl.textContent = "일 / 여가 / 휴식 시간을 입력하면 균형을 분석해 드립니다.";
        return;
    }

    const workPct = (work / total) * 100;
    const leisurePct = (leisure / total) * 100;
    const restPct = (rest / total) * 100;

    const segWork = document.createElement("div");
    segWork.className = "balance-segment balance-work";
    segWork.style.width = `${workPct}%`;

    const segLeisure = document.createElement("div");
    segLeisure.className = "balance-segment balance-leisure";
    segLeisure.style.width = `${leisurePct}%`;

    const segRest = document.createElement("div");
    segRest.className = "balance-segment balance-rest";
    segRest.style.width = `${restPct}%`;

    container.appendChild(segWork);
    container.appendChild(segLeisure);
    container.appendChild(segRest);

    let msg = `일/공부 ${workPct.toFixed(0)}%, 여가 ${leisurePct.toFixed(0)}%, 휴식 ${restPct.toFixed(0)}%. `;
    if (workPct > 50) msg += "일 비중이 높습니다. 여가와 휴식 시간을 조금 늘려보는 건 어떨까요?";
    else if (leisurePct > 40) msg += "여가를 충분히 즐기고 있습니다. 일과 휴식 리듬만 무너지지 않도록 주의해 주세요.";
    else if (restPct > 40) msg += "휴식 비중이 높은 편입니다. 가벼운 활동이나 자기개발을 추가해보는 것도 좋습니다.";
    else msg += "전반적으로 균형 잡힌 하루를 보내고 있네요.";

    descEl.textContent = msg;
}

// ============================
// 남은 시간으로 할 수 있는 일
// ============================
function updateRemainingActivities(remainingDiff) {
    const list = document.getElementById("remaining-activities");
    list.innerHTML = "";

    const days = remainingDiff.totalDays;
    if (!days) {
        list.innerHTML = "<li>이미 기대수명 이상을 살아온 전설적인 생존자입니다. 🎉</li>";
        return;
    }

    const hours = remainingDiff.totalHours;

    // 아주 단순한 가정들
    const minWage = 9860;           // 시급(원) – 대략적인 값
    const workingHours = hours * 0.4; // 남은 시간 중 40%를 일한다고 가정
    const possibleEarning = (workingHours * minWage) / 10000; // 만원 단위

    const books = Math.floor(days / 7);           // 주 1권
    const sleepNights = Math.floor(days * 0.35);  // 1/3 정도 잠
    const crossCountry = Math.floor(days / 20);   // 20일에 1번
    const worldTrips = Math.floor(days / 60);     // 60일에 1번

    const items = [
        `일만 한다면 약 ${possibleEarning.toFixed(0)}만 원 정도 벌 수 있는 시간입니다.`,
        `앞으로 책을 ${books}권 정도 읽을 수 있습니다.`,
        `꿀잠을 잘 수 있는 밤이 약 ${sleepNights}일 남아 있습니다.`,
        `국토대장정을 ${crossCountry}번 정도 할 수 있는 시간입니다.`,
        `세계일주를 ${worldTrips}번 정도 다녀올 수 있는 시간입니다.`
    ];

    items.forEach(t => {
        const li = document.createElement("li");
        li.textContent = t;
        list.appendChild(li);
    });
}

// ============================
// 도넛 차트
// ============================
function renderLifeDonut(livedYears, expectYears) {
    const canvas = document.getElementById("lifeDonutChart");
    const ctx = canvas.getContext("2d");

    if (lifeDonutChart) lifeDonutChart.destroy();

    const lived = Math.max(0, Math.min(expectYears, livedYears));
    const remaining = Math.max(0, expectYears - lived);

    lifeDonutChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["살아온 시간", "남은 시간"],
            datasets: [{
                data: [lived, remaining],
                backgroundColor: ["#6a8bff", "#d0dbff"],
                borderWidth: 0
            }]
        },
        options: {
            cutout: "65%",
            plugins: { legend: { display: false } }
        }
    });

    const label = document.getElementById("donut-label");
    label.textContent = `전체 기대 수명 ${expectYears.toFixed(1)}년 기준`;
}

// ============================
// 생활 습관 랭킹
// ============================
function updateHabitRankings(sleepHours, weeklyHours, smoking, alcohol) {
    const container = document.getElementById("habit-rankings");
    container.innerHTML = "";

    const items = [
        {
            key: "sleep",
            label: "수면",
            score: scoreSleep(sleepHours)
        },
        {
            key: "exercise",
            label: "운동",
            score: scoreExercise(weeklyHours)
        },
        {
            key: "smoking",
            label: "흡연",
            score: scoreSmoking(smoking)
        },
        {
            key: "alcohol",
            label: "음주",
            score: scoreAlcohol(alcohol)
        }
    ];

    items.forEach(item => {
        const row = document.createElement("div");
        row.className = "habit-row";

        const label = document.createElement("div");
        label.className = "habit-label";
        label.textContent = item.label;

        const barTrack = document.createElement("div");
        barTrack.className = "habit-bar-track";

        const barFill = document.createElement("div");
        barFill.className = "habit-bar-fill";
        barFill.style.width = `${item.score}%`;
        barTrack.appendChild(barFill);

        const percent = document.createElement("div");
        percent.className = "habit-percent";
        percent.textContent = `${item.score.toFixed(0)}점`;

        row.appendChild(label);
        row.appendChild(barTrack);
        row.appendChild(percent);

        container.appendChild(row);
    });
}

// ============================
// 메인 핸들러
// ============================
function setupForm() {
    const form = document.getElementById("life-form");
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const birthStr = document.getElementById("birthdate").value;
        const gender = document.getElementById("gender").value;
        const heightCm = parseFloat(document.getElementById("height").value);
        const weightKg = parseFloat(document.getElementById("weight").value);
        const sleepHours = parseFloat(document.getElementById("sleepHours").value);
        const exerciseHours = parseFloat(document.getElementById("exerciseHours").value);
        const smoking = document.getElementById("smoking").value;
        const alcohol = document.getElementById("alcohol").value;
        const meals = parseFloat(document.getElementById("mealsPerDay").value) || 0;
        const workHours = parseFloat(document.getElementById("workHours").value) || 0;
        const leisureHours = parseFloat(document.getElementById("leisureHours").value) || 0;
        const restHours = parseFloat(document.getElementById("restHours").value) || 0;

        if (!birthStr) {
            alert("생년월일을 입력해주세요.");
            return;
        }

        const birthDate = new Date(birthStr);
        const now = new Date();
        const ageDiff = diffComponents(birthDate, now);
        const ageYears = ageDiff.years + ageDiff.months / 12;

        // 타이머 업데이트 인터벌 설정
        if (liveTimerInterval) clearInterval(liveTimerInterval);
        if (lifeExpectTimerInterval) clearInterval(lifeExpectTimerInterval);

        const lifeExpectYears = getLifeExpectancyYears(gender);
        const deathDate = new Date(birthDate.getTime() + lifeExpectYears * 365.25 * 24 * 60 * 60 * 1000);

        liveTimerInterval = setInterval(() => {
            const now = new Date();
            const dc = diffComponents(birthDate, now);
            document.getElementById("lived-time").textContent = formatDiff(dc);
        }, 1000);

        lifeExpectTimerInterval = setInterval(() => {
            const now = new Date();
            const dc = diffComponents(now, deathDate);
            document.getElementById("life-expect-time").textContent = formatDiff(dc);
        }, 1000);

        // 도넛
        renderLifeDonut(ageYears, lifeExpectYears);

        // 남은 시간으로 할 수 있는 일
        const remainingDiff = diffComponents(now, deathDate);
        updateRemainingActivities(remainingDiff);

        // BMI & 라이프스타일
        const heightM = heightCm / 100;
        const bmi = calcBMI(weightKg, heightM);
        document.getElementById("bmi").textContent = isNaN(bmi) ? "-" : bmi.toFixed(1);

        const lifestyle = getLifestyleType(bmi, exerciseHours);
        if (lifestyle) {
            const info = lifestyleDescriptions[lifestyle.cluster] || lifestyleDescriptions[0];
            document.getElementById("lifestyle-type").textContent = info.name;
            document.getElementById("lifestyle-desc").textContent = info.desc;
            document.getElementById("lifestyle-detail").textContent =
                `BMI ${bmi.toFixed(1)}, 주간 운동 ${exerciseHours.toFixed(1)}시간 (유형 중심: BMI ${lifestyle.BMI.toFixed(1)}, ${lifestyle.weekly_hours.toFixed(1)}시간)`;
        } else {
            document.getElementById("lifestyle-type").textContent = "모델 정보 없음";
            document.getElementById("lifestyle-desc").textContent = "AI 라이프스타일 모델을 불러오지 못했습니다.";
            document.getElementById("lifestyle-detail").textContent = "";
        }

        // 생활 습관 랭킹 & AI 건강 점수
        updateHabitRankings(sleepHours, exerciseHours, smoking, alcohol);

        const aiScore = computeAIHealthScore(ageYears, bmi, exerciseHours);
        const aiScoreEl = document.getElementById("ai-score-value");
        const aiDescEl = document.getElementById("ai-score-desc");

        aiScoreEl.textContent = isNaN(aiScore) ? "-" : aiScore;
        if (aiScore >= 80) {
            aiDescEl.textContent = "전반적으로 매우 좋은 생활 패턴입니다. 지금 리듬을 유지하는 것이 가장 중요합니다.";
        } else if (aiScore >= 60) {
            aiDescEl.textContent = "괜찮은 편이지만, 수면/운동/식습관 중 한두 가지를 조정하면 더 좋아질 수 있습니다.";
        } else if (aiScore >= 40) {
            aiDescEl.textContent = "여러 요소에서 개선 여지가 보입니다. 한 가지 영역부터 가볍게 바꿔보는 걸 추천합니다.";
        } else {
            aiDescEl.textContent = "건강 지표가 전반적으로 낮게 나왔습니다. 생활 패턴을 점검해 보는 것을 강력 추천합니다.";
        }

        // 삶의 밸런스
        updateBalanceChart(workHours, leisureHours, restHours);
    });
}

// ============================
// 초기화
// ============================
document.addEventListener("DOMContentLoaded", async () => {
    await loadModels();
    setupForm();
});
