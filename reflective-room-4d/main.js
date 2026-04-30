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
  'position:fixed','top:0','left:0','z-index:300','pointer-events:none',
  'font-family:neue-haas-grotesk-text,Helvetica Neue,Helvetica,sans-serif',
  'font-size:0.95rem','font-weight:400','line-height:1.5','letter-spacing:-0.01em',
  'color:#1a1612','background:rgba(242,238,230,0.96)','border:1px solid rgba(0,0,0,0.08)',
  'backdrop-filter:blur(12px)','border-radius:12px','padding:14px 18px','max-width:260px',
  'box-shadow:0 6px 28px rgba(0,0,0,0.11)','opacity:0','transform:translateY(6px)',
  'transition:opacity 0.22s ease,transform 0.22s ease','white-space:normal',
].join(';');
document.body.appendChild(tooltip);

const tooltipTitle = document.createElement('div');
tooltipTitle.style.cssText = 'font-weight:700;font-size:0.68rem;letter-spacing:0.22em;text-transform:uppercase;opacity:0.4;margin-bottom:5px;';
const tooltipBody = document.createElement('div');
tooltip.appendChild(tooltipTitle);
tooltip.appendChild(tooltipBody);

let tooltipVisible = false;

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
  const tw = tooltip.offsetWidth || 220, th = tooltip.offsetHeight || 60;
  const vw = window.innerWidth, vh = window.innerHeight;
  let tx = mx + 18, ty = my - 8;
  if (tx + tw > vw - 10) tx = mx - tw - 14;
  if (ty + th > vh - 10) ty = vh - th - 10;
  tooltip.style.left = `${tx}px`; tooltip.style.top = `${ty}px`;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7a6e5e);
scene.fog = new THREE.FogExp2(0x7a6e5e, 0.008);

const camera = new THREE.PerspectiveCamera(52, viewportWidth() / Math.max(viewportHeight(), 1), 0.1, 100);
const defaultCamera = { x: 0, y: 2.18, z: 9.2 };
camera.position.set(defaultCamera.x, defaultCamera.y, defaultCamera.z);

let targetCameraX = defaultCamera.x, targetCameraY = defaultCamera.y, targetCameraZ = defaultCamera.z;
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
let hoveredDoor = null, hoveredObject = null, selectedDoor = null, isEntering = false;
let approachDepth = 0, targetApproachDepth = 0;
const APPROACH_NEAR_Z = 3.8, APPROACH_FAR_Z = defaultCamera.z;

function resetCameraTargets() {
  targetCameraX = defaultCamera.x; targetCameraY = defaultCamera.y; targetCameraZ = defaultCamera.z;
  lookTargetX = 0; lookTargetY = 2.02; lookTargetZ = -7.5;
}

function resetLandingScene() {
  for (const door of doors) {
    door.userData.isOpen = false; door.userData.openProgress = 0;
    door.userData.pivot.rotation.y = 0; door.scale.set(1, 1, 1);
  }
  selectedDoor = hoveredDoor = hoveredObject = null;
  isEntering = false; approachDepth = 0; targetApproachDepth = 0;
  mouse.set(-10, -10); resetCameraTargets();
  camera.position.set(defaultCamera.x, defaultCamera.y, defaultCamera.z);
  currentLook.set(0, 2.02, -7.5); targetLook.set(0, 2.02, -7.5);
  renderer.domElement.style.cursor = 'default'; hideTooltip();
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
const baseMat  = new THREE.MeshStandardMaterial({ color: 0x7a6e60, roughness: 0.86 });

const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 22), floorMat);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

// Sky texture — loaded from file in repo
const skyImg2 = new Image();
skyImg2.src = './sky (wecompress.com).jpg';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';
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

