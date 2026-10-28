// Calculadora de Discos de Barra Olímpica y 1RM
// Carga visual de discos IWF y series de aproximación

const PLATES_CONFIG = [
  { weight: 25, color: '#ef4444', name: 'Rojo', height: 140, width: 22, text: '#ffffff' },
  { weight: 20, color: '#3b82f6', name: 'Azul', height: 140, width: 20, text: '#ffffff' },
  { weight: 15, color: '#eab308', name: 'Amarillo', height: 140, width: 18, text: '#000000' },
  { weight: 10, color: '#22c55e', name: 'Verde', height: 140, width: 16, text: '#ffffff' },
  { weight: 5, color: '#f4f4f5', name: 'Blanco', height: 85, width: 14, text: '#000000' },
  { weight: 2.5, color: '#27272a', name: 'Negro', height: 75, width: 12, text: '#ffffff' },
  { weight: 1.25, color: '#71717a', name: 'Plata', height: 65, width: 10, text: '#ffffff' },
  { weight: 0.5, color: '#a855f7', name: 'Violeta', height: 55, width: 8, text: '#ffffff' }
];

const PRESETS = {
  bench100: { targetWeight: 100, barWeight: 20, collarsWeight: 0 },
  deadlift140: { targetWeight: 140, barWeight: 20, collarsWeight: 0 },
  squat120: { targetWeight: 120, barWeight: 20, collarsWeight: 0 },
  ohp60: { targetWeight: 60, barWeight: 20, collarsWeight: 0 },
  empty20: { targetWeight: 20, barWeight: 20, collarsWeight: 0 }
};

let state = {
  targetWeight: 100,
  barWeight: 20,
  collarsWeight: 0,
  unit: 'kg',
  // 1RM section
  repWeight: 80,
  reps: 5
};

// Calculate plate loading per side
function calculatePlates(target, bar, collars) {
  const tare = bar + collars;
  let remainingPerSide = Math.max(0, (target - tare) / 2);

  const loadedPlates = [];
  const plateCounts = {};

  PLATES_CONFIG.forEach(p => {
    let count = 0;
    while (remainingPerSide >= p.weight - 0.001) {
      loadedPlates.push(p);
      count++;
      remainingPerSide -= p.weight;
      remainingPerSide = Math.round(remainingPerSide * 1000) / 1000;
    }
    if (count > 0) {
      plateCounts[p.weight] = count;
    }
  });

  const weightPerSide = loadedPlates.reduce((acc, p) => acc + p.weight, 0);
  const actualTotal = tare + weightPerSide * 2;
  const difference = target - actualTotal;

  return {
    tare,
    weightPerSide,
    actualTotal,
    difference,
    loadedPlates,
    plateCounts
  };
}

// Calculate 1RM (Epley & Brzycki formula)
function calculate1RM(weight, reps) {
  const w = parseFloat(weight) || 0;
  const r = parseInt(reps, 10) || 1;

  if (r <= 1) return { oneRepMax: w, epley: w, brzycki: w };

  // Epley: w * (1 + r/30)
  const epley = w * (1 + r / 30);
  // Brzycki: w * (36 / (37 - r))
  const brzycki = r < 37 ? w * (36 / (37 - r)) : epley;

  const oneRepMax = Math.round(((epley + brzycki) / 2) * 2) / 2; // round to 0.5kg

  return {
    oneRepMax,
    epley,
    brzycki
  };
}

