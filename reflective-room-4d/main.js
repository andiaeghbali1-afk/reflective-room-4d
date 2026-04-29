/**
 * main.js â€” Reflective Rooms 3D Entrance
 *
 * Builds the Three.js 3D lobby that users see before entering any room.
 * The space is designed to feel like a real anteroom â€” warm walls, sky ceiling,
 * Persian rug, a round table, two plants, and a painting on the left wall.
 *
 * Interaction model:
 * - Mouse movement shifts the camera slightly (parallax feel)
 * - Moving toward the screen (mouse down) approaches the doors
 * - Clicking a door triggers a fade and room transition
 * - Hovering objects shows contextual tooltips
 *
 * The painting tooltip hints at the portrait system without explaining it directly.
 */

import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

const mountEl = document.getElementById('room3dMount');
const embeddedMode = Boolean(mountEl);
const viewportEl = embeddedMode ? mountEl : document.body;
const viewportWidth  = () => (embeddedMode ? mountEl.clientWidth  : window.innerWidth);
const viewportHeight = () => (embeddedMode ? mountEl.clientHeight : window.innerHeight);
const fadeOverlay = document.getElementById('fade-overlay');

if (!mountEl) throw new Error('Missing #room3dMount in HTML');

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TOOLTIP  (single shared element on body)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   SCENE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
// â”€â”€ Scene setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Warm fog matches the wall color so distant edges blend naturally.
// Background color is visible around the edges of the 3D viewport.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7a6e5e);
scene.fog = new THREE.FogExp2(0x7a6e5e, 0.008);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   CAMERA
   The camera position responds to mouse movement for a subtle parallax effect.
   Moving the mouse toward the bottom of the screen triggers an "approach" â€” 
   the camera glides closer to the doors. All movement is lerp-smoothed so
   transitions feel weighted rather than instant.
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const camera = new THREE.PerspectiveCamera(52, viewportWidth() / Math.max(viewportHeight(), 1), 0.1, 100);
const defaultCamera = { x: 0, y: 2.18, z: 9.2 };
camera.position.set(defaultCamera.x, defaultCamera.y, defaultCamera.z);

let targetCameraX = defaultCamera.x;
let targetCameraY = defaultCamera.y;
let targetCameraZ = defaultCamera.z;
let lookTargetX = 0, lookTargetY = 2.02, lookTargetZ = -7.5;
const currentLook = new THREE.Vector3(0, 2.02, -7.5);
const targetLook  = new THREE.Vector3(0, 2.02, -7.5);
const tempVec     = new THREE.Vector3();

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   RENDERER
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(viewportWidth(), viewportHeight());
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.domElement.classList.add('room3d-canvas');
viewportEl.appendChild(renderer.domElement);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   RAYCASTER
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-10, -10);
let hoveredDoor     = null;
let hoveredObject   = null; // any interactive non-door object
let selectedDoor    = null;
let isEntering      = false;

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   APPROACH STATE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
let approachDepth = 0, targetApproachDepth = 0;
const APPROACH_NEAR_Z = 3.8, APPROACH_FAR_Z = defaultCamera.z;

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   HELPERS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   LIGHTS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
// â”€â”€ Lighting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// No point lights or spotlights â€” avoids harsh bright spots on the ceiling.
// Ambient + hemisphere gives soft, even illumination like natural daylight.
// A single directional fill light adds subtle depth from the front.
scene.add(new THREE.AmbientLight(0xe8d8b8, 1.6));
scene.add(new THREE.HemisphereLight(0xf0e0c0, 0x8a7a5a, 1.1));

const frontFill = new THREE.DirectionalLight(0xd4c8b0, 0.65);
frontFill.position.set(0, 5, 8); frontFill.target.position.set(0, 1, -5);
scene.add(frontFill); scene.add(frontFill.target);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MATERIALS
   All surfaces use warm taupe tones (beige-brown family) so the colorful
   doors read clearly against a neutral backdrop. The floor is slightly
   darker than the walls to ground the space visually.
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const wallMat  = new THREE.MeshStandardMaterial({ color: 0xb8a890, roughness: 0.88 });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x9a8e7a, roughness: 0.94 });
const ceilMat  = new THREE.MeshStandardMaterial({ color: 0x8a7e6e, roughness: 0.96 });
const baseMat  = new THREE.MeshStandardMaterial({ color: 0x7a6e60, roughness: 0.86 });

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   ROOM GEOMETRY
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

