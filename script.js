'use strict';
/* =====================================================================
   PAC-MAN NEON ARCADE — script.js (JavaScript puro, sem bibliotecas)

   Índice:
     1. Constantes e utilidades
     2. Labirintos (mapas, colisão, BFS)
     3. Fantasias do Pac-Man
     4. Dificuldades e poderes dos fantasmas
     5. Áudio
     6. Ranking e preferências (localStorage, só com aceite do termo)
     7. Estado do jogo
     8. Movimento (grade) — Pac-Man e fantasmas
     9. Inteligência artificial dos fantasmas
    10. Regras: pontos, vidas, fases
    11. Desenho (canvas)
    12. Entrada: teclado, toque e Gamepad
    13. Interface (telas, termo, HUD)
    14. Loop principal
   ===================================================================== */
(function () {

/* =====================================================================
   1. CONSTANTES E UTILIDADES
   ===================================================================== */
const TILE = 24, COLS = 19, ROWS = 21;
const W = COLS * TILE, H = ROWS * TILE;
const DEATH_TIME = 1.7;

const UP = { x: 0, y: -1 }, LEFT = { x: -1, y: 0 }, DOWN = { x: 0, y: 1 }, RIGHT = { x: 1, y: 0 }, NONE = { x: 0, y: 0 };
const DIR_LIST = [UP, LEFT, DOWN, RIGHT];
const KEYMAP = {
  ArrowUp: UP, KeyW: UP, ArrowDown: DOWN, KeyS: DOWN,
  ArrowLeft: LEFT, KeyA: LEFT, ArrowRight: RIGHT, KeyD: RIGHT
};
const STORE = {
  rank: 'pacman_neon_ranking_v1',
  name: 'pacman_neon_name',
  costume: 'pacman_neon_costume',
  mute: 'pacman_neon_mute',
  diff: 'pacman_neon_difficulty',
  consent: 'pacman_neon_consent'      // data/hora do aceite do termo
};

const $ = (id) => document.getElementById(id);
const isOpp = (a, b) => (a.x || a.y) && a.x === -b.x && a.y === -b.y;
const opp = (d) => DIR_LIST.find(o => o.x === -d.x && o.y === -d.y) || NONE;
const wrapX = (x) => ((x % COLS) + COLS) % COLS;
const rand = (arr) => arr[(Math.random() * arr.length) | 0];
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
function lsGet(k, def) { try { const v = localStorage.getItem(k); return v === null ? def : v; } catch (e) { return def; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignorado */ } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignorado */ } }

/* =====================================================================
   2. LABIRINTOS
   Legenda: # parede | . pastilha | o pastilha de poder | espaço vazio | - porta da casa dos fantasmas
   Todos os mapas têm: TÚNEL de teletransporte na linha 9 (pontas abertas),
   a casa dos fantasmas no centro e o Pac-Man nascendo na casa (9,15).
   Cada fase tem o seu próprio mapa (veja PHASES na seção 4).
   ===================================================================== */
const MAPS = [
  {
    name: 'Clássico',
    rows: [
      '###################',
      '#........#........#',
      '#o##.###.#.###.##o#',
      '#.................#',
      '#.##.#.#####.#.##.#',
      '#....#...#...#....#',
      '####.### # ###.####',
      '####.#       #.####',
      '####.# ##-## #.####',
      '    .  #   #  .    ',
      '####.# ##### #.####',
      '####.#       #.####',
      '####.# ##### #.####',
      '#........#........#',
      '#.##.###.#.###.##.#',
      '#o.#..... .....#.o#',
      '##.#.#.#####.#.#.##',
      '#....#...#...#....#',
      '#.######.#.######.#',
      '#.................#',
      '###################'
    ]
  },
  {
    name: 'Praça Central',
    rows: [
      '###################',
      '#........#........#',
      '#o###.##.#.##.###o#',
      '#.................#',
      '#.##.#.#####.#.##.#',
      '#....#.......#....#',
      '####.### # ###.####',
      '####.#       #.####',
      '####.# ##-## #.####',
      '    .  #   #  .    ',
      '####.# ##### #.####',
      '####.#       #.####',
      '####.# ##### #.####',
      '#....#.......#....#',
      '#.##.#.#####.#.##.#',
      '#o....... .......o#',
      '#.###.##.#.##.###.#',
      '#.................#',
      '#.#..#.##.##.#..#.#',
      '#.................#',
      '###################'
    ]
  },
  {
    name: 'Corredores',
    rows: [
      '###################',
      '#.................#',
      '#o####.##.##.####o#',
      '#.................#',
      '#.###.###.###.###.#',
      '#.................#',
      '####.### # ###.####',
      '####.#       #.####',
      '####.# ##-## #.####',
      '    .  #   #  .    ',
      '####.# ##### #.####',
      '####.#       #.####',
      '####.# ##### #.####',
      '#.................#',
      '#.##.##.###.##.##.#',
      '#o....... .......o#',
      '#.####.#####.####.#',
      '#.................#',
      '#.###.###.###.###.#',
      '#.................#',
      '###################'
    ]
  },
  {
    name: 'Muralha',
    rows: [
      '###################',
      '#.................#',
      '#o####.#####.####o#',
      '#.................#',
      '#.###.#######.###.#',
      '#.................#',
      '####.### # ###.####',
      '####.#       #.####',
      '####.# ##-## #.####',
      '    .  #   #  .    ',
      '####.# ##### #.####',
      '####.#       #.####',
      '####.# ##### #.####',
      '#.................#',
      '#.##.###.#.###.##.#',
      '#o....... .......o#',
      '#.##.##.###.##.##.#',
      '#.................#',
      '#.###.###.###.###.#',
      '#.................#',
      '###################'
    ]
  }
];

const THEMES = [
  { line: '#3a6bff', glow: '#2f5bff', fill: '#06062a' },   // Mapa 1 - azul
  { line: '#ff3fb0', glow: '#ff2f9e', fill: '#200618' },   // Mapa 2 - rosa
  { line: '#2fe6a3', glow: '#16c98a', fill: '#031d17' },   // Mapa 3 - verde
  { line: '#ffb02e', glow: '#ff9d1c', fill: '#201402' },   // Mapa 4 - laranja
  { line: '#a65bff', glow: '#8f3fff', fill: '#13062a' }    // (reserva)
];

let grid = [];
let pelletsLeft = 0, pelletsTotal = 0;

function mapIndex(lv) { return PHASES[lv - 1].map; }

function loadMaze() {
  grid = MAPS[mapIndex(level)].rows.map(r => r.split(''));
  pelletsLeft = 0;
  grid.forEach(row => row.forEach(c => { if (c === '.' || c === 'o') pelletsLeft++; }));
  pelletsTotal = pelletsLeft;
}

/** Casa transitável? (porta só para fantasmas que saem/voltam à casa) */
function walkable(x, y, door) {
  if (y < 0 || y >= ROWS) return false;
  const c = grid[y][wrapX(x)];
  if (c === '#') return false;
  if (c === '-') return !!door;
  return true;
}
/** Colisão perfeita: só se move se a casa seguinte (com teletransporte lateral) for livre */
function canMove(tx, ty, d, door) { return walkable(tx + d.x, ty + d.y, door); }

/** Busca em largura (BFS): caminho mais curto entre duas casas. Retorna lista de casas ou null. */
function bfs(sx, sy, gx, gy, door) {
  if (sx === gx && sy === gy) return [{ x: sx, y: sy }];
  const idx = (x, y) => y * COLS + x;
  const prev = new Int16Array(COLS * ROWS).fill(-1);
  const start = idx(sx, sy), goal = idx(gx, gy);
  const q = [start];
  prev[start] = start;
  let found = false;
  for (let h = 0; h < q.length; h++) {
    const cur = q[h];
    if (cur === goal) { found = true; break; }
    const cx = cur % COLS, cy = (cur / COLS) | 0;
    for (const d of DIR_LIST) {
      const nx = wrapX(cx + d.x), ny = cy + d.y;
      if (!walkable(nx, ny, door)) continue;
      const ni = idx(nx, ny);
      if (prev[ni] !== -1) continue;
      prev[ni] = cur;
      q.push(ni);
    }
  }
  if (!found) return null;
  const path = [];
  let c = goal;
  while (c !== start) { path.push({ x: c % COLS, y: (c / COLS) | 0 }); c = prev[c]; }
  path.push({ x: sx, y: sy });
  return path.reverse();
}

function dirTo(a, b) {
  for (const d of DIR_LIST) if (wrapX(a.x + d.x) === b.x && a.y + d.y === b.y) return d;
  return null;
}

/** Linha de visão reta (mesma linha/coluna, sem paredes no meio). Retorna a direção ou null. */
function lineOfSight(ax, ay, bx, by, maxDist) {
  if (ax !== bx && ay !== by) return null;
  const dist = Math.abs(bx - ax) + Math.abs(by - ay);
  if (dist === 0 || dist > maxDist) return null;
  const d = ax === bx ? { x: 0, y: Math.sign(by - ay) } : { x: Math.sign(bx - ax), y: 0 };
  for (let i = 1; i < dist; i++) if (!walkable(ax + d.x * i, ay + d.y * i, false)) return null;
  return DIR_LIST.find(o => o.x === d.x && o.y === d.y);
}

function nearestWalkable(tx, ty) {
  for (let r = 0; r < 8; r++)
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) + Math.abs(dy) !== r) continue;
        const x = tx + dx, y = ty + dy;
        if (x >= 0 && x < COLS && walkable(x, y, false)) return { x, y };
      }
  return { x: 9, y: 15 };
}

