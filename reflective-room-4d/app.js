/**
 * app.js — Reflective Rooms
 */

// ── DOM references ──────────────────────────────────────────────────────
const body = document.body;
const camera = document.getElementById("camera");
const navLinks = document.querySelectorAll(".nav-link");
const rooms = document.querySelectorAll(".room");
const submitButtons = document.querySelectorAll(".submit-btn");
const clearButtons = document.querySelectorAll(".clear-btn");
const returnCards = document.querySelectorAll(".return-card");
const presenceBtn = document.getElementById("presenceBtn");
const presenceToggles = document.querySelectorAll(".presence-toggle");
const clearAllBtn = document.getElementById("clearAllBtn");

const notebookShell = document.getElementById("notebookShell");
const notebookStage = document.getElementById("notebookStage");
const notebookObject = document.getElementById("notebookObject");
const notebookLeftPage = document.getElementById("notebookLeftPage");
const notebookRightPage = document.getElementById("notebookRightPage");
const notebookWritingLeft = document.getElementById("notebookWritingLeft");
const notebookWritingRight = document.getElementById("notebookWritingRight");
const notebookPageIndicator = document.getElementById("notebookPageIndicator");
const pageTurnOverlay = document.getElementById("pageTurnOverlay");
const roomInputs = document.querySelectorAll(".room-input");

const landing = document.getElementById("landing");
const howBtn = document.getElementById("howBtn");
const howPanel = document.getElementById("howPanel");
const howClose = document.getElementById("howClose");
const howOverlay = document.getElementById("howOverlay");
const homeLink = document.getElementById("homeLink");
const fadeOverlay = document.getElementById("fade-overlay");

let streamActive = false;
let notebookRotation = 0;
let dragStartX = 0;
let dragStartRotation = 0;
let draggingNotebook = false;
let dragMoved = false;
let landingHidden = false;

const ROOMS = ['memory', 'pattern', 'resistance', 'discomfort'];

const sessionData = {
  entryOrder:    [],
  timeSpent:     { memory: 0, pattern: 0, resistance: 0, discomfort: 0 },
  wordCount:     { memory: 0, pattern: 0, resistance: 0, discomfort: 0 },
  keystrokeGaps: { memory: [], pattern: [], resistance: [], discomfort: [] },
  returnVisits:  { memory: 0, pattern: 0, resistance: 0, discomfort: 0 },
  visitCount:    { memory: 0, pattern: 0, resistance: 0, discomfort: 0 },
};

let _trackCurrentRoom = null;
let _trackRoomStart   = null;
let _trackLastKey     = null;

function trackEnterRoom(roomName) {
  if (!ROOMS.includes(roomName)) return;
  if (!sessionData.entryOrder.includes(roomName)) {
    sessionData.entryOrder.push(roomName);
  }
  sessionData.visitCount[roomName]++;
  if (sessionData.visitCount[roomName] > 1) {
    sessionData.returnVisits[roomName]++;
  }
  _trackCurrentRoom = roomName;
  _trackRoomStart   = Date.now();
  _trackLastKey     = null;
}

function trackLeaveRoom(roomName) {
  if (!ROOMS.includes(roomName) || !_trackRoomStart) return;
  const elapsed = (Date.now() - _trackRoomStart) / 1000;
  sessionData.timeSpent[roomName] += elapsed;
  _trackRoomStart = null;
}

function trackKeystroke(roomName) {
  if (!ROOMS.includes(roomName)) return;
  const now = Date.now();
  if (_trackLastKey !== null) {
    const gap = now - _trackLastKey;
    if (gap > 50 && gap < 3000) {
      sessionData.keystrokeGaps[roomName].push(gap);
    }
  }
  _trackLastKey = now;
  const room  = document.getElementById(roomName);
  const input = room ? room.querySelector('.room-input') : null;
  if (input) {
    const words = input.value.trim().split(/\s+/).filter(w => w.length > 0).length;
    sessionData.wordCount[roomName] = Math.max(sessionData.wordCount[roomName], words);
  }
}

function roomsVisited() {
  return sessionData.entryOrder.length;
}

// ── localStorage persistence ──────────────────────────────────────────────
const STORAGE_KEY = 'reflective_rooms_v1';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) { return null; }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      pages: notebookPages,
      pageIndex: currentNotebookPage,
    }));
  } catch(e) {}
}

const _saved = loadFromStorage();

const notebookPages = (_saved && _saved.pages) ? _saved.pages : {
  memory: [""],
  pattern: [""],
  resistance: [""],
  discomfort: [""]
};

