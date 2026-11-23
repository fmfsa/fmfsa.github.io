/* Causal coarsening under a constricting lens.
   We never see the micro-level causal structure: only noisy micro-level data.
   The lens starts as large as the whole system, which appears as unstructured
   clouds of observations. As the lens constricts, each cloud it lets go of is
   condensed into a macro-variable, and causal arrows are learned only between
   macro-variables, growing in once both ends are coarse. The lens closes on the
   macro-variable a task depends on, which defines a pathway: off-task structure
   dims to a faint background, and a steady signal flows through the bounded
   pathway while a signal leaking into an off-task branch dies out. */
(() => {
  const figure = document.querySelector('.research-graph');
  if (!figure) return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = figure.querySelector('svg');
  const button = figure.querySelector('.graph-toggle');
  const caption = figure.querySelector('.graph-caption');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const el = (tag, attrs, parent) => {
    const element = document.createElementNS(NS, tag);
    for (const key in attrs) element.setAttribute(key, attrs[key]);
    parent.append(element);
    return element;
  };
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const lerp2 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
  const clamp01 = t => Math.max(0, Math.min(1, t));
  const random = (seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647))(11);

  // Macro-variables (what coarsening recovers) and the causal arrows between them.
  const centers = [[85, 170], [285, 85], [285, 255], [490, 85], [490, 255], [695, 170], [855, 170]];
  const macroEdges = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5], [5, 6]];
  const R_MACRO = 15, SAMPLES = 11, GHOST = 0.2;

  // The lens closes on TASK; the pathway through it runs from input to output.
  const TASK = 4;
  const path = [0, 2, 4, 5, 6];
  const branch = [0, 1, 3]; // an off-task branch where the signal attenuates
  const kept = new Set(path);
  const keptEdge = new Set(path.slice(0, -1).map((c, i) => `${c},${path[i + 1]}`));
  const LENS_START = { c: [470, 170], rx: 520, ry: 185 };
  const LENS_END = { c: centers[TASK], rx: 23, ry: 23 };

  const CAPTIONS = {
    full: 'Observed: micro-level data, structure unknown',
    coarsen: 'Coarsening: learning macro-variables and their causes',
    bounded: 'Bounded pathway: task-relevant structure retained',
    still: 'Causal coarsening: from micro-level data to a coarse causal graph',
  };

  // Micro-level observations: a noisy cloud per macro-variable, with no edges.
  const samples = [];
  centers.forEach((_, c) => {
    for (let i = 0; i < SAMPLES; i++) {
      const r = 46 * Math.sqrt(random()), a = random() * 6.283;
      samples.push({ c, off: [r * Math.cos(a), r * Math.sin(a) * 0.9], wobble: [random() * 6.28, random() * 6.28, 0.8 + random(), 0.8 + random()] });
    }
  });

  const marker = el('marker', { id: 'graph-arrow', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, el('defs', {}, svg));
  el('path', { d: 'M 1 1 L 7 4 L 1 7' }, marker);
  const scene = el('g', {}, svg);
  const lens = el('ellipse', { class: 'graph-lens' }, scene);
  const sampleGroup = el('g', { class: 'graph-samples' }, scene);
  const edgeGroup = el('g', { class: 'graph-edges' }, scene);
  const keptGroup = el('g', { class: 'graph-kept-edges' }, scene);
  const flashGroup = el('g', { class: 'graph-flash-edges' }, scene);
  const nodeGroup = el('g', { class: 'graph-nodes' }, scene);
  const sampleDots = samples.map(() => el('circle', { r: 3 }, sampleGroup));
  const macroLines = macroEdges.map(() => el('line', { 'marker-end': 'url(#graph-arrow)' }, edgeGroup));
  const keptLines = macroEdges.map(([a, b]) => keptEdge.has(`${a},${b}`) ? el('line', {}, keptGroup) : null);
  const flashLines = macroEdges.map(() => el('line', {}, flashGroup));
  const macroDots = centers.map(([x, y]) => el('circle', { cx: x, cy: y }, nodeGroup));
  const keptRings = centers.map(([x, y], c) => kept.has(c) ? el('circle', { r: R_MACRO, cx: x, cy: y, class: 'graph-kept-node' }, nodeGroup) : null);
  const pulseGroup = el('g', { class: 'graph-pulses' }, scene);
  const STREAM = 3; // signals in flight along the pathway at once
  const pulses = Array.from({ length: STREAM }, () => el('circle', { r: 4 }, pulseGroup));
  const leak = el('circle', { r: 3.5 }, pulseGroup);

  // Draw an arrow from a to b, grown to a fraction `grow` of its length.
  function line(element, [x, y], [u, v], r1, r2, opacity, grow = 1) {
    const distance = Math.hypot(u - x, v - y);
    const span = distance - r1 - r2;
    if (opacity < 0.01 || grow < 0.02 || span <= 6) { element.setAttribute('opacity', 0); return; }
    const dx = (u - x) / distance, dy = (v - y) / distance;
    const x1 = x + dx * r1, y1 = y + dy * r1;
    element.setAttribute('x1', x1); element.setAttribute('y1', y1);
    element.setAttribute('x2', x1 + dx * span * grow); element.setAttribute('y2', y1 + dy * span * grow);
    element.setAttribute('opacity', opacity);
  }
  const along = (chain, s) => {
    const leg = Math.min(chain.length - 2, Math.floor(s));
    return lerp2(centers[chain[leg]], centers[chain[leg + 1]], s - leg);
  };

  // Timeline in seconds: observed system 0-1.4 · lens constricts 1.4-5.4
  // · pathway kept, the rest dims 5.2-6.6 · signal flows 6.6-10.6 · fade 10.6-11.4.
  const PERIOD = 11.6, FLOW_START = 6.6, FLOW_END = 10.6, SPEED = 2.4; // legs per second
  const stage = t => t < 1.4 ? 'full' : t < 5.8 ? 'coarsen' : 'bounded';
  function draw(t) {
    const p = ease((t - 1.4) / 4);
    const L = lerp2(LENS_START.c, LENS_END.c, p);
    // Geometric interpolation keeps the constriction feeling steady.
    const rx = LENS_START.rx * Math.pow(LENS_END.rx / LENS_START.rx, p);
    const ry = LENS_START.ry * Math.pow(LENS_END.ry / LENS_START.ry, p);
    const narrow = clamp01((t - 5.2) / 1.4), n = ease(narrow);

    scene.setAttribute('opacity', ease(t / 0.6) * (1 - ease((t - 10.6) / 0.8)));
    lens.setAttribute('cx', L[0]); lens.setAttribute('cy', L[1]);
    lens.setAttribute('rx', rx); lens.setAttribute('ry', ry);
    lens.setAttribute('opacity', 1 - ease((t - 5.5) / 1));
    if (caption && !(paused && reducedMotion.matches)) caption.textContent = CAPTIONS[stage(t)];

    // A cloud stays uncondensed while it sits well inside the lens.
    const meanRadius = (rx + ry) / 2;
    const cloud = centers.map(([x, y]) => {
      const d = Math.hypot((x - L[0]) / rx, (y - L[1]) / ry);
      return ease(((1 - d) * meanRadius - 30) / 40);
    });
    const coarse = cloud.map(f => 1 - f);
    const shown = centers.map((_, c) => kept.has(c) ? 1 : mix(1, GHOST, n));

    samples.forEach(({ c, off, wobble: [p1, p2, f1, f2] }, i) => {
      const spread = cloud[c], jitter = 3 * spread;
      sampleDots[i].setAttribute('cx', centers[c][0] + off[0] * spread + jitter * Math.sin(t * f1 * 2 + p1));
      sampleDots[i].setAttribute('cy', centers[c][1] + off[1] * spread + jitter * Math.cos(t * f2 * 2 + p2));
      sampleDots[i].setAttribute('opacity', ease((spread - 0.15) / 0.6) * shown[c]);
    });
    centers.forEach((_, c) => {
      macroDots[c].setAttribute('r', mix(4, R_MACRO, ease(coarse[c])));
      macroDots[c].setAttribute('opacity', ease((coarse[c] - 0.15) / 0.5) * shown[c]);
      if (keptRings[c]) keptRings[c].setAttribute('opacity', n * coarse[c]);
    });
    // An arrow is learned once both of its ends have become macro-variables.
    macroEdges.forEach(([a, b], k) => {
      const learned = ease((Math.min(coarse[a], coarse[b]) - 0.55) / 0.4);
      const isKept = keptLines[k] !== null;
      const dim = isKept ? 0 : ease((narrow - (0.1 + 0.08 * k)) / 0.35);
      const r1 = R_MACRO + 2, r2 = R_MACRO + 7;
      line(macroLines[k], centers[a], centers[b], r1, r2, mix(1, GHOST * 0.7, dim), learned);
      if (isKept) line(keptLines[k], centers[a], centers[b], r1, r2, n);
      const flash = t < 6 ? 4 * learned * (1 - learned) : 0;
      line(flashLines[k], centers[a], centers[b], r1, r2, flash * 0.9, learned);
    });

    // A steady stream of signal flows along the bounded pathway...
    const legs = path.length - 1, spacing = (legs + 1) / STREAM;
    const run = t >= FLOW_START && t < FLOW_END ? (t - FLOW_START) * SPEED : -1;
    const fadeEdges = clamp01((t - FLOW_START) / 0.3) * clamp01((FLOW_END - t) / 0.3);
    pulses.forEach((dot, k) => {
      const s = run - k * spacing;
      const cycle = s >= 0 ? s % (legs + 1) : -1;
      if (cycle < 0 || cycle > legs) { dot.setAttribute('opacity', 0); return; }
      const [x, y] = along(path, cycle);
      dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      dot.setAttribute('opacity', fadeEdges);
    });
    // ...while a signal leaking into the off-task branch attenuates and dies.
    const s = run >= 0 ? run % (legs + 1) : -1;
    if (s >= 0 && s < 1.6) {
      const [x, y] = along(branch, s);
      leak.setAttribute('cx', x); leak.setAttribute('cy', y);
      leak.setAttribute('opacity', 0.55 * (1 - s / 1.6) * fadeEdges);
    } else leak.setAttribute('opacity', 0);
  }

  const STILL = 3300; // mid-coarsening: the reduced-motion frame
  let paused = reducedMotion.matches;
  let visible = false, frame = null, lastTime = null, elapsed = paused ? STILL : 0;
  function animate(time) {
    if (lastTime !== null) elapsed += Math.min(time - lastTime, 80);
    lastTime = time;
    draw((elapsed % (PERIOD * 1000)) / 1000);
    frame = requestAnimationFrame(animate);
  }
  function sync() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
    button.textContent = paused ? 'Play animation' : 'Pause animation';
    if (caption && paused && reducedMotion.matches) caption.textContent = CAPTIONS.still;
    if (!paused && visible && !document.hidden) frame = requestAnimationFrame(animate);
  }
  draw((elapsed % (PERIOD * 1000)) / 1000);
  button.hidden = false;
  button.addEventListener('click', () => { paused = !paused; sync(); });
  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    if (paused) { elapsed = STILL; draw(STILL / 1000); }
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(figure);
  sync();
})();
