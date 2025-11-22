/* ================================
   시간 계산 유틸
================================ */

function getLivedDiff(birthDate) {
    const now = new Date();
    const diffMs = now - birthDate;
    if (diffMs <= 0) return null;

    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours   = Math.floor(totalMinutes / 60);
    const totalDays    = Math.floor(totalHours / 24);
    const years        = Math.floor(totalDays / 365);
    const days         = totalDays % 365;
    const hours        = totalHours % 24;
    const minutes      = totalMinutes % 60;
    const seconds      = totalSeconds % 60;

    return {
        years, days, hours, minutes, seconds,
        totalSeconds, totalMinutes, totalHours, totalDays
    };
}

function getLifeExpectancy(gender) {
    // 대한민국 평균 기대수명 (대략값, 필요하면 상수만 바꿔도 됨)
    // 예: 통계청 기준 남자 ~80세, 여자 ~86세 근처
    const male = 80.0;
    const female = 86.0;
    return gender === "female" ? female : male;
}

function getRemainingDiff(birthDate, gender) {
    const expectancy = getLifeExpectancy(gender);
    const end = new Date(birthDate);
    end.setFullYear(end.getFullYear() + expectancy);

    const now = new Date();
    const diffMs = end - now;
    if (diffMs <= 0) return null;

    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours   = Math.floor(totalMinutes / 60);
    const totalDays    = Math.floor(totalHours / 24);
    const years        = Math.floor(totalDays / 365);
    const days         = totalDays % 365;
    const hours        = totalHours % 24;
    const minutes      = totalMinutes % 60;
    const seconds      = totalSeconds % 60;

    return {
        years, days, hours, minutes, seconds,
        totalSeconds, totalMinutes, totalHours, totalDays
    };
}

function renderDiffString(diff) {
    if (!diff) return "-";
    return `${diff.years}년 ${diff.days}일 ${diff.hours}시간 ${diff.minutes}분 ${diff.seconds}초`;
}

/* ================================
   도넛 차트
================================ */

let donutChart = null;

function updateDonutChart(lived, remaining) {
    const ctx = document.getElementById("lifeDonutChart");
    if (!ctx) return;

    const livedDays = lived ? lived.totalDays : 0;
    const remainingDays = remaining ? remaining.totalDays : 0;
    const totalDays = livedDays + remainingDays;

    if (donutChart) donutChart.destroy();

    donutChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["살아온 시간", "남은 시간"],
            datasets: [{
                data: [livedDays, remainingDays],
                backgroundColor: ["#4ee6c1", "#272b3c"],
                borderWidth: 0
            }]
        },
        options: {
            cutout: "70%",
            plugins: {
                legend: { display: false }
            }
        }
    });

    const labelEl = document.getElementById("donut-label");
    if (totalDays === 0) {
        labelEl.textContent = "";
        return;
    }
    const livedPct = (livedDays / totalDays) * 100;
    const remainPct = (remainingDays / totalDays) * 100;
    labelEl.textContent =
        `지금까지 약 ${livedPct.toFixed(1)}%를 사용했고, ` +
        `약 ${remainPct.toFixed(1)}%가 남아 있습니다.`;
}

/* ================================
   남은 시간으로 할 수 있는 일
================================ */