/* =====================================================================
   3. FANTASIAS DO PAC-MAN
   Cada fantasia desenha acessórios "em pé" por cima do corpo.
   Medidas em unidades do raio (r).
   ===================================================================== */
function poly(c, r, pts) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0] * r, p[1] * r) : c.moveTo(p[0] * r, p[1] * r)); c.closePath(); c.fill(); c.stroke(); }
function ell(c, r, x, y, rx, ry) { c.beginPath(); c.ellipse(x * r, y * r, rx * r, ry * r, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
function dot(c, r, x, y, rad) { c.beginPath(); c.arc(x * r, y * r, rad * r, 0, Math.PI * 2); c.fill(); c.stroke(); }

const COSTUMES = [
  { name: 'Clássico', body: '#ffe600', draw() {} },
  { name: 'Mago', body: '#ffe600', draw(c, r) {
      c.fillStyle = '#5b2fd0'; poly(c, r, [[-.72, -.55], [.72, -.55], [.12, -1.95]]);
      c.fillStyle = '#3b1c93'; ell(c, r, 0, -.55, .98, .2);
      c.fillStyle = '#ffd84a'; dot(c, r, .02, -1.1, .13); dot(c, r, .3, -.82, .08);
  } },
  { name: 'Rei', body: '#ffe600', draw(c, r) {
      c.fillStyle = '#ffc21a'; poly(c, r, [[-.62, -.72], [-.7, -1.5], [-.33, -1.15], [0, -1.65], [.33, -1.15], [.7, -1.5], [.62, -.72]]);
      c.fillStyle = '#e8312f'; dot(c, r, 0, -.95, .11);
      c.fillStyle = '#2f8bff'; dot(c, r, -.4, -.9, .08); dot(c, r, .4, -.9, .08);
  } },
  { name: 'Pirata', body: '#ffe600', draw(c, r) {
      c.fillStyle = '#17171c'; poly(c, r, [[-1, -.5], [-.55, -1.45], [.55, -1.45], [1, -.5]]); ell(c, r, 0, -.52, 1.05, .15);
      c.fillStyle = '#fff'; dot(c, r, 0, -1.0, .2);
      c.fillStyle = '#17171c'; dot(c, r, -.07, -1.02, .05); dot(c, r, .07, -1.02, .05);
  } },
  { name: 'Ninja', body: '#ffe600', draw(c, r) {
      c.save(); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.clip();
      c.fillStyle = '#d4141c'; c.fillRect(-r, -.98 * r, 2 * r, .3 * r); c.restore();
      c.fillStyle = '#d4141c';
      poly(c, r, [[-.85, -.82], [-1.55, -.55], [-1.35, -.95]]);
      poly(c, r, [[-.85, -.82], [-1.5, -1.0], [-1.3, -.4]]);
  } },
  { name: 'Cartola', body: '#ffe600', draw(c, r) {
      c.fillStyle = '#16161a'; c.fillRect(-.5 * r, -1.7 * r, r, 1.1 * r); ell(c, r, 0, -.62, .95, .17);
      c.fillStyle = '#c8202f'; c.fillRect(-.5 * r, -.95 * r, r, .2 * r);
  } },
  { name: 'Astronauta', body: '#ffe600', draw(c, r) {
      c.fillStyle = 'rgba(140,210,255,.2)'; c.beginPath(); c.arc(0, 0, r * 1.22, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#cfefff'; c.lineWidth = r * .12; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = r * .1; c.beginPath(); c.arc(0, 0, r * 1.02, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
  } },
  { name: 'Chef', body: '#ffe600', draw(c, r) {
      c.fillStyle = '#fff';
      dot(c, r, -.42, -1.12, .4); dot(c, r, .42, -1.12, .4); dot(c, r, 0, -1.4, .46);
      c.fillRect(-.6 * r, -1.05 * r, 1.2 * r, .5 * r);
  } },
  { name: 'Gatinho', body: '#ffb347', draw(c, r) {
      c.fillStyle = '#ffb347';
      poly(c, r, [[-.9, -.3], [-.82, -1.4], [-.18, -.82]]); poly(c, r, [[.9, -.3], [.82, -1.4], [.18, -.82]]);
      c.fillStyle = '#ff8fb0';
      poly(c, r, [[-.72, -.55], [-.7, -1.12], [-.34, -.8]]); poly(c, r, [[.72, -.55], [.7, -1.12], [.34, -.8]]);
      c.strokeStyle = '#5a3b10'; c.lineWidth = r * .05; c.beginPath();
      c.moveTo(-.9 * r, 0); c.lineTo(-1.55 * r, -.12 * r); c.moveTo(-.9 * r, .14 * r); c.lineTo(-1.5 * r, .24 * r);
      c.moveTo(.9 * r, 0); c.lineTo(1.55 * r, -.12 * r); c.moveTo(.9 * r, .14 * r); c.lineTo(1.5 * r, .24 * r);
      c.stroke();
  } },
  { name: 'Festa', body: '#ffe600', draw(c, r) {
      c.fillStyle = '#ff4fa3'; poly(c, r, [[-.55, -.7], [.55, -.7], [0, -1.95]]);
      c.fillStyle = '#4fe0ff'; poly(c, r, [[-.38, -1.02], [.38, -1.02], [.22, -1.3], [-.22, -1.3]]);
      c.fillStyle = '#ffe34a'; dot(c, r, 0, -1.98, .16);
  } },
  { name: 'Viking', body: '#ffe600', draw(c, r) {
      c.fillStyle = '#fff6dc';
      poly(c, r, [[-.88, -.75], [-.85, -1.15], [-1.45, -1.65], [-1.35, -1.05]]);
      poly(c, r, [[.88, -.75], [.85, -1.15], [1.45, -1.65], [1.35, -1.05]]);
      c.fillStyle = '#9aa3ad'; c.beginPath(); c.arc(0, -.62 * r, .92 * r, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#6b737c'; c.fillRect(-.92 * r, -.7 * r, 1.84 * r, .14 * r);
  } },
  { name: 'Noel', body: '#ffe600', draw(c, r) {
      c.fillStyle = '#e0262c'; poly(c, r, [[-.85, -.55], [.85, -.55], [.2, -1.75]]);
      c.fillStyle = '#fff'; ell(c, r, 0, -.58, .98, .2); dot(c, r, .22, -1.78, .2);
  } },
  { name: 'Abóbora', body: '#ff8a14', draw(c, r) {
      c.fillStyle = '#3f9a2b'; poly(c, r, [[-.12, -.95], [.12, -.95], [.22, -1.4], [-.08, -1.35]]);
      ell(c, r, .35, -1.15, .3, .14);
  } },
  { name: 'Coelhinho', body: '#ffffff', outline: '#8a8fa8', draw(c, r) {
      c.fillStyle = '#fff'; ell(c, r, -.42, -1.55, .24, .7); ell(c, r, .42, -1.55, .24, .7);
      c.fillStyle = '#ffb3cc'; ell(c, r, -.42, -1.5, .1, .45); ell(c, r, .42, -1.5, .1, .45);
  } }
];

/** Desenha o Pac-Man (jogo, prévia, ícone de vidas). Rosto feliz + boca que abre/fecha. */
function drawPac(c, x, y, r, o) {
  const cs = COSTUMES[o.costume] || COSTUMES[0];
  const f = o.facing || RIGHT;
  const ang = Math.atan2(f.y, f.x);
  let open = o.open;
  if (o.dying != null) open = 0.2 + o.dying * (Math.PI - 0.2);
  c.save();
  c.translate(x, y);
  c.lineJoin = 'round';
  c.fillStyle = (o.stunned && ((o.time * 20) | 0) % 2) ? '#ffffff' : cs.body;
  c.strokeStyle = cs.outline || 'rgba(0,0,0,.55)';
  c.lineWidth = Math.max(1, r * 0.08);
  c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, ang + open, ang + Math.PI * 2 - open); c.closePath(); c.fill(); c.stroke();

  if (o.dying == null) {
    // Rosto feliz: olho brilhante com sobrancelha alegre
    const ex = f.y === 0 ? f.x * r * 0.12 : r * 0.42;
    const ey = f.y === 0 ? -r * 0.48 : f.y * r * 0.1;
    c.fillStyle = '#101018';
    c.beginPath(); c.ellipse(ex, ey, r * 0.12, r * 0.17, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(ex + r * 0.035, ey - r * 0.06, r * 0.05, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#101018'; c.lineWidth = r * 0.06; c.lineCap = 'round';
    c.beginPath(); c.arc(ex, ey + r * 0.02, r * 0.22, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  }
  if (o.dying == null || o.dying < 0.55) {
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = Math.max(1, r * 0.06);
    cs.draw(c, r, o);
  }
  if (o.stunned) {   // faíscas girando = paralisado
    c.fillStyle = '#fff56a';
    for (let i = 0; i < 4; i++) {
      const a = o.time * 9 + i * Math.PI / 2;
      c.beginPath(); c.arc(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3, r * 0.14, 0, Math.PI * 2); c.fill();
    }
  }
  c.restore();
}

/* =====================================================================
   4. DIFICULDADES E PODERES DOS FANTASMAS
   ===================================================================== */
/* Parâmetros por dificuldade. Até o "Difícil" fica abaixo do clássico em vidas/tolerância,
   e o "Fácil" é bem permissivo: fantasmas lentos, susto longo, paralisia curta. */
const DIFFS = {
  easy: {
    label: 'Fácil', short: 'FÁC', desc: '5 vidas · fantasmas lentos · pontos x1', mult: 1,
    lives: 5, pac: 7.6, gBase: 4.0, gInc: 0.2, gCap: 1.2,
    fright: 9, frightDec: 0.5, frightMin: 3,
    stunBase: 0.8, stunInc: 0.05, stunCap: 1.1,
    beamCd: 6.0, beamDec: 0.2, beamMin: 3.5, beamSpeed: 8, sight: 6,
    burstMul: 1.35, burstDur: 1.4, burstGap: 8,
    rndBase: 0.35, rndMin: 0.12, release: 1.5, scatter: 1.4, hit: 0.45
  },
  medium: {
    label: 'Médio', short: 'MÉD', desc: '4 vidas · ritmo equilibrado · pontos x1,5', mult: 1.5,
    lives: 4, pac: 7.2, gBase: 4.6, gInc: 0.3, gCap: 1.8,
    fright: 7.5, frightDec: 0.6, frightMin: 2.5,
    stunBase: 1.0, stunInc: 0.08, stunCap: 1.5,
    beamCd: 5.0, beamDec: 0.25, beamMin: 2.5, beamSpeed: 9.5, sight: 8,
    burstMul: 1.45, burstDur: 1.7, burstGap: 7,
    rndBase: 0.24, rndMin: 0.08, release: 1.2, scatter: 1.2, hit: 0.52
  },
  hard: {
    label: 'Difícil', short: 'DIF', desc: '3 vidas · fantasmas rápidos · pontos x2', mult: 2,
    lives: 3, pac: 7.0, gBase: 5.3, gInc: 0.35, gCap: 2.2,
    fright: 7, frightDec: 0.7, frightMin: 1.8,
    stunBase: 1.1, stunInc: 0.1, stunCap: 2.0,
    beamCd: 4.2, beamDec: 0.25, beamMin: 1.8, beamSpeed: 11, sight: 9,
    burstMul: 1.6, burstDur: 2.0, burstGap: 6,
    rndBase: 0.16, rndMin: 0.03, release: 1, scatter: 1, hit: 0.6
  }
};

/* Cores do nível de poder: azul claro → verde-limão → laranja → vermelho */
const POWERS = [
  { id: 'strategist', name: 'O Estrategista', color: '#3de8ff', desc: 'Calcula o caminho mais curto até você (BFS).' },
  { id: 'leader',     name: 'O Líder',        color: '#d2ff2e', desc: 'Emite uma rota e coordena o bando para te cercar.' },
  { id: 'fast',       name: 'O Veloz',        color: '#ff9d1c', desc: 'Acelera em picos de velocidade. Fique atento ao brilho!' },
  { id: 'mage',       name: 'O Mago',         color: '#ff1e4d', desc: 'Dispara raios em linha reta que paralisam o Pac-Man.' }
];
const BASE_COLORS = ['#9a6bd6', '#d66ba5', '#4fb39a', '#7f8fb8'];   // fantasmas comuns (cores discretas)
const SCATTER = [[17, 1], [1, 1], [17, 19], [1, 19]];

/* FASES: cada tipo de fantasma tem UMA fase só dele, na ordem do azul claro ao vermelho,
   e cada fase tem o seu próprio mapa. Vale igual para as 3 dificuldades.
     fase 1 = fantasma 1 (Estrategista) | fase 2 = fantasma 2 (Líder)
     fase 3 = fantasma 3 (Veloz)        | fase 4 = fantasma 4 (Mago)
   Para criar mais fases, basta acrescentar uma linha aqui (e um mapa em MAPS). */
const PHASES = [
  { power: 'strategist', ghost: 0, map: 0 },
  { power: 'leader',     ghost: 1, map: 1 },
  { power: 'fast',       ghost: 2, map: 2 },
  { power: 'mage',       ghost: 3, map: 3 }
];
const MAX_LEVEL = PHASES.length;   // ao completar a última fase o jogador vence

/** Apenas UM dos 4 fantasmas recebe o poder da fase; os outros 3 ficam no comportamento padrão. */
function powerForLevel(lv) {
  const ph = PHASES[lv - 1];
  return { ghost: ph.ghost, power: POWERS.find(p => p.id === ph.power) };
}

/* =====================================================================
   5. ÁUDIO (sintetizado com WebAudio, sem arquivos)
   ===================================================================== */
const sound = { ctx: null, muted: lsGet(STORE.mute, '0') === '1', toggle: false };
function audioCtx() {
  if (!sound.ctx) { try { sound.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (sound.ctx.state === 'suspended') sound.ctx.resume();
  return sound.ctx;
}
function tone(freq, dur, type, vol, toFreq, delay) {
  if (sound.muted) return;
  const ac = audioCtx(); if (!ac) return;
  const t = ac.currentTime + (delay || 0);
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t);
  if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
  g.gain.setValueAtTime(vol || 0.04, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(t); o.stop(t + dur + 0.03);
}
const sfx = {
  waka() { sound.toggle = !sound.toggle; tone(sound.toggle ? 440 : 330, 0.07, 'square', 0.03); },
  power() { tone(200, 0.35, 'sawtooth', 0.05, 700); },
  eatGhost() { tone(300, 0.25, 'square', 0.05, 1200); },
  fruit() { tone(660, 0.1, 'triangle', 0.06); tone(990, 0.15, 'triangle', 0.06, null, 0.1); },
  death() { tone(520, 1.2, 'sawtooth', 0.05, 60); },
  beam() { tone(900, 0.25, 'sawtooth', 0.04, 150); },
  stun() { tone(120, 0.5, 'square', 0.06, 40); },
  start() { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.14, 'square', 0.04, null, i * 0.13)); },
  clear() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.06, null, i * 0.12)); },
  oneUp() { [784, 988, 1175].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, null, i * 0.09)); }
};

/* =====================================================================
   6. RANKING E PREFERÊNCIAS (localStorage)
   Só grava dados se o jogador aceitou o termo (variável "consent").
   Cada registro guarda: nome, pontos, FASE em que a partida terminou, dificuldade e data.
   ===================================================================== */
let consent = lsGet(STORE.consent, '') !== '';
let diffKey = lsGet(STORE.diff, 'medium');
if (!DIFFS[diffKey]) diffKey = 'medium';
const D = () => DIFFS[diffKey];

/** Salva uma preferência somente com autorização do jogador. */
function savePref(k, v) { if (consent) lsSet(k, v); }

function loadRanking() {
  try {
    const r = JSON.parse(lsGet(STORE.rank, '[]'));
    return Array.isArray(r) ? r.filter(e => e && typeof e.score === 'number' && typeof e.name === 'string') : [];
  } catch (e) { return []; }
}
/** Salva a pontuação e devolve a posição (1-10) ou 0 se não entrou no Top 10. */
function saveScoreEntry(entry) {
  if (!consent) return 0;
  const r = loadRanking();
  r.push(entry);
  r.sort((a, b) => b.score - a.score || a.date - b.date);
  const top = r.slice(0, 10);
  lsSet(STORE.rank, JSON.stringify(top));
  const pos = top.findIndex(e => e.date === entry.date && e.score === entry.score && e.name === entry.name);
  return pos + 1;
}
function bestScore() { const r = loadRanking(); return r.length ? r[0].score : 0; }

/** Texto da fase do recorde, ex.: "Fase 3 · MÉD" */
function levelLabel(e) {
  return 'Fase ' + (e.level || 1) + ((DIFFS[e.diff] || {}).short ? ' · ' + DIFFS[e.diff].short : '');
}

function renderRanking(podiumEl, listEl, hl) {
  const r = loadRanking();
  const same = (e) => hl && e && e.date === hl.date && e.score === hl.score && e.name === hl.name;
  podiumEl.replaceChildren();
  [1, 0, 2].forEach(i => {   // 2º, 1º, 3º
    const e = r[i];
    const d = document.createElement('div');
    d.className = 'place p' + (i + 1) + (same(e) ? ' me' : '');
    const medal = document.createElement('div'); medal.className = 'medal'; medal.textContent = ['🥇', '🥈', '🥉'][i];
    const nm = document.createElement('div'); nm.className = 'pname'; nm.textContent = e ? e.name : '---';
    const sc = document.createElement('div'); sc.className = 'pscore'; sc.textContent = e ? e.score : '0';
    const lv = document.createElement('div'); lv.className = 'plevel'; lv.textContent = e ? levelLabel(e) : '';
    const st = document.createElement('div'); st.className = 'step';
    d.append(medal, nm, sc, lv, st);
    podiumEl.appendChild(d);
  });
  listEl.replaceChildren();
  if (r.length === 0) {
    const li = document.createElement('li'); li.className = 'rank-empty'; li.textContent = 'Nenhum recorde ainda. Seja o primeiro!';
    listEl.appendChild(li);
    return;
  }
  r.forEach((e, i) => {
    if (i < 3) return;
    const li = document.createElement('li');
    if (same(e)) li.className = 'me';
    const a = document.createElement('span'); a.textContent = (i + 1) + 'º';
    const b = document.createElement('span'); b.textContent = e.name;
    const c = document.createElement('span'); c.className = 'lv'; c.textContent = levelLabel(e);
    const d = document.createElement('span'); d.className = 'sc'; d.textContent = e.score;
    li.append(a, b, c, d);
    listEl.appendChild(li);
  });
}

/* =====================================================================
   7. ESTADO DO JOGO
   ===================================================================== */
const canvas = $('game');
const ctx = canvas.getContext('2d');

let state = 'menu';   // menu | ready | playing | dying | levelclear | levelscreen | gameover | paused
let prevState = 'menu';
let score = 0, lives = 3, level = 1, extraLifeGiven = false;
let playerName = 'JOGADOR';
let costumeIdx = Math.min(COSTUMES.length - 1, Math.max(0, parseInt(lsGet(STORE.costume, '0'), 10) || 0));
let pac = null, ghosts = [], beams = [], popups = [], fruit = null;
let frightTimer = 0, ghostCombo = 0;
let mode = 'scatter', modeIdx = 0, modeTimer = 0;
let readyTimer = 0, deathTimer = 0, clearTimer = 0, time = 0;
let currentPower = POWERS[0], specialIdx = 0;
let mazeCache = null, mazeFlash = null;
let lastRank = null;

const FRUITS = [
  { color: '#ff2a3a', pts: 100 }, { color: '#ff6fa8', pts: 300 }, { color: '#ff9d1c', pts: 500 },
  { color: '#6adf3c', pts: 700 }, { color: '#9cf06a', pts: 1000 }, { color: '#b46bff', pts: 2000 }
];

/* =====================================================================
   8. MOVIMENTO EM GRADE
   Cada entidade está numa casa (tx,ty) e avança 'prog' (0..1) rumo à casa seguinte.
   Decisões de direção só acontecem no centro da casa => nunca atravessa parede nem trava.
   ===================================================================== */
function makeEntity(tx, ty) { return { tx, ty, dir: NONE, prog: 0, door: false }; }

function posOf(e) { return { x: wrapX(e.tx + e.dir.x * e.prog), y: e.ty + e.dir.y * e.prog }; }
function tileOf(e) {
  return e.prog >= 0.5 ? { x: wrapX(e.tx + e.dir.x), y: e.ty + e.dir.y } : { x: e.tx, y: e.ty };
}
function near(p, q, th) {
  let dx = Math.abs(p.x - q.x); dx = Math.min(dx, COLS - dx);
  const dy = p.y - q.y;
  return dx * dx + dy * dy < th * th;
}

/** Inverte o sentido no meio do caminho sem "pular" de lugar. */
function flip(e) {
  if (!(e.dir.x || e.dir.y)) return;
  if (e.prog > 0) { e.tx = wrapX(e.tx + e.dir.x); e.ty += e.dir.y; e.prog = 1 - e.prog; }
  e.dir = opp(e.dir);
}

function stepEntity(e, dist, choose, arrive) {
  let guard = 0;
  while (dist > 1e-9 && guard++ < 8) {
    if (state !== 'playing') return;
    if (e.prog === 0) {
      choose(e);
      if (e.dir === NONE) return;
      if (!canMove(e.tx, e.ty, e.dir, e.door)) { e.dir = NONE; return; }
    }
    const need = 1 - e.prog;
    if (dist >= need - 1e-9) {
      dist -= need;
      e.tx = wrapX(e.tx + e.dir.x); e.ty += e.dir.y; e.prog = 0;
      if (arrive) arrive(e);
    } else { e.prog += dist; dist = 0; }
  }
}

/* ---- Pac-Man ---- */
function pacChoose(e) {
  if (canMove(e.tx, e.ty, e.want, false)) e.dir = e.want;
  else if (!canMove(e.tx, e.ty, e.dir, false)) e.dir = NONE;
  if (e.dir !== NONE) e.facing = e.dir;
}

function pacArrive(e) {
  const c = grid[e.ty][e.tx];
  if (c === '.') {
    grid[e.ty][e.tx] = ' '; pelletsLeft--; addScore(10); sfx.waka();
  } else if (c === 'o') {
    grid[e.ty][e.tx] = ' '; pelletsLeft--; addScore(50); startFright(); sfx.power();
  }
  // Frutas bônus aparecem quando ~30% e ~70% das pastilhas foram comidas
  const eaten = pelletsTotal - pelletsLeft;
  if (!fruit && (eaten === Math.round(pelletsTotal * 0.3) || eaten === Math.round(pelletsTotal * 0.7))) fruit = { x: 9, y: 11, life: 10 };
  if (pelletsLeft <= 0) levelCleared();
}

function setWant(d) {
  if (!pac) return;
  pac.want = d;
  if (state === 'playing' && pac.stun <= 0 && isOpp(d, pac.dir) && pac.prog > 0) flip(pac);
}

function updatePac(dt) {
  pac.stunImmune = Math.max(0, pac.stunImmune - dt);
  if (pac.stun > 0) { pac.stun -= dt; return; }
  stepEntity(pac, D().pac * dt, pacChoose, pacArrive);
  if (pac.dir !== NONE) pac.phase += dt * 15;
}

/* ---- Fantasmas ---- */
function isFrightened(g) { return frightTimer > 0 && g.state === 'normal' && !g.immune; }

function leaderActive() {
  const L = ghosts.find(o => o.power === 'leader');
  return L && L.state === 'normal' && !isFrightened(L) ? L : null;
}

function ghostSpeed(g) {
  const d = D();
  const base = d.gBase + Math.min(d.gCap, (level - 1) * d.gInc);
  if (g.state === 'eaten') return 12;
  if (g.state === 'leaving') return base * 0.75;
  if (isFrightened(g)) return base * 0.5;
  let s = base;
  if (g.power === 'fast' && g.burst > 0) s *= d.burstMul;
  if (g.power === 'default' && leaderActive()) s *= 1.05;
  if (g.ty === 9 && (g.tx < 4 || g.tx > 14)) s *= 0.55;     // túnel deixa lento
  return s;
}

function updateGhost(g, dt) {
  const d = D();
  if (g.state === 'house') {
    g.release -= dt;
    if (g.release <= 0) g.state = 'leaving';
    return;
  }
  if (g.power === 'fast') {
    if (g.burst > 0) g.burst -= dt;
    else { g.nextBurst -= dt; if (g.nextBurst <= 0) { g.burst = d.burstDur; g.nextBurst = Math.max(3, d.burstGap - 0.25 * level); } }
  }
  if (g.power === 'mage') g.cd -= dt;
  if (g.charge > 0) {
    if (isFrightened(g) || g.state !== 'normal') g.charge = 0;
    else { g.charge -= dt; if (g.charge <= 0) fireBeam(g); return; }
  }
  stepEntity(g, ghostSpeed(g) * dt, ghostChoose, null);
}

/* =====================================================================
   9. INTELIGÊNCIA ARTIFICIAL DOS FANTASMAS
   ===================================================================== */
function pathDir(g, gx, gy, door) {
  const p = bfs(g.tx, g.ty, gx, gy, door);
  if (!p || p.length < 2) return null;
  g.route = p;
  return dirTo(p[0], p[1]);
}

function followerTarget(g) {
  const followers = ghosts.filter(o => o.power !== 'leader');
  const idx = followers.indexOf(g);
  const pt = tileOf(pac), f = pac.facing;
  if (Math.abs(g.tx - pt.x) + Math.abs(g.ty - pt.y) <= 2) return pt;
  let tx, ty;
  if (idx === 0) { tx = pt.x + f.x * 4; ty = pt.y + f.y * 4; }          // corta pela frente
  else if (idx === 1) { tx = pt.x - f.x * 3; ty = pt.y - f.y * 3; }    // fecha por trás
  else { tx = pt.x - f.y * 3; ty = pt.y + f.x * 3; }                    // flanqueia pelo lado
  tx = Math.max(0, Math.min(COLS - 1, tx)); ty = Math.max(0, Math.min(ROWS - 1, ty));
  return nearestWalkable(tx, ty);
}

function ghostChoose(g) {
  // Transições de estado ligadas à casa dos fantasmas
  if (g.state === 'eaten' && g.tx === 9 && g.ty === 9) g.state = 'leaving';
  if (g.state === 'leaving' && g.tx === 9 && g.ty === 7) g.state = 'normal';
  g.door = (g.state === 'leaving' || g.state === 'eaten');

  if (g.state === 'eaten') { g.dir = pathDir(g, 9, 9, true) || NONE; return; }
  if (g.state === 'leaving') { g.dir = pathDir(g, 9, 7, true) || NONE; return; }

  let opts = DIR_LIST.filter(d => canMove(g.tx, g.ty, d, false) && !isOpp(d, g.dir));
  if (!opts.length) opts = DIR_LIST.filter(d => canMove(g.tx, g.ty, d, false));
  if (!opts.length) { g.dir = NONE; return; }

  const dif = D();
  let choice = null;
  if (isFrightened(g)) {
    choice = rand(opts);                                   // assustado: anda ao acaso
  } else {
    const pt = tileOf(pac);
    if (g.power === 'strategist' || g.power === 'leader') {
      choice = pathDir(g, pt.x, pt.y, false);              // caminho ótimo (BFS)
    } else if (g.power === 'mage') {
      if (g.cd <= 0) {
        const d = lineOfSight(g.tx, g.ty, pt.x, pt.y, dif.sight);
        if (d) { g.charge = 0.55; g.fireDir = d; g.dir = NONE; return; }
      }
    }
    if (!choice) {
      const L = leaderActive();
      if (L && g.power === 'default') {                    // suporte do Líder: rota otimizada para cercar
        const t = followerTarget(g);
        choice = pathDir(g, t.x, t.y, false);
      }
    }
    if (!choice) {                                         // perseguidor padrão (guloso) com um pouco de acaso
      const scatter = mode === 'scatter' && g.power === 'default';
      const target = scatter ? { x: SCATTER[g.id][0], y: SCATTER[g.id][1] } : pt;
      const chance = Math.max(dif.rndMin, dif.rndBase - 0.015 * (level - 1));
      if (Math.random() < chance && opts.length > 1) choice = rand(opts);
      else {
        let bd = Infinity;
        for (const d of opts) {
          const dd = (g.tx + d.x - target.x) ** 2 + (g.ty + d.y - target.y) ** 2;
          if (dd < bd) { bd = dd; choice = d; }
        }
      }
    }
  }
  g.dir = choice || opts[0];
  if (g.dir !== NONE) g.facing = g.dir;
}

/* ---- Raios do Mago ---- */
function fireBeam(g) {
  const d = D();
  const pt = tileOf(pac);
  const dir = lineOfSight(g.tx, g.ty, pt.x, pt.y, 12) || g.fireDir || g.facing || LEFT;
  beams.push({ x: g.tx, y: g.ty, dir, speed: d.beamSpeed, life: 2.5, color: '#ff1e4d' });
  g.cd = Math.max(d.beamMin, d.beamCd - d.beamDec * (level - 1));
  sfx.beam();
}

function updateBeams(dt) {
  const d = D();
  const pp = posOf(pac);
  for (let i = beams.length - 1; i >= 0; i--) {
    const b = beams[i];
    b.x += b.dir.x * b.speed * dt; b.y += b.dir.y * b.speed * dt; b.life -= dt;
    if (b.life <= 0 || b.x < 0 || b.x > COLS - 1 || !walkable(Math.round(b.x), Math.round(b.y), false)) { beams.splice(i, 1); continue; }
    if (near({ x: b.x, y: b.y }, pp, d.hit - 0.05)) {
      beams.splice(i, 1);
      if (pac.stun <= 0 && pac.stunImmune <= 0) {
        const dur = Math.min(d.stunCap, d.stunBase + d.stunInc * level);
        pac.stun = dur; pac.stunImmune = dur + 1.6;
        sfx.stun(); rumble(300, 0.9);
        addPopup(pp.x * TILE + TILE / 2, pp.y * TILE, 'PARALISADO!', '#fff56a');
      }
    }
  }
}

/* =====================================================================
   10. REGRAS: PONTOS, VIDAS, FASES
   ===================================================================== */
function addScore(n) {
  score += Math.round(n * D().mult);
  if (!extraLifeGiven && score >= 10000) { extraLifeGiven = true; lives++; sfx.oneUp(); drawLives(); addPopup(W / 2, H / 2, '1UP!', '#7dff7d'); }
  if (score > parseInt($('hudHigh').dataset.v || '0', 10)) { $('hudHigh').dataset.v = score; $('hudHigh').textContent = score; }
  $('hudScore').textContent = score;
}

function addPopup(x, y, text, color) { popups.push({ x, y, text, color, life: 1.1 }); }

function startFright() {
  const d = D();
  frightTimer = Math.max(d.frightMin, d.fright - (level - 1) * d.frightDec);
  ghostCombo = 0;
  ghosts.forEach(g => { g.immune = false; if (g.state === 'normal') { g.charge = 0; flip(g); } });
}

const MODE_SEQ = [['scatter', 7], ['chase', 20], ['scatter', 6], ['chase', 20], ['scatter', 4], ['chase', Infinity]];
function scatterScale() { return D().scatter * Math.max(0.3, 1 - 0.1 * (level - 1)); }
function resetModes() { modeIdx = 0; mode = MODE_SEQ[0][0]; modeTimer = MODE_SEQ[0][1] * scatterScale(); }
function advanceMode() {
  modeIdx = Math.min(modeIdx + 1, MODE_SEQ.length - 1);
  mode = MODE_SEQ[modeIdx][0];
  modeTimer = MODE_SEQ[modeIdx][1] * (mode === 'scatter' ? scatterScale() : 1);
}

function resetActors() {
  const d = D();
  pac = makeEntity(9, 15);
  Object.assign(pac, { want: LEFT, facing: LEFT, phase: 0, stun: 0, stunImmune: 0 });
  const starts = [[9, 7], [8, 9], [9, 9], [10, 9]];
  const sp = powerForLevel(level);
  specialIdx = sp.ghost; currentPower = sp.power;
  ghosts = starts.map((s, i) => {
    const g = makeEntity(s[0], s[1]);
    Object.assign(g, {
      id: i, state: i === 0 ? 'normal' : 'house', facing: LEFT, immune: false,
      release: Math.max(1, [0, 2.5, 5, 7.5][i] * d.release - (level - 1) * 0.4),
      color: BASE_COLORS[i], power: 'default', burst: 0, nextBurst: 3.5 + (d.burstGap - 6) * 0.5,
      cd: d.beamCd / 2, charge: 0, route: null, fireDir: null
    });
    if (i === 0) g.dir = LEFT;
    if (i === sp.ghost) g.power = sp.power.id;
    return g;
  });
  beams = []; frightTimer = 0;
}

function startLevel() {
  loadMaze();
  const th = THEMES[mapIndex(level) % THEMES.length];
  mazeCache = buildMaze(th, false); mazeFlash = buildMaze(th, true);
  resetActors(); resetModes();
  popups = []; fruit = null;
  state = 'ready'; readyTimer = 2.4;
  showScreen(null);
  updateHud(); updatePowerBar();
  sfx.start();
}

function startNewGame() {
  if (!consent) { showScreen('screen-start'); return; }
  score = 0; lives = D().lives; level = 1; extraLifeGiven = false;
  $('hudHigh').dataset.v = bestScore(); $('hudHigh').textContent = bestScore();
  startLevel();
}

function killPac() {
  state = 'dying'; deathTimer = DEATH_TIME; beams = [];
  sfx.death(); rumble(500, 1);
}

function afterDeath() {
  lives--; drawLives();
  if (lives <= 0) { gameOver(false); return; }
  resetActors(); resetModes();
  state = 'ready'; readyTimer = 1.8;
}

function levelCleared() {
  state = 'levelclear'; clearTimer = 1.6; beams = [];
  sfx.clear();
}

function afterClear() {
  const bonus = 500 * level;
  addScore(bonus);
  if (level >= MAX_LEVEL) { gameOver(true); return; }
  const nx = powerForLevel(level + 1).power;
  $('luTitle').textContent = 'Fase ' + level + ' completa!';
  $('luBonus').textContent = 'Bônus +' + Math.round(bonus * D().mult);
  $('luMap').textContent = 'Novo mapa: ' + MAPS[mapIndex(level + 1)].name;
  $('luPowerDot').style.background = nx.color; $('luPowerDot').style.color = nx.color;
  $('luPowerName').textContent = nx.name; $('luPowerName').style.color = nx.color;
  $('luPowerDesc').textContent = nx.desc;
  state = 'levelscreen';
  showScreen('screen-levelup');
}

function gameOver(win) {
  state = 'gameover';
  // "level" é a fase em que a partida terminou: é ela que vai para o ranking
  const entry = { name: playerName, score, level, diff: diffKey, date: Date.now() };
  const pos = saveScoreEntry(entry);
  lastRank = entry;
  $('goTitle').textContent = win ? 'Você venceu!' : 'Game Over';
  $('goScore').textContent = score + ' pontos · fase ' + level;
  $('goRankMsg').textContent = pos
    ? (pos === 1 ? 'Novo recorde na fase ' + level + '! Você é o nº 1 do ranking.' : 'Você ficou em ' + pos + 'º lugar no ranking (fase ' + level + ').')
    : 'Não foi dessa vez: fora do Top 10.';
  renderRanking($('podiumGO'), $('rankListGO'), entry);
  showScreen('screen-gameover');
}

function togglePause() {
  if (state === 'playing' || state === 'ready') { prevState = state; state = 'paused'; showScreen('screen-pause'); }
  else if (state === 'paused') { state = prevState; showScreen(null); }
}

function updatePlaying(dt) {
  // Temporizadores globais
  if (frightTimer > 0) { frightTimer -= dt; if (frightTimer < 0) frightTimer = 0; }
  else { modeTimer -= dt; if (modeTimer <= 0) advanceMode(); }

  updatePac(dt);
  if (state !== 'playing') return;
  ghosts.forEach(g => updateGhost(g, dt));
  updateBeams(dt);

  // Fruta bônus
  if (fruit) {
    fruit.life -= dt;
    if (fruit.life <= 0) fruit = null;
    else if (near(posOf(pac), fruit, 0.6)) {
      const f = FRUITS[(level - 1) % FRUITS.length];
      addScore(f.pts); sfx.fruit();
      lives++; drawLives(); sfx.oneUp();   // fruta = +1 vida, em qualquer fase e dificuldade
      addPopup(fruit.x * TILE + TILE / 2, fruit.y * TILE, '+1 VIDA', '#7dff7d');
      fruit = null;
    }
  }

  // Colisões Pac-Man x fantasmas (a "área de acerto" é menor nas dificuldades fáceis)
  const pp = posOf(pac);
  for (const g of ghosts) {
    if (g.state === 'house' || g.state === 'eaten') continue;
    if (!near(pp, posOf(g), D().hit)) continue;
    if (isFrightened(g)) {
      ghostCombo++;
      const pts = Math.min(1600, 200 * Math.pow(2, ghostCombo - 1));
      addScore(pts); sfx.eatGhost();
      addPopup(pp.x * TILE + TILE / 2, pp.y * TILE, String(Math.round(pts * D().mult)), '#3de8ff');
      g.state = 'eaten'; g.immune = true; g.charge = 0;
    } else { killPac(); break; }
  }
}

/* =====================================================================
   11. DESENHO
   ===================================================================== */
function buildMaze(theme, flash) {
  const o = document.createElement('canvas'); o.width = W; o.height = H;
  const c = o.getContext('2d');
  c.fillStyle = '#02020a'; c.fillRect(0, 0, W, H);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
    if (grid[y][x] === '#') { c.fillStyle = flash ? '#1a1a44' : theme.fill; c.fillRect(x * TILE, y * TILE, TILE, TILE); }
  c.lineCap = 'round'; c.lineWidth = 2.5;
  c.strokeStyle = flash ? '#ffffff' : theme.line;
  c.shadowColor = flash ? '#ffffff' : theme.glow; c.shadowBlur = 9;
  c.beginPath();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (grid[y][x] !== '#') continue;
    for (const d of DIR_LIST) {
      const nx = x + d.x, ny = y + d.y;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || grid[ny][nx] === '#') continue;
      let x1, y1, x2, y2;
      if (d.y === -1) { x1 = x * TILE; y1 = y * TILE; x2 = x1 + TILE; y2 = y1; }
      else if (d.y === 1) { x1 = x * TILE; y1 = (y + 1) * TILE; x2 = x1 + TILE; y2 = y1; }
      else if (d.x === -1) { x1 = x * TILE; y1 = y * TILE; x2 = x1; y2 = y1 + TILE; }
      else { x1 = (x + 1) * TILE; y1 = y * TILE; x2 = x1; y2 = y1 + TILE; }
      c.moveTo(x1, y1); c.lineTo(x2, y2);
    }
  }
  c.stroke();
  c.shadowBlur = 0; c.strokeStyle = '#ffb8de'; c.lineWidth = 3;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
    if (grid[y][x] === '-') { c.beginPath(); c.moveTo(x * TILE, y * TILE + TILE / 2); c.lineTo((x + 1) * TILE, y * TILE + TILE / 2); c.stroke(); }
  return o;
}