const currentNotebookPage = (_saved && _saved.pageIndex) ? _saved.pageIndex : {
  memory: 0,
  pattern: 0,
  resistance: 0,
  discomfort: 0
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getCurrentRoomName() {
  const activeRoom = document.querySelector(".room.active");
  return activeRoom ? activeRoom.id : "memory";
}

function updatePresenceButtons(isOn) {
  const text = isOn ? "Hide Presence" : "Show Presence";
  if (presenceBtn) presenceBtn.textContent = text;
  presenceToggles.forEach(btn => { btn.textContent = text; });
}

function setNotebookRotation(angle) {
  notebookRotation = clamp(angle, -125, 125);
  if (notebookObject) {
    notebookObject.style.setProperty("--notebook-rotate", `${notebookRotation}deg`);
  }
}

function centerNotebook() { setNotebookRotation(0); }
function closeNotebook() { setNotebookRotation(118); }
function notebookIsOpen() { return Math.abs(notebookRotation) < 55; }

function updateNotebookIndicator() {
  const roomName = getCurrentRoomName();
  if (roomName === "continuation" || roomName === "about") return;
  if (!notebookPageIndicator) return;
  const pageIndex = currentNotebookPage[roomName] || 0;
  notebookPageIndicator.textContent = `Page ${pageIndex + 1}-${pageIndex + 2}`;
}

function showLandingMode() {
  body.className = "";
  body.classList.add("landing-mode");
  landingHidden = false;
  if (landing) landing.classList.add("active");
  rooms.forEach(room => room.classList.remove("active"));
  if (notebookShell) notebookShell.style.display = "none";
  if (camera) camera.classList.remove("visible");
  if (fadeOverlay) fadeOverlay.classList.remove("active");
  if (typeof window.resetLandingScene === "function") window.resetLandingScene();
}

function hideLandingMode() {
  body.classList.remove("landing-mode");
  landingHidden = true;
}

function openHowPanel() {
  if (howPanel) { howPanel.classList.add("open"); howPanel.setAttribute("aria-hidden", "false"); }
  if (howOverlay) howOverlay.classList.add("open");
}

function closeHowPanel() {
  if (howPanel) { howPanel.classList.remove("open"); howPanel.setAttribute("aria-hidden", "true"); }
  if (howOverlay) howOverlay.classList.remove("open");
}

function returnToLanding() {
  rooms.forEach(room => room.classList.remove("active"));
  closeHowPanel();
  body.className = "";
  body.classList.add("landing-mode");
  landingHidden = false;
  if (landing) landing.classList.add("active");
  if (notebookShell) notebookShell.style.display = "none";
  if (camera) camera.classList.remove("visible");
  if (fadeOverlay) fadeOverlay.classList.remove("active");
  if (typeof window.resetLandingScene === "function") window.resetLandingScene();
}

function goHomeSmooth() {
  body.classList.add("fade-out");
  setTimeout(() => { returnToLanding(); body.classList.remove("fade-out"); }, 300);
}

function setRoom(roomName) {
  if (_trackCurrentRoom) trackLeaveRoom(_trackCurrentRoom);
  rooms.forEach(room => { room.classList.toggle("active", room.id === roomName); });
  navLinks.forEach(link => { link.classList.toggle("active", link.dataset.room === roomName); });
  body.className = "";
  body.classList.add(`${roomName}-room`);
  if (roomName === 'pattern') dotBurstCount = 0;
  trackEnterRoom(roomName);
  if (landing) landing.classList.remove("active");
  landingHidden = true;
  const blackRoom = roomName === "continuation" || roomName === "about";
  if (blackRoom) {
    if (camera) camera.classList.remove("visible");
    if (notebookShell) notebookShell.style.display = "none";
  } else {
    if (notebookShell) notebookShell.style.display = "block";
    if (streamActive && camera) { camera.classList.add("visible"); body.classList.add("camera-on"); }
  }
  updateNotebook();
  updateNotebookIndicator();
  closeNotebook();
  setTimeout(() => { centerNotebook(); }, 600);
}

function enterFromLanding(roomName) {
  closeHowPanel();
  if (!document.getElementById(roomName)) { console.warn(`Missing room: ${roomName}`); return; }
  setTimeout(() => {
    try {
      hideLandingMode();
      window.setRoom(roomName);
    } catch(e) {
      console.error('setRoom error:', e);
      // Still try basic room switch
      document.querySelectorAll('.room').forEach(r => r.classList.toggle('active', r.id === roomName));
      document.body.className = roomName + '-room';
    }
    setTimeout(() => { if (fadeOverlay) fadeOverlay.classList.remove("active"); }, 220);
  }, 120);
}

window.enterFromLanding = enterFromLanding;
window.setRoom = setRoom;
window.returnToLanding = returnToLanding;

async function enableCamera() {
  if (streamActive) {
    if (camera) camera.classList.add("visible");
    body.classList.add("camera-on");
    updatePresenceButtons(true);
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    camera.srcObject = stream;
    streamActive = true;
    body.classList.add("camera-on");
    if (!body.classList.contains("continuation-room") && !body.classList.contains("about-room")) {
      camera.classList.add("visible");
    }
    updatePresenceButtons(true);
  } catch (error) {
    alert("Camera access blocked or unavailable.");
  }
}

function disableCamera() {
  if (camera && camera.srcObject) { camera.srcObject.getTracks().forEach(track => track.stop()); }
  if (camera) { camera.srcObject = null; camera.classList.remove("visible"); }
  streamActive = false;
  body.classList.remove("camera-on");
  updatePresenceButtons(false);
}

function toggleCamera() { if (streamActive) disableCamera(); else enableCamera(); }

function playFlipSound(direction = "forward") {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();
  const now = ctx.currentTime;
  const duration = 0.28;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.35) * 0.55;
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(direction === "forward" ? 1350 : 1150, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.36, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  source.start(now); source.stop(now + duration);
}

function updateNotebook() {
  const roomName = getCurrentRoomName();
  if (roomName === "continuation" || roomName === "about") return;
  if (!notebookWritingLeft || !notebookWritingRight) return;
  const pages = notebookPages[roomName];
  const pageIndex = currentNotebookPage[roomName];
  notebookWritingLeft.textContent = pages[pageIndex] || "";
  notebookWritingRight.textContent = pages[pageIndex + 1] || "";
  const activeRoom = document.querySelector(".room.active");
  const activeInput = activeRoom ? activeRoom.querySelector(".room-input") : null;
  if (activeInput) activeInput.value = pages[pageIndex] || "";
  updateNotebookIndicator();
}

function animatePageTurn(direction) {
  if (!pageTurnOverlay) return;
  pageTurnOverlay.classList.remove("flip-forward", "flip-backward");
  void pageTurnOverlay.offsetWidth;
  setTimeout(() => {
    pageTurnOverlay.classList.add(direction === "forward" ? "flip-forward" : "flip-backward");
  }, 10);
}

function flipForward() {
  const roomName = getCurrentRoomName();
  if (roomName === "continuation" || roomName === "about") return;
  if (!notebookIsOpen()) return;
  const activeRoom = document.querySelector(".room.active");
  const activeInput = activeRoom ? activeRoom.querySelector(".room-input") : null;
  if (!activeInput) return;
  notebookPages[roomName][currentNotebookPage[roomName]] = activeInput.value;
  currentNotebookPage[roomName] += 1;
  if (typeof notebookPages[roomName][currentNotebookPage[roomName]] !== "string") notebookPages[roomName][currentNotebookPage[roomName]] = "";
  if (typeof notebookPages[roomName][currentNotebookPage[roomName] + 1] !== "string") notebookPages[roomName][currentNotebookPage[roomName] + 1] = "";
  animatePageTurn("forward"); playFlipSound("forward"); updateNotebook();
}

function flipBackward() {
  const roomName = getCurrentRoomName();
  if (roomName === "continuation" || roomName === "about") return;
  if (currentNotebookPage[roomName] === 0) return;
  if (!notebookIsOpen()) return;
  const activeRoom = document.querySelector(".room.active");
  const activeInput = activeRoom ? activeRoom.querySelector(".room-input") : null;
  if (!activeInput) return;
  notebookPages[roomName][currentNotebookPage[roomName]] = activeInput.value;
  currentNotebookPage[roomName] -= 1;
  animatePageTurn("backward"); playFlipSound("backward"); updateNotebook();
}

function startNotebookDrag(event) {
  draggingNotebook = true; dragMoved = false;
  if (notebookStage) notebookStage.classList.add("dragging");
  dragStartX = event.clientX || 0; dragStartRotation = notebookRotation;
}

function moveNotebookDrag(event) {
  if (!draggingNotebook) return;
  const currentX = event.clientX || dragStartX;
  const delta = currentX - dragStartX;
  if (Math.abs(delta) > 6) dragMoved = true;
  setNotebookRotation(dragStartRotation + delta * 0.35);
}

function endNotebookDrag() {
  if (!draggingNotebook) return;
  draggingNotebook = false;
  if (notebookStage) notebookStage.classList.remove("dragging");
  if (Math.abs(notebookRotation) < 28) centerNotebook();
  else if (notebookRotation > 28) setNotebookRotation(118);
  else setNotebookRotation(-118);
  setTimeout(() => { dragMoved = false; }, 20);
}

navLinks.forEach(link => {
  link.addEventListener("click", () => {
    if (link.id === "homeLink") return;
    if (!link.dataset.room) return;
    window.setRoom(link.dataset.room);
  });
});

returnCards.forEach(card => { card.addEventListener("click", () => setRoom(card.dataset.room)); });

if (howBtn) howBtn.addEventListener("click", openHowPanel);
if (howClose) howClose.addEventListener("click", closeHowPanel);
if (howOverlay) howOverlay.addEventListener("click", closeHowPanel);
if (homeLink) homeLink.addEventListener("click", goHomeSmooth);
if (presenceBtn) presenceBtn.addEventListener("click", toggleCamera);
presenceToggles.forEach(btn => { btn.addEventListener("click", toggleCamera); });

if (notebookLeftPage) { notebookLeftPage.addEventListener("click", () => { if (!dragMoved) flipBackward(); }); }
if (notebookRightPage) { notebookRightPage.addEventListener("click", () => { if (!dragMoved) flipForward(); }); }

if (notebookStage) {
  notebookStage.addEventListener("pointerdown", startNotebookDrag);
  window.addEventListener("pointermove", moveNotebookDrag);
  window.addEventListener("pointerup", endNotebookDrag);
  window.addEventListener("pointercancel", endNotebookDrag);
}

let isAutoAdvancing = false;

function ensureRippleField() {
  let field = document.querySelector('.memory-ripple-field');
  if (!field) { field = document.createElement('div'); field.className = 'memory-ripple-field'; document.body.appendChild(field); }
  return field;
}

function ensurePatternField() {
  let field = document.querySelector('.pattern-dot-field');
  if (!field) { field = document.createElement('div'); field.className = 'pattern-dot-field'; document.body.appendChild(field); }
  return field;
}

function ensureGrainLayer() {
  if (!document.querySelector('.grain-layer')) {
    const g = document.createElement('div'); g.className = 'grain-layer'; document.body.appendChild(g);
  }
}

let lastRippleTime = 0;
function emitRipple(fromInput) {
  if (!body.classList.contains('memory-room')) return;
  const now = performance.now();
  if (now - lastRippleTime < 55) return;
  lastRippleTime = now;
  const field = ensureRippleField();
  const rect = fromInput.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const ripple = document.createElement('div');
  ripple.className = 'memory-ripple';
  const startSize = 24;
  ripple.style.width = startSize + 'px';
  ripple.style.height = startSize + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  const duration = 2800 + Math.random() * 900;
  ripple.style.animationDuration = duration + 'ms';
  field.appendChild(ripple);
  setTimeout(() => ripple.remove(), duration + 120);
}

let lastDotTime = 0;
let dotBurstCount = 0;

function emitPatternDots(fromInput) {
  if (!body.classList.contains('pattern-room')) return;
  const now = performance.now();
  if (now - lastDotTime < 35) return;
  lastDotTime = now; dotBurstCount++;
  const field = ensurePatternField();
  const rect = fromInput.getBoundingClientRect();
  const basex = rect.left + rect.width / 2;
  const basey = rect.top + rect.height / 2;
  const drift = Math.min(dotBurstCount * 8, 420);
  const driftAngle = dotBurstCount * 0.38;
  const ox = basex + Math.cos(driftAngle) * drift * 0.55;
  const oy = basey + Math.sin(driftAngle * 0.7) * drift * 0.35;
  const cx = Math.max(80, Math.min(window.innerWidth - 80, ox));
  const cy = Math.max(80, Math.min(window.innerHeight - 80, oy));

  function spawnDot(originX, originY, minDist, maxDist, minSize, maxSize, minDur, maxDur) {
    const dot = document.createElement('div');
    dot.className = 'pattern-dot';
    const angle = Math.random() * Math.PI * 2;
    const distance = minDist + Math.random() * (maxDist - minDist);
    const size = minSize + Math.random() * (maxSize - minSize);
    const duration = minDur + Math.random() * (maxDur - minDur);
    const delay = Math.random() * 120;
    dot.style.cssText = `left:${originX}px;top:${originY}px;width:${size}px;height:${size}px;--tx:${Math.cos(angle)*distance}px;--ty:${Math.sin(angle)*distance}px;animation-duration:${duration}ms;animation-delay:${delay}ms;`;
    field.appendChild(dot);
    setTimeout(() => dot.remove(), duration + delay + 80);
  }

  const count1 = 10 + Math.floor(Math.random() * 7);
  for (let i = 0; i < count1; i++) spawnDot(cx, cy, 180, 700, 4, 15, 2800, 4800);
  const count2 = 5 + Math.floor(Math.random() * 4);
  const w2x = cx + (Math.random() - 0.5) * 200;
  const w2y = cy + (Math.random() - 0.5) * 200;
  for (let i = 0; i < count2; i++) spawnDot(w2x, w2y, 400, 1100, 2, 8, 3200, 5400);
}

ensureGrainLayer();

let resistanceCanvas = null, resistanceCtx = null, resistanceNodes = [], resistanceRAF = null, lastResistanceTime = 0;

function ensureResistanceCanvas() {
  if (resistanceCanvas) return;
  resistanceCanvas = document.createElement('canvas');
  resistanceCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;opacity:0;transition:opacity 0.8s ease;';
  document.body.appendChild(resistanceCanvas);
  resistanceCtx = resistanceCanvas.getContext('2d');
  resizeResistanceCanvas();
  window.addEventListener('resize', resizeResistanceCanvas);
}

function resizeResistanceCanvas() { if (!resistanceCanvas) return; resistanceCanvas.width = window.innerWidth; resistanceCanvas.height = window.innerHeight; }

function spawnResistanceNode(fromInput) {
  if (!body.classList.contains('resistance-room')) return;
  const now = performance.now();
  if (now - lastResistanceTime < 28) return;
  lastResistanceTime = now;
  ensureResistanceCanvas();
  resistanceCanvas.style.opacity = '1';
  const rect = fromInput.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const spread = Math.min(resistanceNodes.length * 22, window.innerWidth * 0.72);
  const angle = Math.random() * Math.PI * 2;
  const dist = 30 + Math.random() * Math.max(spread, 120);
  const x = Math.max(50, Math.min(window.innerWidth - 50, cx + Math.cos(angle) * dist));
  const y = Math.max(50, Math.min(window.innerHeight - 50, cy + Math.sin(angle) * dist));
  resistanceNodes.push({
    x, y, r: 30 + Math.random() * 50, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
    age: 0, maxAge: 700 + Math.random() * 600,
    satellites: Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => ({
      angle: Math.random() * Math.PI * 2, dist: 12 + Math.random() * 28,
      rx: 8 + Math.random() * 18, ry: 4 + Math.random() * 10, rot: Math.random() * Math.PI,
    }))
  });
  if (!resistanceRAF) drawResistanceWeb();
}