// Render dynamic SVG barbell with realistic colored bumper plates
function renderBarbellSVG(plates) {
  const svgEl = document.getElementById('barbell-svg');
  if (!svgEl) return;

  // Visual layout
  // Center collar is at x = 180. Sleeve extends to x = 460.
  // Plates load from left (collar) to right.
  const collarX = 140;
  const centerY = 80;

  let platesMarkup = '';
  let currentX = collarX + 16; // starting right after collar

  plates.forEach(p => {
    const yTop = centerY - p.height / 2;
    platesMarkup += `
      <g>
        <rect x="${currentX}" y="${yTop}" width="${p.width}" height="${p.height}" rx="3" fill="${p.color}" stroke="#18181b" stroke-width="1.5" />
        <line x1="${currentX + 3}" y1="${yTop + 5}" x2="${currentX + 3}" y2="${yTop + p.height - 5}" stroke="rgba(255,255,255,0.25)" stroke-width="1" />
        ${p.height >= 100 ? `<text x="${currentX + p.width/2}" y="${centerY + 4}" fill="${p.text}" font-size="11" font-weight="900" font-family="-apple-system, sans-serif" text-anchor="middle" transform="rotate(-90 ${currentX + p.width/2} ${centerY + 4})">${p.weight}</text>` : ''}
      </g>
    `;
    currentX += p.width + 3;
  });

  // Spring collar / clip at the end if plates are present
  if (plates.length > 0) {
    platesMarkup += `
      <rect x="${currentX + 1}" y="${centerY - 22}" width="8" height="44" rx="2" fill="#e4e4e7" stroke="#71717a" stroke-width="1" />
      <circle cx="${currentX + 5}" cy="${centerY - 22}" r="5" fill="#a1a1aa" />
    `;
  }

  svgEl.innerHTML = `
    <!-- Shaft knurled bar coming from left -->
    <rect x="0" y="${centerY - 10}" width="${collarX}" height="20" rx="3" fill="url(#steelGrad)" stroke="#3f3f46" stroke-width="1" />
    <!-- Center knurl markings -->
    <line x1="40" y1="${centerY - 10}" x2="40" y2="${centerY + 10}" stroke="#71717a" stroke-width="1.5" />
    <line x1="80" y1="${centerY - 10}" x2="80" y2="${centerY + 10}" stroke="#71717a" stroke-width="1.5" />

    <!-- Big inner sleeve collar (stop) -->
    <rect x="${collarX}" y="${centerY - 35}" width="16" height="70" rx="4" fill="#52525b" stroke="#27272a" stroke-width="2" />
    <line x1="${collarX + 4}" y1="${centerY - 32}" x2="${collarX + 4}" y2="${centerY + 32}" stroke="#71717a" stroke-width="1.5" />

    <!-- Barbell Sleeve Shaft (50mm diameter) -->
    <rect x="${collarX + 16}" y="${centerY - 16}" width="340" height="32" rx="2" fill="url(#sleeveGrad)" stroke="#3f3f46" stroke-width="1" />
    <!-- End Cap -->
    <ellipse cx="${collarX + 356}" cy="${centerY}" rx="4" ry="16" fill="#3f3f46" />

    <!-- Loaded Plates Stack -->
    ${platesMarkup}
  `;
}

