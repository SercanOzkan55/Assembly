// ═══════════════════════════════════════════════════════════════
// HOLO-CYBER OS v3.0 — Sercan Özkan Interactive Portfolio Engine
// ═══════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────
// 1. SYSTEM CLOCK & POWER CONTROLS
// ────────────────────────────────────────────────
const clockEl = document.getElementById('os-taskbar-clock');
function tickClock() {
  const n = new Date();
  const p = (v) => String(v).padStart(2, '0');
  clockEl.textContent = `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
}
setInterval(tickClock, 1000);
tickClock();

// Flicker toggle
const flickerOverlay = document.getElementById('flicker-overlay');
let flickerActive = true;
document.getElementById('sw-flicker').addEventListener('click', function () {
  flickerActive = !flickerActive;
  flickerOverlay.className = flickerActive ? 'flicker' : '';
  this.classList.toggle('active-switch', flickerActive);
});

// Power toggle
let powerOn = true;
const crtGlass = document.querySelector('.crt-glass');
document.getElementById('sw-power').addEventListener('click', function () {
  powerOn = !powerOn;
  if (!powerOn) {
    crtGlass.style.opacity = '0.03';
    crtGlass.style.filter = 'brightness(0)';
  } else {
    crtGlass.style.opacity = '1';
    crtGlass.style.filter = 'none';
  }
});


// ────────────────────────────────────────────────
// 2. THEME MANAGER — 5 NEON PALETTES
// ────────────────────────────────────────────────
const themeMap = {
  'cyberpunk': '',           // default :root
  'matrix': 'theme-matrix',
  'vaporwave': 'theme-vaporwave',
  'amber': 'theme-amber',
  'cyan': 'theme-cyan'
};

document.querySelectorAll('[data-theme]').forEach(btn => {
  const applyTheme = (e) => {
    e.preventDefault();
    const cls = themeMap[btn.dataset.theme];
    document.body.className = cls || '';
  };
  btn.addEventListener('click', applyTheme);
  btn.addEventListener('touchstart', applyTheme, { passive: false });
});


// ────────────────────────────────────────────────
// 3. DRAGGABLE WINDOW MANAGER
// ────────────────────────────────────────────────
const allWindows = document.querySelectorAll('.window');
const desktopIcons = document.querySelectorAll('.desktop-icon');
const taskbarTabs = document.getElementById('taskbar-active-tabs');
let topZ = 10;
let activeWinId = null;
const openWindows = new Set();

// Canvas loop references so we can start/stop them
const canvasLoops = {};

function bringToFront(winEl) {
  allWindows.forEach(w => w.classList.remove('active-window'));
  topZ++;
  winEl.style.zIndex = topZ;
  winEl.classList.add('active-window');
  activeWinId = winEl.id;
}

let aboutTyped = false;

function openWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  win.style.display = 'flex';
  bringToFront(win);
  openWindows.add(id);
  refreshTaskbar();

  // Trigger window-specific init hooks
  if (id === 'win-skills') animateSkillBars();
  if (id === 'win-matrix') startMatrixRain();
  if (id === 'win-arcade') startArcadeGame();
  if (id === 'win-diagnostics') startDiagnostics();
  if (id === 'win-compiler') initCompilerWindow();

  // Trigger typing effect for About window
  if (id === 'win-about' && !aboutTyped) {
    aboutTyped = true;
    const aboutBody = document.querySelector('#win-about .window-body');
    if (aboutBody) {
      const originalHTML = aboutBody.innerHTML;
      const textContent = aboutBody.innerText;
      aboutBody.innerHTML = '';

      // Create a typing container
      const typingEl = document.createElement('div');
      typingEl.style.whiteSpace = 'pre-wrap';
      typingEl.style.fontFamily = 'var(--font-mono)';
      typingEl.style.fontSize = '0.75rem';
      typingEl.style.lineHeight = '1.5';
      typingEl.style.color = 'var(--text-main)';
      aboutBody.appendChild(typingEl);

      let charIndex = 0;
      const typeSpeed = 12;

      function typeChar() {
        if (charIndex < textContent.length) {
          typingEl.textContent += textContent[charIndex];
          charIndex++;
          aboutBody.scrollTop = aboutBody.scrollHeight;
          setTimeout(typeChar, typeSpeed);
        } else {
          setTimeout(() => {
            aboutBody.innerHTML = originalHTML;
          }, 300);
        }
      }
      setTimeout(typeChar, 200);
    }
  }
}


function closeWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  win.style.display = 'none';
  openWindows.delete(id);
  refreshTaskbar();

  // Cleanup hooks
  if (id === 'win-skills') resetSkillBars();
  if (id === 'win-matrix') stopMatrixRain();
  if (id === 'win-arcade') stopArcadeGame();
  if (id === 'win-diagnostics') stopDiagnostics();
}

function minimizeWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  win.style.display = 'none';
  if (activeWinId === id) {
    activeWinId = null;
  }
  refreshTaskbar();
}

function refreshTaskbar() {
  taskbarTabs.innerHTML = '';
  openWindows.forEach(id => {
    const win = document.getElementById(id);
    if (!win) return;
    const titleText = win.querySelector('.window-titlebar span').textContent;
    const tab = document.createElement('button');
    tab.className = 'window-tab' + (activeWinId === id ? ' active' : '');
    tab.textContent = titleText.replace('[', '').replace(']', '').split(' - ')[1] || titleText;
    const handleTabClick = (e) => {
      e.preventDefault();
      const w = document.getElementById(id);
      if (w.style.display === 'none') {
        w.style.display = 'flex';
        bringToFront(w);
      } else {
        if (activeWinId === id) {
          minimizeWindow(id);
        } else {
          bringToFront(w);
        }
      }
      refreshTaskbar();
    };
    tab.addEventListener('click', handleTabClick);
    tab.addEventListener('touchstart', handleTabClick, { passive: false });
    taskbarTabs.appendChild(tab);
  });
}

// Desktop icon click/touch -> open window
desktopIcons.forEach(icon => {
  const triggerOpen = (e) => {
    e.preventDefault();
    const winId = icon.dataset.open;
    openWindow(winId);
  };
  icon.addEventListener('click', triggerOpen);
  icon.addEventListener('touchstart', triggerOpen, { passive: false });
});

// Window close & minimize buttons
document.querySelectorAll('.win-close').forEach(btn => {
  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeWindow(btn.dataset.win);
  };
  btn.addEventListener('click', handleClose);
  btn.addEventListener('touchstart', handleClose, { passive: false });
});

document.querySelectorAll('.win-min').forEach(btn => {
  const handleMin = (e) => {
    e.preventDefault();
    e.stopPropagation();
    minimizeWindow(btn.dataset.win);
  };
  btn.addEventListener('click', handleMin);
  btn.addEventListener('touchstart', handleMin, { passive: false });
});

// Titlebar click brings to front
allWindows.forEach(win => {
  const titlebar = win.querySelector('.window-titlebar');
  titlebar.addEventListener('mousedown', () => bringToFront(win));
});

// Drag mechanics
let dragTarget = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

document.addEventListener('mousedown', (e) => {
  const titlebar = e.target.closest('.window-titlebar');
  if (!titlebar) return;
  if (e.target.closest('.win-btn')) return; // Don't drag when clicking buttons

  const win = titlebar.closest('.window');
  if (!win) return;

  dragTarget = win;
  bringToFront(win);
  refreshTaskbar();

  const rect = win.getBoundingClientRect();
  const desktopRect = document.getElementById('desktop-area').getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;

  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!dragTarget) return;
  const desktopRect = document.getElementById('desktop-area').getBoundingClientRect();

  let newX = e.clientX - desktopRect.left - dragOffsetX;
  let newY = e.clientY - desktopRect.top - dragOffsetY;

  // Clamp within desktop area
  newX = Math.max(0, Math.min(newX, desktopRect.width - 100));
  newY = Math.max(0, Math.min(newY, desktopRect.height - 40));

  dragTarget.style.left = newX + 'px';
  dragTarget.style.top = newY + 'px';
});

document.addEventListener('mouseup', () => {
  dragTarget = null;
});

// Touch support for drag
document.addEventListener('touchstart', (e) => {
  const titlebar = e.target.closest('.window-titlebar');
  if (!titlebar) return;
  if (e.target.closest('.win-btn')) return;

  const win = titlebar.closest('.window');
  if (!win) return;

  dragTarget = win;
  bringToFront(win);
  refreshTaskbar();

  const rect = win.getBoundingClientRect();
  const touch = e.touches[0];
  dragOffsetX = touch.clientX - rect.left;
  dragOffsetY = touch.clientY - rect.top;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (!dragTarget) return;
  const desktopRect = document.getElementById('desktop-area').getBoundingClientRect();
  const touch = e.touches[0];

  let newX = touch.clientX - desktopRect.left - dragOffsetX;
  let newY = touch.clientY - desktopRect.top - dragOffsetY;

  newX = Math.max(0, Math.min(newX, desktopRect.width - 100));
  newY = Math.max(0, Math.min(newY, desktopRect.height - 40));

  dragTarget.style.left = newX + 'px';
  dragTarget.style.top = newY + 'px';
}, { passive: true });

document.addEventListener('touchend', () => { dragTarget = null; });

// Start menu opens About on click/touch
const handleStart = (e) => {
  e.preventDefault();
  openWindow('win-about');
};
document.getElementById('btn-start-os').addEventListener('click', handleStart);
document.getElementById('btn-start-os').addEventListener('touchstart', handleStart, { passive: false });


// ────────────────────────────────────────────────
// 4. STARFIELD PARTICLE BACKGROUND CANVAS (MOUSE-INTERACTIVE)
// ────────────────────────────────────────────────
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
let bgParticles = [];
const BG_COUNT = 60;
let mouseX = -9999, mouseY = -9999;
const MOUSE_PUSH_RADIUS = 120;
const MOUSE_PUSH_FORCE = 1.5;

function resizeBg() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeBg);
resizeBg();

// Track mouse for particle push effect
document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});
document.addEventListener('mouseleave', () => {
  mouseX = -9999;
  mouseY = -9999;
});

class StarNode {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * bgCanvas.width;
    this.y = Math.random() * bgCanvas.height;
    this.r = Math.random() * 2 + 0.5;
    this.vx = (Math.random() - 0.5) * 0.35;
    this.vy = (Math.random() - 0.5) * 0.35;
  }
  update() {
    // Mouse push interaction
    const dx = this.x - mouseX;
    const dy = this.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MOUSE_PUSH_RADIUS && dist > 0) {
      const force = (1 - dist / MOUSE_PUSH_RADIUS) * MOUSE_PUSH_FORCE;
      this.vx += (dx / dist) * force * 0.15;
      this.vy += (dy / dist) * force * 0.15;
    }
    // Dampen velocity
    this.vx *= 0.98;
    this.vy *= 0.98;
    // Base drift
    this.vx += (Math.random() - 0.5) * 0.02;
    this.vy += (Math.random() - 0.5) * 0.02;

    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > bgCanvas.width || this.y < 0 || this.y > bgCanvas.height) this.reset();
  }
  draw() {
    bgCtx.fillStyle = 'rgba(0, 229, 255, 0.4)';
    bgCtx.beginPath();
    bgCtx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    bgCtx.fill();
  }
}

for (let i = 0; i < BG_COUNT; i++) bgParticles.push(new StarNode());

function bgLoop() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  for (let i = 0; i < bgParticles.length; i++) {
    bgParticles[i].update();
    bgParticles[i].draw();
    for (let j = i + 1; j < bgParticles.length; j++) {
      const dx = bgParticles[i].x - bgParticles[j].x;
      const dy = bgParticles[i].y - bgParticles[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 120) {
        bgCtx.strokeStyle = `rgba(0, 229, 255, ${0.1 * (1 - d / 120)})`;
        bgCtx.lineWidth = 0.5;
        bgCtx.beginPath();
        bgCtx.moveTo(bgParticles[i].x, bgParticles[i].y);
        bgCtx.lineTo(bgParticles[j].x, bgParticles[j].y);
        bgCtx.stroke();
      }
    }
  }
  requestAnimationFrame(bgLoop);
}
bgLoop();


// ────────────────────────────────────────────────
// 5. SKILLS CAPABILITY BARS ANIMATION
// ────────────────────────────────────────────────
const skillIds = {
  'mbar-ai': 90,
  'mbar-backend': 85,
  'mbar-db': 78,
  'mbar-desktop': 70
};

function animateSkillBars() {
  setTimeout(() => {
    Object.entries(skillIds).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.style.width = val + '%';
    });
  }, 200);
}

function resetSkillBars() {
  Object.keys(skillIds).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.width = '0%';
  });
}


// ────────────────────────────────────────────────
// 6. PROJECT DIRECTORY FILE TREE INSPECTOR
// ────────────────────────────────────────────────
const projectDB = {
  cv: {
    name: 'CV_ANALYZER.PY',
    desc: 'NLP-powered resume parsing and semantic ATS matching engine. Extracts keyword density maps, computes similarity vectors, and grades resume fitness against target job vacancies.',
    stack: 'Python, FastAPI, SentenceTransformers, SQLite',
    link: 'https://github.com/SercanOzkan55/CV-Analyzer'
  },
  space: {
    name: 'SPACE_DUEL.JS',
    desc: 'Retro canvas-based space arcade shooter featuring enemy wave patterns, particle explosion debris, and real-time high-score persistence.',
    stack: 'JavaScript ES6, HTML5 Canvas, Keyframe Physics',
    link: 'https://SercanOzkan55.github.io/SercanOzkan55/'
  },
  food: {
    name: 'FOODAPP_SERVER.JS',
    desc: 'Full-stack food catalog ordering platform. Robust REST endpoints, clean state controllers, and relational database query optimizers.',
    stack: 'NodeJS, ExpressJS, MongoDB, REST API',
    link: 'https://github.com/SercanOzkan55/FoodApp'
  }
};

const projPanel = document.getElementById('proj-detail-panel');
const projName = document.getElementById('proj-detail-name');
const projDesc = document.getElementById('proj-detail-desc');
const projStack = document.getElementById('proj-detail-stack');
const projLink = document.getElementById('proj-detail-href');

document.querySelectorAll('.tree-file').forEach(file => {
  file.addEventListener('click', () => {
    const key = file.dataset.proj;
    const data = projectDB[key];
    if (!data) return;
    projName.textContent = data.name;
    projDesc.textContent = data.desc;
    projStack.textContent = data.stack;
    projLink.href = data.link;
    projPanel.style.display = 'block';
  });
});


// ────────────────────────────────────────────────
// 7. CLI HACKER TERMINAL SHELL
// ────────────────────────────────────────────────
const cliScreen = document.getElementById('cli-screen');
const cliInput = document.getElementById('cli-input-box');

const shellCommands = {
  help: `Available system scripts:
  <span style="color:var(--primary)">help</span>          Display this reference manual
  <span style="color:var(--primary)">about</span>         Print developer profile biography
  <span style="color:var(--primary)">status</span>        Diagnostic system state report
  <span style="color:var(--primary)">projects</span>      List active repository metadata
  <span style="color:var(--primary)">skills</span>        Print proficiency index values
  <span style="color:var(--primary)">neofetch</span>      System information overlay
  <span style="color:var(--primary)">fortune</span>       Random developer wisdom quote
  <span style="color:var(--primary)">matrix</span>        Open matrix rain visualizer
  <span style="color:var(--primary)">arcade</span>        Launch Space Duel executable
  <span style="color:var(--primary)">date</span>          Display current date and time
  <span style="color:var(--primary)">whoami</span>        Print current user identity
  <span style="color:var(--primary)">clear</span>         Flush terminal buffer`,

  about: `┌─────────────────────────────────────────────────┐
│ SERCAN ÖZKAN — Computer Engineering Student     │
│ Location: Turkey 🇹🇷                             │
│ Focus: AI integrations, Backend APIs, Desktop   │
│ Style: Clean logic, Neon UI, Performance tuning │
└─────────────────────────────────────────────────┘`,

  status: `System Diagnostics Report:
  [USER]         Sercan Özkan
  [ROLE]         Backend Developer & AI Integrator
  [CPU_LOAD]     42% (nominal)
  [MEM_ALLOC]    342MB / 512MB
  [DISK_STATUS]  Online — No corrupt sectors
  [NET_STATUS]   Connected (port 443 secure)
  [AVAILABILITY] Open for collaboration`,

  projects: `Repository Manifest:
  ┌ CV_Analyzer ──── AI resume parsing & ATS scoring
  │   Tech: Python, FastAPI, NLP, SQLite
  ├ Space_Duel ───── Browser arcade shooter game
  │   Tech: JavaScript, HTML5 Canvas, Physics
  └ FoodApp ──────── Food catalog ordering platform
      Tech: NodeJS, Express, MongoDB, REST`,

  skills: `Capability Matrix Index:
  AI_PROMPT_ENGINEERING ■■■■■■■■■□ 90%
  BACKEND_WEB_LOGIC    ■■■■■■■■□□ 85%
  UI_PRESENTATION      ■■■■■■■■□□ 82%
  DATABASE_SYSTEMS     ■■■■■■■□□□ 78%
  SYSTEMS_MINDSET      ■■■■■■■□□□ 72%
  DESKTOP_TOOLS        ■■■■■■□□□□ 70%`,

  neofetch: `<span style="color:var(--secondary)">       ████████████
      ██░░░░░░░░░░██
     ██░░████████░░██</span>     <span style="color:var(--primary)">sercan@mainframe</span>
     <span style="color:var(--secondary)">██░░██      ██░░██</span>     ─────────────────
     <span style="color:var(--secondary)">██░░████████░░██</span>      OS: Holo-Cyber OS v3.0
      <span style="color:var(--secondary)">██░░░░░░░░░░██</span>       Host: GitHub Pages
       <span style="color:var(--secondary)">████████████</span>        Kernel: JavaScript ES6
                           Shell: CLI_SHELL.SH
                           Theme: Cyberpunk Neon
                           CPU: Sercan Brain v2026
                           Memory: 512MB Allocated`,

  fortune: 'LOADING_FORTUNE...',

  date: 'DATE_CMD',

  whoami: `\x1b[1msercan\x1b[0m
UID: 1000(sercan) GID: 1000(dev)
Groups: 1000(dev), 27(sudo), 100(users)
Home: /home/sercan
Shell: /bin/holo-shell`,

  clear: 'CLEAR'
};

const fortunes = [
  '"Clean code always reads like well-written prose." — Grady Booch',
  '"First, solve the problem. Then, write the code." — John Johnson',
  '"Code is like humor. When you have to explain it, it\'s bad." — Cory House',
  '"The best error message is the one that never shows up." — Thomas Fuchs',
  '"Any fool can write code that a computer can understand. Good programmers write code that humans can understand." — Martin Fowler',
  '"Programs must be written for people to read, and only incidentally for machines to execute." — Abelson & Sussman',
  '"Simplicity is the soul of efficiency." — Austin Freeman'
];

function escHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function runShell(cmd) {
  cmd = cmd.trim();
  if (!cmd) return;

  // Add user's line
  const userLine = document.createElement('div');
  userLine.className = 'terminal-line';
  userLine.innerHTML = `<span class="term-prompt">sercan@mainframe:~$</span> ${escHtml(cmd)}`;
  const inputRow = cliScreen.querySelector('.terminal-line:last-child');
  cliScreen.insertBefore(userLine, inputRow);

  const outputLine = document.createElement('div');
  outputLine.className = 'terminal-line';

  const lower = cmd.toLowerCase();

  if (lower === 'clear') {
    const lines = cliScreen.querySelectorAll('.terminal-line');
    lines.forEach((l, i) => { if (i < lines.length - 1) l.remove(); });
    return;
  }

  if (lower === 'date') {
    const now = new Date();
    outputLine.innerHTML = `<span style="color:var(--primary);">${now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</span>\n${now.toLocaleTimeString('en-US', { hour12: false })} UTC${now.getTimezoneOffset() > 0 ? '-' : '+'}${String(Math.abs(Math.floor(now.getTimezoneOffset()/60))).padStart(2,'0')}:${String(Math.abs(now.getTimezoneOffset()%60)).padStart(2,'0')}`;
    cliScreen.insertBefore(outputLine, inputRow);
    cliScreen.scrollTop = cliScreen.scrollHeight;
    return;
  }

  if (lower === 'matrix') {
    openWindow('win-matrix');
    outputLine.innerHTML = '<span style="color:var(--secondary);">Matrix rain visualizer launched in separate window.</span>';
  } else if (lower === 'arcade') {
    openWindow('win-arcade');
    outputLine.innerHTML = '<span style="color:var(--secondary);">Space Duel arcade loaded into game window.</span>';
  } else if (lower === 'fortune') {
    outputLine.innerHTML = fortunes[Math.floor(Math.random() * fortunes.length)];
  } else if (shellCommands[lower]) {
    outputLine.innerHTML = shellCommands[lower];
  } else {
    outputLine.innerHTML = `<span style="color:#ef4444;">bash: command not found: ${escHtml(cmd)}</span>
Type <span style="color:var(--primary);">help</span> to view available scripts.`;
  }

  cliScreen.insertBefore(outputLine, inputRow);
  cliScreen.querySelector('.terminal-screen, .window-body').scrollTop = 999999;
  cliScreen.scrollTop = cliScreen.scrollHeight;
}

cliInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    runShell(cliInput.value);
    cliInput.value = '';
  }
});


// ────────────────────────────────────────────────
// 8. MATRIX CODE RAIN CANVAS RENDERER
// ────────────────────────────────────────────────
const matCanvas = document.getElementById('matrix-canvas');
const matCtx = matCanvas.getContext('2d');
let matLoopId = null;
let matActive = false;
let matColorIdx = 0;
let matSpeedIdx = 0;

const matColors = ['#39ff14', '#00f0ff', '#ff007f', '#ffb000', '#c084fc'];
const matSpeeds = [30, 50, 80, 120];

const matCols = Math.floor(matCanvas.width / 14);
const matDrops = [];
for (let i = 0; i < matCols; i++) matDrops[i] = Math.floor(Math.random() * -20);

function drawMatrixFrame() {
  matCtx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  matCtx.fillRect(0, 0, matCanvas.width, matCanvas.height);

  matCtx.font = '12px monospace';
  matCtx.fillStyle = matColors[matColorIdx];

  const chars = 'アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF';
  for (let i = 0; i < matDrops.length; i++) {
    const ch = chars[Math.floor(Math.random() * chars.length)];
    matCtx.fillText(ch, i * 14, matDrops[i] * 14);
    if (matDrops[i] * 14 > matCanvas.height && Math.random() > 0.98) {
      matDrops[i] = 0;
    }
    matDrops[i]++;
  }
}

function matLoop() {
  if (!matActive) return;
  drawMatrixFrame();
  matLoopId = setTimeout(() => requestAnimationFrame(matLoop), matSpeeds[matSpeedIdx]);
}

function startMatrixRain() {
  if (matActive) return;
  matActive = true;
  // Clear
  matCtx.fillStyle = '#000';
  matCtx.fillRect(0, 0, matCanvas.width, matCanvas.height);
  matLoop();
}

function stopMatrixRain() {
  matActive = false;
  if (matLoopId) clearTimeout(matLoopId);
}

document.getElementById('btn-mat-color').addEventListener('click', () => {
  matColorIdx = (matColorIdx + 1) % matColors.length;
});

document.getElementById('btn-mat-speed').addEventListener('click', () => {
  matSpeedIdx = (matSpeedIdx + 1) % matSpeeds.length;
});


// ────────────────────────────────────────────────
// 9. SPACE DUEL ARCADE — FULL GAME ENGINE
// ────────────────────────────────────────────────
const arcCanvas = document.getElementById('arcade-canvas');
const arcCtx = arcCanvas.getContext('2d');
const arcScoreEl = document.getElementById('arc-score');
const arcHiEl = document.getElementById('arc-highscore');
const arcShieldEl = document.getElementById('arc-shield');

let arcLoopId = null;
let arcActive = false;
let arcScore = 0;
let arcHiScore = 150;
let arcShield = 5;
let arcMultiplier = 1;
let arcConsecutiveKills = 0;
let arcPowerups = [];

let shipX = arcCanvas.width / 2;
const shipY = arcCanvas.height - 20;
let arcBullets = [];
let arcEnemies = [];
let arcParticles = []; // explosion debris
let arcStars = [];     // background starfield
let enemySpawnTick = 0;
let enemyWaveLevel = 1;

// Initialize static stars for arcade background
for (let i = 0; i < 40; i++) {
  arcStars.push({
    x: Math.random() * arcCanvas.width,
    y: Math.random() * arcCanvas.height,
    s: Math.random() * 1.5 + 0.5,
    speed: Math.random() * 0.6 + 0.2
  });
}

const arcKeys = { a: false, d: false, ArrowLeft: false, ArrowRight: false, space: false };

function arcKeyDown(e) {
  if (e.key === 'a' || e.key === 'ArrowLeft') arcKeys.a = true;
  if (e.key === 'd' || e.key === 'ArrowRight') arcKeys.d = true;
  if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); arcKeys.space = true; }
}
function arcKeyUp(e) {
  if (e.key === 'a' || e.key === 'ArrowLeft') arcKeys.a = false;
  if (e.key === 'd' || e.key === 'ArrowRight') arcKeys.d = false;
  if (e.key === ' ' || e.code === 'Space') arcKeys.space = false;
}

// Mobile D-pad
document.getElementById('btn-arc-left').addEventListener('pointerdown', () => arcKeys.a = true);
document.getElementById('btn-arc-left').addEventListener('pointerup', () => arcKeys.a = false);
document.getElementById('btn-arc-right').addEventListener('pointerdown', () => arcKeys.d = true);
document.getElementById('btn-arc-right').addEventListener('pointerup', () => arcKeys.d = false);
document.getElementById('btn-arc-fire').addEventListener('pointerdown', () => arcKeys.space = true);
document.getElementById('btn-arc-fire').addEventListener('pointerup', () => arcKeys.space = false);

// Tap to shoot on canvas
arcCanvas.addEventListener('click', (e) => {
  if (!arcActive) {
    // Restart game on click
    arcActive = true;
    arcScore = 0;
    arcShield = 5;
    arcBullets = [];
    arcEnemies = [];
    arcParticles = [];
    arcPowerups = [];
    arcMultiplier = 1;
    arcConsecutiveKills = 0;
    enemyWaveLevel = 1;
    shipX = arcCanvas.width / 2;
    return;
  }
  const rect = arcCanvas.getBoundingClientRect();
  shipX = ((e.clientX - rect.left) / rect.width) * arcCanvas.width;
  arcBullets.push({ x: shipX, y: shipY - 6, w: 2, h: 8, speed: 7 });
});

let arcFireCooldown = 0;

function spawnEnemy() {
  const types = ['normal', 'fast', 'big'];
  const type = types[Math.floor(Math.random() * Math.min(types.length, enemyWaveLevel))];

  let eW = 18, eH = 18, eSpeed = 1.0 + Math.random() * 0.5, eHP = 1, eColor = 'var(--primary)';

  if (type === 'fast') {
    eW = 12; eH = 12; eSpeed = 2.0 + Math.random() * 0.5; eColor = '#ff007f';
  } else if (type === 'big') {
    eW = 28; eH = 24; eSpeed = 0.6; eHP = 3; eColor = '#ffb000';
  }

  arcEnemies.push({
    x: Math.random() * (arcCanvas.width - eW),
    y: -eH,
    w: eW, h: eH,
    speed: eSpeed,
    hp: eHP,
    color: eColor,
    type: type,
    wobble: Math.random() * Math.PI * 2
  });
}

function spawnExplosion(x, y, color) {
  for (let i = 0; i < 8; i++) {
    arcParticles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 20 + Math.floor(Math.random() * 15),
      color: color || 'var(--primary)',
      r: Math.random() * 3 + 1
    });
  }
}

function updateArcade() {
  // Ship movement
  if (arcKeys.a) shipX -= 4.5;
  if (arcKeys.d) shipX += 4.5;
  shipX = Math.max(14, Math.min(arcCanvas.width - 14, shipX));

  // Shooting
  if (arcKeys.space) {
    arcKeys.space = false;
    if (arcFireCooldown <= 0) {
      arcBullets.push({ x: shipX - 3, y: shipY - 6, w: 2, h: 8, speed: 7 });
      arcBullets.push({ x: shipX + 3, y: shipY - 6, w: 2, h: 8, speed: 7 });
      arcFireCooldown = 6;
    }
  }
  if (arcFireCooldown > 0) arcFireCooldown--;

  // Shoot flash visual feedback
  if (arcKeys.space || arcFireCooldown === 5) {
    arcCanvas.classList.add('arcade-shoot-flash');
    setTimeout(() => arcCanvas.classList.remove('arcade-shoot-flash'), 100);
  }

  // Update bullets
  for (let i = arcBullets.length - 1; i >= 0; i--) {
    arcBullets[i].y -= arcBullets[i].speed;
    if (arcBullets[i].y < -10) arcBullets.splice(i, 1);
  }

  // Spawn enemies
  enemySpawnTick++;
  const spawnRate = Math.max(25, 70 - enemyWaveLevel * 4);
  if (enemySpawnTick > spawnRate) {
    enemySpawnTick = 0;
    spawnEnemy();
  }

  // Spawn powerups (green shield pickups)
  if (Math.random() < 0.003) {
    arcPowerups.push({
      x: Math.random() * (arcCanvas.width - 14),
      y: -14,
      w: 14,
      h: 14,
      speed: 0.8
    });
  }

  // Update powerups
  for (let i = arcPowerups.length - 1; i >= 0; i--) {
    arcPowerups[i].y += arcPowerups[i].speed;
    if (arcPowerups[i].y > arcCanvas.height) {
      arcPowerups.splice(i, 1);
      continue;
    }
    // Check collision with ship
    const p = arcPowerups[i];
    if (Math.abs((p.x + p.w/2) - shipX) < 18 && Math.abs((p.y + p.h/2) - shipY) < 18) {
      arcShield++;
      spawnExplosion(p.x + p.w/2, p.y + p.h/2, '#39ff14');
      arcPowerups.splice(i, 1);
    }
  }

  // Level up
  if (arcScore > 0 && arcScore % 100 === 0) {
    enemyWaveLevel = Math.min(8, Math.floor(arcScore / 100) + 1);
  }

  // Update enemies
  for (let i = arcEnemies.length - 1; i >= 0; i--) {
    const e = arcEnemies[i];
    e.y += e.speed;
    if (e.type === 'fast') {
      e.wobble += 0.08;
      e.x += Math.sin(e.wobble) * 1.5;
    }

    if (e.y > arcCanvas.height) {
      arcEnemies.splice(i, 1);
      arcShield--;
      arcConsecutiveKills = 0;
      arcMultiplier = 1;
      continue;
    }
  }

  // Collision check: bullets vs enemies
  for (let bi = arcBullets.length - 1; bi >= 0; bi--) {
    const b = arcBullets[bi];
    if (!b) continue;
    for (let ei = arcEnemies.length - 1; ei >= 0; ei--) {
      const e = arcEnemies[ei];
      if (
        b.x > e.x && b.x < e.x + e.w &&
        b.y > e.y && b.y < e.y + e.h
      ) {
        arcBullets.splice(bi, 1);
        e.hp--;
        if (e.hp <= 0) {
          spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color);
          arcEnemies.splice(ei, 1);
          arcConsecutiveKills++;
          arcMultiplier = Math.min(8, 1 + Math.floor(arcConsecutiveKills / 5));
          const baseScore = (e.type === 'big' ? 30 : e.type === 'fast' ? 20 : 10);
          arcScore += baseScore * arcMultiplier;
        }
        break;
      }
    }
  }

  // Update particles
  for (let i = arcParticles.length - 1; i >= 0; i--) {
    arcParticles[i].x += arcParticles[i].vx;
    arcParticles[i].y += arcParticles[i].vy;
    arcParticles[i].life--;
    if (arcParticles[i].life <= 0) arcParticles.splice(i, 1);
  }

  // Update background stars
  arcStars.forEach(s => {
    s.y += s.speed;
    if (s.y > arcCanvas.height) { s.y = 0; s.x = Math.random() * arcCanvas.width; }
  });

  // Update UI
  arcScoreEl.textContent = String(arcScore).padStart(4, '0');
  if (arcScore > arcHiScore) {
    arcHiScore = arcScore;
    arcHiEl.textContent = String(arcHiScore).padStart(4, '0');
  }
  arcShieldEl.textContent = 'I'.repeat(Math.max(0, arcShield));

  if (arcShield <= 0) arcActive = false;
}

function drawArcade() {
  arcCtx.clearRect(0, 0, arcCanvas.width, arcCanvas.height);

  // Stars
  arcCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  arcStars.forEach(s => {
    arcCtx.beginPath();
    arcCtx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
    arcCtx.fill();
  });

  // Subtle grid
  arcCtx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
  arcCtx.lineWidth = 0.5;
  for (let x = 0; x < arcCanvas.width; x += 25) {
    arcCtx.beginPath(); arcCtx.moveTo(x, 0); arcCtx.lineTo(x, arcCanvas.height); arcCtx.stroke();
  }
  for (let y = 0; y < arcCanvas.height; y += 25) {
    arcCtx.beginPath(); arcCtx.moveTo(0, y); arcCtx.lineTo(arcCanvas.width, y); arcCtx.stroke();
  }

  // Ship
  arcCtx.fillStyle = 'var(--primary)';
  arcCtx.beginPath();
  arcCtx.moveTo(shipX, shipY - 10);
  arcCtx.lineTo(shipX - 12, shipY + 6);
  arcCtx.lineTo(shipX + 12, shipY + 6);
  arcCtx.closePath();
  arcCtx.fill();

  // Engine glow
  arcCtx.fillStyle = 'var(--secondary)';
  arcCtx.fillRect(shipX - 3, shipY + 6, 6, 3 + Math.random() * 3);

  // Bullets
  arcCtx.fillStyle = '#ef4444';
  arcBullets.forEach(b => {
    arcCtx.fillRect(b.x - b.w / 2, b.y, b.w, b.h);
    // Bullet trail
    arcCtx.fillStyle = 'rgba(239, 68, 68, 0.3)';
    arcCtx.fillRect(b.x - b.w / 2, b.y + b.h, b.w, 6);
    arcCtx.fillStyle = '#ef4444';
  });

  // Enemies
  arcEnemies.forEach(e => {
    arcCtx.fillStyle = e.color;
    arcCtx.fillRect(e.x, e.y, e.w, e.h);
    // Inner pixel details
    arcCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    arcCtx.fillRect(e.x + 3, e.y + 4, 4, 4);
    arcCtx.fillRect(e.x + e.w - 7, e.y + 4, 4, 4);
  });

  // Powerup items (green shield pickups)
  arcPowerups.forEach(p => {
    arcCtx.fillStyle = '#39ff14';
    arcCtx.fillRect(p.x, p.y, p.w, p.h);
    // Plus symbol inside
    arcCtx.fillStyle = '#000';
    arcCtx.fillRect(p.x + 6, p.y + 3, 2, 8);
    arcCtx.fillRect(p.x + 3, p.y + 6, 8, 2);
    // Glow
    arcCtx.shadowColor = '#39ff14';
    arcCtx.shadowBlur = 8;
    arcCtx.fillStyle = 'rgba(57, 255, 20, 0.2)';
    arcCtx.fillRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
    arcCtx.shadowBlur = 0;
  });

  // Explosion particles
  arcParticles.forEach(p => {
    arcCtx.globalAlpha = p.life / 35;
    arcCtx.fillStyle = p.color;
    arcCtx.fillRect(p.x, p.y, p.r, p.r);
  });
  arcCtx.globalAlpha = 1.0;

  // Multiplier HUD
  if (arcMultiplier > 1) {
    arcCtx.fillStyle = '#ff007f';
    arcCtx.font = 'bold 12px monospace';
    arcCtx.textAlign = 'right';
    arcCtx.fillText(`x${arcMultiplier} COMBO`, arcCanvas.width - 8, 16);
    arcCtx.textAlign = 'start';
  }

  // Game over
  if (!arcActive) {
    arcCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    arcCtx.fillRect(0, 0, arcCanvas.width, arcCanvas.height);
    arcCtx.fillStyle = '#ef4444';
    arcCtx.font = '20px monospace';
    arcCtx.textAlign = 'center';
    arcCtx.fillText('GAME OVER', arcCanvas.width / 2, arcCanvas.height / 2 - 12);
    arcCtx.fillStyle = 'var(--primary)';
    arcCtx.font = '10px monospace';
    arcCtx.fillText(`SCORE: ${arcScore}  |  CLICK TO RETRY`, arcCanvas.width / 2, arcCanvas.height / 2 + 14);
    arcCtx.textAlign = 'start';
  }
}

function arcadeMainLoop() {
  if (arcActive) updateArcade();
  drawArcade();
  arcLoopId = requestAnimationFrame(arcadeMainLoop);
}

function startArcadeGame() {
  if (arcActive) return;
  arcActive = true;
  arcScore = 0;
  arcShield = 5;
  arcBullets = [];
  arcEnemies = [];
  arcParticles = [];
  arcPowerups = [];
  arcMultiplier = 1;
  arcConsecutiveKills = 0;
  enemyWaveLevel = 1;
  shipX = arcCanvas.width / 2;
  window.addEventListener('keydown', arcKeyDown);
  window.addEventListener('keyup', arcKeyUp);
  arcadeMainLoop();
}

function stopArcadeGame() {
  arcActive = false;
  if (arcLoopId) cancelAnimationFrame(arcLoopId);
  window.removeEventListener('keydown', arcKeyDown);
  window.removeEventListener('keyup', arcKeyUp);
}


// ────────────────────────────────────────────────
// 10. HARDWARE DIAGNOSTICS OSCILLOSCOPE
// ────────────────────────────────────────────────
const diagCanvas = document.getElementById('diagnostic-canvas');
const diagCtx = diagCanvas.getContext('2d');
const diagCpuEl = document.getElementById('diag-cpu-val');
const diagTimeEl = document.getElementById('diag-time');
let diagLoopId = null;
let diagActive = false;
let diagPhase = 0;

function drawDiagnostics() {
  if (!diagActive) return;

  diagCtx.clearRect(0, 0, diagCanvas.width, diagCanvas.height);

  // Background grid
  diagCtx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
  diagCtx.lineWidth = 0.5;
  for (let x = 0; x < diagCanvas.width; x += 20) {
    diagCtx.beginPath(); diagCtx.moveTo(x, 0); diagCtx.lineTo(x, diagCanvas.height); diagCtx.stroke();
  }
  for (let y = 0; y < diagCanvas.height; y += 20) {
    diagCtx.beginPath(); diagCtx.moveTo(0, y); diagCtx.lineTo(diagCanvas.width, y); diagCtx.stroke();
  }

  const midY = diagCanvas.height / 2;

  // Wave 1: CPU load sine wave (primary color)
  diagCtx.strokeStyle = 'var(--primary)';
  diagCtx.lineWidth = 2;
  diagCtx.beginPath();
  for (let x = 0; x < diagCanvas.width; x++) {
    const y = midY + Math.sin((x + diagPhase) * 0.035) * 30 + Math.sin((x + diagPhase) * 0.08) * 12;
    if (x === 0) diagCtx.moveTo(x, y);
    else diagCtx.lineTo(x, y);
  }
  diagCtx.stroke();

  // Wave 2: Memory utilization cosine wave (secondary color)
  diagCtx.strokeStyle = 'var(--secondary)';
  diagCtx.lineWidth = 1.5;
  diagCtx.beginPath();
  for (let x = 0; x < diagCanvas.width; x++) {
    const y = midY + Math.cos((x + diagPhase * 0.7) * 0.05) * 25 + Math.sin((x + diagPhase) * 0.12) * 8;
    if (x === 0) diagCtx.moveTo(x, y);
    else diagCtx.lineTo(x, y);
  }
  diagCtx.stroke();

  // Wave 3: Network jitter (subtle fast noise)
  diagCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  diagCtx.lineWidth = 1;
  diagCtx.beginPath();
  for (let x = 0; x < diagCanvas.width; x++) {
    const y = midY + Math.sin((x + diagPhase * 2) * 0.2) * 10 + (Math.random() * 4 - 2);
    if (x === 0) diagCtx.moveTo(x, y);
    else diagCtx.lineTo(x, y);
  }
  diagCtx.stroke();

  // Wave 4: Square wave (disk I/O activity)
  diagCtx.strokeStyle = 'rgba(255, 0, 127, 0.25)';
  diagCtx.lineWidth = 1.2;
  diagCtx.beginPath();
  for (let x = 0; x < diagCanvas.width; x++) {
    const period = 40;
    const offset = (x + diagPhase * 0.5) % period;
    const sqVal = offset < period / 2 ? -1 : 1;
    const y = midY + sqVal * 18;
    if (x === 0) diagCtx.moveTo(x, y);
    else diagCtx.lineTo(x, y);
  }
  diagCtx.stroke();

  diagPhase += 2;

  // Update fake CPU value (oscillating between 35-65)
  const cpuVal = Math.floor(42 + Math.sin(diagPhase * 0.02) * 18);
  diagCpuEl.textContent = cpuVal;
  diagTimeEl.textContent = Math.floor(60 + Math.sin(diagPhase * 0.01) * 8);

  diagLoopId = requestAnimationFrame(drawDiagnostics);
}

function startDiagnostics() {
  if (diagActive) return;
  diagActive = true;
  drawDiagnostics();
}

function stopDiagnostics() {
  diagActive = false;
  if (diagLoopId) cancelAnimationFrame(diagLoopId);
}


// ────────────────────────────────────────────────
// 11. CV ATS SCANNER ENGINE
// ────────────────────────────────────────────────
const scanBtn = document.getElementById('btn-run-scan');
const scanBar = document.getElementById('scan-progress-bar');
const scanFill = document.getElementById('scan-progress-fill');
const scanHud = document.getElementById('scan-results-hud');

scanBtn.addEventListener('click', () => {
  scanHud.style.display = 'none';
  scanBar.style.display = 'block';
  scanFill.style.width = '0%';

  let v = 0;
  const interval = setInterval(() => {
    v += 4;
    scanFill.style.width = v + '%';
    if (v >= 100) {
      clearInterval(interval);
      setTimeout(showScanHud, 200);
    }
  }, 80);
});

function showScanHud() {
  scanBar.style.display = 'none';

  const cvType = document.getElementById('scan-cv-opt').value;
  const jobType = document.getElementById('scan-job-opt').value;

  let score = 0, assess = '', strengths = [], gaps = [];

  if (cvType === 'student' && jobType === 'ai') {
    score = 88;
    assess = 'Excellent profile alignment. Resume demonstrates active deployment of LLM prompt tuning, parsing tools, and Python data structuring matching target AI/Backend requirement.';
    strengths = ['Explicit AI and Prompt Engineering experience', 'Active project repositories linked', 'Python + SQL data capabilities'];
    gaps = ['Expand cloud deployment pipelines (Docker, AWS)'];
  } else if (cvType === 'student' && jobType === 'web') {
    score = 65;
    assess = 'Partial match. Strong JavaScript and HTML5 Canvas experience detected, but modern component architecture gaps observed.';
    strengths = ['Solid ES6 JavaScript foundations', 'Canvas-based visual design experience'];
    gaps = ['Include React/Vue component frameworks', 'Add responsive CSS layout mentions'];
  } else if (cvType === 'student' && jobType === 'sales') {
    score = 22;
    assess = 'Critical skill discrepancy. Technical development experience does not align with commercial marketing pipeline KPIs.';
    strengths = ['High analytical capability index'];
    gaps = ['No CRM or Salesforce experience', 'Missing lead generation funnel data'];
  } else if (cvType === 'junior' && jobType === 'web') {
    score = 80;
    assess = 'Good junior alignment. Core web credentials align with standard frontend interface development requirements.';
    strengths = ['Core HTML/CSS/JS fundamentals', 'Hands-on layout formatting experience'];
    gaps = ['Learn modern build tools and Git workflow', 'Add TypeScript experience'];
  } else if (cvType === 'marketing' && jobType === 'sales') {
    score = 92;
    assess = 'Top-tier candidate alignment. CRM pipeline metrics, Adwords funneling, and presentation skills map directly to sales targets.';
    strengths = ['Salesforce CRM listed explicitly', 'Marketing pipeline automation tools included'];
    gaps = ['Include data visualization dashboards (Tableau, PowerBI)'];
  } else {
    score = Math.floor(Math.random() * 30) + 15;
    assess = 'Low correlation index. Core skill markers do not match target framework capabilities for this role.';
    strengths = ['General computer literacy detected'];
    gaps = ['Major technical retraining recommended', 'Acquire corresponding certification courses'];
  }

  document.getElementById('scan-match-val').textContent = score;
  document.getElementById('scan-match-assess').textContent = assess;
  document.getElementById('scan-match-strengths').innerHTML = strengths.map(s => `<li>• ${s}</li>`).join('');
  document.getElementById('scan-match-gaps').innerHTML = gaps.map(g => `<li>• ${g}</li>`).join('');
  scanHud.style.display = 'block';
}


// ────────────────────────────────────────────────
// 12. COMPILER APP WINDOW LOGIC
// ────────────────────────────────────────────────
let compilerInitialized = false;
function initCompilerWindow() {
  if (compilerInitialized) return;
  compilerInitialized = true;

  const editor = document.getElementById('compiler-editor-textarea');
  const gutter = document.getElementById('editor-line-gutter');
  const lineCounter = document.getElementById('editor-line-counter');

  // Gutter update function
  function updateGutter() {
    const lines = editor.value.split('\n');
    const lineCount = Math.max(1, lines.length);
    let gutterHTML = '';
    for (let i = 1; i <= lineCount; i++) {
      gutterHTML += `<div>${i}</div>`;
    }
    gutter.innerHTML = gutterHTML;
    syncGutterScroll();
  }

  function syncGutterScroll() {
    gutter.scrollTop = editor.scrollTop;
  }

  editor.addEventListener('input', updateGutter);
  editor.addEventListener('scroll', syncGutterScroll);

  // Track cursor position
  function updateCursorPos() {
    const text = editor.value;
    const selStart = editor.selectionStart;
    
    let line = 1;
    let col = 1;
    for (let i = 0; i < selStart; i++) {
      if (text[i] === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
    }
    lineCounter.textContent = `LN ${line}, COL ${col}`;

    // Highlight active line in gutter
    const gutterDivs = gutter.querySelectorAll('div');
    gutterDivs.forEach((div, idx) => {
      if (idx + 1 === line) {
        div.className = 'gutter-line-active';
      } else {
        div.className = '';
      }
    });
  }

  editor.addEventListener('keyup', updateCursorPos);
  editor.addEventListener('click', updateCursorPos);
  editor.addEventListener('focus', updateCursorPos);

  // Tab Switching logic
  const tabButtons = document.querySelectorAll('.comp-tab-btn');
  const tabContents = document.querySelectorAll('.comp-tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = btn.dataset.tab;
      
      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.style.color = 'var(--text-muted)';
      });
      tabContents.forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
      });

      btn.classList.add('active');
      btn.style.color = 'var(--primary)';
      
      const targetContent = document.getElementById(tabId);
      targetContent.classList.add('active');
      targetContent.style.display = 'block';
    });
  });

  // Action Buttons
  const sampleBtn = document.getElementById('btn-comp-sample');
  const clearBtn = document.getElementById('btn-comp-clear');
  const runBtn = document.getElementById('btn-comp-run');

  sampleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    editor.value = `// Sample Two-Pass Compiler Program
int x;
int y;
float result;

x = 10;
y = 3;
result = x + y * 2;

if (result > 15) {
  print("Result is large");
} else {
  print("Result is small");
}

while (x > 0) {
  x = x - 1;
}
`;
    updateGutter();
    updateCursorPos();
  });

  clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    editor.value = '';
    updateGutter();
    updateCursorPos();
    resetCompilationViews();
  });

  const compilerEngine = new CompilerEngine();

  function resetCompilationViews() {
    document.getElementById('lexer-token-table-body').innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; padding:10px; color:var(--text-muted);">No token stream loaded. Click RUN_COMPILER().</td>
      </tr>
    `;
    document.getElementById('symbol-table-body').innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:10px; color:var(--text-muted);">Symbol table empty.</td>
      </tr>
    `;
    document.getElementById('ast-tree-view').textContent = 'No AST generated.';
    document.getElementById('tac-code-view').textContent = 'No IR generated.';
    document.getElementById('diagnostics-summary').innerHTML = '<span style="color:var(--text-muted);">STATUS: </span><span style="color:var(--primary);">IDLE</span>';
    document.getElementById('diagnostics-errors-list').innerHTML = '';
  }

  runBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const sourceCode = editor.value;
    if (!sourceCode.trim()) {
      alert("Source code is empty.");
      return;
    }

    // Run compile!
    const results = compilerEngine.compile(sourceCode);
    
    // 1. Render Lexer Tokens
    const tokenTableBody = document.getElementById('lexer-token-table-body');
    if (results.tokens.length === 0) {
      tokenTableBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center; padding:10px; color:var(--text-muted);">No tokens identified.</td>
        </tr>
      `;
    } else {
      tokenTableBody.innerHTML = results.tokens.map((tok, idx) => `
        <tr class="lexer-row-clickable" data-line="${tok.line}" data-col="${tok.col}" data-token-idx="${idx}">
          <td style="padding:4px; border-bottom:1px solid rgba(255,255,255,0.05);">${tok.line}</td>
          <td style="padding:4px; border-bottom:1px solid rgba(255,255,255,0.05); color:var(--primary); font-weight:bold;">${escapeHtml(tok.value)}</td>
          <td style="padding:4px; border-bottom:1px solid rgba(255,255,255,0.05); color:var(--secondary);">${tok.type}</td>
        </tr>
      `).join('');

      // Add click listener to token rows to highlight in source code
      const rows = tokenTableBody.querySelectorAll('tr');
      rows.forEach(row => {
        row.addEventListener('click', () => {
          rows.forEach(r => r.classList.remove('lexer-row-highlight'));
          row.classList.add('lexer-row-highlight');
          const line = parseInt(row.dataset.line, 10);
          highlightLineInEditor(line);
        });
      });
    }

    // 2. Render Symbol Table
    const symTableBody = document.getElementById('symbol-table-body');
    if (results.symbolTable.length === 0) {
      symTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:10px; color:var(--text-muted);">Symbol table is empty (no declarations).</td>
        </tr>
      `;
    } else {
      symTableBody.innerHTML = results.symbolTable.map(sym => `
        <tr>
          <td style="padding:4px; border-bottom:1px solid rgba(255,255,255,0.05); color:var(--primary); font-weight:bold;">${escapeHtml(sym.name)}</td>
          <td style="padding:4px; border-bottom:1px solid rgba(255,255,255,0.05); color:var(--secondary);">${sym.type}</td>
          <td style="padding:4px; border-bottom:1px solid rgba(255,255,255,0.05);">${sym.scopeLevel}</td>
          <td style="padding:4px; border-bottom:1px solid rgba(255,255,255,0.05); font-family:var(--font-mono);">0x${sym.memoryOffset.toString(16).toUpperCase().padStart(4, '0')}</td>
          <td style="padding:4px; border-bottom:1px solid rgba(255,255,255,0.05);">${sym.declaredLine}</td>
        </tr>
      `).join('');
    }

    // 3. Render AST
    const astView = document.getElementById('ast-tree-view');
    if (results.ast) {
      astView.textContent = results.parseTreeText;
    } else {
      astView.textContent = "No AST could be generated due to compilation errors.";
    }

    // 3.5. Render TAC (IR Code)
    const tacView = document.getElementById('tac-code-view');
    if (results.ast && results.errors.length === 0) {
      tacView.textContent = results.tacText;
    } else {
      tacView.textContent = "No IR (TAC) generated due to compilation errors.";
    }

    // 4. Render Diagnostics & Errors
    const diagSummary = document.getElementById('diagnostics-summary');
    const diagErrorsList = document.getElementById('diagnostics-errors-list');
    diagErrorsList.innerHTML = '';

    if (results.errors.length === 0) {
      diagSummary.innerHTML = '<span style="color:var(--text-muted);">STATUS: </span><span style="color:#22c55e; font-weight:bold;">SUCCESS</span>';
      diagErrorsList.innerHTML = `
        <div class="diag-success-item">
          <strong>COMPILATION SUCCESSFUL!</strong><br>
          • Pass 1 (Lexer) completed: ${results.tokens.length} tokens.<br>
          • Pass 2 (Parser) completed successfully.<br>
          • Semantic checks passed: All variables declared properly & type systems match.
        </div>
      `;
    } else {
      diagSummary.innerHTML = `<span style="color:var(--text-muted);">STATUS: </span><span style="color:#ef4444; font-weight:bold;">FAILED (${results.errors.length} ERRORS)</span>`;
      diagErrorsList.innerHTML = results.errors.map(err => `
        <div class="diag-error-item" data-line="${err.line}">
          <strong>${err.phase} Error (Line ${err.line}):</strong> ${escapeHtml(err.message)}
        </div>
      `).join('');

      // Add click handler to diagnostics errors to jump to error line
      const errorDivs = diagErrorsList.querySelectorAll('.diag-error-item');
      errorDivs.forEach(div => {
        div.addEventListener('click', () => {
          const line = parseInt(div.dataset.line, 10);
          highlightLineInEditor(line);
        });
      });
    }

    // Swap to Diagnostics tab automatically if errors exist, otherwise Lexer
    const targetTab = results.errors.length > 0 ? 'tab-diagnostics' : 'tab-lexer';
    const activeBtn = document.querySelector(`.comp-tab-btn[data-tab="${targetTab}"]`);
    if (activeBtn) activeBtn.click();
  });

  function highlightLineInEditor(line) {
    const text = editor.value;
    const lines = text.split('\n');
    if (line > lines.length) return;

    let startPos = 0;
    for (let i = 0; i < line - 1; i++) {
      startPos += lines[i].length + 1; // +1 for the newline
    }
    const endPos = startPos + lines[line - 1].length;

    editor.focus();
    editor.setSelectionRange(startPos, endPos);
    
    // Scroll editor to center the highlighted text
    const lineHeight = 16.8; // line-height in px
    editor.scrollTop = (line - 3) * lineHeight;
    updateCursorPos();
  }

  function escapeHtml(string) {
    return String(string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Initial Gutter Setup
  updateGutter();
}


// ────────────────────────────────────────────────
// 13. BOOT SEQUENCE — ANIMATED SYSTEM STARTUP
// ────────────────────────────────────────────────
(function runBootSequence() {
  const bootOverlay = document.createElement('div');
  bootOverlay.className = 'boot-overlay';
  bootOverlay.innerHTML = `
    <div class="boot-line" data-delay="0">[ <span class="ok">BIOS</span> ] BIOS CHECK... <span class="ok">OK</span></div>
    <div class="boot-line" data-delay="1">[ <span class="loading">KERN</span> ] LOADING KERNEL MODULES...</div>
    <div class="boot-line" data-delay="2">[ <span class="loading">GPU</span>  ] INITIALIZING DISPLAY DRIVER...</div>
    <div class="boot-line" data-delay="3">[ <span class="loading">FS</span>   ] MOUNTING FILESYSTEM...</div>
    <div class="boot-line" data-delay="4">[ <span class="loading">WM</span>   ] STARTING WINDOW MANAGER...</div>
    <div class="boot-line" data-delay="5">[ <span class="ok">READY</span> ] SERCAN_OS v3.0 READY<span class="boot-cursor"></span></div>
  `;
  document.body.appendChild(bootOverlay);

  const lines = bootOverlay.querySelectorAll('.boot-line');
  lines.forEach((line, i) => {
    setTimeout(() => {
      line.classList.add('visible');
    }, 400 + i * 550);
  });

  // Total boot time: 400 + 5*550 = 3150ms, then wait a bit and fade
  const totalBootTime = 400 + (lines.length - 1) * 550 + 800;
  setTimeout(() => {
    bootOverlay.classList.add('fade-out');
    setTimeout(() => {
      bootOverlay.remove();
      openWindow('win-about');
    }, 900);
  }, totalBootTime);
})();