[[-6.97,0,14,0],[-6.97,Math.PI/2,22,-6.97],[1.8,-Math.PI/2,22,6.97]].forEach(([pz,ry,len,px])=>{
  const s=new THREE.Mesh(new THREE.BoxGeometry(len,0.18,0.06),baseMat);
  s.rotation.y=ry;s.position.set(px||0,0.09,pz);scene.add(s);
  const c=new THREE.Mesh(new THREE.BoxGeometry(len,0.14,0.1),baseMat);
  c.rotation.y=ry;c.position.set(px||0,5.93,pz);scene.add(c);
});

function makePlaqueTexture(drawFn,doorColor){
  const size=256,canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#e8e3da';roundRect(ctx,0,0,size,size,22);ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.10)';ctx.lineWidth=3;roundRect(ctx,2,2,size-4,size-4,20);ctx.stroke();
  drawFn(ctx,size,doorColor);
  return new THREE.CanvasTexture(canvas);
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}
function hexToRgb(hex){const r=(hex>>16)&255,g=(hex>>8)&255,b=hex&255;return `rgb(${r},${g},${b})`;}
function drawMemoryIcon(ctx,size,col){
  const cx=size/2,cy=size/2+10;ctx.strokeStyle=hexToRgb(col);ctx.lineWidth=7;ctx.lineCap='round';
  [38,58,78].forEach((r,i)=>{ctx.globalAlpha=1-i*0.22;ctx.beginPath();ctx.arc(cx,cy,r,Math.PI,2*Math.PI);ctx.stroke();});
  ctx.globalAlpha=1;ctx.fillStyle=hexToRgb(col);ctx.beginPath();ctx.arc(cx,cy,7,0,Math.PI*2);ctx.fill();
}
function drawPatternIcon(ctx,size,col){
  ctx.fillStyle=hexToRgb(col);const sp=38,sx=size/2-sp*2,sy=size/2-sp*2;
  for(let r=0;r<5;r++)for(let c=0;c<5;c++){
    ctx.globalAlpha=Math.min(0.35+((r+c)%3)*0.22,1);
    ctx.beginPath();ctx.arc(sx+c*sp,sy+r*sp,5+((r+c)%2)*2,0,Math.PI*2);ctx.fill();
  }ctx.globalAlpha=1;
}
function drawResistanceIcon(ctx,size,col){
  const cx=size/2,cy=size/2;ctx.strokeStyle=hexToRgb(col);ctx.lineWidth=8;ctx.lineCap='round';ctx.globalAlpha=1;
  ctx.beginPath();ctx.arc(cx-30,cy,48,-Math.PI*0.55,Math.PI*0.55);ctx.stroke();
  ctx.beginPath();ctx.arc(cx+30,cy,48,Math.PI-Math.PI*0.55,Math.PI+Math.PI*0.55);ctx.stroke();
  ctx.globalAlpha=0.4;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy-28);ctx.lineTo(cx,cy+28);ctx.stroke();ctx.globalAlpha=1;
}
function drawDiscomfortIcon(ctx,size,col){
  const cx=size/2,cy=size/2;ctx.strokeStyle=hexToRgb(col);ctx.lineWidth=7;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(cx-72,cy+18);ctx.lineTo(cx-30,cy-34);ctx.lineTo(cx,cy+20);
  ctx.lineTo(cx+30,cy-34);ctx.lineTo(cx+72,cy+18);ctx.stroke();
}
const plaqueDrawFns={memory:drawMemoryIcon,pattern:drawPatternIcon,resistance:drawResistanceIcon,discomfort:drawDiscomfortIcon};
const doorColors3={memory:0xb52828,pattern:0x3c72b8,resistance:0x2a6638,discomfort:0x8a6e1a};