function drawPellets() {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = grid[y][x];
    if (ch === '.') {
      ctx.fillStyle = '#ffd9b0'; ctx.beginPath(); ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 2.2, 0, Math.PI * 2); ctx.fill();
    } else if (ch === 'o') {
      const pulse = 5 + 1.6 * Math.sin(time * 8);
      ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 10; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, pulse, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
}

function drawFruit() {
  if (!fruit) return;
  const f = FRUITS[(level - 1) % FRUITS.length];
  const x = fruit.x * TILE + TILE / 2, y = fruit.y * TILE + TILE / 2;
  ctx.save();
  if (fruit.life < 3 && ((time * 8) | 0) % 2) ctx.globalAlpha = 0.4;
  ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(x - 3, y + 2, 6, 0, Math.PI * 2); ctx.arc(x + 4, y + 3, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3f9a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.quadraticCurveTo(x, y - 10, x + 5, y - 8); ctx.moveTo(x + 4, y - 3); ctx.lineTo(x + 5, y - 8); ctx.stroke();
  ctx.restore();
}

function withWrap(p, fn) {
  const px = p.x * TILE + TILE / 2, py = p.y * TILE + TILE / 2;
  fn(px, py);
  if (p.x > COLS - 1) fn(px - W, py);   // metade que atravessa o túnel aparece do outro lado
}

function drawPowerIcon(c, id, r) {
  c.save(); c.translate(0, -r * 1.55); c.lineWidth = 1.4; c.strokeStyle = '#fff';
  if (id === 'strategist') {
    c.beginPath(); c.arc(0, 0, r * .3, 0, Math.PI * 2); c.moveTo(-r * .45, 0); c.lineTo(r * .45, 0); c.moveTo(0, -r * .45); c.lineTo(0, r * .45); c.stroke();
  } else if (id === 'leader') {
    c.fillStyle = '#ffd23a'; poly(c, r, [[-.35, .2], [-.4, -.3], [-.15, -.05], [0, -.4], [.15, -.05], [.4, -.3], [.35, .2]]);
  } else if (id === 'fast') {
    c.fillStyle = '#fff12e'; poly(c, r, [[.1, -.45], [-.25, .05], [0, .05], [-.1, .5], [.3, -.1], [.05, -.1]]);
  } else if (id === 'mage') {
    c.fillStyle = '#fff'; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .16 : r * .38; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }
  c.restore();
}

function drawGhost(g, px, py) {
  const r = TILE * 0.46;
  const fr = isFrightened(g);
  const special = g.power !== 'default';
  const pw = special ? POWERS.find(p => p.id === g.power) : null;
  const tier = Math.floor((level - 1) / 4);
  const f = (g.dir.x || g.dir.y) ? g.dir : (g.facing || LEFT);
  if (g.dir.x || g.dir.y) g.facing = g.dir;
  const bob = g.state === 'house' ? Math.sin(time * 6 + g.id) * 2 : 0;

  ctx.save();
  ctx.translate(px, py + bob);

  if (g.state !== 'eaten') {
    let color = g.color;
    if (fr) color = (frightTimer < 2 && ((time * 8) | 0) % 2) ? '#ffffff' : '#2234ff';
    else if (special) color = pw.color;
    const warn = g.power === 'fast' && g.nextBurst < 0.8 && g.burst <= 0 && !fr;

    if (special && !fr) {
      const pulse = 0.6 + 0.4 * Math.sin(time * 6 + g.id);
      const gr = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * (2.2 + 0.2 * tier));
      gr.addColorStop(0, rgba(pw.color, 0.55 * pulse)); gr.addColorStop(1, rgba(pw.color, 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r * (2.4 + 0.2 * tier), 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = pw.color; ctx.shadowBlur = 14 + 8 * pulse;
      if (g.power === 'fast' && g.burst > 0) {   // rastro de velocidade
        ctx.strokeStyle = rgba(pw.color, 0.7); ctx.lineWidth = 2;
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath(); ctx.moveTo(-f.x * r * 1.1 + f.y * k * r * .5, -f.y * r * 1.1 + f.x * k * r * .5);
          ctx.lineTo(-f.x * r * 2.4 + f.y * k * r * .5, -f.y * r * 2.4 + f.x * k * r * .5); ctx.stroke();
        }
      }
    }
    // corpo (cúpula + base ondulada)
    ctx.fillStyle = (warn && ((time * 16) | 0) % 2) ? '#ffffff' : color;
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r, Math.PI, 0);
    ctx.lineTo(r, r * 0.95);
    const n = 3, step = 2 * r / n, wave = ((time * 8) | 0) % 2 ? 0.55 : 0.75;
    for (let i = 0; i < n; i++) { const xr = r - i * step; ctx.lineTo(xr - step / 2, r * wave); ctx.lineTo(xr - step, r * 0.95); }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

    if (g.charge > 0) {   // mago carregando o raio
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r * (1 + (1 - g.charge / 0.55) * 1.4), 0, Math.PI * 2); ctx.stroke();
    }
  }

  // ----- rosto -----
  if (fr) {
    ctx.fillStyle = '#ffd9a0';
    ctx.beginPath(); ctx.arc(-r * .35, -r * .2, r * .13, 0, Math.PI * 2); ctx.arc(r * .35, -r * .2, r * .13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i <= 6; i++) { const mx = -r * .6 + i * r * .2, my = r * .35 + (i % 2 ? -r * .12 : r * .1); i ? ctx.lineTo(mx, my) : ctx.moveTo(mx, my); }
    ctx.stroke();
  } else {
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(s * r * 0.4, -r * 0.2, r * 0.27, r * 0.34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = special && g.state !== 'eaten' ? '#111' : '#1a2cff';
      ctx.beginPath(); ctx.arc(s * r * 0.4 + f.x * r * 0.13, -r * 0.2 + f.y * r * 0.15, r * 0.15, 0, Math.PI * 2); ctx.fill();
    }
    if (g.state !== 'eaten') {
      if (g.charge > 0) {
        ctx.fillStyle = '#220010'; ctx.beginPath(); ctx.arc(0, r * 0.38, r * 0.24, 0, Math.PI * 2); ctx.fill();
      } else if (special) {   // sorriso largo com dentes
        ctx.fillStyle = '#220010'; ctx.beginPath(); ctx.arc(0, r * 0.15, r * 0.5, 0, Math.PI); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(-r * 0.4, r * 0.15, r * 0.8, r * 0.13);
      } else {                // sorriso simples
        ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, r * 0.05, r * 0.42, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
      }
    }
  }
  if (special && !fr && g.state !== 'eaten') drawPowerIcon(ctx, g.power, r);
  ctx.restore();
}