function updateRemainingActivities(remaining) {
    const container = document.getElementById("remaining-activities");
    container.innerHTML = "";

    if (!remaining) {
        const li = document.createElement("li");
        li.className = "activity-card";
        li.innerHTML = `
            <div class="activity-title">기대수명 초과 달성</div>
            <div class="activity-value">Legend</div>
            <div class="activity-sub">이미 통계를 넘어선 전설적인 생존자입니다. 🎉</div>
        `;
        container.appendChild(li);
        return;
    }

    const days = remaining.totalDays;
    const hours = remaining.totalHours;

    // 1) 돈 벌기
    const minWage = 9860;                // 시간당 최저임금(예시)
    const workingHours = hours * 0.4;    // 남은 시간 중 40%를 일한다고 가정
    const money = Math.max(0, Math.floor(workingHours * minWage));

    // 2) 3분 카레
    const curry = Math.max(0, Math.floor((hours * 60) / 3));

    // 3) 책 읽기 (책 1권 읽는데 8시간 가정)
    const books = Math.max(0, Math.floor(hours / 8));

    // 4) 꿀잠
    const sleepDays = Math.max(0, days);

    // 5) 국토대장정 (1회 20일)
    const cross = Math.max(0, Math.floor(days / 20));

    // 6) 세계일주 (1회 60일)
    const world = Math.max(0, Math.floor(days / 60));

    const items = [
        {
            title: "최저임금 기준으로",
            value: `${money.toLocaleString()}원`,
            sub: "일만 했다면 이 정도 벌 수 있는 시간입니다."
        },
        {
            title: "3분카레 공장장이 된다면",
            value: `${curry.toLocaleString()}개`,
            sub: "3분마다 하나씩 쉼 없이 만든다고 가정했습니다."
        },
        {
            title: "읽을 수 있는 책 권수",
            value: `${books.toLocaleString()}권`,
            sub: "책 한 권을 읽는 데 8시간 정도 걸린다고 가정했습니다."
        },
        {
            title: "꿀잠 잘 수 있는 날",
            value: `${sleepDays.toLocaleString()}일`,
            sub: "앞으로 포근하게 눕게 될 밤의 개수입니다."
        },
        {
            title: "국토대장정",
            value: `${cross.toLocaleString()}번`,
            sub: "1회 20일짜리 국토 종단을 기준으로 계산했습니다."
        },
        {
            title: "세계일주",
            value: `${world.toLocaleString()}번`,
            sub: "1회 60일짜리 세계일주를 기준으로 한 대략적인 횟수입니다."
        }
    ];

    items.forEach(item => {
        const li = document.createElement("li");
        li.className = "activity-card";
        li.innerHTML = `
            <div class="activity-title">${item.title}</div>
            <div class="activity-value">${item.value}</div>
            <div class="activity-sub">${item.sub}</div>
        `;
        container.appendChild(li);
    });
}

/* ================================
   BMI & 라이프스타일
================================ */

function bmiFeedback(bmi) {
    if (bmi < 18.5) return "저체중 범위입니다. 단백질과 칼로리 섭취를 조금 늘리고, 가벼운 근력 운동을 병행하면 좋습니다.";
    if (bmi < 23)   return "정상 체중 범위입니다. 현재의 식단·운동 습관을 유지하는 것이 중요합니다.";
    if (bmi < 25)   return "과체중에 가까운 편입니다. 간단한 유산소 운동과 간식/야식 줄이기가 도움이 됩니다.";
    return "비만 범위입니다. 식습관 조절과 규칙적인 운동이 건강을 지키는 데 필요합니다.";
}

const lifestyleDescriptions = {
    0: {
        name: "슬림 활동형",
        desc: "체중이 가볍고, 기본적인 활동량은 있는 편입니다.",
        advice: "근력 운동을 조금씩 늘리고, 충분한 영양 섭취를 신경 쓰면 체력 유지에 도움이 됩니다."
    },
    1: {
        name: "밸런스 활동형",
        desc: "체중과 활동량이 가장 이상적인 패턴에 가까운 타입입니다.",
        advice: "현재의 수면·식단·운동 패턴을 꾸준히 유지하는 것이 가장 중요합니다."
    },
    2: {
        name: "운동하는 고BMI형",
        desc: "체중은 높은 편이지만, 운동을 꾸준히 하는 타입입니다.",
        advice: "운동 습관은 유지하되, 식단 조절(야식/당분 줄이기)과 수면 리듬을 조정하면 체중 관리에 큰 도움이 됩니다."
    },
    3: {
        name: "고위험 비만형",
        desc: "BMI가 높고 활동량이 적은 편으로, 장기적인 건강 관리가 필요한 타입입니다.",
        advice: "무리한 다이어트 대신, 하루 10분 걷기·탄산 대신 물 마시기 등 작은 습관부터 천천히 바꿔보는 걸 추천합니다."
    }
};

function classifyLifestyle(bmi, weeklyExerciseHours) {
    if (bmi < 18.5) return 0;
    if (bmi < 23 && weeklyExerciseHours >= 3) return 1;
    if (bmi >= 23 && weeklyExerciseHours >= 3) return 2;
    return 3;
}