function createDoor({color,x,y=1.6,z=-6.86,name}){
  const group=new THREE.Group();
  group.userData={name,room:name,type:'door',isOpen:false,openProgress:0};
  const pivot=new THREE.Group();pivot.position.set(-0.56,0,0);group.add(pivot);
  const dmg=new THREE.Group();dmg.position.set(0.56,0,0.045);pivot.add(dmg);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(1.26,3.32,0.1),new THREE.MeshStandardMaterial({color:0xc8c0b5,roughness:0.88}));
  frame.position.set(0,0,-0.12);frame.castShadow=true;dmg.add(frame);
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.12,3.15,0.13),new THREE.MeshStandardMaterial({color,roughness:0.36,metalness:0.04}));
  body.castShadow=true;dmg.add(body);
  const inset=new THREE.Mesh(new THREE.BoxGeometry(0.82,2.55,0.024),new THREE.MeshStandardMaterial({color,roughness:0.48}));
  inset.position.z=0.076;dmg.add(inset);
  [[0.5],[-0.4]].forEach(([py])=>{
    const l=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.024,0.02),new THREE.MeshStandardMaterial({color:0,transparent:true,opacity:0.1}));
    l.position.set(0,py,0.082);dmg.add(l);
  });
  const hp=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.34,0.025),new THREE.MeshStandardMaterial({color:0xe8e2d6,roughness:0.4,metalness:0.18}));
  hp.position.set(0.39,-0.06,0.082);dmg.add(hp);
  const h=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.28,0.045),new THREE.MeshStandardMaterial({color:0xf4f0e4,roughness:0.18,metalness:0.22}));
  h.position.set(0.39,-0.06,0.1);dmg.add(h);
  const sh=new THREE.Mesh(new THREE.PlaneGeometry(1.4,0.5),new THREE.MeshStandardMaterial({color:0x1a1408,transparent:true,opacity:0.12,depthWrite:false}));
  sh.rotation.x=-Math.PI/2;sh.position.set(0.56,0.001,0.2);pivot.add(sh);
  group.userData.pivot=pivot;group.userData.doorMeshGroup=dmg;
  group.position.set(x,y,z);scene.add(group);return group;
}

const doors=[
  createDoor({color:0xb52828,x:-3.0,name:'memory'}),
  createDoor({color:0x3c72b8,x:-1.0,name:'pattern'}),
  createDoor({color:0x2a6638,x: 1.0,name:'resistance'}),
  createDoor({color:0x8a6e1a,x: 3.0,name:'discomfort'}),
];

const plaques=[],plaqueMeshes=[];
const doorInfo={
  memory:{title:'Memory',desc:"What do you keep returning to, even when you tell yourself it's over?"},
  pattern:{title:'Pattern',desc:'When did you first notice this pattern repeating?'},
  resistance:{title:'Resistance',desc:'What are you protecting yourself from?'},
  discomfort:{title:'Discomfort',desc:'What feels difficult to admit?'},
};

doors.forEach(door=>{
  const name=door.userData.name;
  const tex=makePlaqueTexture(plaqueDrawFns[name],doorColors3[name]);
  const plaque=new THREE.Mesh(new THREE.BoxGeometry(0.72,0.72,0.04),new THREE.MeshStandardMaterial({map:tex,roughness:0.55}));
  plaque.position.set(door.position.x,door.position.y+2.55,-6.82);plaque.castShadow=true;
  plaque.userData={type:'plaque',name,title:doorInfo[name].title,desc:doorInfo[name].desc,door};
  scene.add(plaque);plaques.push(plaque);plaqueMeshes.push(plaque);
});

const tableMat=new THREE.MeshStandardMaterial({color:0x4a4238,roughness:0.78});
const tableTop=new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.05,0.1,48),tableMat);
tableTop.position.set(0,0.72,1.4);tableTop.castShadow=true;tableTop.receiveShadow=true;
tableTop.userData={type:'table',title:'Reflective Rooms',desc:'A self-guided space built around four emotional states. There is no fixed order. Begin anywhere.'};
scene.add(tableTop);
const tableStem=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.18,0.6,16),tableMat);
tableStem.position.set(0,0.38,1.4);tableStem.castShadow=true;scene.add(tableStem);
const tableBase=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.06,32),tableMat);
tableBase.position.set(0,0.06,1.4);tableBase.receiveShadow=true;scene.add(tableBase);

