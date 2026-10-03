let params = null;
let state = null;
const controls = { throttle: 0 };
let launched = false;
let currentFrame = 0;
let audioCtx, engineGain, rumbleFilter;
let currentTwr = 0;
let maxQ = 0;
let prevVy = 0;
const altInfo = document.getElementById("altReadout");
const speedInfo = document.getElementById("speedReadout");
const fuelInfo = document.getElementById("fuelReadout");
const twrInfo = document.getElementById("twrReadout");
const thSlider = document.getElementById("throttle");
const launchBtn = document.getElementById("launch");
const resetBtn = document.getElementById("reset");
const dryMassSlider = document.getElementById("dryMassSlider");
const fuelSlider = document.getElementById("fuelSlider");
const tMaxSlider = document.getElementById("tMaxSlider");
const ispSlider = document.getElementById("ispSlider");
const gravitySelect = document.getElementById("gravitySelect")
const simulateBtn = document.getElementById("simulate");
const simulationDialog = document.getElementById("simDialog");
const toast = document.getElementById('toast');
const milestones = {
  liftoffPlayed: false,
  mecoPlayed: false,
  apexPlayed: false,
  maxQPassed: false,
  landed: false, 
  crashPlayed: false
};
let throttleTarget = 0;
const rampRate = 500;
const frameWidth = 190.3;
const frameHeight = 222.3;
const rocketImg = new Image();
rocketImg.src = "rocket.svg";
let rocketReady = false;
rocketImg.onload = () => { rocketReady = true; };
const rocketHeight = 270;
const rocketWidth = rocketHeight * (63.46 / 563.98);
let surface = null;
const skyColors = {
  9.81: ["#4a90d9", "#dceeff"],
  1.62: ["#000000", "#333333"],
  3.71: ["#c1440e", "#f2c9a0"],
  8.87: ["#D5B714", "#FBF082"],
};

const atmoParams = {
  9.81: { rho0: 1.225, H: 8500 },    // Earth
  1.62: { rho0: 0, H: 8500 },         // Moon: no atmosphere
  3.71: { rho0: 0.020, H: 11100 },    // Mars
  8.87: { rho0: 65, H: 15900 },       // Venus
};
const flameSheet = new Image();
let frameTimer = 0;
flameSheet.src = "flame.png";
let flameReady = false;
flameSheet.onload = () => { flameReady = true; };
resetBtn.style.display = 'none';
document.getElementById("throttleWrap").style.display = 'none';
simulationDialog.showModal();

const MAX_BARS = 1000;

const speedGraph = new Chart(document.getElementById("speedGraph"), {
  type: "line",
  data: {
    labels: Array(MAX_BARS).fill("Velocity"),
    datasets: [{ data: Array(MAX_BARS).fill(0), borderColor: "red", pointRadius: 0, tension: 0.3 }]
  },
  options: {
    animation: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { min: -100, max: 300 } }
  }
});

const twrGraph = new Chart(document.getElementById("twrGraph"), {
  type: "line",
  data: {
    labels: Array(MAX_BARS).fill("TWR"),
    datasets: [{ data: Array(MAX_BARS).fill(0), borderColor: "blue", pointRadius: 0, tension: 0.3 }, {
      label: "Hover (1.0)",
      data: Array(MAX_BARS).fill(1),
      borderColor: "gray",
      borderDash: [6, 6],
      pointRadius: 0
    }]
  },
  options: {
    animation: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { min: 0, max: 3 } }
  }
});

simulateBtn.addEventListener('click', () => {
  const atmo = atmoParams[Number(gravitySelect.value)];
  state = makeState(Number(fuelSlider.value));
  params = { dryMass: Number(dryMassSlider.value), tMax: Number(tMaxSlider.value), isp: Number(ispSlider.value), g: Number(gravitySelect.value), targetAltitude: 100000, rho0: atmo.rho0, H: atmo.H, cd: 0.5, area: 1 }
  last = performance.now()
  simulationDialog.close();
  switch (Number(gravitySelect.value)) {
    case 9.81:
      surface = 'darkgreen';
      break;
    case 1.62:
      surface = 'darkgray';
      break;
    case 3.71:
      surface = 'coral';
      break;
    case 8.87:
      surface = 'olive';
      break;
  }
  startEngineSound();
});

thSlider.addEventListener('input', () => {
  throttleTarget = Number(thSlider.value) / 100;
  updateEngineSound(Number(thSlider.value) / 100)
});