function drawRoutes() {
  ctx.save();
  ctx.lineWidth = 3; ctx.setLineDash([4, 7]); ctx.lineCap = 'round';
  for (const g of ghosts) {
    if ((g.power !== 'strategist' && g.power !== 'leader') || g.state !== 'normal' || isFrightened(g) || !g.route) continue;
    const col = POWERS.find(p => p.id === g.power).color;
    ctx.strokeStyle = rgba(col, 0.38); ctx.beginPath();
    g.route.forEach((p, i) => {
      const x = p.x * TILE + TILE / 2, y = p.y * TILE + TILE / 2;
      if (i === 0 || Math.abs(g.route[i - 1].x - p.x) > 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  const L = leaderActive();
  if (L) {   // laços de comunicação do líder com o bando
    const lp = posOf(L);
    ctx.strokeStyle = rgba('#d2ff2e', 0.35);
    ghosts.forEach(o => {
      if (o === L || o.state !== 'normal') return;
      const p = posOf(o);
      ctx.beginPath(); ctx.moveTo(lp.x * TILE + TILE / 2, lp.y * TILE + TILE / 2); ctx.lineTo(p.x * TILE + TILE / 2, p.y * TILE + TILE / 2); ctx.stroke();
    });
  }
  ctx.restore();
}

function drawBeams() {
  for (const b of beams) {
    const x1 = b.x * TILE + TILE / 2, y1 = b.y * TILE + TILE / 2;
    const x0 = x1 - b.dir.x * TILE * 1.8, y0 = y1 - b.dir.y * TILE * 1.8;
    ctx.save();
    ctx.shadowColor = b.color; ctx.shadowBlur = 14;
    for (const pass of [{ c: b.color, w: 5 }, { c: '#ffffff', w: 2 }]) {
      ctx.strokeStyle = pass.c; ctx.lineWidth = pass.w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0);
      for (let i = 1; i <= 6; i++) {
        const t = i / 6, j = i === 6 ? 0 : (Math.random() - 0.5) * 7;
        ctx.lineTo(x0 + (x1 - x0) * t + b.dir.y * j, y0 + (y1 - y0) * t + b.dir.x * j);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawPopups(dt) {
  ctx.save(); ctx.font = 'bold 13px "Courier New", monospace'; ctx.textAlign = 'center';
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i]; p.life -= dt; p.y -= 18 * dt;
    if (p.life <= 0) { popups.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
  }
  ctx.restore();
}

function banner(text, y, color, size) {
  ctx.save(); ctx.textAlign = 'center'; ctx.font = 'bold ' + (size || 18) + 'px "Courier New", monospace';
  ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(text, W / 2, y);
  ctx.fillStyle = color; ctx.fillText(text, W / 2, y); ctx.restore();
}

function pacOpen() {
  if (pac.dir === NONE) return 0.35;
  return 0.04 + 0.72 * Math.abs(Math.sin(pac.phase));
}

function render(dt) {
  ctx.clearRect(0, 0, W, H);
  if (!mazeCache) { ctx.fillStyle = '#02020a'; ctx.fillRect(0, 0, W, H); return; }
  const flashing = state === 'levelclear' && ((clearTimer * 6) | 0) % 2 === 0;
  ctx.drawImage(flashing ? mazeFlash : mazeCache, 0, 0);
  if (state === 'levelclear') { /* só o labirinto piscando */ }
  else drawPellets();
  drawFruit();
  if (state === 'levelclear') return;
  if (!pac) return;

  drawRoutes();
  drawBeams();

  // Pac-Man
  withWrap(posOf(pac), (x, y) => {
    if (state === 'dying') drawPac(ctx, x, y, TILE * 0.46, { facing: pac.facing, open: 0, dying: Math.min(1, 1 - deathTimer / DEATH_TIME), costume: costumeIdx, time });
    else drawPac(ctx, x, y, TILE * 0.46, { facing: pac.facing, open: pacOpen(), costume: costumeIdx, stunned: pac.stun > 0, time });
  });

  // Fantasmas (comuns primeiro, especial por cima)
  if (state !== 'dying' || deathTimer > DEATH_TIME * 0.75) {
    const order = ghosts.slice().sort((a, b) => (a.power !== 'default') - (b.power !== 'default'));
    order.forEach(g => withWrap(posOf(g), (x, y) => drawGhost(g, x, y)));
  }

  drawPopups(dt);

  if (state === 'ready') {
    banner('PRONTO!', 11 * TILE + 17, '#ffe600', 20);
    banner('FASE ' + level + ' · ' + MAPS[mapIndex(level)].name, 12.6 * TILE + 8, '#ffffff', 14);
    banner(currentPower.name, 13.5 * TILE + 8, currentPower.color, 14);
  } else if (state === 'paused') {
    banner('PAUSA', 11 * TILE + 17, '#ffffff', 20);
  }
}

/* =====================================================================
   12. ENTRADA: TECLADO, TOQUE E GAMEPAD
   ===================================================================== */
window.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  const d = KEYMAP[e.code];
  if (d) {
    e.preventDefault();
    if (state === 'playing' || state === 'ready') setWant(d);
    else if (activeScreen()) menuMove(d);
    return;
  }
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (e.code === 'KeyM') { toggleMute(); return; }
  if (e.code === 'Enter') {
    const s = activeScreen();
    if (s && document.activeElement && document.activeElement.tagName !== 'BUTTON') {
      const b = s.querySelector('.btn.primary:not(:disabled)'); if (b) b.click();
    }
  }
});

// Deslizar o dedo no canvas
let touchStart = null;
canvas.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; touchStart = { x: t.clientX, y: t.clientY }; }, { passive: true });
canvas.addEventListener('touchmove', (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0], dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
  if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
  setWant(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? RIGHT : LEFT) : (dy > 0 ? DOWN : UP));
  touchStart = { x: t.clientX, y: t.clientY };
  e.preventDefault();
}, { passive: false });

