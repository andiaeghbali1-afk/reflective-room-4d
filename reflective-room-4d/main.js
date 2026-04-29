/**
 * main.js — Reflective Rooms 3D Entrance
 */

import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

const mountEl = document.getElementById('room3dMount');
const embeddedMode = Boolean(mountEl);
const viewportEl = embeddedMode ? mountEl : document.body;
const viewportWidth  = () => (embeddedMode ? mountEl.clientWidth  : window.innerWidth);
const viewportHeight = () => (embeddedMode ? mountEl.clientHeight : window.innerHeight);
const fadeOverlay = document.getElementById('fade-overlay');

if (!mountEl) throw new Error('Missing #room3dMount in HTML');

const tooltip = document.createElement('div');
tooltip.style.cssText = [
  'position:fixed','top:0','left:0','z-index:300',
  'pointer-events:none',
  'font-family:neue-haas-grotesk-text,Helvetica Neue,Helvetica,sans-serif',
  'font-size:0.95rem','font-weight:400','line-height:1.5',
  'letter-spacing:-0.01em',
  'color:#1a1612',
  'background:rgba(242,238,230,0.96)',
  'border:1px solid rgba(0,0,0,0.08)',
  'backdrop-filter:blur(12px)',
  'border-radius:12px',
  'padding:14px 18px',
  'max-width:260px',
  'box-shadow:0 6px 28px rgba(0,0,0,0.11)',
  'opacity:0',
  'transform:translateY(6px)',
  'transition:opacity 0.22s ease,transform 0.22s ease',
  'white-space:normal',
].join(';');
document.body.appendChild(tooltip);

const tooltipTitle = document.createElement('div');
tooltipTitle.style.cssText = 'font-weight:700;font-size:0.68rem;letter-spacing:0.22em;text-transform:uppercase;opacity:0.4;margin-bottom:5px;';
const tooltipBody = document.createElement('div');
tooltip.appendChild(tooltipTitle);
tooltip.appendChild(tooltipBody);

let tooltipVisible = false;
let tooltipMouseX = 0;
let tooltipMouseY = 0;

function showTooltip(title, body, mx, my) {
  tooltipTitle.textContent = title;
  tooltipBody.textContent  = body;
  positionTooltip(mx, my);
  if (!tooltipVisible) {
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'translateY(0)';
    tooltipVisible = true;
  }
}
function hideTooltip() {
  if (tooltipVisible) {
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translateY(6px)';
    tooltipVisible = false;
  }
}
function positionTooltip(mx, my) {
  const tw = tooltip.offsetWidth  || 220;
  const th = tooltip.offsetHeight || 60;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let tx = mx + 18;
  let ty = my - 8;
  if (tx + tw > vw - 10) tx = mx - tw - 14;
  if (ty + th > vh - 10) ty = vh - th - 10;
  tooltip.style.left = `${tx}px`;
  tooltip.style.top  = `${ty}px`;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7a6e5e);
scene.fog = new THREE.FogExp2(0x7a6e5e, 0.008);

const camera = new THREE.PerspectiveCamera(52, viewportWidth() / Math.max(viewportHeight(), 1), 0.1, 100);
const defaultCamera = { x: 0, y: 2.18, z: 9.2 };
camera.position.set(defaultCamera.x, defaultCamera.y, defaultCamera.z);

let targetCameraX = defaultCamera.x;
let targetCameraY = defaultCamera.y;
let targetCameraZ = defaultCamera.z;
let lookTargetX = 0, lookTargetY = 2.02, lookTargetZ = -7.5;
const currentLook = new THREE.Vector3(0, 2.02, -7.5);
const targetLook  = new THREE.Vector3(0, 2.02, -7.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(viewportWidth(), viewportHeight());
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.domElement.classList.add('room3d-canvas');
viewportEl.appendChild(renderer.domElement);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-10, -10);
let hoveredDoor     = null;
let hoveredObject   = null;
let selectedDoor    = null;
let isEntering      = false;

let approachDepth = 0, targetApproachDepth = 0;
const APPROACH_NEAR_Z = 3.8, APPROACH_FAR_Z = defaultCamera.z;

function resetCameraTargets() {
  targetCameraX = defaultCamera.x;
  targetCameraY = defaultCamera.y;
  targetCameraZ = defaultCamera.z;
  lookTargetX = 0; lookTargetY = 2.02; lookTargetZ = -7.5;
}

function resetLandingScene() {
  for (const door of doors) {
    door.userData.isOpen = false;
    door.userData.openProgress = 0;
    door.userData.pivot.rotation.y = 0;
    door.scale.set(1, 1, 1);
  }
  selectedDoor = hoveredDoor = hoveredObject = null;
  isEntering = false;
  approachDepth = 0; targetApproachDepth = 0;
  mouse.set(-10, -10);
  resetCameraTargets();
  camera.position.set(defaultCamera.x, defaultCamera.y, defaultCamera.z);
  currentLook.set(0, 2.02, -7.5);
  targetLook.set(0, 2.02, -7.5);
  renderer.domElement.style.cursor = 'default';
  hideTooltip();
  if (fadeOverlay) fadeOverlay.classList.remove('active');
}
window.resetLandingScene = resetLandingScene;