function drawResistanceWeb() {
  if (!resistanceCtx) return;
  if (!body.classList.contains('resistance-room')) { if (resistanceCanvas) resistanceCanvas.style.opacity = '0'; resistanceRAF = null; return; }
  const W = resistanceCanvas.width, H = resistanceCanvas.height;
  resistanceCtx.clearRect(0, 0, W, H);
  resistanceNodes = resistanceNodes.filter(n => n.age < n.maxAge);
  for (const n of resistanceNodes) {
    n.age++; n.x += n.vx; n.y += n.vy;
    if (n.x < 40 || n.x > W - 40) n.vx *= -1;
    if (n.y < 40 || n.y > H - 40) n.vy *= -1;
  }
  const nodes = resistanceNodes;
  const COLOR = '245, 240, 225';
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 320) continue;
      const t = 1 - dist / 320;
      const ao = Math.min(t * 1.0, 0.88) * Math.min(a.age / 20, 1) * Math.min(b.age / 20, 1);
      const bow = (Math.random() - 0.5) * dist * 0.5;
      const perp = { x: -(b.y - a.y) / dist, y: (b.x - a.x) / dist };
      const mx = (a.x + b.x) / 2 + perp.x * bow;
      const my = (a.y + b.y) / 2 + perp.y * bow;
      resistanceCtx.beginPath(); resistanceCtx.moveTo(a.x, a.y); resistanceCtx.quadraticCurveTo(mx, my, b.x, b.y);
      resistanceCtx.strokeStyle = `rgba(${COLOR},${ao})`; resistanceCtx.lineWidth = 1.0 + t * 2.2; resistanceCtx.stroke();
      if (dist < 120 && t > 0.5) {
        resistanceCtx.beginPath(); resistanceCtx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, 3.5, 0, Math.PI * 2);
        resistanceCtx.fillStyle = `rgba(${COLOR},${Math.min(ao * 1.6, 0.9)})`; resistanceCtx.fill();
      }
    }
  }
  for (const n of nodes) {
    const fadeIn = Math.min(n.age / 20, 1);
    const fadeOut = n.age > n.maxAge - 80 ? (n.maxAge - n.age) / 80 : 1;
    const alpha = fadeIn * fadeOut * 0.95;
    if (alpha <= 0) continue;
    resistanceCtx.beginPath(); resistanceCtx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    resistanceCtx.strokeStyle = `rgba(${COLOR},${alpha * 0.95})`; resistanceCtx.lineWidth = 1.8; resistanceCtx.stroke();
    for (const s of n.satellites) {
      const sx = n.x + Math.cos(s.angle) * (n.r * 0.6 + s.dist);
      const sy = n.y + Math.sin(s.angle) * (n.r * 0.6 + s.dist);
      resistanceCtx.save(); resistanceCtx.translate(sx, sy); resistanceCtx.rotate(s.rot + s.angle);
      resistanceCtx.beginPath(); resistanceCtx.ellipse(0, 0, s.rx, s.ry, 0, 0, Math.PI * 2);
      resistanceCtx.strokeStyle = `rgba(${COLOR},${alpha * 0.80})`; resistanceCtx.lineWidth = 1.3; resistanceCtx.stroke(); resistanceCtx.restore();
    }
    resistanceCtx.beginPath(); resistanceCtx.arc(n.x, n.y, 3.5, 0, Math.PI * 2);
    resistanceCtx.fillStyle = `rgba(${COLOR},${alpha})`; resistanceCtx.fill();
  }
  resistanceRAF = requestAnimationFrame(drawResistanceWeb);
}