// --- Gamepad API (Xbox, PlayStation e similares) ---
const gp = { pad: null, prevBtn: {}, lastDir: null };
window.addEventListener('gamepadconnected', () => setPadStatus(true));
window.addEventListener('gamepaddisconnected', () => setPadStatus(false));
function setPadStatus(on) {
  $('padStatus').textContent = on ? '🎮 Controle conectado: D-pad ou analógico esquerdo · Start pausa' : 'Nenhum controle detectado (opcional)';
}
function rumble(ms, mag) {
  try {
    const p = gp.pad;
    if (p && p.vibrationActuator) p.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: mag, weakMagnitude: mag / 2 });
  } catch (e) { /* ignorado */ }
}
function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let pad = null;
  for (const p of pads) if (p && p.connected) { pad = p; break; }
  if (!pad) { gp.pad = null; return; }
  if (!gp.pad) setPadStatus(true);
  gp.pad = pad;
  const down = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
  const edge = (i) => { const n = down(i), was = gp.prevBtn[i]; gp.prevBtn[i] = n; return n && !was; };

  let dir = null;
  if (down(12)) dir = UP; else if (down(13)) dir = DOWN; else if (down(14)) dir = LEFT; else if (down(15)) dir = RIGHT;
  else {
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    if (Math.hypot(ax, ay) > 0.5) dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? RIGHT : LEFT) : (ay > 0 ? DOWN : UP);
  }
  const a = edge(0), start = edge(9);
  const newDir = dir && dir !== gp.lastDir;
  gp.lastDir = dir;

  if (start && (state === 'playing' || state === 'ready' || state === 'paused')) { togglePause(); return; }
  if (state === 'playing' || state === 'ready') { if (dir) setWant(dir); return; }
  if (activeScreen()) {
    if (newDir) menuMove(dir);
    if (a) {
      const s = activeScreen(), f = document.activeElement;
      if (f && f.tagName === 'BUTTON' && s.contains(f)) f.click();
      else { const b = s.querySelector('.btn.primary:not(:disabled)'); if (b) b.click(); }
    }
  }
}