/* ================================
   생활 습관 점수
================================ */

function scoreSleep(hours) {
    if (hours >= 7 && hours <= 9) return 95;
    if (hours >= 6) return 80;
    if (hours >= 5) return 60;
    return 40;
}

function scoreExercise(hours) {
    if (hours >= 5) return 95;
    if (hours >= 3) return 80;
    if (hours >= 1) return 60;
    return 40;
}

function scoreSmoking(smoking) {
    switch (smoking) {
        case "none":     return 95;
        case "month12":  return 90;
        case "week12":   return 75;
        case "halfday":  return 55;
        case "halfmore": return 35;
        case "onemore":  return 20;
        default:         return 50;
    }
}

function scoreAlcohol(alcohol) {
    switch (alcohol) {
        case "none":   return 95;
        case "rare":   return 85;
        case "weekly": return 70;
        case "often":  return 50;
        case "daily":  return 30;
        default:       return 50;
    }
}

function updateHabitRankings(sleepHours, exerciseHours, smoking, alcohol) {
    const container = document.getElementById("habit-rankings");
    container.innerHTML = "";

    const rows = [
        { label: "수면",  score: scoreSleep(sleepHours) },
        { label: "운동",  score: scoreExercise(exerciseHours) },
        { label: "흡연",  score: scoreSmoking(smoking) },
        { label: "음주",  score: scoreAlcohol(alcohol) }
    ];

    rows.forEach(r => {
        const rowEl = document.createElement("div");
        rowEl.className = "habit-row";

        const labelEl = document.createElement("div");
        labelEl.className = "habit-label";
        labelEl.textContent = r.label;

        const trackEl = document.createElement("div");
        trackEl.className = "habit-bar-track";

        const fillEl = document.createElement("div");
        fillEl.className = "habit-bar-fill";
        fillEl.style.width = `${r.score}%`;

        trackEl.appendChild(fillEl);

        const percentEl = document.createElement("div");
        percentEl.className = "habit-percent";
        percentEl.textContent = `${r.score.toFixed(0)}점`;

        rowEl.appendChild(labelEl);
        rowEl.appendChild(trackEl);
        rowEl.appendChild(percentEl);

        container.appendChild(rowEl);
    });
}

/* ================================
   AI 건강 점수
================================ */

function computeAIHealthScore(age, bmi, exerciseHours, sleepHours, smoking, alcohol) {
    let score = 80; // 기본값

    // 1) BMI 영향
    if (bmi < 18.5) score -= 5;       // 저체중
    else if (bmi < 23) score += 10;   // 정상
    else if (bmi < 25) score -= 2;    // 과체중 직전
    else if (bmi < 30) score -= 10;   // 비만 1
    else score -= 15;                 // 비만 2+

    // 2) 주간 운동시간 영향
    if (exerciseHours >= 5) score += 10;       
    else if (exerciseHours >= 3) score += 5;   
    else if (exerciseHours >= 1) score -= 2;   
    else score -= 10;                           

    // 3) 흡연 영향 (가중치 큼)
    switch (smoking) {
        case "none":     score += 5; break;
        case "month12":  score -= 5; break;
        case "week12":   score -= 10; break;
        case "halfday":  score -= 15; break;
        case "halfmore": score -= 20; break;
        case "onemore":  score -= 25; break;
    }

    // 4) 음주 영향 (중간 가중치)
    switch (alcohol) {
        case "none":   score += 3; break;
        case "rare":   score -= 2; break;
        case "weekly": score -= 8; break;
        case "often":  score -= 14; break;
        case "daily":  score -= 20; break;
    }

    // 5) 나이 영향
    if (age < 30) score += 5;
    else if (age > 60) score -= 10;
    else if (age > 50) score -= 5;

    // 0 ~ 100 사이로 묶기
    score = Math.max(0, Math.min(100, Math.round(score)));
    return score;
}