let crackCanvas = null, crackCtx = null, crackRAF = null, crackSegments = [], crackRoots = [], lastCrackTime = 0, crackGeneration = 0;

function ensureCrackCanvas() {
  if (crackCanvas) return;
  crackCanvas = document.createElement('canvas');
  crackCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;opacity:0;transition:opacity 0.8s ease;';
  document.body.appendChild(crackCanvas);
  crackCtx = crackCanvas.getContext('2d');
  resizeCrackCanvas();
  window.addEventListener('resize', resizeCrackCanvas);
}

function resizeCrackCanvas() { if (!crackCanvas) return; crackCanvas.width = window.innerWidth; crackCanvas.height = window.innerHeight; }

function buildCrack(x, y, angle, length, width, depth, segments) {
  if (depth <= 0 || length < 4) return;
  const jag = (Math.random() - 0.5) * 0.7;
  const newAngle = angle + jag;
  const segLen = length * (0.55 + Math.random() * 0.35);
  const x2 = x + Math.cos(newAngle) * segLen;
  const y2 = y + Math.sin(newAngle) * segLen;
  const seg = { x1: x, y1: y, x2, y2, width, drawProgress: 0, speed: 0.06 + Math.random() * 0.06, children: [], spawned: false, opacity: 0.82 - (0.06 * (5 - depth)) };
  segments.push(seg);
  const branches = depth > 2 ? (Math.random() < 0.55 ? 2 : 1) : (Math.random() < 0.3 ? 1 : 0);
  for (let b = 0; b < branches; b++) {
    const branchAngle = newAngle + (Math.random() - 0.5) * 1.1 + (b === 1 ? (Math.random() > 0.5 ? 0.5 : -0.5) : 0);
    const branchLen = (length * 0.45) * (0.7 + Math.random() * 0.4);
    const childSegs = [];
    buildCrack(x2, y2, branchAngle, branchLen, width * 0.62, depth - 1, childSegs);
    seg.children.push(childSegs);
  }
}