const rugMat=new THREE.MeshStandardMaterial({color:0x8a1a1a,roughness:0.92,side:THREE.DoubleSide});
const rug=new THREE.Mesh(new THREE.PlaneGeometry(6.5,5.0),rugMat);
rug.rotation.x=-Math.PI/2;rug.position.set(0,0.006,1.2);rug.receiveShadow=true;
rug.userData={type:'rug',title:'Self-guided',desc:'No scores, no prompts, no fixed path.'};
scene.add(rug);
const rugBorder=new THREE.Mesh(new THREE.PlaneGeometry(7.2,5.6),new THREE.MeshStandardMaterial({color:0x6a1010,roughness:0.92,side:THREE.DoubleSide}));
rugBorder.rotation.x=-Math.PI/2;rugBorder.position.set(0,0.004,1.2);scene.add(rugBorder);

// PAINTING — your abstract line art portrait with color stripes
const paintCanvas=document.createElement('canvas');
paintCanvas.width=512;paintCanvas.height=640;
const pctx=paintCanvas.getContext('2d');

pctx.fillStyle='#f9f9f9';
pctx.fillRect(0,0,512,640);

// Red triangle bottom left
pctx.fillStyle='#8b1515';
pctx.beginPath();
pctx.moveTo(0,440);pctx.lineTo(0,640);pctx.lineTo(120,640);pctx.closePath();pctx.fill();

// Blue patch
pctx.fillStyle='#1a3a8a';
pctx.beginPath();
pctx.moveTo(0,560);pctx.lineTo(0,640);pctx.lineTo(75,640);pctx.lineTo(0,580);pctx.closePath();pctx.fill();

// Green diagonal band
pctx.fillStyle='#1e6b22';
pctx.beginPath();
pctx.moveTo(55,640);pctx.lineTo(512,240);pctx.lineTo(512,155);pctx.lineTo(0,535);pctx.lineTo(0,590);pctx.closePath();pctx.fill();

// Olive band
pctx.fillStyle='#6e8018';
pctx.beginPath();
pctx.moveTo(90,640);pctx.lineTo(512,360);pctx.lineTo(512,240);pctx.lineTo(55,640);pctx.closePath();pctx.fill();

// Ragged torn edges
pctx.fillStyle='#f9f9f9';
for(let i=0;i<80;i++){
  const t=i/80,x=60+t*460+Math.sin(i*2.3)*12,y=640-t*400-20+Math.random()*22;
  pctx.beginPath();pctx.ellipse(x,y,5+Math.random()*12,3+Math.random()*9,Math.random()*0.6,0,Math.PI*2);pctx.fill();
}
for(let i=0;i<65;i++){
  const t=i/65,x=90+t*430+Math.sin(i*1.8)*10,y=640-t*275-70+Math.random()*18;
  pctx.beginPath();pctx.ellipse(x,y,4+Math.random()*9,2+Math.random()*7,Math.random()*0.6,0,Math.PI*2);pctx.fill();
}

// Line art
pctx.lineCap='round';pctx.lineJoin='round';

// Head oval
pctx.strokeStyle='#111111';pctx.lineWidth=2.5;
pctx.beginPath();
pctx.moveTo(248,52);
pctx.bezierCurveTo(342,42,408,88,412,172);
pctx.bezierCurveTo(416,256,372,332,312,368);
pctx.bezierCurveTo(278,388,246,388,220,370);
pctx.bezierCurveTo(188,348,170,302,168,248);
pctx.bezierCurveTo(164,180,178,78,248,52);
pctx.stroke();

// Long sharp line from left
pctx.lineWidth=2.0;
pctx.beginPath();pctx.moveTo(68,182);
pctx.bezierCurveTo(120,175,185,172,228,178);pctx.stroke();

// Upper eye sweep
pctx.lineWidth=2.2;
pctx.beginPath();pctx.moveTo(168,195);
pctx.bezierCurveTo(200,178,248,170,292,175);
pctx.bezierCurveTo(340,180,385,192,418,188);pctx.stroke();