launchBtn.addEventListener('click', () => {
  launched = true;
  launchBtn.style.display = 'none';
  resetBtn.style.display = '';
  document.getElementById("throttleWrap").style.display = '';
});

resetBtn.addEventListener('click', () => {
  window.location.reload();
});

document.getElementById("resultClose").addEventListener('click', () => {
  window.location.reload();
});

document.querySelectorAll('input[type="range"]').forEach(el => {
  el.addEventListener('input', () => {
    toast.style.opacity = '1';
    toast.textContent = `${el.getAttribute("name")}: ${el.value}`;
    setTimeout(() => {
      toast.style.opacity = '0';
    }, 2000);
  });
});

function pop(message) {
  toast.style.opacity = '1';
  toast.textContent = message;
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 2000);
}

function makeState(nFuel) {
  return { y: 0, vy: 0, fuel: nFuel, impactSpeed: 0, landed: false };
}

const canvas = document.getElementById("c");
canvas.width = canvas.parentElement.clientWidth;
canvas.height = canvas.parentElement.clientHeight;
const ctx = canvas.getContext("2d");
const GROUND = canvas.height - 50;
const PX_PER_M = 2;


function draw() {
  let cam = Math.max(0, state.y - 100)
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const [topColor, bottomColor] = skyColors[Number(gravitySelect.value)];
  const currentDensity = airDensity(state.y, params.rho0, params.H);
  const skyProgress = params.rho0 > 0 ? 1 - Math.min(currentDensity / params.rho0, 1) : 1;
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, shadeColor(topColor, skyProgress));   // darker as skyProgress rises
  sky.addColorStop(1, shadeColor(bottomColor, skyProgress));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);       // sky, painted with sky style

  ctx.fillStyle = surface;                                // restore ground color
  ctx.fillRect(0, GROUND + cam * PX_PER_M, canvas.width, canvas.height - GROUND);

  const rocketX = canvas.width / 2 - rocketWidth / 2;      // adjust width/2 to match your SVG's actual width
  const rocketY = GROUND - (state.y - cam) * PX_PER_M - rocketHeight;   // same y math as before, adjust 60 to your SVG's actual height
  const col = currentFrame % 8;
  const row = Math.floor(currentFrame / 8);
  const srcX = col * frameWidth;
  const srcY = row * frameHeight;

  if (flameReady && state.fuel > 0 && controls.throttle > 0) {
    const flameDestWidth = rocketWidth * 7 * controls.throttle;
    const flameDestHeight = rocketHeight * controls.throttle;
    const centeringOffsetRatio = -3 / (rocketWidth * 7);
    const flameX = rocketX + rocketWidth / 2 - flameDestWidth / 2 + flameDestWidth * centeringOffsetRatio;   // horizontally centered on rocket
    const flameY = rocketY + rocketHeight - 10;
    ctx.drawImage(
      flameSheet,
      srcX, srcY, frameWidth, frameHeight,
      flameX, flameY, flameDestWidth, flameDestHeight
    );
  }

  if (rocketReady) {
    ctx.drawImage(rocketImg, rocketX, rocketY, rocketWidth, rocketHeight);
  }

  frameTimer++;
  if (frameTimer >= 4) {
    frameTimer = 0;
    if (currentFrame < 7) {
      currentFrame++;
    } else {
      currentFrame++;
      if (currentFrame > 14) {
        currentFrame = 7;
      }
    }
  }
}

function shadeColor(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (num >> 16) - 255 * amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - 255 * amount);
  const b = Math.max(0, (num & 0xff) - 255 * amount);
  return `rgb(${r}, ${g}, ${b})`;
}

const DT = 1 / 120;
let acc = 0;
let last = performance.now();