/* =====================================================================
   13. INTERFACE: TELAS, TERMO, HUD, FANTASIAS
   ===================================================================== */
function activeScreen() { return document.querySelector('.screen:not(.hidden)'); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  if (!id) return;
  const s = $(id);
  s.classList.remove('hidden');
  const first = s.querySelector('input') || s.querySelector('.btn.primary:not(:disabled)') || s.querySelector('button:not(:disabled)');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
}

function menuMove(d) {
  const s = activeScreen(); if (!s) return;
  // No termo, cima/baixo rolam o texto (útil no controle); esquerda/direita trocam o botão em foco
  if (s.id === 'screen-terms' && (d === UP || d === DOWN)) { $('termsText').scrollBy(0, d === DOWN ? 70 : -70); return; }
  const items = Array.from(s.querySelectorAll('button:not([disabled])'));
  if (!items.length) return;
  let i = items.indexOf(document.activeElement);
  i = (d === UP || d === LEFT) ? (i <= 0 ? items.length - 1 : i - 1) : (i + 1) % items.length;
  items[i].focus();
}

function updateHud() {
  $('hudName').textContent = playerName;
  $('hudNameLbl').textContent = 'Jogador · ' + D().label;
  $('hudScore').textContent = score;
  $('hudLevel').textContent = level;
  drawLives();
}