scene.add(new THREE.AmbientLight(0xe8d8b8, 1.6));
scene.add(new THREE.HemisphereLight(0xf0e0c0, 0x8a7a5a, 1.1));

const frontFill = new THREE.DirectionalLight(0xd4c8b0, 0.65);
frontFill.position.set(0, 5, 8); frontFill.target.position.set(0, 1, -5);
scene.add(frontFill); scene.add(frontFill.target);

const wallMat  = new THREE.MeshStandardMaterial({ color: 0xb8a890, roughness: 0.88 });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x9a8e7a, roughness: 0.94 });
const ceilMat  = new THREE.MeshStandardMaterial({ color: 0x8a7e6e, roughness: 0.96 });
const baseMat  = new THREE.MeshStandardMaterial({ color: 0x7a6e60, roughness: 0.86 });

const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 22), floorMat);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

const skyImg2 = new Image();
skyImg2.src = 'data:image/jpeg;base64,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';
const skyTex = new THREE.Texture(skyImg2);
skyImg2.onload = () => { skyTex.needsUpdate = true; };
skyTex.wrapS = THREE.MirroredRepeatWrapping; skyTex.wrapT = THREE.ClampToEdgeWrapping;
let skyOffset2 = 0, skyTimer = 0;
function animateSky(dt) {
  skyTimer += dt; if (skyTimer > 0.05) { skyTimer = 0; skyOffset2 += 0.003; skyTex.offset.x = skyOffset2; skyTex.needsUpdate = true; }
}
const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(18, 22),
  new THREE.MeshStandardMaterial({ map: skyTex, roughness: 1.0, metalness: 0.0 }));
ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 6, -1); scene.add(ceiling);

const backWallMesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 6.2), wallMat);
backWallMesh.position.set(0, 3.1, -7); backWallMesh.receiveShadow = true; scene.add(backWallMesh);

const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(22, 6.2), wallMat);
leftWall.rotation.y = Math.PI / 2; leftWall.position.set(-7, 3.1, 1.8); scene.add(leftWall);

const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(22, 6.2), wallMat);
rightWall.rotation.y = -Math.PI / 2; rightWall.position.set(7, 3.1, 1.8); scene.add(rightWall);

[[-6.97, 0, 14, 0], [-6.97, Math.PI/2, 22, -6.97], [1.8, -Math.PI/2, 22, 6.97]].forEach(([pz, ry, len, px]) => {
  const s = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, 0.06), baseMat);
  s.rotation.y = ry; s.position.set(px || 0, 0.09, pz); scene.add(s);
  const c = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.1), baseMat);
  c.rotation.y = ry; c.position.set(px || 0, 5.93, pz); scene.add(c);
});

function makePlaqueTexture(drawFn, doorColor) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e8e3da';
  roundRect(ctx, 0, 0, size, size, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.10)';
  ctx.lineWidth = 3;
  roundRect(ctx, 2, 2, size - 4, size - 4, 20);
  ctx.stroke();
  drawFn(ctx, size, doorColor);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hexToRgb(hex) {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  return `rgb(${r},${g},${b})`;
}