function spawnCrack(fromInput) {
  if (!body.classList.contains('discomfort-room')) return;
  const now = performance.now();
  if (now - lastCrackTime < 60) return;
  lastCrackTime = now; crackGeneration++;
  ensureCrackCanvas();
  crackCanvas.style.opacity = '1';
  const rect = fromInput.getBoundingClientRect();
  const basex = rect.left + rect.width / 2;
  const basey = rect.top + rect.height / 2;
  const drift = Math.min(crackGeneration * 28, window.innerWidth * 0.85);
  const da = crackGeneration * 0.44;
  const ox = Math.max(60, Math.min(window.innerWidth - 60, basex + Math.cos(da) * drift * 0.75));
  const oy = Math.max(60, Math.min(window.innerHeight - 60, basey + Math.sin(da * 0.58) * drift * 0.65));
  crackRoots.push({ x: ox, y: oy });
  const arms = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < arms; i++) {
    const angle = (Math.PI * 2 * i / arms) + (Math.random() - 0.5) * 1.0;
    const length = 160 + Math.random() * 340;
    const segments = [];
    buildCrack(ox, oy, angle, length, 1.8 + Math.random() * 1.4, 6, segments);
    crackSegments.push(...segments);
  }
  if (!crackRAF) drawCracks();
}

function drawCracks() {
  if (!crackCtx) return;
  if (!body.classList.contains('discomfort-room')) { if (crackCanvas) crackCanvas.style.opacity = '0'; crackRAF = null; return; }
  const W = crackCanvas.width, H = crackCanvas.height;
  crackCtx.clearRect(0, 0, W, H);
  for (const seg of crackSegments) {
    if (seg.drawProgress < 1) {
      seg.drawProgress = Math.min(1, seg.drawProgress + seg.speed);
      if (!seg.spawned && seg.drawProgress > 0.75) { seg.spawned = true; for (const childArr of seg.children) crackSegments.push(...childArr); }
    }
  }
  for (const seg of crackSegments) {
    if (seg.drawProgress <= 0) continue;
    const p = seg.drawProgress;
    const x2 = seg.x1 + (seg.x2 - seg.x1) * p;
    const y2 = seg.y1 + (seg.y2 - seg.y1) * p;
    crackCtx.beginPath(); crackCtx.moveTo(seg.x1, seg.y1);
    if (p > 0.3 && seg.width > 1.2) {
      const mx = (seg.x1 + x2) / 2 + (Math.random() - 0.5) * seg.width * 1.5;
      const my = (seg.y1 + y2) / 2 + (Math.random() - 0.5) * seg.width * 1.5;
      crackCtx.quadraticCurveTo(mx, my, x2, y2);
    } else { crackCtx.lineTo(x2, y2); }
    crackCtx.strokeStyle = `rgba(240,225,180,${seg.opacity * p})`; crackCtx.lineWidth = seg.width * p; crackCtx.lineCap = 'round'; crackCtx.stroke();
    if (seg.width > 2.2 && p > 0.5) {
      crackCtx.beginPath(); crackCtx.moveTo(seg.x1, seg.y1); crackCtx.lineTo(x2, y2);
      crackCtx.strokeStyle = `rgba(10,4,0,${(seg.opacity * 0.6) * p})`; crackCtx.lineWidth = seg.width * 0.35 * p; crackCtx.stroke();
    }
  }
  for (const r of crackRoots) {
    crackCtx.beginPath(); crackCtx.arc(r.x, r.y, 3, 0, Math.PI * 2);
    crackCtx.fillStyle = 'rgba(240,225,180,0.75)'; crackCtx.fill();
  }
  crackRAF = requestAnimationFrame(drawCracks);
}