function loop(now) {
  if (!state || !params) {
    requestAnimationFrame(loop);
    return;
  }
  currentTwr = twr(thrust(controls.throttle, params.tMax, state.fuel), totalMass(params.dryMass, state.fuel), params.g).toFixed(2);
  acc += (now - last) / 1000;
  last = now
  acc = Math.min(acc, 0.1);
  while (acc >= DT) {
    if (launched) {
      state = step(state, controls, params, DT);
    }
    acc -= DT;
  }
  if (state.y.toFixed(0) < 1000) {
    altInfo.textContent = state.y.toFixed(1) + 'm';
  } else {
    altInfo.textContent = (state.y / 1000).toFixed(2) + 'km';
  }
  if (state.vy.toFixed(0) < 1000) {
    speedInfo.textContent = state.vy.toFixed(1) + 'm/s';
  } else {
    speedInfo.textContent = state.vy.toFixed(1) + ' m/s' + ` (${(state.vy * 3.6).toFixed(1)} km/h)`;
  }

  if (controls.throttle < throttleTarget) {
    controls.throttle = Math.min(controls.throttle + rampRate * DT, throttleTarget);
  } else if (controls.throttle > throttleTarget) {
    controls.throttle = Math.max(controls.throttle - rampRate * DT, throttleTarget);
  }


  pushValue(state.vy, speedGraph);
  pushValue(currentTwr, twrGraph);
  
  fuelInfo.textContent = state.fuel.toFixed(0);
  twrInfo.textContent = currentTwr;
  if (launched) {
    const outcome = checkOutcome(state, params);
    if (outcome !== "flying") {
      if (!milestones.landed){
        speak(outcome === "successful_landing" ? "Touchdown" : "Impact");
        milestones.landed = true;
      }
      document.getElementById("resultMsg").textContent = outcome.replaceAll("_", " ");
      document.getElementById("result").showModal();
      if (outcome === "crashed" && !milestones.crashPlayed) {
        document.getElementById("crashAudio").play();
        milestones.crashPlayed = true;
      }
    }

    if (state.fuel <= 0 && !milestones.mecoPlayed) {
      pop("Out of Fuel");
      speak("Main engine cutoff")
      updateEngineSound(0)
      milestones.mecoPlayed = true;
      document.getElementById("throttleWrap").setAttribute("disabled", "");
    }

    if (state.y > 100 && currentTwr >= 1 && !milestones.liftoffPlayed) {
      speak("We have liftoff");
      milestones.liftoffPlayed = true;
    }

    const q = 0.5 * airDensity(state.y, params.rho0, params.H) * state.vy * state.vy;

    if (q > maxQ) {
      maxQ = q
    } else if (maxQ > q && maxQ > 1000 && !milestones.maxQPassed) {
      speak("Approaching max dynamic pressure.");
      milestones.maxQPassed = true;
    }

    if (prevVy > 0 && state.vy <= 0 && !milestones.apexPlayed) {
      speak("Apex");
      milestones.apexPlayed = true;
    }
    prevVy = state.vy;
  }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);


function pushValue(v, chart) {
  const d = chart.data.datasets[0].data;
  if (v >= chart.options.scales.y.max) {
    chart.options.scales.y.max *= 1.5;
  }

  if (v <= chart.options.scales.y.min) {
    chart.options.scales.y.min *= 1.5;
  }
  d.push(v);
  d.shift();
  chart.update("none");
}


document.querySelectorAll('input[type="range"]').forEach(input => {
  const slider = document.createElement("div");

  input.after(slider);
  input.style.display = 'none';

  noUiSlider.create(slider, {
    connect: 'lower',
    start: Number(input.value),
    range: {
      min: Number(input.min) || 0,
      max: Number(input.max) || 100
    },
    step: Number(input.step) || 1
  });

  slider.noUiSlider.on('update', (values) => {
    input.value = values[0];
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

});


function startEngineSound() {
  audioCtx = new AudioContext();
  const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 4, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++)
    data[i] = last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
  const rumble = audioCtx.createBufferSource();
  rumble.buffer = buffer;
  rumble.loop = true;
  rumbleFilter = audioCtx.createBiquadFilter();
  rumbleFilter.type = "lowpass";
  rumbleFilter.frequency.value = 150;
  engineGain = audioCtx.createGain();
  engineGain.gain.value = 0;
  rumble.connect(rumbleFilter).connect(engineGain).connect(audioCtx.destination);
  rumble.start();
}

function updateEngineSound(t) {
  if (!engineGain) return;
  engineGain.gain.value = t * 1.5;
  rumbleFilter.frequency.value = 80 + t * 400;
}

async function speak(text) {
  if (!speechSynthesis.getVoices().length)
    await new Promise(r => speechSynthesis.addEventListener("voiceschanged", r, { once: true }));
  const u = new SpeechSynthesisUtterance(text);
  u.voice = speechSynthesis.getVoices().find(v => v.name.includes("David"));
  u.rate = 0.9;
  speechSynthesis.speak(u);
}