function drawMemoryIcon(ctx, size, col) {
  const cx = size / 2, cy = size / 2 + 10;
  ctx.strokeStyle = hexToRgb(col);
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  [38, 58, 78].forEach((r, i) => {
    ctx.globalAlpha = 1 - i * 0.22;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = hexToRgb(col);
  ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPatternIcon(ctx, size, col) {
  ctx.fillStyle = hexToRgb(col);
  const cols = 5, rows = 5;
  const spacing = 38, startX = size / 2 - spacing * 2, startY = size / 2 - spacing * 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const alpha = 0.35 + ((r + c) % 3) * 0.22;
      ctx.globalAlpha = Math.min(alpha, 1);
      const radius = 5 + ((r + c) % 2) * 2;
      ctx.beginPath();
      ctx.arc(startX + c * spacing, startY + r * spacing, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawResistanceIcon(ctx, size, col) {
  const cx = size / 2, cy = size / 2;
  ctx.strokeStyle = hexToRgb(col);
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(cx - 30, cy, 48, -Math.PI * 0.55, Math.PI * 0.55); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + 30, cy, 48, Math.PI - Math.PI * 0.55, Math.PI + Math.PI * 0.55); ctx.stroke();
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx, cy - 28); ctx.lineTo(cx, cy + 28); ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawDiscomfortIcon(ctx, size, col) {
  const cx = size / 2, cy = size / 2;
  ctx.strokeStyle = hexToRgb(col);
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 72, cy + 18);
  ctx.lineTo(cx - 30, cy - 34);
  ctx.lineTo(cx,      cy + 20);
  ctx.lineTo(cx + 30, cy - 34);
  ctx.lineTo(cx + 72, cy + 18);
  ctx.stroke();
}

const plaqueDrawFns = {
  memory:     drawMemoryIcon,
  pattern:    drawPatternIcon,
  resistance: drawResistanceIcon,
  discomfort: drawDiscomfortIcon,
};
const doorColors3 = {
  memory: 0xb52828, pattern: 0x3c72b8, resistance: 0x2a6638, discomfort: 0x8a6e1a
};

function createDoor({ color, x, y = 1.6, z = -6.86, name }) {
  const group = new THREE.Group();
  group.userData.name = name;
  group.userData.room = name;
  group.userData.type = 'door';
  group.userData.isOpen = false;
  group.userData.openProgress = 0;

  const pivot = new THREE.Group();
  pivot.position.set(-0.56, 0, 0);
  group.add(pivot);

  const doorMeshGroup = new THREE.Group();
  doorMeshGroup.position.set(0.56, 0, 0.045);
  pivot.add(doorMeshGroup);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.26, 3.32, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xc8c0b5, roughness: 0.88 })
  );
  frame.position.set(0, 0, -0.12); frame.castShadow = true; frame.receiveShadow = true;
  doorMeshGroup.add(frame);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.12, 3.15, 0.13),
    new THREE.MeshStandardMaterial({ color, roughness: 0.36, metalness: 0.04 })
  );
  body.castShadow = true; body.receiveShadow = true;
  doorMeshGroup.add(body);

  const insetPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 2.55, 0.024),
    new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.01 })
  );
  insetPanel.position.z = 0.076; doorMeshGroup.add(insetPanel);

  [[0.5], [-0.4]].forEach(([py]) => {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.024, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.1 })
    );
    line.position.set(0, py, 0.082); doorMeshGroup.add(line);
  });

  const handlePlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.34, 0.025),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.4, metalness: 0.18 })
  );
  handlePlate.position.set(0.39, -0.06, 0.082); doorMeshGroup.add(handlePlate);

  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.28, 0.045),
    new THREE.MeshStandardMaterial({ color: 0xf4f0e4, roughness: 0.18, metalness: 0.22 })
  );
  handle.position.set(0.39, -0.06, 0.1); doorMeshGroup.add(handle);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x1a1408, transparent: true, opacity: 0.12, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0.56, 0.001, 0.2); pivot.add(shadow);

  group.userData.pivot = pivot;
  group.userData.doorMeshGroup = doorMeshGroup;
  group.position.set(x, y, z);
  scene.add(group);
  return group;
}

const doors = [
  createDoor({ color: 0xb52828, x: -3.0, name: 'memory'     }),
  createDoor({ color: 0x3c72b8, x: -1.0, name: 'pattern'    }),
  createDoor({ color: 0x2a6638, x:  1.0, name: 'resistance' }),
  createDoor({ color: 0x8a6e1a, x:  3.0, name: 'discomfort' }),
];

const plaques = [];
const plaqueMeshes = [];

const doorInfo = {
  memory:     { title: 'Memory',     desc: 'What do you keep returning to, even when you tell yourself it\'s over?' },
  pattern:    { title: 'Pattern',    desc: 'When did you first notice this pattern repeating?' },
  resistance: { title: 'Resistance', desc: 'What are you protecting yourself from?' },
  discomfort: { title: 'Discomfort', desc: 'What feels difficult to admit?' },
};

doors.forEach(door => {
  const name = door.userData.name;
  const tex  = makePlaqueTexture(plaqueDrawFns[name], doorColors3[name]);
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.72, 0.04),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.0 })
  );
  plaque.position.set(door.position.x, door.position.y + 2.55, -6.82);
  plaque.castShadow = true;
  plaque.userData.type  = 'plaque';
  plaque.userData.name  = name;
  plaque.userData.title = doorInfo[name].title;
  plaque.userData.desc  = doorInfo[name].desc;
  plaque.userData.door  = door;
  scene.add(plaque);
  plaques.push(plaque);
  plaqueMeshes.push(plaque);
});

const tableMat = new THREE.MeshStandardMaterial({ color: 0x4a4238, roughness: 0.78 });
const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.05, 0.1, 48), tableMat);
tableTop.position.set(0, 0.72, 1.4);
tableTop.castShadow = true; tableTop.receiveShadow = true;
tableTop.userData.type  = 'table';
tableTop.userData.title = 'Reflective Rooms';
tableTop.userData.desc  = 'A self-guided space built around four emotional states. There is no fixed order. Begin anywhere.';
scene.add(tableTop);