// Lower eye curve
pctx.beginPath();pctx.moveTo(178,215);
pctx.bezierCurveTo(215,228,262,238,298,228);
pctx.bezierCurveTo(340,218,378,210,415,218);pctx.stroke();

// Inner face curve
pctx.lineWidth=1.8;
pctx.beginPath();pctx.moveTo(222,178);
pctx.bezierCurveTo(238,210,245,240,240,268);
pctx.bezierCurveTo(236,285,242,298,258,305);pctx.stroke();

// Nose
pctx.lineWidth=1.5;
pctx.beginPath();pctx.moveTo(268,295);
pctx.bezierCurveTo(262,310,260,328,266,340);
pctx.bezierCurveTo(272,348,285,350,295,346);pctx.stroke();

// Lips upper
pctx.lineWidth=1.8;
pctx.beginPath();pctx.moveTo(258,362);
pctx.bezierCurveTo(268,354,285,352,295,354);
pctx.bezierCurveTo(305,352,318,354,325,362);pctx.stroke();
// Lips lower
pctx.beginPath();pctx.moveTo(258,362);
pctx.bezierCurveTo(270,372,285,376,295,375);
pctx.bezierCurveTo(305,376,318,372,325,362);pctx.stroke();

// Neck left
pctx.lineWidth=2.2;pctx.globalAlpha=0.9;
pctx.beginPath();pctx.moveTo(220,385);
pctx.bezierCurveTo(210,425,202,480,205,540);
pctx.bezierCurveTo(207,580,212,615,215,645);pctx.stroke();

// Neck right
pctx.lineWidth=2.5;
pctx.beginPath();pctx.moveTo(285,388);
pctx.bezierCurveTo(292,430,296,488,292,548);
pctx.bezierCurveTo(289,588,284,620,282,645);pctx.stroke();

// Thin trailing line
pctx.lineWidth=0.9;pctx.globalAlpha=0.45;
pctx.beginPath();pctx.moveTo(248,388);
pctx.bezierCurveTo(246,428,244,480,246,535);
pctx.bezierCurveTo(248,575,250,612,250,645);pctx.stroke();

pctx.globalAlpha=1;
pctx.strokeStyle='rgba(0,0,0,0.2)';pctx.lineWidth=9;
pctx.strokeRect(5,5,502,630);

const paintTex=new THREE.CanvasTexture(paintCanvas);
const paintFrame=new THREE.Mesh(new THREE.BoxGeometry(2.0,2.5,0.08),new THREE.MeshStandardMaterial({color:0x8a7040,roughness:0.4,metalness:0.3}));
paintFrame.position.set(-6.1,3.2,-1.5);paintFrame.rotation.y=Math.PI/2;paintFrame.castShadow=true;scene.add(paintFrame);
const paintMesh=new THREE.Mesh(new THREE.PlaneGeometry(1.8,2.3),new THREE.MeshStandardMaterial({map:paintTex,roughness:0.8}));
paintMesh.position.set(-6.05,3.2,-1.5);paintMesh.rotation.y=Math.PI/2;scene.add(paintMesh);
paintMesh.userData=paintFrame.userData={type:'painting',title:'Your Portrait',desc:'Visit at least two rooms, then go to About. A reflection of how you moved through this space will appear.'};

