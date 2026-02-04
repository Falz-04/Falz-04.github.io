// ==============================================
// Neon Electronics Theme — interactions + background
// ==============================================

const yearEl = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();

// Mobile menu
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");
function setMenu(open){
  mobileMenu.classList.toggle("open", open);
  hamburger.setAttribute("aria-expanded", String(open));
  mobileMenu.setAttribute("aria-hidden", String(!open));
}
hamburger?.addEventListener("click", () => {
  const open = !mobileMenu.classList.contains("open");
  setMenu(open);
});
mobileMenu?.addEventListener("click", (e) => {
  if (e.target?.tagName === "A") setMenu(false);
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});

// Subtle "tilt" on cards (mouse-only)
const tiltCards = document.querySelectorAll("[data-tilt]");
tiltCards.forEach(card => {
  let rect = null;
  card.addEventListener("mouseenter", () => rect = card.getBoundingClientRect());
  card.addEventListener("mousemove", (e) => {
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const rx = (-y * 5).toFixed(2);
    const ry = (x * 7).toFixed(2);
    card.style.transform = `translateY(-6px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  });
  card.addEventListener("mouseleave", () => {
    rect = null;
    card.style.transform = "";
  });
});

// ---------- Background: "Circuit traces" + particles ----------
const canvas = document.getElementById("fx");
const ctx = canvas.getContext("2d", { alpha: true });

function resize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener("resize", resize);
resize();

const rand = (a,b)=> a + Math.random()*(b-a);

const palette = [
  "rgba(50,246,255,0.55)",
  "rgba(255,79,216,0.45)",
  "rgba(139,255,106,0.40)",
  "rgba(154,123,255,0.38)",
  "rgba(255,211,107,0.35)"
];

// Trace network
const traces = [];
const traceCount = Math.round((window.innerWidth * window.innerHeight) / 90000);

function spawnTrace(){
  const x = rand(0, window.innerWidth);
  const y = rand(0, window.innerHeight);
  const segments = Math.floor(rand(4, 9));
  const step = rand(40, 110);
  const angleChoices = [0, Math.PI/2, Math.PI, -Math.PI/2];
  let ang = angleChoices[Math.floor(Math.random()*angleChoices.length)];
  let pts = [{x,y}];
  let cx=x, cy=y;
  for(let i=0;i<segments;i++){
    if (Math.random() < 0.35){
      ang = angleChoices[Math.floor(Math.random()*angleChoices.length)];
    }
    cx += Math.cos(ang) * step * rand(0.7, 1.2);
    cy += Math.sin(ang) * step * rand(0.7, 1.2);
    pts.push({x:cx, y:cy});
  }
  traces.push({
    pts,
    color: palette[Math.floor(Math.random()*palette.length)],
    t: rand(0, 1),
    speed: rand(0.0009, 0.0022),
    width: rand(1.0, 2.2),
    glow: rand(6, 12),
    alpha: rand(0.14, 0.26)
  });
  if (traces.length > traceCount) traces.shift();
}
for(let i=0;i<traceCount;i++) spawnTrace();

// Particles that "flow" along traces
const particles = [];
const particleCount = Math.round(window.innerWidth / 18);

function pointOnPolyline(pts, t){
  // t in [0,1]
  const n = pts.length - 1;
  const f = t * n;
  const i = Math.floor(f);
  const u = f - i;
  const a = pts[Math.min(i, n)];
  const b = pts[Math.min(i+1, n)];
  return { x: a.x + (b.x-a.x)*u, y: a.y + (b.y-a.y)*u };
}
function spawnParticle(){
  const tr = traces[Math.floor(Math.random()*traces.length)];
  particles.push({
    tr,
    t: Math.random(),
    speed: rand(0.0012, 0.0042),
    r: rand(1.0, 2.2),
    alpha: rand(0.35, 0.75)
  });
  if (particles.length > particleCount) particles.shift();
}
for(let i=0;i<particleCount;i++) spawnParticle();

let last = performance.now();
function tick(now){
  const dt = Math.min(40, now - last);
  last = now;

  // fade
  ctx.clearRect(0,0,window.innerWidth, window.innerHeight);

  // draw traces
  for(const tr of traces){
    tr.t += tr.speed * dt;
    const a = tr.alpha * (0.65 + 0.35*Math.sin(tr.t*6.283));
    ctx.save();
    ctx.globalAlpha = a;

    // glow
    ctx.shadowBlur = tr.glow;
    ctx.shadowColor = tr.color;
    ctx.strokeStyle = tr.color;
    ctx.lineWidth = tr.width;
    ctx.beginPath();
    tr.pts.forEach((p, idx) => idx ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
    ctx.stroke();

    // nodes
    ctx.shadowBlur = tr.glow*1.2;
    ctx.fillStyle = tr.color;
    tr.pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, tr.width*1.3, 0, Math.PI*2);
      ctx.fill();
    });

    ctx.restore();
  }

  // animate particles
  for(const p of particles){
    p.t += p.speed * dt;
    if (p.t > 1) { p.t -= 1; p.tr = traces[Math.floor(Math.random()*traces.length)]; }
    const pos = pointOnPolyline(p.tr.pts, p.t);
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.shadowBlur = 14;
    ctx.shadowColor = p.tr.color;
    ctx.fillStyle = p.tr.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, p.r, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  // occasionally refresh traces/particles for variety
  if (Math.random() < 0.02) spawnTrace();
  if (Math.random() < 0.04) spawnParticle();

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