// Skirting + cornice
[[-6.97, 0, 14, 0], [-6.97, Math.PI/2, 22, -6.97], [1.8, -Math.PI/2, 22, 6.97]].forEach(([pz, ry, len, px]) => {
  const s = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, 0.06), baseMat);
  s.rotation.y = ry; s.position.set(px || 0, 0.09, pz); scene.add(s);
  const c = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.1), baseMat);
  c.rotation.y = ry; c.position.set(px || 0, 5.93, pz); scene.add(c);
});

// No ceiling fixtures

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PLAQUE ICONS  (canvas textures, drawn in 2D)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function makePlaqueTexture(drawFn, doorColor) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Background â€” slightly lighter than wall, warm stone
  ctx.fillStyle = '#e8e3da';
  roundRect(ctx, 0, 0, size, size, 22);
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = 'rgba(0,0,0,0.10)';
  ctx.lineWidth = 3;
  roundRect(ctx, 2, 2, size - 4, size - 4, 20);
  ctx.stroke();

  // Draw the icon using the door color
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

// Memory icon: concentric half-circles (like ripples / echo of memory)
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
  // dot at center-top
  ctx.globalAlpha = 1;
  ctx.fillStyle = hexToRgb(col);
  ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// Pattern icon: repeating grid of small circles
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

// Resistance icon: two opposing arcs with a gap â€” like tension / push-back
function drawResistanceIcon(ctx, size, col) {
  const cx = size / 2, cy = size / 2;
  ctx.strokeStyle = hexToRgb(col);
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  // Left arc pushing right
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(cx - 30, cy, 48, -Math.PI * 0.55, Math.PI * 0.55); ctx.stroke();
  // Right arc pushing left
  ctx.beginPath(); ctx.arc(cx + 30, cy, 48, Math.PI - Math.PI * 0.55, Math.PI + Math.PI * 0.55); ctx.stroke();
  // Gap line in center
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx, cy - 28); ctx.lineTo(cx, cy + 28); ctx.stroke();
  ctx.globalAlpha = 1;
}