// AI 건강 점수 → 화면에 표시 + 설명 생성
function updateAIHealthScore(age, bmi, exerciseHours, sleepHours, smoking, alcohol) {
    const valueEl = document.getElementById("ai-score-value");
    const descEl  = document.getElementById("ai-score-desc");

    // NaN 체크 (0은 허용)
    if (!Number.isFinite(bmi) || !Number.isFinite(exerciseHours) || !Number.isFinite(sleepHours)) {
        valueEl.textContent = "-";
        descEl.textContent = "필수 정보를 입력하면 AI 건강 점수를 계산해드립니다.";
        return;
    }

    const score = computeAIHealthScore(age, bmi, exerciseHours, sleepHours, smoking, alcohol);
    valueEl.textContent = score;

    let baseMsg = "";
    if (score >= 80) {
        baseMsg = "전반적으로 매우 좋은 생활 패턴입니다. 지금 리듬을 유지하는 것이 가장 중요합니다.";
    } else if (score >= 60) {
        baseMsg = "꽤 괜찮은 편이지만, 수면·운동·식습관 중 한두 가지를 조정하면 더 좋아질 수 있습니다.";
    } else if (score >= 40) {
        baseMsg = "여러 요소에서 개선 여지가 보입니다. 부담되지 않는 영역부터 하나씩 바꿔보는 걸 추천합니다.";
    } else {
        baseMsg = "건강 지표가 전반적으로 낮게 나왔습니다. 생활 패턴을 한 번 진지하게 점검해 보는 것이 좋겠습니다.";
    }

    const tips = [];
    if (scoreSleep(sleepHours) < 60) {
        tips.push("· 수면 시간은 7~9시간 사이로 맞추고, 취침·기상 시간을 일정하게 유지해 보세요.");
    }
    if (scoreExercise(exerciseHours) < 60) {
        tips.push("· 일주일에 최소 3일, 하루 20~30분 정도의 가벼운 유산소/걷기 운동부터 시작해 보는 것을 권장합니다.");
    }
    if (scoreSmoking(smoking) < 80) {
        tips.push("· 흡연량을 한 단계라도 줄이면 심혈관·호흡기 질환 위험이 빠르게 감소합니다.");
    }
    if (scoreAlcohol(alcohol) < 70) {
        tips.push("· 음주 횟수를 줄이거나, 마시는 날에도 양과 속도를 조절해 보세요. 주 2회를 넘지 않도록 목표를 잡으면 좋습니다.");
    }

    let finalMsg = baseMsg;
    if (tips.length > 0) {
        finalMsg += "<br><br><strong>개선하면 좋은 부분:</strong><br>" + tips.join("<br>");
    }

    descEl.innerHTML = finalMsg;
}

/* ================================
   삶의 밸런스
================================ */

function updateBalanceChart(workHours, selfHours, leisureHours) {
    const total = workHours + selfHours + leisureHours;

    const workEl   = document.querySelector(".balance-work");
    const selfEl   = document.querySelector(".balance-self");
    const leisEl   = document.querySelector(".balance-leisure");
    const descEl   = document.getElementById("balance-desc");

    if (!total) {
        workEl.style.width = "0%";
        selfEl.style.width = "0%";
        leisEl.style.width = "0%";
        descEl.textContent = "일 / 자기개발 / 여가 시간을 입력하면 균형을 분석해 드립니다.";
        return;
    }

    const w = (workHours / total) * 100;
    const s = (selfHours / total) * 100;
    const l = (leisureHours / total) * 100;

    workEl.style.width = `${w}%`;
    selfEl.style.width = `${s}%`;
    leisEl.style.width = `${l}%`;

    let msg = `일 ${w.toFixed(0)}%, 자기개발 ${s.toFixed(0)}%, 여가 ${l.toFixed(0)}%. `;

    if (w > 50) {
        msg += "일 비중이 상당히 높습니다. 자기개발과 여가 시간을 조금이라도 확보해 보세요.";
    } else if (s > 40) {
        msg += "자기개발 비중이 높은 편입니다. 과로하지 않도록 여가와 휴식도 챙기는 것이 좋습니다.";
    } else if (l > 40) {
        msg += "여가 시간이 많은 편입니다. 일과 자기개발 비중을 조금 늘리면 더 균형 잡힌 패턴이 됩니다.";
    } else {
        msg += "세 영역이 비교적 고르게 분포되어 있어 균형 잡힌 하루를 보내고 있습니다.";
    }

    descEl.textContent = msg;
}

/* ================================
   메인 폼 처리
================================ */