function updateUI() {
  const target = parseFloat(state.targetWeight) || 0;
  const bar = parseFloat(state.barWeight) || 20;
  const collars = parseFloat(state.collarsWeight) || 0;

  const res = calculatePlates(target, bar, collars);

  // Hero numbers
  const displayTotal = document.getElementById('display-total');
  const displayPerSide = document.getElementById('display-per-side');
  if (displayTotal) displayTotal.textContent = res.actualTotal.toFixed(1);
  if (displayPerSide) displayPerSide.textContent = `Cargar en cada manga: ${res.weightPerSide.toFixed(1)} kg (${res.loadedPlates.length} discos)`;

  // Render SVG graphic
  renderBarbellSVG(res.loadedPlates);

  // Plates list breakdown
  const platesListEl = document.getElementById('plates-summary-list');
  if (platesListEl) {
    if (res.loadedPlates.length === 0) {
      platesListEl.innerHTML = `
        <div class="plate-row-badge" style="justify-content: center; color: var(--text-muted); font-size: 0.88rem;">
          Barra vacía (sin discos). Peso inicial: ${res.tare} kg.
        </div>
      `;
    } else {
      platesListEl.innerHTML = Object.keys(res.plateCounts).map(weightKey => {
        const w = parseFloat(weightKey);
        const pConf = PLATES_CONFIG.find(p => p.weight === w) || { color: '#71717a', name: '' };
        const countPerSide = res.plateCounts[weightKey];
        const countTotal = countPerSide * 2;
        return `
          <div class="plate-row-badge">
            <span class="plate-pill" style="background-color: ${pConf.color}; color: ${pConf.text || '#fff'};">
              ● ${w} kg (${pConf.name})
            </span>
            <span class="plate-count-badge">
              <strong>${countPerSide} por lado</strong> <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">(${countTotal} total)</span>
            </span>
          </div>
        `;
      }).join('');
    }
  }

  // 1RM Calculation & Warmup Ladder
  const oneRmRes = calculate1RM(state.repWeight, state.reps);
  const display1RM = document.getElementById('display-1rm');
  if (display1RM) display1RM.textContent = Math.round(oneRmRes.oneRepMax) + ' kg';

  // Warmup steps ladder
  const ladderEl = document.getElementById('warmup-ladder');
  if (ladderEl) {
    const warmupSteps = [
      { pct: 50, reps: '5 reps', desc: 'Calentamiento inicial (barra rápida)' },
      { pct: 70, reps: '3 reps', desc: 'Aproximación ritmo' },
      { pct: 80, reps: '2 reps', desc: 'Aproximación pesada' },
      { pct: 90, reps: '1 rep', desc: 'Activación del SNC' },
      { pct: 100, reps: '1 rep', desc: '1RM / Récord Personal' }
    ];

    ladderEl.innerHTML = warmupSteps.map(s => {
      const stepWeight = Math.round((oneRmRes.oneRepMax * (s.pct / 100)) / 2.5) * 2.5; // rounded to 2.5kg
      return `
        <div class="warmup-item" data-load="${stepWeight}" title="Haz click para cargar este peso en la barra">
          <div>
            <div class="warmup-pct">${s.pct}% • ${s.reps}</div>
            <div class="warmup-reps">${s.desc}</div>
          </div>
          <div class="warmup-weight">${stepWeight} kg ➔</div>
        </div>
      `;
    }).join('');

    // Attach click listeners to warmup steps to load barbell
    ladderEl.querySelectorAll('.warmup-item').forEach(item => {
      item.addEventListener('click', () => {
        const loadVal = parseFloat(item.getAttribute('data-load'));
        if (!isNaN(loadVal)) {
          state.targetWeight = loadVal;
          const inputEl = document.getElementById('input-target-weight');
          if (inputEl) inputEl.value = loadVal;
          updateUI();
        }
      });
    });
  }

  // Sticky Mobile Bar
  const stickyTotal = document.getElementById('sticky-total');
  const stickySide = document.getElementById('sticky-side');
  if (stickyTotal) stickyTotal.textContent = `${res.actualTotal.toFixed(1)} kg`;
  if (stickySide) stickySide.textContent = `${res.weightPerSide.toFixed(1)}kg c/lado (${res.loadedPlates.length} discos)`;

  saveState();
}

function applyPreset(presetKey) {
  const p = PRESETS[presetKey];
  if (!p) return;

  state.targetWeight = p.targetWeight;
  state.barWeight = p.barWeight;
  state.collarsWeight = p.collarsWeight;

  const targetInput = document.getElementById('input-target-weight');
  const barSelect = document.getElementById('select-bar-weight');
  const collarSelect = document.getElementById('select-collars-weight');

  if (targetInput) targetInput.value = p.targetWeight;
  if (barSelect) barSelect.value = p.barWeight;
  if (collarSelect) collarSelect.value = p.collarsWeight;

  updateUI();
}