function createFicusPlant(x,z,scale,t,d){
  const g=new THREE.Group();g.position.set(x,0,z);g.userData={type:'plant',title:t,desc:d};
  const pm=new THREE.MeshStandardMaterial({color:0xd4cfc4,roughness:0.80});
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(0.50*scale,0.38*scale,0.72*scale,28),pm);
  pot.position.y=0.36*scale;pot.castShadow=true;pot.receiveShadow=true;g.add(pot);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(0.51*scale,0.04*scale,8,32),pm);
  rim.rotation.x=Math.PI/2;rim.position.y=0.73*scale;g.add(rim);
  const soil=new THREE.Mesh(new THREE.CircleGeometry(0.48*scale,32),new THREE.MeshStandardMaterial({color:0x3c2e1e,roughness:1.0}));
  soil.rotation.x=-Math.PI/2;soil.position.y=0.725*scale;g.add(soil);
  const tm=new THREE.MeshStandardMaterial({color:0x6b5240,roughness:0.92});
  [[0,0],[-0.12,0.08],[0.10,-0.06]].forEach(([ox,oz],i)=>{
    const h=(1.4+i*0.15)*scale;
    const s=new THREE.Mesh(new THREE.CylinderGeometry(0.04*scale,0.07*scale,h,7),tm);
    s.position.set(ox*scale,0.725*scale+h*0.5,oz*scale);s.castShadow=true;g.add(s);
  });
  const f1=new THREE.MeshStandardMaterial({color:0x2d5e35,roughness:0.88});
  const f2=new THREE.MeshStandardMaterial({color:0x3a7242,roughness:0.84});
  const f3=new THREE.MeshStandardMaterial({color:0x4a8e52,roughness:0.80});
  const f4=new THREE.MeshStandardMaterial({color:0x245030,roughness:0.92});
  [[0,2.80,0,0.80,f2],[-0.55,2.55,0.22,0.62,f1],[0.50,2.52,-0.18,0.60,f1],
   [0.12,2.30,0.38,0.55,f4],[-0.38,2.28,-0.30,0.52,f4],[0,3.05,0.15,0.50,f3],
   [-0.62,2.75,-0.10,0.46,f2],[0.58,2.72,0.20,0.44,f3],[-0.20,2.10,0.25,0.48,f4],
   [0.30,2.15,-0.25,0.44,f1],[-0.45,3.00,0.25,0.38,f3],[0.40,2.95,-0.20,0.36,f2],
   [0,1.90,0,0.42,f4],[-0.65,2.40,0.30,0.35,f3]
  ].forEach(([lx,ly,lz,lr,mat])=>{
    const l=new THREE.Mesh(new THREE.SphereGeometry(lr*scale,11,8),mat);
    l.position.set(lx*scale,ly*scale,lz*scale);l.castShadow=true;g.add(l);
  });
  const pl=new THREE.PointLight(0xb0e8b0,0.50,4.0,2.0);pl.position.set(0,2.7*scale,0);g.add(pl);
  scene.add(g);return g;
}

function createOlivePlant(x,z,scale,t,d){
  const g=new THREE.Group();g.position.set(x,0,z);g.userData={type:'plant',title:t,desc:d};
  const pm=new THREE.MeshStandardMaterial({color:0xd8d2c6,roughness:0.78});
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(0.42*scale,0.32*scale,0.65*scale,24),pm);
  pot.position.y=0.325*scale;pot.castShadow=true;pot.receiveShadow=true;g.add(pot);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(0.43*scale,0.036*scale,8,28),pm);
  rim.rotation.x=Math.PI/2;rim.position.y=0.66*scale;g.add(rim);
  const soil=new THREE.Mesh(new THREE.CircleGeometry(0.40*scale,28),new THREE.MeshStandardMaterial({color:0x3c2e1e,roughness:1.0}));
  soil.rotation.x=-Math.PI/2;soil.position.y=0.655*scale;g.add(soil);
  const tm=new THREE.MeshStandardMaterial({color:0x7a6850,roughness:0.94});
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.038*scale,0.065*scale,2.2*scale,7),tm);
  trunk.position.set(-0.06*scale,0.655*scale+1.1*scale,0);trunk.rotation.z=0.06;trunk.castShadow=true;g.add(trunk);
  [[0.18,1.9,0,0.5,-0.3],[-0.14,1.85,0,0.45,0.28]].forEach(([ox,oy,oz,len,angle])=>{
    const b=new THREE.Mesh(new THREE.CylinderGeometry(0.018*scale,0.030*scale,len*scale,5),tm);
    b.position.set(ox*scale,oy*scale,oz*scale);b.rotation.z=angle;b.castShadow=true;g.add(b);
  });
  const o1=new THREE.MeshStandardMaterial({color:0x4e8858,roughness:0.80});
  const o2=new THREE.MeshStandardMaterial({color:0x3c7248,roughness:0.84});
  const o3=new THREE.MeshStandardMaterial({color:0x62a86e,roughness:0.76});
  const o4=new THREE.MeshStandardMaterial({color:0x2e5e38,roughness:0.88});
  [[0,3.10,0,0.52,o1],[0.42,2.88,0.18,0.42,o3],[-0.36,2.90,-0.14,0.40,o2],
   [0.22,3.28,0.10,0.34,o3],[-0.18,3.25,-0.08,0.32,o1],[0.52,3.05,-0.20,0.30,o4],
   [-0.50,3.08,0.22,0.30,o2],[0.10,2.72,0.30,0.36,o4],[-0.28,2.68,-0.28,0.34,o1],
   [0.35,3.40,0.05,0.26,o3],[-0.30,3.42,-0.05,0.24,o2]
  ].forEach(([lx,ly,lz,lr,mat])=>{
    const l=new THREE.Mesh(new THREE.SphereGeometry(lr*scale,10,7),mat);
    l.position.set(lx*scale,ly*scale,lz*scale);l.castShadow=true;g.add(l);
  });
  const pl=new THREE.PointLight(0xc0f0b8,0.45,3.5,2.0);pl.position.set(0,3.0*scale,0);g.add(pl);
  scene.add(g);return g;
}