const tableStem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.6, 16), tableMat);
tableStem.position.set(0, 0.38, 1.4);
tableStem.castShadow = true; scene.add(tableStem);

const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 32), tableMat);
tableBase.position.set(0, 0.06, 1.4);
tableBase.receiveShadow = true; scene.add(tableBase);

const rugMat = new THREE.MeshStandardMaterial({ color: 0x8a1a1a, roughness: 0.92, side: THREE.DoubleSide });
const rug = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 5.0), rugMat);
rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.006, 1.2); rug.receiveShadow = true;
rug.userData = { type:'rug', title:'Self-guided', desc:'No scores, no prompts, no fixed path.' };
scene.add(rug);
const rugBorder = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 5.6),
  new THREE.MeshStandardMaterial({ color: 0x6a1010, roughness: 0.92, side: THREE.DoubleSide }));
rugBorder.rotation.x = -Math.PI / 2; rugBorder.position.set(0, 0.004, 1.2); scene.add(rugBorder);

// ── PAINTING — sky background with abstract portrait ──
const paintCanvas = document.createElement('canvas');
paintCanvas.width = 512; paintCanvas.height = 640;
const pctx = paintCanvas.getContext('2d');

// Sky background
const skyGrad = pctx.createLinearGradient(0, 0, 0, 640);
skyGrad.addColorStop(0, '#a8c8e8');
skyGrad.addColorStop(0.4, '#c8dff0');
skyGrad.addColorStop(1, '#d8eaf8');
pctx.fillStyle = skyGrad;
pctx.fillRect(0, 0, 512, 640);

// Clouds
function drawCloud(cx, cy, rx, ry, alpha) {
  pctx.globalAlpha = alpha;
  pctx.fillStyle = '#e8f4ff';
  pctx.beginPath(); pctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2); pctx.fill();
  pctx.fillStyle = '#f0f8ff';
  pctx.beginPath(); pctx.ellipse(cx-rx*0.35, cy+ry*0.2, rx*0.65, ry*0.75, 0, 0, Math.PI*2); pctx.fill();
  pctx.beginPath(); pctx.ellipse(cx+rx*0.35, cy+ry*0.15, rx*0.6, ry*0.7, 0, 0, Math.PI*2); pctx.fill();
  pctx.fillStyle = '#ffffff';
  pctx.beginPath(); pctx.ellipse(cx, cy+ry*0.3, rx*0.8, ry*0.55, 0, 0, Math.PI*2); pctx.fill();
  pctx.globalAlpha = 1;
}
drawCloud(150, 100, 90, 38, 0.75);
drawCloud(370, 78, 72, 30, 0.7);
drawCloud(260, 125, 50, 20, 0.55);

// Sun
pctx.globalAlpha = 0.65;
pctx.fillStyle = '#ffe878';
pctx.beginPath(); pctx.arc(430, 60, 38, 0, Math.PI*2); pctx.fill();
pctx.globalAlpha = 0.2;
pctx.beginPath(); pctx.arc(430, 60, 52, 0, Math.PI*2); pctx.fill();
pctx.globalAlpha = 1;
pctx.fillStyle = '#ffe060';
pctx.beginPath(); pctx.arc(430, 60, 28, 0, Math.PI*2); pctx.fill();

// Skin tone fill
pctx.globalAlpha = 0.55;
pctx.fillStyle = '#f0d8c8';
pctx.beginPath();
pctx.moveTo(182, 195);
pctx.bezierCurveTo(180, 155, 196, 125, 216, 112);
pctx.bezierCurveTo(238, 100, 256, 98, 262, 108);
pctx.bezierCurveTo(280, 96, 306, 92, 326, 100);
pctx.bezierCurveTo(360, 86, 400, 98, 415, 128);
pctx.bezierCurveTo(430, 150, 426, 182, 415, 205);
pctx.bezierCurveTo(406, 225, 395, 250, 388, 268);
pctx.bezierCurveTo(375, 295, 355, 315, 330, 325);
pctx.bezierCurveTo(312, 332, 290, 328, 274, 318);
pctx.bezierCurveTo(252, 305, 235, 278, 226, 252);
pctx.bezierCurveTo(215, 230, 188, 210, 182, 195);
pctx.closePath();
pctx.fill();
pctx.globalAlpha = 1;

// Hair lines — purple
pctx.strokeStyle = '#7a50a0';
pctx.lineWidth = 2.8;
pctx.lineCap = 'round';
pctx.globalAlpha = 0.85;
pctx.beginPath();
pctx.moveTo(162, 195);
pctx.bezierCurveTo(158, 165, 172, 125, 198, 105);
pctx.bezierCurveTo(225, 82, 262, 75, 296, 80);
pctx.bezierCurveTo(330, 75, 365, 82, 388, 100);
pctx.bezierCurveTo(415, 120, 428, 155, 425, 190);
pctx.stroke();
pctx.beginPath();
pctx.moveTo(162, 195);
pctx.bezierCurveTo(155, 208, 148, 225, 155, 245);
pctx.stroke();
pctx.globalAlpha = 1;