function shareBarbell() {
  const target = parseFloat(state.targetWeight) || 0;
  const bar = parseFloat(state.barWeight) || 20;
  const collars = parseFloat(state.collarsWeight) || 0;
  const res = calculatePlates(target, bar, collars);
  const oneRmRes = calculate1RM(state.repWeight, state.reps);

  let text = `🏋️ Carga de Barra Olímpica:\n`;
  text += `---------------------------------\n`;
  text += `🎯 Peso Total: ${res.actualTotal} kg\n`;
  text += `🔩 Barra: ${bar} kg | Cargar por lado: ${res.weightPerSide} kg\n\n`;
  text += `📦 Discos por manga:\n`;
  if (res.loadedPlates.length === 0) {
    text += `• Barra vacía sin discos adicionales.\n`;
  } else {
    Object.keys(res.plateCounts).forEach(w => {
      const pConf = PLATES_CONFIG.find(p => p.weight === parseFloat(w)) || { name: '' };
      text += `• ${res.plateCounts[w]}x ${w} kg (${pConf.name})\n`;
    });
  }
  text += `---------------------------------\n`;
  text += `⚡ 1RM Estimado: ${Math.round(oneRmRes.oneRepMax)} kg (${state.repWeight}kg × ${state.reps} reps)\n`;
  text += `Calculado en: https://sebiglesias.com.ar/barra-olimpica/`;

  if (navigator.share) {
    navigator.share({
      title: `Carga de Barra Olímpica: ${res.actualTotal} kg`,
      text: text,
      url: 'https://sebiglesias.com.ar/barra-olimpica/'
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      const shareBtn = document.getElementById('btn-share');
      if (shareBtn) {
        const orig = shareBtn.innerHTML;
        shareBtn.innerHTML = '✓ ¡Copiado al portapapeles!';
        setTimeout(() => shareBtn.innerHTML = orig, 2500);
      }
    });
  }
}

function saveState() {
  try {
    localStorage.setItem('barra_olimpica_state', JSON.stringify(state));
  } catch (e) {}
}

function loadState() {
  try {
    const saved = localStorage.getItem('barra_olimpica_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      state = Object.assign(state, parsed);
    }
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  loadState();

  const targetInput = document.getElementById('input-target-weight');
  const barSelect = document.getElementById('select-bar-weight');
  const collarSelect = document.getElementById('select-collars-weight');
  const repWeightInput = document.getElementById('input-rep-weight');
  const repsInput = document.getElementById('input-reps');

  if (targetInput) {
    targetInput.value = state.targetWeight;
    targetInput.addEventListener('input', (e) => {
      state.targetWeight = parseFloat(e.target.value) || 0;
      updateUI();
    });
  }

  if (barSelect) {
    barSelect.value = state.barWeight;
    barSelect.addEventListener('change', (e) => {
      state.barWeight = parseFloat(e.target.value) || 20;
      updateUI();
    });
  }

  if (collarSelect) {
    collarSelect.value = state.collarsWeight;
    collarSelect.addEventListener('change', (e) => {
      state.collarsWeight = parseFloat(e.target.value) || 0;
      updateUI();
    });
  }

  if (repWeightInput) {
    repWeightInput.value = state.repWeight;
    repWeightInput.addEventListener('input', (e) => {
      state.repWeight = parseFloat(e.target.value) || 0;
      updateUI();
    });
  }

  if (repsInput) {
    repsInput.value = state.reps;
    repsInput.addEventListener('input', (e) => {
      state.reps = parseInt(e.target.value, 10) || 1;
      updateUI();
    });
  }

  // Quick plus/minus step buttons for target weight
  document.querySelectorAll('.btn-weight-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = parseFloat(btn.getAttribute('data-step')) || 0;
      state.targetWeight = Math.max(state.barWeight, state.targetWeight + step);
      if (targetInput) targetInput.value = state.targetWeight;
      updateUI();
    });
  });

  // Presets
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      applyPreset(chip.getAttribute('data-preset'));
    });
  });

  // Action buttons
  const shareBtn = document.getElementById('btn-share');
  if (shareBtn) shareBtn.addEventListener('click', shareBarbell);

  const printBtn = document.getElementById('btn-print');
  if (printBtn) printBtn.addEventListener('click', () => window.print());

  const stickyBtn = document.getElementById('sticky-share-btn');
  if (stickyBtn) stickyBtn.addEventListener('click', shareBarbell);

  // Theme toggle
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeBtn.textContent = currentTheme === 'light' ? '🌙' : '☀️';

    themeBtn.addEventListener('click', () => {
      const now = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', now);
      localStorage.setItem('theme', now);
      themeBtn.textContent = now === 'light' ? '🌙' : '☀️';
    });
  }

  updateUI();

  // Register SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