const _origSetRoom = window.setRoom;
window.setRoom = function(roomName) {
  _origSetRoom(roomName);
  if (roomName !== 'resistance') {
    resistanceNodes = [];
    if (resistanceCanvas) resistanceCanvas.style.opacity = '0';
    if (resistanceRAF) { cancelAnimationFrame(resistanceRAF); resistanceRAF = null; }
  }
  if (roomName !== 'discomfort') {
    crackSegments = []; crackRoots = []; crackGeneration = 0;
    if (crackCanvas) crackCanvas.style.opacity = '0';
    if (crackRAF) { cancelAnimationFrame(crackRAF); crackRAF = null; }
  }
};

let idleFadeTimer = null;
const IDLE_DELAY = 1200;

function showEffects() {
  const rippleField = document.querySelector('.memory-ripple-field');
  const dotField = document.querySelector('.pattern-dot-field');
  if (rippleField) rippleField.style.opacity = '1';
  if (dotField) dotField.style.opacity = '1';
  if (resistanceCanvas && body.classList.contains('resistance-room')) resistanceCanvas.style.opacity = '1';
  if (crackCanvas && body.classList.contains('discomfort-room')) crackCanvas.style.opacity = '1';
}

function scheduleIdleFade() {
  if (idleFadeTimer) clearTimeout(idleFadeTimer);
  idleFadeTimer = setTimeout(() => {
    const rippleField = document.querySelector('.memory-ripple-field');
    const dotField = document.querySelector('.pattern-dot-field');
    if (rippleField) rippleField.style.opacity = '0';
    if (dotField) dotField.style.opacity = '0';
    if (resistanceCanvas) resistanceCanvas.style.opacity = '0';
    if (crackCanvas) crackCanvas.style.opacity = '0';
    setTimeout(() => {
      if (rippleField) rippleField.innerHTML = '';
      if (dotField) dotField.innerHTML = '';
      resistanceNodes = [];
      if (resistanceRAF) { cancelAnimationFrame(resistanceRAF); resistanceRAF = null; }
      if (resistanceCtx && resistanceCanvas) resistanceCtx.clearRect(0, 0, resistanceCanvas.width, resistanceCanvas.height);
      crackSegments = []; crackRoots = []; crackGeneration = 0;
      if (crackRAF) { cancelAnimationFrame(crackRAF); crackRAF = null; }
      if (crackCtx && crackCanvas) crackCtx.clearRect(0, 0, crackCanvas.width, crackCanvas.height);
    }, 900);
  }, IDLE_DELAY);
}

roomInputs.forEach(input => {
  input.addEventListener("input", (e) => {
    if (isAutoAdvancing) return;
    const roomName = input.dataset.room;
    notebookPages[roomName][currentNotebookPage[roomName]] = input.value;
    updateNotebook();
    saveToStorage();
    trackKeystroke(roomName);
    if (e.inputType && e.inputType.startsWith('insert')) {
      showEffects();
      emitRipple(input);
      emitPatternDots(input);
      spawnResistanceNode(input);
      spawnCrack(input);
    }
    scheduleIdleFade();
    requestAnimationFrame(() => autoAdvancePage(input, roomName));
  });
});