// Left eye
pctx.strokeStyle = '#3060a0';
pctx.lineWidth = 2.2;
pctx.globalAlpha = 0.75;
pctx.fillStyle = '#b8d0f0';
pctx.beginPath();
pctx.moveTo(196, 195);
pctx.bezierCurveTo(208, 185, 228, 182, 248, 188);
pctx.bezierCurveTo(264, 193, 272, 205, 268, 215);
pctx.bezierCurveTo(264, 225, 248, 230, 232, 226);
pctx.bezierCurveTo(215, 222, 200, 210, 196, 195);
pctx.closePath();
pctx.fill();
pctx.stroke();

// Right eye
pctx.beginPath();
pctx.moveTo(300, 188);
pctx.bezierCurveTo(315, 178, 338, 175, 358, 181);
pctx.bezierCurveTo(375, 186, 385, 198, 380, 210);
pctx.bezierCurveTo(375, 222, 358, 226, 340, 222);
pctx.bezierCurveTo(322, 218, 305, 206, 300, 188);
pctx.closePath();
pctx.fill();
pctx.stroke();
pctx.globalAlpha = 1;

// Pupils
pctx.fillStyle = '#3060a0';
pctx.globalAlpha = 0.65;
pctx.beginPath(); pctx.arc(232, 208, 7, 0, Math.PI*2); pctx.fill();
pctx.beginPath(); pctx.arc(345, 202, 7, 0, Math.PI*2); pctx.fill();
pctx.fillStyle = '#88b8f0';
pctx.globalAlpha = 0.85;
pctx.beginPath(); pctx.arc(230, 206, 3, 0, Math.PI*2); pctx.fill();
pctx.beginPath(); pctx.arc(343, 200, 3, 0, Math.PI*2); pctx.fill();
pctx.globalAlpha = 1;

// Eyebrows — golden
pctx.strokeStyle = '#a06828';
pctx.lineWidth = 2.8;
pctx.lineCap = 'round';
pctx.globalAlpha = 0.8;
pctx.beginPath();
pctx.moveTo(196, 182);
pctx.bezierCurveTo(212, 174, 235, 172, 252, 178);
pctx.stroke();
pctx.beginPath();
pctx.moveTo(300, 175);
pctx.bezierCurveTo(318, 166, 342, 166, 358, 172);
pctx.stroke();
pctx.globalAlpha = 1;

// Nose
pctx.strokeStyle = '#c87850';
pctx.lineWidth = 1.8;
pctx.globalAlpha = 0.65;
pctx.beginPath();
pctx.moveTo(282, 235);
pctx.bezierCurveTo(275, 255, 272, 275, 278, 288);
pctx.bezierCurveTo(285, 298, 300, 302, 312, 298);
pctx.stroke();
pctx.globalAlpha = 1;

// Lips
pctx.fillStyle = '#e89080';
pctx.strokeStyle = '#c05040';
pctx.lineWidth = 1.8;
pctx.globalAlpha = 0.75;
pctx.beginPath();
pctx.moveTo(270, 310);
pctx.bezierCurveTo(280, 302, 295, 298, 308, 300);
pctx.bezierCurveTo(320, 298, 335, 302, 345, 310);
pctx.bezierCurveTo(335, 320, 320, 325, 308, 324);
pctx.bezierCurveTo(295, 325, 278, 320, 270, 310);
pctx.closePath();
pctx.fill();
pctx.stroke();
pctx.beginPath();
pctx.moveTo(272, 310);
pctx.bezierCurveTo(290, 318, 325, 318, 344, 310);
pctx.stroke();
pctx.globalAlpha = 1;

// Neck — purple
pctx.strokeStyle = '#7a50a0';
pctx.lineWidth = 2.5;
pctx.globalAlpha = 0.7;
pctx.beginPath();
pctx.moveTo(295, 335);
pctx.bezierCurveTo(288, 360, 282, 400, 285, 440);
pctx.bezierCurveTo(287, 470, 292, 500, 295, 530);
pctx.stroke();
pctx.beginPath();
pctx.moveTo(330, 335);
pctx.bezierCurveTo(338, 360, 345, 400, 342, 440);
pctx.bezierCurveTo(340, 470, 338, 500, 338, 530);
pctx.stroke();
pctx.globalAlpha = 1;

// Body lower — orange
pctx.strokeStyle = '#e87840';
pctx.lineWidth = 3;
pctx.globalAlpha = 0.65;
pctx.beginPath();
pctx.moveTo(295, 530);
pctx.bezierCurveTo(292, 570, 290, 610, 292, 640);
pctx.stroke();
pctx.beginPath();
pctx.moveTo(338, 530);
pctx.bezierCurveTo(340, 570, 340, 610, 338, 640);
pctx.stroke();
pctx.globalAlpha = 1;