const plantLeft=createFicusPlant(-5.8,1.8,1.05,'Non-linear','You can begin with any room and move freely between them. There is no correct path.');
const plantRight=createOlivePlant(5.4,1.2,1.0,'Anonymous','Nothing you write is recorded, stored, or shared. This space exists only for you, only now.');

const interactives=[...plaqueMeshes,tableTop,rug,paintMesh,paintFrame,
  ...plantLeft.children.filter(c=>c.isMesh),...plantRight.children.filter(c=>c.isMesh)];
[plantLeft,plantRight].forEach(plant=>{
  plant.children.filter(c=>c.isMesh).forEach(c=>{c.userData={type:'plant',title:plant.userData.title,desc:plant.userData.desc};});
});

let rawMouseX=0,rawMouseY=0;

renderer.domElement.addEventListener('mousemove',(e)=>{
  rawMouseX=e.clientX;rawMouseY=e.clientY;
  const rect=renderer.domElement.getBoundingClientRect();
  const inside=e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
  if(!inside&&embeddedMode){mouse.set(-10,-10);return;}
  mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
  mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
  if(!selectedDoor&&!isEntering){
    const an=Math.max(0,(-mouse.y+0.1)/1.1);
    targetApproachDepth=Math.min(1,an*1.1);
    const zBase=APPROACH_FAR_Z+(APPROACH_NEAR_Z-APPROACH_FAR_Z)*targetApproachDepth;
    const ts=1-targetApproachDepth*0.4;
    targetCameraX=mouse.x*0.42*ts;targetCameraY=2.18+mouse.y*0.08*ts;targetCameraZ=zBase;
    lookTargetX=mouse.x*0.28*ts;lookTargetY=2.02+mouse.y*0.03*ts;lookTargetZ=-7.5;
  }
  if(tooltipVisible)positionTooltip(e.clientX,e.clientY);
});
renderer.domElement.addEventListener('mouseleave',()=>{
  mouse.set(-10,-10);targetApproachDepth=0;
  if(!selectedDoor&&!isEntering)resetCameraTargets();hideTooltip();
});
renderer.domElement.addEventListener('wheel',(e)=>{
  if(isEntering)return;e.preventDefault();
  targetApproachDepth=Math.max(0,Math.min(1,targetApproachDepth+(e.deltaY>0?0.1:-0.1)));
},{passive:false});
renderer.domElement.addEventListener('click',(e)=>{
  e.stopPropagation();if(isEntering)return;
  if(hoveredObject&&hoveredObject.userData.type==='plaque'){triggerEnterRoom(hoveredObject.userData.door);return;}
  if(!hoveredDoor)return;triggerEnterRoom(hoveredDoor);
});