document.getElementById("life-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const birthStr = document.getElementById("birthdate").value;
    if (!birthStr) return;
    const birthDate = new Date(birthStr);

    const gender   = document.getElementById("gender").value;
    const height   = parseFloat(document.getElementById("height").value);
    const weight   = parseFloat(document.getElementById("weight").value);
    const sleep    = parseFloat(document.getElementById("sleepHours").value);
    const exercise = parseFloat(document.getElementById("exerciseHours").value);
    const smoking  = document.getElementById("smoking").value;
    const alcohol  = document.getElementById("alcohol").value;

    const workHours    = parseFloat(document.getElementById("workHours").value)    || 0;
    const selfHours    = parseFloat(document.getElementById("leisureHours").value) || 0;
    const leisureHours = parseFloat(document.getElementById("restHours").value)    || 0;

    /* --- 타이머 --- */
    const lived     = getLivedDiff(birthDate);
    const remaining = getRemainingDiff(birthDate, gender);

    const livedMainEl  = document.getElementById("lived-time");
    const remainMainEl = document.getElementById("life-expect-time");

    livedMainEl.textContent  = lived ? renderDiffString(lived)  : "아직 태어나지 않았어요?";
    remainMainEl.textContent = remaining ? renderDiffString(remaining) : "기대수명을 이미 초과했습니다!";

    if (lived) {
        document.getElementById("lived-days").textContent    = `일수 기준: ${lived.totalDays.toLocaleString()}일`;
        document.getElementById("lived-hours").textContent   = `시간 기준: ${lived.totalHours.toLocaleString()}시간`;
        document.getElementById("lived-minutes").textContent = `분 기준: ${lived.totalMinutes.toLocaleString()}분`;
        document.getElementById("lived-seconds").textContent = `초 기준: ${lived.totalSeconds.toLocaleString()}초`;
    } else {
        document.getElementById("lived-days").textContent =
        document.getElementById("lived-hours").textContent =
        document.getElementById("lived-minutes").textContent =
        document.getElementById("lived-seconds").textContent = "";
    }

    if (remaining) {
        document.getElementById("remain-days").textContent    = `일수 기준: ${remaining.totalDays.toLocaleString()}일`;
        document.getElementById("remain-hours").textContent   = `시간 기준: ${remaining.totalHours.toLocaleString()}시간`;
        document.getElementById("remain-minutes").textContent = `분 기준: ${remaining.totalMinutes.toLocaleString()}분`;
        document.getElementById("remain-seconds").textContent = `초 기준: ${remaining.totalSeconds.toLocaleString()}초`;
    } else {
        document.getElementById("remain-days").textContent =
        document.getElementById("remain-hours").textContent =
        document.getElementById("remain-minutes").textContent =
        document.getElementById("remain-seconds").textContent = "";
    }

    updateDonutChart(lived, remaining);
    updateRemainingActivities(remaining);

    /* --- BMI & 라이프스타일 --- */
    const bmi = weight / Math.pow(height / 100, 2);
    document.getElementById("bmi").textContent = bmi ? bmi.toFixed(1) : "-";

    const lifestyleCluster = classifyLifestyle(bmi, exercise);
    const info = lifestyleDescriptions[lifestyleCluster];

    const lifestyleTypeEl   = document.getElementById("lifestyle-type");
    const lifestyleDescEl   = document.getElementById("lifestyle-desc");
    const lifestyleDetailEl = document.getElementById("lifestyle-detail");

    lifestyleTypeEl.textContent = info.name;
    lifestyleDescEl.textContent = info.desc + " " + bmiFeedback(bmi);
    lifestyleDetailEl.textContent =
        `내 BMI ${bmi.toFixed(1)}, 주간 운동 ${exercise.toFixed(1)}시간. ` +
        info.advice;

    /* --- 생활 습관 랭킹 --- */
    updateHabitRankings(sleep, exercise, smoking, alcohol);

    /* --- AI 건강 점수 --- */
    const ageYears = lived ? lived.years : 0;
    updateAIHealthScore(ageYears, bmi, exercise, sleep, smoking, alcohol);

    /* --- 삶의 밸런스 --- */
    updateBalanceChart(workHours, selfHours, leisureHours);
});
