// =======================
// 1. 기본 상수 & DOM 요소
// =======================
const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

// 생년월일은 설문 폼의 #survey-birth에서 가져옴
const birthInput = document.getElementById('survey-birth');

// 살아온 시간 출력 요소
const livedMain  = document.getElementById('lived-main');
const livedDays  = document.getElementById('lived-days');
const livedHours = document.getElementById('lived-hours');
const livedMins  = document.getElementById('lived-mins');
const livedSecs  = document.getElementById('lived-secs');
const livedYears = document.getElementById('lived-years');

// 남은 시간 출력 요소
const remainMain   = document.getElementById('remain-main');
const remainYears  = document.getElementById('remain-years');
const remainDays   = document.getElementById('remain-days');
const remainHours  = document.getElementById('remain-hours');
const expDeathDate = document.getElementById('expected-death-date');

let timerId = null;
let expectedDeathTime = null; // Date 객체

// =======================
// 2. 생명표 데이터 (2023 간이생명표, 전체 기대여명)
// =======================
const lifeTable = [
  { age: 0,   ex: 83.5 },
  { age: 1,   ex: 82.7 },
  { age: 5,   ex: 78.7 },
  { age: 10,  ex: 73.8 },
  { age: 15,  ex: 68.8 },
  { age: 20,  ex: 63.9 },
  { age: 25,  ex: 59.0 },
  { age: 30,  ex: 54.1 },
  { age: 35,  ex: 49.3 },
  { age: 40,  ex: 44.4 },
  { age: 45,  ex: 39.7 },
  { age: 50,  ex: 35.0 },
  { age: 55,  ex: 30.4 },
  { age: 60,  ex: 25.9 },
  { age: 65,  ex: 21.5 },
  { age: 70,  ex: 17.2 },
  { age: 75,  ex: 13.2 },
  { age: 80,  ex: 9.7 },
  { age: 85,  ex: 6.8 },
  { age: 90,  ex: 4.7 },
  { age: 95,  ex: 3.2 },
  { age: 100, ex: 2.2 }
];

function lookupRemainingYears(ageYears) {
  const n = lifeTable.length;
  if (ageYears <= lifeTable[0].age) return lifeTable[0].ex;
  if (ageYears >= lifeTable[n - 1].age) return lifeTable[n - 1].ex;

  for (let i = 0; i < n - 1; i++) {
    const a0 = lifeTable[i];
    const a1 = lifeTable[i + 1];
    if (ageYears >= a0.age && ageYears < a1.age) {
      const t = (ageYears - a0.age) / (a1.age - a0.age); // 0~1
      return a0.ex + (a1.ex - a0.ex) * t;
    }
  }
  return lifeTable[n - 1].ex;
}

// =======================
// 3. 타이머 로직
// =======================
function startTimer() {
  if (timerId) clearInterval(timerId);

  const birthStr = birthInput.value;
  if (!birthStr) {
    livedMain.textContent  = '생년월일을 입력하면 계산됩니다.';
    remainMain.textContent = '생년월일을 입력하면 계산됩니다.';
    return;
  }

  const birthDate = new Date(birthStr + 'T00:00:00');
  const now       = new Date();

  const ageMs    = Math.max(0, now.getTime() - birthDate.getTime());
  const ageYears = ageMs / MS_PER_YEAR;

  const ex = lookupRemainingYears(ageYears); // 남은 연수

  expectedDeathTime = new Date(now.getTime() + ex * MS_PER_YEAR);

  tick();
  timerId = setInterval(tick, 1000);
}

function tick() {
  const birthStr = birthInput.value;
  if (!birthStr) return;

  const birthDate = new Date(birthStr + 'T00:00:00');
  const now       = new Date();

  const livedMs = Math.max(0, now.getTime() - birthDate.getTime());
  updateLivedView(livedMs);

  if (!expectedDeathTime) return;
  const remainMs = Math.max(0, expectedDeathTime.getTime() - now.getTime());
  updateRemainView(remainMs);
}

// =======================
// 4. 화면 갱신
// =======================
function updateLivedView(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const s            = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m            = totalMinutes % 60;
  const totalHours   = Math.floor(totalMinutes / 60);
  const h            = totalHours % 24;
  const d            = Math.floor(totalHours / 24);

  const approxYears  = (ms / MS_PER_YEAR).toFixed(6);
  const totalMins    = Math.floor(ms / (1000 * 60));
  const totalHrs     = Math.floor(ms / (1000 * 60 * 60));
  const totalDays    = Math.floor(ms / (1000 * 60 * 60 * 24));

  livedMain.textContent = `${formatNumber(d)}일  ${pad(h)}:${pad(m)}:${pad(s)}`;
  livedDays.textContent  = formatNumber(totalDays);
  livedHours.textContent = formatNumber(totalHrs);
  livedMins.textContent  = formatNumber(totalMins);
  livedSecs.textContent  = formatNumber(totalSeconds);
  livedYears.textContent = `${approxYears} 년`;
}

function updateRemainView(msLeft) {
  const yearsLeft = msLeft / MS_PER_YEAR;
  const daysLeft  = msLeft / (1000 * 60 * 60 * 24);
  const hoursLeft = msLeft / (1000 * 60 * 60);

  const totalSeconds = Math.floor(msLeft / 1000);
  const s            = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m            = totalMinutes % 60;
  const totalHours   = Math.floor(totalMinutes / 60);
  const h            = totalHours % 24;
  const d            = Math.floor(totalHours / 24);

  remainMain.textContent = `${formatNumber(d)}일  ${pad(h)}:${pad(m)}:${pad(s)} 남음 (근사)`;
  remainYears.textContent = `${yearsLeft.toFixed(3)} 년`;
  remainDays.textContent  = `${Math.floor(daysLeft).toLocaleString('ko-KR')} 일`;
  remainHours.textContent = `${Math.floor(hoursLeft).toLocaleString('ko-KR')} 시간`;

  if (msLeft <= 0) {
    expDeathDate.textContent = '통계상 기대수명을 이미 초과했습니다 (축하합니다 🎉)';
  } else {
    const expected = expectedDeathTime;
    const y  = expected.getFullYear();
    const mon = expected.getMonth() + 1;
    const d2  = expected.getDate();
    expDeathDate.textContent = `${y}년 ${mon}월 ${d2}일 즈음`;
  }
}

// =======================
// 5. 유틸 함수
// =======================
function pad(n){ return String(n).padStart(2,'0'); }
function formatNumber(n){ return n.toLocaleString('ko-KR'); }

// 설문 생년월일이 바뀔 때마다 타이머 갱신
birthInput.addEventListener('change', startTimer);

// 페이지 로드시 한 번 실행 (입력 없으면 안내 문구만 뜸)
startTimer();

// =======================
// 6. 설문 처리 (BMI 계산 + 디버그 출력)
// =======================
const form = document.getElementById('lifestyle-form');
const debug = document.getElementById('survey-debug');

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  data.height = Number(data.height);
  data.weight = Number(data.weight);
  data.exercise_hours_per_week = Number(data.exercise_hours_per_week);
  data.sleep_hours = Number(data.sleep_hours);
  data.meals_per_day = Number(data.meals_per_day);

  if (data.height > 0 && data.weight > 0) {
    const meter = data.height / 100;
    data.bmi = Number((data.weight / (meter * meter)).toFixed(2));
  }

  debug.textContent =
    '입력 값 미리보기 (나중에 이 데이터를 기반으로 건강 점수/리포트 생성 예정):\n'
    + JSON.stringify(data, null, 2);

  console.log('설문 데이터:', data);
});