function triggerEnterRoom(door){
  selectedDoor=door;isEntering=true;hideTooltip();
  targetCameraX=door.position.x*0.55;targetCameraY=1.95;targetCameraZ=5.2;
  lookTargetX=door.position.x;lookTargetY=1.95;lookTargetZ=-6.95;
  door.userData.isOpen=true;
  setTimeout(()=>{if(fadeOverlay)fadeOverlay.classList.add('active');},70);
  setTimeout(()=>{if(typeof window.enterFromLanding==='function')window.enterFromLanding(door.userData.room);},520);
}

function updateHover(){
  if(isEntering)return;
  raycaster.setFromCamera(mouse,camera);
  const hi=raycaster.intersectObjects(interactives,false);
  if(hi.length>0){
    const obj=hi[0].object;
    if(obj!==hoveredObject){hoveredObject=obj;showTooltip(obj.userData.title,obj.userData.desc,rawMouseX,rawMouseY);}
    hoveredDoor=null;renderer.domElement.style.cursor=obj.userData.type==='plaque'?'pointer':'default';return;
  }
  const hd=raycaster.intersectObjects(doors,true);
  if(hd.length>0){
    let found=hd[0].object;
    while(found&&!doors.includes(found))found=found.parent;
    if(found!==hoveredDoor){hoveredDoor=found||null;if(hoveredDoor){const info=doorInfo[hoveredDoor.userData.name];showTooltip(info.title,info.desc,rawMouseX,rawMouseY);}}
    hoveredObject=null;renderer.domElement.style.cursor='pointer';return;
  }
  if(hoveredDoor||hoveredObject)hideTooltip();
  hoveredDoor=null;hoveredObject=null;renderer.domElement.style.cursor='default';
}

function animatePlaques(){
  for(const p of plaques){
    const ih=(p===hoveredObject);
    const ty=p.userData.door.position.y+2.55+(ih?0.04:0);
    p.position.y+=(ty-p.position.y)*0.12;
    const ts=ih?1.06:1;
    p.scale.x+=(ts-p.scale.x)*0.12;p.scale.y+=(ts-p.scale.y)*0.12;
  }
}

function animateDoors(){
  for(const door of doors){
    const ih=door===hoveredDoor&&!isEntering;const hs=ih?1.018:1;
    door.scale.x+=(hs-door.scale.x)*0.14;door.scale.y+=(hs-door.scale.y)*0.14;door.scale.z+=(hs-door.scale.z)*0.14;
    if(door.userData.isOpen)door.userData.openProgress+=(1-door.userData.openProgress)*0.1;
    else door.userData.openProgress+=(0-door.userData.openProgress)*0.1;
    door.userData.pivot.rotation.y=-door.userData.openProgress*1.05;
  }
}

let lastTime=0;
function animate(time=0){
  requestAnimationFrame(animate);
  const dt=Math.min((time-lastTime)/1000,0.05);lastTime=time;
  approachDepth+=(targetApproachDepth-approachDepth)*0.055;
  camera.position.x+=(targetCameraX-camera.position.x)*0.06;
  camera.position.y+=(targetCameraY-camera.position.y)*0.06;
  camera.position.z+=(targetCameraZ-camera.position.z)*0.06;
  targetLook.set(lookTargetX,lookTargetY,lookTargetZ);
  currentLook.lerp(targetLook,0.08);camera.lookAt(currentLook);
  updateHover();animateDoors();animatePlaques();animateSky(dt);
  renderer.render(scene,camera);
}
animate();

window.addEventListener('resize',()=>{
  camera.aspect=viewportWidth()/Math.max(viewportHeight(),1);
  camera.updateProjectionMatrix();
  renderer.setSize(viewportWidth(),viewportHeight());
});