// Frame
pctx.strokeStyle = 'rgba(88, 120, 160, 0.5)';
pctx.lineWidth = 12;
pctx.strokeRect(6, 6, 500, 628);

const paintTex = new THREE.CanvasTexture(paintCanvas);

const paintFrame = new THREE.Mesh(new THREE.BoxGeometry(2.0,2.5,0.08),
  new THREE.MeshStandardMaterial({color:0x8a7040,roughness:0.4,metalness:0.3}));
paintFrame.position.set(-6.1,3.2,-1.5); paintFrame.rotation.y=Math.PI/2; paintFrame.castShadow=true; scene.add(paintFrame);
const paintMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8,2.3),
  new THREE.MeshStandardMaterial({map:paintTex,roughness:0.8}));
paintMesh.position.set(-6.05,3.2,-1.5); paintMesh.rotation.y=Math.PI/2; scene.add(paintMesh);
paintMesh.userData = paintFrame.userData = {type:'painting',title:'Your Portrait',desc:'Visit at least two rooms, then go to About. A reflection of how you moved through this space will appear.'};

function createFicusPlant(x, z, scale, discoveryTitle, discoveryDesc) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.userData.type  = 'plant';
  group.userData.title = discoveryTitle;
  group.userData.desc  = discoveryDesc;
  const potMat = new THREE.MeshStandardMaterial({ color: 0xd4cfc4, roughness: 0.80 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.50 * scale, 0.38 * scale, 0.72 * scale, 28), potMat);
  pot.position.y = 0.36 * scale; pot.castShadow = true; pot.receiveShadow = true; group.add(pot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.51 * scale, 0.04 * scale, 8, 32), potMat);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.73 * scale; group.add(rim);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.48 * scale, 32),
    new THREE.MeshStandardMaterial({ color: 0x3c2e1e, roughness: 1.0 }));
  soil.rotation.x = -Math.PI / 2; soil.position.y = 0.725 * scale; group.add(soil);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b5240, roughness: 0.92 });
  [[0, 0], [-0.12, 0.08], [0.10, -0.06]].forEach(([ox, oz], i) => {
    const h = (1.4 + i * 0.15) * scale;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.07 * scale, h, 7), trunkMat);
    stem.position.set(ox * scale, 0.725 * scale + h * 0.5, oz * scale);
    stem.castShadow = true; group.add(stem);
  });
  const f1 = new THREE.MeshStandardMaterial({ color: 0x2d5e35, roughness: 0.88 });
  const f2 = new THREE.MeshStandardMaterial({ color: 0x3a7242, roughness: 0.84 });
  const f3 = new THREE.MeshStandardMaterial({ color: 0x4a8e52, roughness: 0.80 });
  const f4 = new THREE.MeshStandardMaterial({ color: 0x245030, roughness: 0.92 });
  const ficusFoliage = [
    [ 0.00, 2.80,  0.00, 0.80, f2],[-0.55, 2.55,  0.22, 0.62, f1],[ 0.50, 2.52, -0.18, 0.60, f1],
    [ 0.12, 2.30,  0.38, 0.55, f4],[-0.38, 2.28, -0.30, 0.52, f4],[ 0.00, 3.05,  0.15, 0.50, f3],
    [-0.62, 2.75, -0.10, 0.46, f2],[ 0.58, 2.72,  0.20, 0.44, f3],[-0.20, 2.10,  0.25, 0.48, f4],
    [ 0.30, 2.15, -0.25, 0.44, f1],[-0.45, 3.00,  0.25, 0.38, f3],[ 0.40, 2.95, -0.20, 0.36, f2],
    [ 0.00, 1.90,  0.00, 0.42, f4],[-0.65, 2.40,  0.30, 0.35, f3],
  ];
  ficusFoliage.forEach(([lx, ly, lz, lr, mat]) => {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(lr * scale, 11, 8), mat);
    leaf.position.set(lx * scale, ly * scale, lz * scale);
    leaf.castShadow = true; group.add(leaf);
  });
  const pl = new THREE.PointLight(0xb0e8b0, 0.50, 4.0, 2.0);
  pl.position.set(0, 2.7 * scale, 0); group.add(pl);
  scene.add(group);
  return group;
}

