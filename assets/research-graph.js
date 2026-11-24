/* Causal coarsening as condensation.
   We never see the micro-level causal structure, only micro-level data: a field
   of drifting points with no known structure. The points swirl together and
   condense into variables, and causal arrows are drawn between them, including
   feedback cycles. Each cycle then merges into a single node, leaving an
   acyclic coarse graph, before everything dissolves back into data. */
(() => {
  const figure = document.querySelector('.research-graph');
  if (!figure) return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = figure.querySelector('svg');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const el = (tag, attrs, parent) => {
    const element = document.createElementNS(NS, tag);
    for (const key in attrs) element.setAttribute(key, attrs[key]);
    parent.append(element);
    return element;
  };
  const mix = (a, b, t) => a + (b - a) * t;
  const lerp2 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
  const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const random = (seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647))(7);

  // Variables [x, y, radius] and causal arrows [from, to, bend]. Three groups
  // of variables form feedback cycles; the arrows between groups are acyclic.
  const nodes = [
    [70, 170, 12], [190, 68, 10], [275, 80, 10], [236, 148, 11], [215, 272, 11],
    [400, 196, 10], [485, 200, 11], [444, 272, 10], [430, 64, 10], [598, 92, 10],
    [684, 96, 10], [680, 180, 11], [596, 176, 10], [655, 286, 10], [852, 184, 14], [840, 62, 9],
  ];
  const cycles = [[1, 2, 3], [5, 6, 7], [9, 10, 11, 12]];
  const edges = [
    // Feedback cycles, bowed outwards.
    [1, 2, -0.25], [2, 3, -0.25], [3, 1, -0.25],
    [5, 6, -0.25], [6, 7, -0.25], [7, 5, -0.25],
    [9, 10, -0.2], [10, 11, -0.2], [11, 12, -0.2], [12, 9, -0.2],
    // Arrows between groups.
    [0, 1, 0.1], [0, 4, 0.1], [3, 5, 0.1], [4, 7, 0.1], [2, 8, 0.1], [8, 9, 0.1],
    [6, 12, 0.1], [7, 13, 0.1], [11, 14, 0.1], [13, 14, 0.1], [10, 15, 0.1], [15, 14, 0.1],
  ];
  const group = nodes.map((_, c) => cycles.findIndex(g => g.includes(c)));
  const merged = cycles.map(g => ({
    center: [g.reduce((s, c) => s + nodes[c][0], 0) / g.length, g.reduce((s, c) => s + nodes[c][1], 0) / g.length],
    r: Math.sqrt(g.reduce((s, c) => s + nodes[c][2] ** 2, 0)) * 0.85,
  }));

  // Timeline in seconds: data drifts · condenses 1.4-6 · arrows drawn
  // · cycles merge 7-9.1 · coarse graph holds · dissolves 10.4-12.4 · drifts.
  const PERIOD = 13, CONDENSE = 1.4, MERGE = 7, DISSOLVE = 10.4, RESET = 12.4;

  // Micro-level data: more points for larger variables.
  const particles = [];
  nodes.forEach(([, , r], c) => {
    for (let i = 0, n = Math.round(r * 1.5); i < n; i++) {
      const rr = (r - 4) * Math.sqrt(random()), a = random() * 6.283;
      particles.push({
        c, delay: random(),
        field: [20 + random() * 890, 20 + random() * 300],
        home: [rr * Math.cos(a), rr * Math.sin(a)],
        swirl: (random() - 0.5) * 120,
        phase: [random() * 6.283, random() * 6.283],
        // Whole cycles per period, so the drift loops seamlessly.
        cycles: [1 + Math.floor(random() * 3), 1 + Math.floor(random() * 3)],
      });
    }
  });
  const counts = nodes.map((_, c) => particles.filter(p => p.c === c).length);

  const marker = el('marker', { id: 'graph-arrow', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: 'auto' }, el('defs', {}, svg));
  el('path', { d: 'M 1 1 L 7 4 L 1 7' }, marker);
  const edgeGroup = el('g', { class: 'graph-edges' }, svg);
  const particleGroup = el('g', { class: 'graph-particles' }, svg);
  const nodeGroup = el('g', { class: 'graph-nodes' }, svg);
  const lines = edges.map(() => el('path', { 'marker-end': 'url(#graph-arrow)' }, edgeGroup));
  const dots = particles.map(() => el('circle', { r: 2.7 }, particleGroup));
  const circles = nodes.map(() => el('circle', {}, nodeGroup));
  const coarse = merged.map(({ center: [x, y], r }) => el('circle', { cx: x, cy: y, r, class: 'graph-merged' }, nodeGroup));

  // A quadratic arrow between two rims, drawn up to a fraction `grow`.
  const split = ([p0, p1, p2], t) => {
    const q0 = lerp2(p0, p1, t), q1 = lerp2(p1, p2, t), b = lerp2(q0, q1, t);
    return [[p0, q0, b], [b, q1, p2]];
  };
  function arrow(line, [x, y], ra, [u, v], rb, bend, grow, opacity) {
    const d = Math.hypot(u - x, v - y);
    if (grow < 0.03 || opacity < 0.01 || d < ra + rb + 14) { line.setAttribute('opacity', 0); return; }
    const control = [(x + u) / 2 - ((v - y) / d) * bend * d, (y + v) / 2 + ((u - x) / d) * bend * d];
    const t0 = (ra + 3) / d, t1 = 1 - (rb + 7) / d;
    const trimmed = split(split([[x, y], control, [u, v]], t1)[0], t0 / t1)[1];
    const [p0, p1, p2] = split(trimmed, grow)[0];
    line.setAttribute('d', `M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} Q ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`);
    line.setAttribute('opacity', opacity);
  }

  function draw(t) {
    const sum = nodes.map(() => 0);
    const condensed = particles.map(p => {
      const order = (nodes[p.c][0] / 930) * 2.9;
      const start = CONDENSE + order + p.delay * 0.5;
      const end = DISSOLVE + order * 0.15 + p.delay * 0.3;
      const q = ease((t - start) / 1.4) * (1 - ease((t - end) / 1.3));
      sum[p.c] += q;
      return q;
    });
    const formed = sum.map((s, c) => ease((s / counts[c] - 0.55) / 0.4));

    // Each cycle collapses onto its centre, left to right.
    const merge = cycles.map((_, g) => ease((t - MERGE - 0.35 * g) / 1.4) * (1 - ease((t - RESET) / 0.4)));
    const pos = nodes.map(([x, y], c) => group[c] < 0 ? [x, y] : lerp2([x, y], merged[group[c]].center, merge[group[c]]));
    const radius = nodes.map(([, , r], c) => group[c] < 0 ? r : mix(r, merged[group[c]].r, merge[group[c]]));

    const w = (2 * Math.PI * t) / PERIOD;
    particles.forEach((p, i) => {
      const fx = p.field[0] + 12 * Math.sin(p.cycles[0] * w + p.phase[0]);
      const fy = p.field[1] + 10 * Math.cos(p.cycles[1] * w + p.phase[1]);
      const tx = pos[p.c][0] + p.home[0], ty = pos[p.c][1] + p.home[1];
      const q = condensed[i], e = ease(q);
      // Curve the trip by pushing sideways at mid-flight.
      const dx = tx - fx, dy = ty - fy, length = Math.hypot(dx, dy) || 1;
      const bend = Math.sin(Math.PI * e) * p.swirl;
      dots[i].setAttribute('cx', mix(fx, tx, e) - (dy / length) * bend);
      dots[i].setAttribute('cy', mix(fy, ty, e) + (dx / length) * bend);
      dots[i].setAttribute('opacity', 0.6 * (1 - ease((q - 0.8) / 0.2)));
    });

    nodes.forEach((_, c) => {
      circles[c].setAttribute('cx', pos[c][0]); circles[c].setAttribute('cy', pos[c][1]);
      circles[c].setAttribute('r', radius[c] * mix(0.4, 1, formed[c]));
      const hidden = group[c] < 0 ? 0 : ease((merge[group[c]] - 0.75) / 0.25);
      circles[c].setAttribute('opacity', formed[c] * (1 - hidden));
    });
    cycles.forEach((g, k) => {
      const present = Math.min(...g.map(c => formed[c]));
      coarse[k].setAttribute('r', merged[k].r * mix(0.4, 1, present));
      coarse[k].setAttribute('opacity', ease((merge[k] - 0.6) / 0.4) * present);
    });

    // An arrow is drawn once both of its ends have formed; arrows inside a
    // cycle shrink away as it merges.
    edges.forEach(([a, b, bend], k) => {
      const grow = ease((Math.min(formed[a], formed[b]) - 0.45) / 0.55);
      const inside = group[a] >= 0 && group[a] === group[b];
      const opacity = inside ? 1 - ease(merge[group[a]] / 0.6) : 1;
      arrow(lines[k], pos[a], radius[a], pos[b], radius[b], bend, grow, opacity);
    });
  }

  const STILL = 9.8; // the coarse acyclic graph: the reduced-motion frame
  let visible = false, frame = null, lastTime = null, elapsed = 0;
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
    if (reducedMotion.matches) draw(STILL);
    else if (visible && !document.hidden) frame = requestAnimationFrame(animate);
  }
  draw(reducedMotion.matches ? STILL : 0);
  reducedMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(figure);
})();