// Discomfort icon: jagged zigzag â€” like a crack or sharp edge
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   DOORS
   Each door is a pivot group so it swings open on click.
   Door colors correspond to the four emotional rooms:
   red = memory, blue = pattern, green = resistance, gold = discomfort.
   The pivot is set at the door's hinge edge, not its center.
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PLAQUES  (above each door, on back wall)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const plaques = [];
const plaqueMeshes = []; // for raycasting

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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   ROUND TABLE  (center-foreground)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PLANTS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PLANT LEFT â€” Large bushy ficus, left corner,
   tall and full like the reference left plant
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function createFicusPlant(x, z, scale, discoveryTitle, discoveryDesc) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.userData.type  = 'plant';
  group.userData.title = discoveryTitle;
  group.userData.desc  = discoveryDesc;

  // Large textured pot â€” round, chunky
  const potMat = new THREE.MeshStandardMaterial({ color: 0xd4cfc4, roughness: 0.80 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.50 * scale, 0.38 * scale, 0.72 * scale, 28), potMat);
  pot.position.y = 0.36 * scale; pot.castShadow = true; pot.receiveShadow = true; group.add(pot);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.51 * scale, 0.04 * scale, 8, 32), potMat);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.73 * scale; group.add(rim);

  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.48 * scale, 32),
    new THREE.MeshStandardMaterial({ color: 0x3c2e1e, roughness: 1.0 }));
  soil.rotation.x = -Math.PI / 2; soil.position.y = 0.725 * scale; group.add(soil);

  // Short multi-stem trunk (ficus style â€” splits low)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b5240, roughness: 0.92 });
  [[0, 0], [-0.12, 0.08], [0.10, -0.06]].forEach(([ox, oz], i) => {
    const h = (1.4 + i * 0.15) * scale;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.07 * scale, h, 7), trunkMat);
    stem.position.set(ox * scale, 0.725 * scale + h * 0.5, oz * scale);
    stem.castShadow = true; group.add(stem);
  });

  // Dense layered foliage â€” dark rich greens, many clusters, spread wide
  const f1 = new THREE.MeshStandardMaterial({ color: 0x2d5e35, roughness: 0.88 });
  const f2 = new THREE.MeshStandardMaterial({ color: 0x3a7242, roughness: 0.84 });
  const f3 = new THREE.MeshStandardMaterial({ color: 0x4a8e52, roughness: 0.80 });
  const f4 = new THREE.MeshStandardMaterial({ color: 0x245030, roughness: 0.92 });

  // 14 foliage blobs â€” wide spread, multiple height layers
  const ficusFoliage = [
    [ 0.00, 2.80,  0.00, 0.80, f2],
    [-0.55, 2.55,  0.22, 0.62, f1],
    [ 0.50, 2.52, -0.18, 0.60, f1],
    [ 0.12, 2.30,  0.38, 0.55, f4],
    [-0.38, 2.28, -0.30, 0.52, f4],
    [ 0.00, 3.05,  0.15, 0.50, f3],
    [-0.62, 2.75, -0.10, 0.46, f2],
    [ 0.58, 2.72,  0.20, 0.44, f3],
    [-0.20, 2.10,  0.25, 0.48, f4],
    [ 0.30, 2.15, -0.25, 0.44, f1],
    [-0.45, 3.00,  0.25, 0.38, f3],
    [ 0.40, 2.95, -0.20, 0.36, f2],
    [ 0.00, 1.90,  0.00, 0.42, f4],
    [-0.65, 2.40,  0.30, 0.35, f3],
  ];
  ficusFoliage.forEach(([lx, ly, lz, lr, mat]) => {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(lr * scale, 11, 8), mat);
    leaf.position.set(lx * scale, ly * scale, lz * scale);
    leaf.castShadow = true; group.add(leaf);
  });

  // Warm green light inside
  const pl = new THREE.PointLight(0xb0e8b0, 0.50, 4.0, 2.0);
  pl.position.set(0, 2.7 * scale, 0); group.add(pl);

  scene.add(group);
  return group;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PLANT RIGHT â€” Airy olive/fig tree, closer
   to the right side, sparse and tall like ref
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function createOlivePlant(x, z, scale, discoveryTitle, discoveryDesc) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.userData.type  = 'plant';
  group.userData.title = discoveryTitle;
  group.userData.desc  = discoveryDesc;

  // Slightly slimmer pot
  const potMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 0.78 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * scale, 0.32 * scale, 0.65 * scale, 24), potMat);
  pot.position.y = 0.325 * scale; pot.castShadow = true; pot.receiveShadow = true; group.add(pot);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.43 * scale, 0.036 * scale, 8, 28), potMat);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.66 * scale; group.add(rim);

  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.40 * scale, 28),
    new THREE.MeshStandardMaterial({ color: 0x3c2e1e, roughness: 1.0 }));
  soil.rotation.x = -Math.PI / 2; soil.position.y = 0.655 * scale; group.add(soil);

  // Single slender trunk that leans slightly â€” olive tree style
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a6850, roughness: 0.94 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.038 * scale, 0.065 * scale, 2.2 * scale, 7), trunkMat);
  trunk.position.set(-0.06 * scale, 0.655 * scale + 1.1 * scale, 0);
  trunk.rotation.z = 0.06;
  trunk.castShadow = true; group.add(trunk);

  // Two branch arms splitting near top
  [[0.18, 1.9, 0, 0.5, -0.3], [-0.14, 1.85, 0, 0.45, 0.28]].forEach(([ox, oy, oz, len, angle]) => {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * scale, 0.030 * scale, len * scale, 5), trunkMat);
    branch.position.set(ox * scale, oy * scale, oz * scale);
    branch.rotation.z = angle;
    branch.castShadow = true; group.add(branch);
  });

  // Sparse, airy foliage â€” lighter greens, smaller gaps between blobs
  const o1 = new THREE.MeshStandardMaterial({ color: 0x4e8858, roughness: 0.80 });
  const o2 = new THREE.MeshStandardMaterial({ color: 0x3c7248, roughness: 0.84 });
  const o3 = new THREE.MeshStandardMaterial({ color: 0x62a86e, roughness: 0.76 });
  const o4 = new THREE.MeshStandardMaterial({ color: 0x2e5e38, roughness: 0.88 });

  // Fewer, airier blobs â€” spread outward in delicate clusters
  const oliveFoliage = [
    [ 0.00, 3.10,  0.00, 0.52, o1],
    [ 0.42, 2.88,  0.18, 0.42, o3],
    [-0.36, 2.90, -0.14, 0.40, o2],
    [ 0.22, 3.28,  0.10, 0.34, o3],
    [-0.18, 3.25, -0.08, 0.32, o1],
    [ 0.52, 3.05, -0.20, 0.30, o4],
    [-0.50, 3.08,  0.22, 0.30, o2],
    [ 0.10, 2.72,  0.30, 0.36, o4],
    [-0.28, 2.68, -0.28, 0.34, o1],
    [ 0.35, 3.40,  0.05, 0.26, o3],
    [-0.30, 3.42, -0.05, 0.24, o2],
  ];
  oliveFoliage.forEach(([lx, ly, lz, lr, mat]) => {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(lr * scale, 10, 7), mat);
    leaf.position.set(lx * scale, ly * scale, lz * scale);
    leaf.castShadow = true; group.add(leaf);
  });

  // Slightly brighter fill â€” olive trees feel lighter
  const pl = new THREE.PointLight(0xc0f0b8, 0.45, 3.5, 2.0);
  pl.position.set(0, 3.0 * scale, 0); group.add(pl);

  scene.add(group);
  return group;
}