function drawLives() {
  const c = $('livesCanvas').getContext('2d');
  c.clearRect(0, 0, 92, 26);
  if (lives <= 3) {
    for (let i = 0; i < lives; i++) drawPac(c, 14 + i * 22, 15, 8, { facing: RIGHT, open: 0.5, costume: costumeIdx, time: 0 });
  } else {   // muitas vidas: um ícone + "x N"
    drawPac(c, 14, 15, 8, { facing: RIGHT, open: 0.5, costume: costumeIdx, time: 0 });
    c.fillStyle = '#ffe600'; c.font = 'bold 13px monospace'; c.fillText('x' + lives, 30, 20);
  }
}

function updatePowerBar() {
  $('pbDot').style.background = currentPower.color; $('pbDot').style.color = currentPower.color;
  $('pbName').textContent = currentPower.name; $('pbName').style.color = currentPower.color;
  $('pbDesc').textContent = '— ' + currentPower.desc;
  const scale = $('pbScale');
  scale.replaceChildren();
  POWERS.forEach(p => {
    const i = document.createElement('i');
    i.style.background = p.color; i.style.color = p.color;
    if (p.id === currentPower.id) i.className = 'on';
    scale.appendChild(i);
  });
}

function toggleMute() {
  sound.muted = !sound.muted;
  savePref(STORE.mute, sound.muted ? '1' : '0');
  $('btnMute').textContent = sound.muted ? '🔇' : '🔊';
}