function createOlivePlant(x, z, scale, discoveryTitle, discoveryDesc) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.userData.type  = 'plant';
  group.userData.title = discoveryTitle;
  group.userData.desc  = discoveryDesc;
  const potMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 0.78 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * scale, 0.32 * scale, 0.65 * scale, 24), potMat);
  pot.position.y = 0.325 * scale; pot.castShadow = true; pot.receiveShadow = true; group.add(pot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.43 * scale, 0.036 * scale, 8, 28), potMat);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.66 * scale; group.add(rim);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.40 * scale, 28),
    new THREE.MeshStandardMaterial({ color: 0x3c2e1e, roughness: 1.0 }));
  soil.rotation.x = -Math.PI / 2; soil.position.y = 0.655 * scale; group.add(soil);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a6850, roughness: 0.94 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.038 * scale, 0.065 * scale, 2.2 * scale, 7), trunkMat);
  trunk.position.set(-0.06 * scale, 0.655 * scale + 1.1 * scale, 0);
  trunk.rotation.z = 0.06; trunk.castShadow = true; group.add(trunk);
  [[0.18, 1.9, 0, 0.5, -0.3], [-0.14, 1.85, 0, 0.45, 0.28]].forEach(([ox, oy, oz, len, angle]) => {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * scale, 0.030 * scale, len * scale, 5), trunkMat);
    branch.position.set(ox * scale, oy * scale, oz * scale);
    branch.rotation.z = angle; branch.castShadow = true; group.add(branch);
  });
  const o1 = new THREE.MeshStandardMaterial({ color: 0x4e8858, roughness: 0.80 });
  const o2 = new THREE.MeshStandardMaterial({ color: 0x3c7248, roughness: 0.84 });
  const o3 = new THREE.MeshStandardMaterial({ color: 0x62a86e, roughness: 0.76 });
  const o4 = new THREE.MeshStandardMaterial({ color: 0x2e5e38, roughness: 0.88 });
  const oliveFoliage = [
    [ 0.00, 3.10,  0.00, 0.52, o1],[ 0.42, 2.88,  0.18, 0.42, o3],[-0.36, 2.90, -0.14, 0.40, o2],
    [ 0.22, 3.28,  0.10, 0.34, o3],[-0.18, 3.25, -0.08, 0.32, o1],[ 0.52, 3.05, -0.20, 0.30, o4],
    [-0.50, 3.08,  0.22, 0.30, o2],[ 0.10, 2.72,  0.30, 0.36, o4],[-0.28, 2.68, -0.28, 0.34, o1],
    [ 0.35, 3.40,  0.05, 0.26, o3],[-0.30, 3.42, -0.05, 0.24, o2],
  ];
  oliveFoliage.forEach(([lx, ly, lz, lr, mat]) => {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(lr * scale, 10, 7), mat);
    leaf.position.set(lx * scale, ly * scale, lz * scale);
    leaf.castShadow = true; group.add(leaf);
  });
  const pl = new THREE.PointLight(0xc0f0b8, 0.45, 3.5, 2.0);
  pl.position.set(0, 3.0 * scale, 0); group.add(pl);
  scene.add(group);
  return group;
}

const plantLeft  = createFicusPlant(-5.8, 1.8, 1.05, 'Non-linear', 'You can begin with any room and move freely between them. There is no correct path.');
const plantRight = createOlivePlant(5.4, 1.2, 1.0, 'Anonymous', 'Nothing you write is recorded, stored, or shared. This space exists only for you, only now.');

const interactives = [
  ...plaqueMeshes, tableTop, rug, paintMesh, paintFrame,
  ...plantLeft.children.filter(c => c.isMesh),
  ...plantRight.children.filter(c => c.isMesh),
];
[plantLeft, plantRight].forEach(plant => {
  plant.children.filter(c => c.isMesh).forEach(c => {
    c.userData.type  = 'plant';
    c.userData.title = plant.userData.title;
    c.userData.desc  = plant.userData.desc;
  });
});

let rawMouseX = 0, rawMouseY = 0;

renderer.domElement.addEventListener('mousemove', (e) => {
  rawMouseX = e.clientX; rawMouseY = e.clientY;
  const rect = renderer.domElement.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                 e.clientY >= rect.top  && e.clientY <= rect.bottom;
  if (!inside && embeddedMode) { mouse.set(-10, -10); return; }
  mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  if (!selectedDoor && !isEntering) {
    const approachNorm  = Math.max(0, (-mouse.y + 0.1) / 1.1);
    targetApproachDepth = Math.min(1, approachNorm * 1.1);
    const zBase         = APPROACH_FAR_Z + (APPROACH_NEAR_Z - APPROACH_FAR_Z) * targetApproachDepth;
    const tiltScale     = 1 - targetApproachDepth * 0.4;
    targetCameraX  = mouse.x * 0.42 * tiltScale;
    targetCameraY  = 2.18 + mouse.y * 0.08 * tiltScale;
    targetCameraZ  = zBase;
    lookTargetX    = mouse.x * 0.28 * tiltScale;
    lookTargetY    = 2.02 + mouse.y * 0.03 * tiltScale;
    lookTargetZ    = -7.5;
  }
  if (tooltipVisible) positionTooltip(e.clientX, e.clientY);
});