// Left: large bushy ficus, left side, mid-depth â€” clearly framing the left edge
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

// Left eye — blue fill
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

// Right eye — blue fill
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

// Lips — warm red
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
const plantLeft  = createFicusPlant(-5.8, 1.8, 1.05,
  'Non-linear',
  'You can begin with any room and move freely between them. There is no correct path.');

// Right: airy olive tree, right side, slightly closer to doors
const plantRight = createOlivePlant(5.4, 1.2, 1.0,
  'Anonymous',
  'Nothing you write is recorded, stored, or shared. This space exists only for you, only now.');

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   INTERACTIVE OBJECT REGISTRY
   All non-door raycasting targets in one list
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const interactives = [
  ...plaqueMeshes,
  tableTop,
  rug,
  paintMesh,
  paintFrame,
  // collect all meshes inside each plant group
  ...plantLeft.children.filter(c => c.isMesh),
  ...plantRight.children.filter(c => c.isMesh),
];
// Tag plant children with parent group data
[plantLeft, plantRight].forEach(plant => {
  plant.children.filter(c => c.isMesh).forEach(c => {
    c.userData.type  = 'plant';
    c.userData.title = plant.userData.title;
    c.userData.desc  = plant.userData.desc;
  });
});

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   INPUT
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
    const approachNorm     = Math.max(0, (-mouse.y + 0.1) / 1.1);
    targetApproachDepth    = Math.min(1, approachNorm * 1.1);
    const zBase            = APPROACH_FAR_Z + (APPROACH_NEAR_Z - APPROACH_FAR_Z) * targetApproachDepth;
    const tiltScale        = 1 - targetApproachDepth * 0.4;

    targetCameraX  = mouse.x * 0.42 * tiltScale;
    targetCameraY  = 2.18 + mouse.y * 0.08 * tiltScale;
    targetCameraZ  = zBase;
    lookTargetX    = mouse.x * 0.28 * tiltScale;
    lookTargetY    = 2.02 + mouse.y * 0.03 * tiltScale;
    lookTargetZ    = -7.5;
  }

  // Keep tooltip following cursor
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

  // Clicking a plaque enters that room
  if (hoveredObject && hoveredObject.userData.type === 'plaque') {
    const door = hoveredObject.userData.door;
    triggerEnterRoom(door);
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   HOVER UPDATE  (raycasting â€” doors + interactives)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function updateHover() {
  if (isEntering) return;

  raycaster.setFromCamera(mouse, camera);

  // Check interactives first (plaques, table, plants)
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

  // Check doors
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

  // Nothing hovered
  if (hoveredDoor || hoveredObject) hideTooltip();
  hoveredDoor = null;
  hoveredObject = null;
  renderer.domElement.style.cursor = 'default';
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PLAQUE HOVER ANIMATION
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   DOOR ANIMATION
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   LIGHT FLICKER
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function updateLightFlicker(dt) {}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   ANIMATE LOOP
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
  updateLightFlicker(dt);
  animateSky(dt);

  renderer.render(scene, camera);
}
animate();

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   RESIZE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
window.addEventListener('resize', () => {
  camera.aspect = viewportWidth() / Math.max(viewportHeight(), 1);
  camera.updateProjectionMatrix();
  renderer.setSize(viewportWidth(), viewportHeight());
});