function autoAdvancePage(input, roomName) {
  if (!notebookWritingLeft || !notebookLeftPage) return;
  if (isAutoAdvancing) return;
  const writingEl = notebookWritingLeft;
  const pageEl = notebookLeftPage;
  const pageHeight = pageEl.clientHeight;
  if (writingEl.scrollHeight <= pageHeight + 4) return;
  const fullText = input.value;
  if (!fullText.trim()) return;
  const cs = window.getComputedStyle(writingEl);
  const lineHeightPx = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.6;
  const paddingTop = parseFloat(cs.paddingTop) || 0;
  const paddingBot = parseFloat(cs.paddingBottom) || 0;
  const linesPerPage = Math.floor((pageHeight - paddingTop - paddingBot) / lineHeightPx);
  const measurer = document.createElement('div');
  measurer.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;top:-9999px;left:-9999px;width:${writingEl.offsetWidth}px;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};line-height:${cs.lineHeight};letter-spacing:${cs.letterSpacing};white-space:pre-wrap;word-break:break-word;padding:${cs.padding};box-sizing:border-box;`;
  document.body.appendChild(measurer);
  let lo = 0, hi = fullText.length;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    measurer.textContent = fullText.slice(0, mid);
    const renderedLines = Math.round(measurer.scrollHeight / lineHeightPx);
    if (renderedLines <= linesPerPage) lo = mid; else hi = mid;
  }
  document.body.removeChild(measurer);
  let splitAt = lo;
  const lastSpace = fullText.lastIndexOf(' ', lo);
  const lastNewline = fullText.lastIndexOf('\n', lo);
  const wordBound = Math.max(lastSpace, lastNewline);
  if (wordBound > Math.floor(lo * 0.75)) splitAt = wordBound;
  const pageText = fullText.slice(0, splitAt).replace(/[ \t]+$/, '');
  const spillText = fullText.slice(splitAt).replace(/^[\s]+/, '');
  if (!pageText || !spillText) return;
  isAutoAdvancing = true;
  notebookPages[roomName][currentNotebookPage[roomName]] = pageText;
  currentNotebookPage[roomName] += 1;
  while (notebookPages[roomName].length <= currentNotebookPage[roomName] + 1) notebookPages[roomName].push('');
  notebookPages[roomName][currentNotebookPage[roomName]] = spillText;
  animatePageTurn('forward'); playFlipSound('forward'); updateNotebook();
  requestAnimationFrame(() => {
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
    input.scrollTop = input.scrollHeight;
    isAutoAdvancing = false;
  });
}

submitButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const value = input.value.trim();
    const roomName = input.dataset.room;
    if (!value) return;
    notebookPages[roomName][currentNotebookPage[roomName]] = value;
    input.value = "";
    updateNotebook();
    saveToStorage();
  });
});

clearButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const roomName = btn.dataset.room;
    notebookPages[roomName] = [""];
    currentNotebookPage[roomName] = 0;
    const room = document.getElementById(roomName);
    const input = room ? room.querySelector(".room-input") : null;
    if (input) input.value = "";
    updateNotebook(); saveToStorage(); centerNotebook();
  });
});

if (clearAllBtn) {
  clearAllBtn.addEventListener("click", () => {
    Object.keys(notebookPages).forEach(key => { notebookPages[key] = [""]; currentNotebookPage[key] = 0; });
    roomInputs.forEach(input => { input.value = ""; });
    updateNotebook(); centerNotebook();
  });
}

// ── Portrait removed — replaced with diary view ──
// About room now shows saved writings summary

function renderDiaryView() {
  const roomNames = { memory: 'Memory', pattern: 'Pattern', resistance: 'Resistance', discomfort: 'Discomfort' };
  const aboutSection = document.getElementById('about');
  const panel = aboutSection ? aboutSection.querySelector('.panel') : null;
  if (!panel) return;

  // Clear existing content
  panel.innerHTML = '';

  // Title
  const label = document.createElement('p');
  label.className = 'room-label';
  label.textContent = 'YOUR ARCHIVE';
  panel.appendChild(label);

  // Privacy note
  const privacyNote = document.createElement('div');
  privacyNote.style.cssText = 'font-size:0.8rem;color:rgba(14,10,6,0.38);line-height:1.6;margin-bottom:36px;max-width:480px;letter-spacing:0.01em;';
  privacyNote.innerHTML = 'Your writing stays with you. No one else sees this.';
  panel.appendChild(privacyNote);

  // Check if anything written
  const ROOMS_LIST = ['memory', 'pattern', 'resistance', 'discomfort'];
  const hasContent = ROOMS_LIST.some(r => notebookPages[r] && notebookPages[r].some(p => p && p.trim()));

  if (!hasContent) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:rgba(14,10,6,0.38);font-size:1rem;line-height:1.7;max-width:400px;';
    empty.textContent = 'Nothing here yet. Enter a room and write — your words will collect here.';
    panel.appendChild(empty);
  } else {
    ROOMS_LIST.forEach(roomKey => {
      const pages = notebookPages[roomKey];
      if (!pages || !pages.some(p => p && p.trim())) return;

      const section = document.createElement('div');
      section.style.cssText = 'margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid rgba(14,10,6,0.07);';

      const roomLabel = document.createElement('p');
      roomLabel.style.cssText = 'font-size:0.62rem;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:rgba(14,10,6,0.35);margin:0 0 10px;';
      roomLabel.textContent = roomNames[roomKey];
      section.appendChild(roomLabel);

      const text = pages.filter(p => p && p.trim()).join('\n\n');
      const content = document.createElement('p');
      content.style.cssText = 'font-family:"neue-haas-grotesk-display","Helvetica Neue",Helvetica,sans-serif;font-size:1rem;line-height:1.75;color:#0e0a06;margin:0;white-space:pre-wrap;max-width:520px;';
      content.textContent = text;
      section.appendChild(content);

      panel.appendChild(section);
    });
  }

  // Clear all button
  const clearWrap = document.createElement('div');
  clearWrap.style.cssText = 'margin-top:32px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;';

  const clearAllBtn2 = document.createElement('button');
  clearAllBtn2.style.cssText = 'padding:10px 20px;border:1px solid rgba(14,10,6,0.18);background:transparent;border-radius:999px;font-family:"neue-haas-grotesk-text","Helvetica Neue",Helvetica,sans-serif;font-size:0.78rem;font-weight:600;color:rgba(14,10,6,0.50);cursor:pointer;letter-spacing:0.04em;transition:all 0.2s;';
  clearAllBtn2.textContent = 'Clear all writing';
  clearAllBtn2.addEventListener('mouseenter', () => { clearAllBtn2.style.color = '#c00'; clearAllBtn2.style.borderColor = 'rgba(180,0,0,0.3)'; });
  clearAllBtn2.addEventListener('mouseleave', () => { clearAllBtn2.style.color = 'rgba(14,10,6,0.50)'; clearAllBtn2.style.borderColor = 'rgba(14,10,6,0.18)'; });
  clearAllBtn2.addEventListener('click', () => {
    if (!confirm('Clear all writing from all rooms? This cannot be undone.')) return;
    ROOMS_LIST.forEach(key => { notebookPages[key] = [""]; currentNotebookPage[key] = 0; });
    roomInputs.forEach(input => { input.value = ""; });
    updateNotebook();
    saveToStorage();
    renderDiaryView();
  });
  clearWrap.appendChild(clearAllBtn2);
  panel.appendChild(clearWrap);
}

const _setRoomBeforePortrait = window.setRoom;
window.setRoom = function(roomName) {
  _setRoomBeforePortrait(roomName);
  if (roomName === 'about') {
    const aboutSection = document.getElementById('about');
    if (aboutSection) { aboutSection.style.background = '#f8f6f2'; aboutSection.style.color = '#0e0a06'; }
    setTimeout(renderDiaryView, 200);
  }
};

// Portrait overlay removed — diary view replaces it

/* ═══════════════════════════════════════════════════
   AUDIO SYSTEM
═══════════════════════════════════════════════════ */
const landingAudio = document.getElementById('landingAudio');
const muteBtn = document.getElementById('muteBtn');
const muteIcon = document.getElementById('muteIcon');

let audioMuted = false;
let audioStarted = false;

function startLandingAudio() {
  if (audioMuted || !landingAudio) return;
  landingAudio.volume = 0;
  landingAudio.play().catch(() => {});
  let vol = 0;
  const fadeIn = setInterval(() => {
    vol = Math.min(vol + 0.02, 0.4);
    landingAudio.volume = vol;
    if (vol >= 0.4) clearInterval(fadeIn);
  }, 50);
}
function fadeInLandingAudio() {
  if (audioMuted) return;
  startLandingAudio();
}
function fadeOutLandingAudio() {
  if (!landingAudio) return;
  let vol = landingAudio.volume;
  const fade = setInterval(() => {
    vol = Math.max(vol - 0.02, 0);
    landingAudio.volume = vol;
    if (vol <= 0) { clearInterval(fade); landingAudio.pause(); }
  }, 40);
}

function updateMuteBtn() {
  if (!muteBtn || !muteIcon) return;
  if (audioMuted) { muteBtn.classList.add('muted'); muteBtn.style.opacity = '0.4'; }
  else { muteBtn.classList.remove('muted'); muteBtn.style.opacity = '1'; }
  muteIcon.textContent = '♪';
}

// ── Per-room audio tracks ──
const roomAudioSrc = {
  memory:     './Yosi-Horikawa-Fluid-320 copy.mp3',
  pattern:    './Stephan-Bodzin-Singularity-320.mp3',
  resistance: './Gidge-Fauna-Pt-II-320.mp3',
  discomfort: './Rival-Consoles-Recovery-Vessels-Remix-320.mp3',
};

const roomAudioDelay = { memory: 0, pattern: 0, resistance: 0, discomfort: 0 };
const roomAudioStart = { discomfort: 20 };

let currentRoomAudio = null;
let currentRoomName  = null;
let audioUnlocked    = false;
let pendingRoomName  = null;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); ctx.resume().then(() => ctx.close()); } catch(e) {}
  if (pendingRoomName) {
    const r = pendingRoomName; pendingRoomName = null;
    setTimeout(() => crossfadeToRoom(r), 50);
  }
}
document.addEventListener('click', unlockAudio);

function stopRoomAudio() {
  if (currentRoomAudio) {
    const a = currentRoomAudio;
    let vol = a.volume;
    const fade = setInterval(() => {
      vol = Math.max(vol - 0.025, 0);
      a.volume = vol;
      if (vol <= 0) { clearInterval(fade); a.pause(); a.currentTime = 0; }
    }, 30);
    currentRoomAudio = null;
  }
}

function crossfadeToRoom(roomName) {
  if (audioMuted) return;
  const src = roomAudioSrc[roomName];
  const delay = roomAudioDelay[roomName] || 0;
  if (!src) { stopRoomAudio(); return; }
  stopRoomAudio();
  setTimeout(() => {
    if (_trackCurrentRoom !== roomName && roomName !== 'discomfort') return;
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0;
    audio.currentTime = roomAudioStart[roomName] || 0;
    currentRoomAudio = audio;
    currentRoomName = roomName;
    audio.play().then(() => {
      let vol = 0;
      const fadeIn = setInterval(() => {
        vol = Math.min(vol + 0.015, 0.5);
        audio.volume = vol;
        if (vol >= 0.5) clearInterval(fadeIn);
      }, 60);
    }).catch(() => {
      pendingRoomName = roomName;
      currentRoomAudio = null;
    });
  }, delay);
}

function startRoomAudio(roomName) { crossfadeToRoom(roomName); }

if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    audioMuted = !audioMuted;
    if (audioMuted) { if (landingAudio) landingAudio.pause(); stopRoomAudio(); }
    else {
      const activeRoom = document.querySelector('.room.active');
      const roomName = activeRoom ? activeRoom.id : null;
      if (roomName && roomAudioSrc[roomName]) startRoomAudio(roomName);
    }
    updateMuteBtn();
  });
}

const __origEnterFromLanding = window.enterFromLanding;
window.enterFromLanding = function(roomName) {
  fadeOutLandingAudio();
  startRoomAudio(roomName);
  if (__origEnterFromLanding) __origEnterFromLanding(roomName);
};

const __origReturnToLanding = window.returnToLanding;
window.returnToLanding = function() {
  stopRoomAudio();
  if (__origReturnToLanding) __origReturnToLanding();
  setTimeout(fadeInLandingAudio, 400);
};

const _setRoomForAudio = window.setRoom;
window.setRoom = function(roomName) {
  _setRoomForAudio(roomName);
  if (roomAudioSrc[roomName]) { fadeOutLandingAudio(); startRoomAudio(roomName); }
  else stopRoomAudio();
};

if (homeLink) { homeLink.addEventListener('click', () => { setTimeout(fadeInLandingAudio, 500); }); }

// Start landing audio on first user interaction
let landingAudioStarted = false;
function tryStartLandingAudio() {
  if (landingAudioStarted || audioMuted || landingHidden) return;
  landingAudioStarted = true;
  startLandingAudio();
}
document.addEventListener('click', tryStartLandingAudio, { once: true });
document.addEventListener('mousemove', tryStartLandingAudio, { once: true });

updateMuteBtn();
showLandingMode();
updatePresenceButtons(false);
updateNotebook();
centerNotebook();