renderer.domElement.addEventListener('mouseleave', () => {
  mouse.set(-10, -10);
  targetApproachDepth = 0;
  if (!selectedDoor && !isEntering) resetCameraTargets();
  hideTooltip();
});

renderer.domElement.addEventListener('wheel', (e) => {
  if (isEntering) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.1 : -0.1;
  targetApproachDepth = Math.max(0, Math.min(1, targetApproachDepth + delta));
}, { passive: false });

renderer.domElement.addEventListener('click', (e) => {
  e.stopPropagation();
  if (isEntering) return;
  if (hoveredObject && hoveredObject.userData.type === 'plaque') {
    triggerEnterRoom(hoveredObject.userData.door);
    return;
  }
  if (!hoveredDoor) return;
  triggerEnterRoom(hoveredDoor);
});

function triggerEnterRoom(door) {
  selectedDoor = door;
  isEntering   = true;
  hideTooltip();
  targetCameraX = door.position.x * 0.55;
  targetCameraY = 1.95;
  targetCameraZ = 5.2;
  lookTargetX   = door.position.x;
  lookTargetY   = 1.95;
  lookTargetZ   = -6.95;
  door.userData.isOpen = true;
  setTimeout(() => { if (fadeOverlay) fadeOverlay.classList.add('active'); }, 70);
  setTimeout(() => {
    if (typeof window.enterFromLanding === 'function') {
      window.enterFromLanding(door.userData.room);
    }
  }, 520);
}

function updateHover() {
  if (isEntering) return;
  raycaster.setFromCamera(mouse, camera);
  const hitInteractive = raycaster.intersectObjects(interactives, false);
  if (hitInteractive.length > 0) {
    const obj = hitInteractive[0].object;
    if (obj !== hoveredObject) {
      hoveredObject = obj;
      showTooltip(obj.userData.title, obj.userData.desc, rawMouseX, rawMouseY);
    }
    hoveredDoor = null;
    renderer.domElement.style.cursor = obj.userData.type === 'plaque' ? 'pointer' : 'default';
    return;
  }
  const hitDoors = raycaster.intersectObjects(doors, true);
  if (hitDoors.length > 0) {
    let found = hitDoors[0].object;
    while (found && !doors.includes(found)) found = found.parent;
    if (found !== hoveredDoor) {
      hoveredDoor = found || null;
      if (hoveredDoor) {
        const info = doorInfo[hoveredDoor.userData.name];
        showTooltip(info.title, info.desc, rawMouseX, rawMouseY);
      }
    }
    hoveredObject = null;
    renderer.domElement.style.cursor = 'pointer';
    return;
  }
  if (hoveredDoor || hoveredObject) hideTooltip();
  hoveredDoor = null;
  hoveredObject = null;
  renderer.domElement.style.cursor = 'default';
}

function animatePlaques() {
  for (const p of plaques) {
    const isHovered = (p === hoveredObject);
    const targetY   = p.userData.door.position.y + 2.55 + (isHovered ? 0.04 : 0);
    p.position.y   += (targetY - p.position.y) * 0.12;
    const targetScale = isHovered ? 1.06 : 1;
    p.scale.x += (targetScale - p.scale.x) * 0.12;
    p.scale.y += (targetScale - p.scale.y) * 0.12;
  }
}

function animateDoors() {
  for (const door of doors) {
    const isHov = door === hoveredDoor && !isEntering;
    const hoverScale = isHov ? 1.018 : 1;
    door.scale.x += (hoverScale - door.scale.x) * 0.14;
    door.scale.y += (hoverScale - door.scale.y) * 0.14;
    door.scale.z += (hoverScale - door.scale.z) * 0.14;
    if (door.userData.isOpen) {
      door.userData.openProgress += (1 - door.userData.openProgress) * 0.1;
    } else {
      door.userData.openProgress += (0 - door.userData.openProgress) * 0.1;
    }
    door.userData.pivot.rotation.y = -door.userData.openProgress * 1.05;
  }
}

let lastTime = 0;
function animate(time = 0) {
  requestAnimationFrame(animate);
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  approachDepth += (targetApproachDepth - approachDepth) * 0.055;
  camera.position.x += (targetCameraX - camera.position.x) * 0.06;
  camera.position.y += (targetCameraY - camera.position.y) * 0.06;
  camera.position.z += (targetCameraZ - camera.position.z) * 0.06;
  targetLook.set(lookTargetX, lookTargetY, lookTargetZ);
  currentLook.lerp(targetLook, 0.08);
  camera.lookAt(currentLook);
  updateHover();
  animateDoors();
  animatePlaques();
  animateSky(dt);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = viewportWidth() / Math.max(viewportHeight(), 1);
  camera.updateProjectionMatrix();
  renderer.setSize(viewportWidth(), viewportHeight());
});
