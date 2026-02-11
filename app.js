const DISTANCES = [
  { name: "5K", km: 5 },
  { name: "10K", km: 10 },
  { name: "Half Marathon", km: 21.097 },
  { name: "Marathon", km: 42.195 },
];

const form = document.getElementById("predictorForm");
const primaryResult = document.getElementById("primaryResult");
const paceText = document.getElementById("paceText");
const confidenceBadge = document.getElementById("confidenceBadge");
const distanceCards = document.getElementById("distanceCards");
const splits = document.getElementById("splits");
const readinessBar = document.getElementById("readinessBar");
const insightText = document.getElementById("insightText");

const toSeconds = (timeString) => {
  const parts = timeString.trim().split(":").map(Number);
  if (parts.some(Number.isNaN) || parts.length < 2 || parts.length > 3) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
};

const formatTime = (seconds) => {
  const safe = Math.max(0, Math.round(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const pacePerKm = (totalSeconds, km) => {
  const pace = totalSeconds / km;
  const m = Math.floor(pace / 60);
  const s = Math.round(pace % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

const predictTime = (baseSeconds, baseKm, targetKm, modifiers) => {
  const riegelExponent = 1.06;
  const baseline = baseSeconds * Math.pow(targetKm / baseKm, riegelExponent);
  return baseline * modifiers;
};

const calcModifiers = (mileage, elevation, temp, goal) => {
  const mileageFactor = 1 - Math.min(Math.max((mileage - 35) * 0.0018, -0.06), 0.08);
  const elevationFactor = 1 + Math.min(elevation * 0.00028, 0.09);

  let tempFactor = 1;
  if (temp > 14) tempFactor += (temp - 14) * 0.004;
  if (temp < 4) tempFactor += (4 - temp) * 0.0025;

  const goalFactor = goal === "aggressive" ? 0.985 : goal === "conservative" ? 1.02 : 1;
  return mileageFactor * elevationFactor * tempFactor * goalFactor;
};

const calcReadiness = (mileage, elevation, temp) => {
  let score = 70;
  score += Math.min(Math.max((mileage - 30) * 0.7, -20), 20);
  score -= Math.min(elevation / 35, 18);
  score -= Math.max(temp - 18, 0) * 1.2;
  score -= Math.max(2 - temp, 0) * 0.8;
  return Math.min(97, Math.max(30, Math.round(score)));
};

const confidenceFromInputs = (baseSeconds, mileage) => {
  let confidence = 78;
  if (baseSeconds < 18 * 60) confidence -= 4;
  if (baseSeconds > 4 * 3600) confidence -= 6;
  if (mileage < 25) confidence -= 10;
  if (mileage > 80) confidence += 4;
  return Math.min(95, Math.max(58, confidence));
};

const render = (predictions, readiness, confidence) => {
  const target10k = predictions.find((item) => item.name === "10K");
  primaryResult.querySelector("h3").textContent = `${target10k.name} · ${formatTime(target10k.seconds)}`;
  paceText.textContent = `Pace: ${pacePerKm(target10k.seconds, target10k.km)} /km`;
  confidenceBadge.textContent = `Confidence: ${confidence}%`;

  distanceCards.innerHTML = predictions
    .map((item) => `<article class="distance-card"><p>${item.name}</p><h4>${formatTime(item.seconds)}</h4></article>`)
    .join("");

  const splitCount = Math.ceil(target10k.km / 5);
  const averageSplit = target10k.seconds / splitCount;
  splits.innerHTML = Array.from({ length: splitCount }, (_, i) => {
    const segmentFactor = 1 + (i === 0 ? 0.01 : i === splitCount - 1 ? -0.01 : 0);
    const splitSec = averageSplit * segmentFactor;
    const barWidth = 75 + ((splitCount - i) / splitCount) * 25;
    return `<div class="split"><strong>${(i + 1) * 5}K</strong><div class="bar" style="width:${barWidth}%"></div><span>${formatTime(splitSec)}</span></div>`;
  }).join("");

  readinessBar.style.width = `${readiness}%`;
  const status = readiness > 80 ? "very ready" : readiness > 65 ? "solid" : "building";
  insightText.textContent = `Your readiness score is ${readiness}/100 — fitness looks ${status}. Keep easy days easy and long runs consistent.`;
};

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const baseKm = Number(document.getElementById("baseDistance").value);
  const baseSeconds = toSeconds(document.getElementById("baseTime").value);
  const mileage = Number(document.getElementById("weeklyMileage").value);
  const elevation = Number(document.getElementById("elevation").value);
  const temperature = Number(document.getElementById("temperature").value);
  const goal = document.getElementById("goalStyle").value;

  if (!baseSeconds) {
    alert("Please enter a valid race time like 42:30 or 01:35:20");
    return;
  }

  const modifiers = calcModifiers(mileage, elevation, temperature, goal);
  const predictions = DISTANCES.map((distance) => ({
    ...distance,
    seconds: predictTime(baseSeconds, baseKm, distance.km, modifiers),
  }));

  const readiness = calcReadiness(mileage, elevation, temperature);
  const confidence = confidenceFromInputs(baseSeconds, mileage);
  render(predictions, readiness, confidence);
});

form.dispatchEvent(new Event("submit"));