// --- Termo de conscientização e autorização de dados ---
function refreshConsentUI() {
  $('btnConsent').setAttribute('aria-checked', consent ? 'true' : 'false');
  $('btnPlay').disabled = !consent;
}
function setConsent(on) {
  consent = on;
  if (on) {
    lsSet(STORE.consent, new Date().toISOString());
    // grava as escolhas feitas antes do aceite
    lsSet(STORE.costume, String(costumeIdx)); lsSet(STORE.diff, diffKey);
    lsSet(STORE.mute, sound.muted ? '1' : '0');
  } else {
    lsDel(STORE.consent);
  }
  refreshConsentUI();
}
/** Revoga o aceite e apaga TUDO que o jogo guardou no navegador. */
function eraseData() {
  Object.keys(STORE).forEach(k => lsDel(STORE[k]));
  consent = false; costumeIdx = 0; diffKey = 'medium'; playerName = 'JOGADOR';
  lastRank = null;
  $('hudHigh').dataset.v = '0'; $('hudHigh').textContent = '0';
  refreshConsentUI(); refreshDiffUI(); refreshCostumeSelection(); updateHud(); updatePowerBar();
  $('termsMsg').textContent = 'Dados apagados e aceite revogado.';
}

// --- Dificuldade ---
function refreshDiffUI() {
  document.querySelectorAll('#diffSeg .seg-btn').forEach(b => b.setAttribute('aria-checked', b.dataset.diff === diffKey ? 'true' : 'false'));
  $('diffDesc').textContent = D().desc;
}
document.querySelectorAll('#diffSeg .seg-btn').forEach(b => b.addEventListener('click', () => {
  diffKey = b.dataset.diff; savePref(STORE.diff, diffKey); refreshDiffUI(); updateHud();
}));

// --- Fantasias ---
const previews = [];
function refreshCostumeSelection() {
  $('costumeGrid').querySelectorAll('.costume-card').forEach((el, k) => el.classList.toggle('selected', k === costumeIdx));
  drawLives();
}
function buildCostumeGrid() {
  const g = $('costumeGrid');
  g.replaceChildren();
  COSTUMES.forEach((cs, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'costume-card' + (i === costumeIdx ? ' selected' : '');
    const cv = document.createElement('canvas'); cv.width = 90; cv.height = 90;
    const lb = document.createElement('span'); lb.textContent = cs.name;
    b.append(cv, lb);
    b.addEventListener('click', () => {
      costumeIdx = i; savePref(STORE.costume, String(i));
      refreshCostumeSelection();
    });
    g.appendChild(b);
    previews.push({ cv, i });
  });
}
function animatePreviews() {
  const cs = !$('screen-costumes').classList.contains('hidden');
  const nm = !$('screen-name').classList.contains('hidden');
  if (cs) previews.forEach(p => {
    const c = p.cv.getContext('2d'); c.clearRect(0, 0, 90, 90);
    drawPac(c, 45, 56, 24, { facing: RIGHT, open: 0.08 + 0.65 * Math.abs(Math.sin(time * 5 + p.i)), costume: p.i, time });
  });
  if (nm) {
    const c = $('namePreview').getContext('2d'); c.clearRect(0, 0, 110, 110);
    drawPac(c, 55, 68, 30, { facing: RIGHT, open: 0.08 + 0.65 * Math.abs(Math.sin(time * 5)), costume: costumeIdx, time });
  }
}

// --- Botões das telas ---
let costumeBack = 'screen-start';
$('btnConsent').addEventListener('click', () => setConsent(!consent));
$('btnTerms').addEventListener('click', () => { $('termsMsg').textContent = ''; showScreen('screen-terms'); });
$('btnTermsAccept').addEventListener('click', () => { setConsent(true); showScreen('screen-start'); });
$('btnTermsBack').addEventListener('click', () => showScreen('screen-start'));
$('btnErase').addEventListener('click', eraseData);

$('btnPlay').addEventListener('click', () => {
  if (!consent) return;
  audioCtx();
  $('nameInput').value = lsGet(STORE.name, '');
  refreshDiffUI();
  showScreen('screen-name');
});
$('btnCostumes').addEventListener('click', () => { costumeBack = 'screen-start'; showScreen('screen-costumes'); });
$('btnRanking').addEventListener('click', () => { renderRanking($('podiumMain'), $('rankListMain'), null); showScreen('screen-ranking'); });
$('btnRankingBack').addEventListener('click', () => showScreen('screen-start'));
$('btnNameBack').addEventListener('click', () => showScreen('screen-start'));
$('btnNameCostumes').addEventListener('click', () => { costumeBack = 'screen-name'; showScreen('screen-costumes'); });
$('btnCostumesBack').addEventListener('click', () => showScreen(costumeBack));
$('nameForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!consent) { showScreen('screen-start'); return; }
  const n = $('nameInput').value.trim().slice(0, 12);
  if (!n) { $('nameInput').focus(); return; }
  playerName = n; lsSet(STORE.name, n);
  startNewGame();
});
$('btnNextLevel').addEventListener('click', () => { level++; startLevel(); });
$('btnAgain').addEventListener('click', () => startNewGame());
$('btnToMenu').addEventListener('click', () => { state = 'menu'; showScreen('screen-start'); });
$('btnResume').addEventListener('click', () => togglePause());
$('btnQuit').addEventListener('click', () => { state = 'menu'; showScreen('screen-start'); });
$('btnMute').addEventListener('click', toggleMute);
document.addEventListener('visibilitychange', () => { if (document.hidden && (state === 'playing' || state === 'ready')) togglePause(); });

/* =====================================================================
   14. LOOP PRINCIPAL
   ===================================================================== */
let last = performance.now();
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts; time += dt;
  pollGamepad();

  if (state === 'ready') { readyTimer -= dt; if (readyTimer <= 0) state = 'playing'; }
  else if (state === 'playing') updatePlaying(dt);
  else if (state === 'dying') { deathTimer -= dt; if (deathTimer <= 0) afterDeath(); }
  else if (state === 'levelclear') { clearTimer -= dt; if (clearTimer <= 0) afterClear(); }

  render(dt);
  animatePreviews();
  requestAnimationFrame(frame);
}

/* ---- Inicialização ---- */
loadMaze();
lives = D().lives;
playerName = lsGet(STORE.name, '') || 'JOGADOR';
$('btnMute').textContent = sound.muted ? '🔇' : '🔊';
$('hudHigh').dataset.v = bestScore(); $('hudHigh').textContent = bestScore();
buildCostumeGrid();
refreshConsentUI();
refreshDiffUI();
updateHud();
updatePowerBar();
showScreen('screen-start');
requestAnimationFrame(frame);

})();
