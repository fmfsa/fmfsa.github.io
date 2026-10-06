/* Isolated nodes → neural network → causal DAG → abstraction. */
(() => {
  const figure = document.querySelector('.research-graph');
  if (!figure) return;
  const nodes = [...figure.querySelectorAll('.graph-nodes circle')];
  const edgeGroup = figure.querySelector('.graph-edges');
  const button = figure.querySelector('.graph-toggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cloud = nodes.map(node => [+node.getAttribute('cx'), +node.getAttribute('cy')]);
  const layers = [[0, 1, 2, 3], [4, 5, 6, 7, 8, 9], [10, 11, 12, 13, 14, 15], [16, 17, 18, 19, 20], [21, 22, 23]];
  const groups = [[0, 1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12], [13, 14, 15], [16, 17, 18, 19, 20], [21, 22, 23]];
  const centers = [[85, 170], [285, 85], [285, 255], [490, 85], [490, 255], [695, 170], [855, 170]];
  const offsets = [[-38, -28], [-20, 30], [26, -24], [40, 32], [0, 62]];
  const network = [], dag = [], coarse = [], groupOf = [];
  layers.forEach((layer, column) => layer.forEach((id, row) => {
    network[id] = [75 + column * 192, 35 + row * 270 / (layer.length - 1)];
  }));
  groups.forEach((group, index) => group.forEach((id, member) => {
    groupOf[id] = index;
    coarse[id] = centers[index];
    dag[id] = centers[index].map((value, axis) => value + offsets[member][axis]);
  }));
  const leaders = new Set(groups.map(group => group[0]));
  const networkPairs = layers.slice(0, -1).flatMap((layer, i) => layer.flatMap(from => layers[i + 1].map(to => [from, to])));
  // Internal edges and forward inter-group edges guarantee an acyclic quotient.
  const dagPairs = groups.flatMap(group => group.slice(0, -1).map((from, i) => [from, group[i + 1]]));
  dagPairs.push([1, 4], [3, 7], [5, 10], [6, 13], [8, 13], [9, 15], [11, 16], [12, 18], [14, 17], [15, 20], [18, 21], [20, 23]);
  const abstractPairs = [...new Set(dagPairs.filter(([a, b]) => groupOf[a] !== groupOf[b]).map(([a, b]) => `${groupOf[a]},${groupOf[b]}`))].map(pair => pair.split(',').map(Number));

  function makeEdges(pairs, directed) {
    return pairs.map(([from, to]) => {
      const element = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      element.setAttribute('opacity', '0');
      if (directed) element.setAttribute('marker-end', 'url(#graph-arrow)');
      edgeGroup.append(element);
      return { from, to, element };
    });
  }
  const networkEdges = makeEdges(networkPairs, false);
  const dagEdges = makeEdges(dagPairs, true);
  const abstractEdges = makeEdges(abstractPairs, true);
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const blend = (a, b, t) => a.map((point, i) => point.map((value, axis) => mix(value, b[i][axis], t)));

  function drawEdges(edges, positions, opacity, radius, directed) {
    edges.forEach(({ from, to, element }) => {
      const [x, y] = positions[from];
      const [u, v] = positions[to];
      const distance = Math.hypot(u - x, v - y);
      // Hide collapsing internal edges before they invert or divide by zero.
      if (opacity < 0.001 || distance <= radius * 2 + 8) {
        element.setAttribute('opacity', '0');
        return;
      }
      const dx = (u - x) / distance, dy = (v - y) / distance;
      element.setAttribute('x1', x + dx * (radius + 2));
      element.setAttribute('y1', y + dy * (radius + 2));
      element.setAttribute('x2', u - dx * (radius + (directed ? 7 : 2)));
      element.setAttribute('y2', v - dy * (radius + (directed ? 7 : 2)));
      element.setAttribute('opacity', opacity);
    });
  }

  function draw(seconds) {
    let positions = cloud, networkOpacity = 0, dagOpacity = 0, abstractOpacity = 0, merge = 0;
    if (seconds >= 2 && seconds < 7) {
      const t = ease((seconds - 2) / 3);
      positions = blend(cloud, network, t);
      networkOpacity = t * 0.42;
    } else if (seconds >= 7 && seconds < 13) {
      const t = ease((seconds - 7) / 4);
      positions = blend(network, dag, t);
      networkOpacity = (1 - t) * 0.42;
      dagOpacity = t;
    } else if (seconds >= 13 && seconds < 20) {
      merge = ease((seconds - 13) / 4);
      positions = blend(dag, coarse, merge);
      dagOpacity = 1 - ease(merge);
      abstractOpacity = ease((merge - 0.25) / 0.75);
    } else if (seconds >= 20 && seconds < 24) {
      const t = ease((seconds - 20) / 3);
      positions = blend(coarse, cloud, t);
      merge = 1 - t;
      abstractOpacity = 1 - ease(t * 3);
    }
    nodes.forEach((node, i) => {
      node.setAttribute('cx', positions[i][0]);
      node.setAttribute('cy', positions[i][1]);
      node.setAttribute('r', leaders.has(i) ? mix(7, 17, merge) : 7);
      node.setAttribute('opacity', leaders.has(i) ? 1 : 1 - ease((merge - 0.45) / 0.55));
    });
    drawEdges(networkEdges, positions, networkOpacity, 7, false);
    drawEdges(dagEdges, positions, dagOpacity, 7, true);
    drawEdges(abstractEdges, groups.map(group => positions[group[0]]), abstractOpacity, mix(7, 17, merge), true);
  }

  let paused = reducedMotion.matches;
  let visible = false, frame = null, lastTime = null, elapsed = 0;
  function animate(time) {
    if (lastTime !== null) elapsed += Math.min(time - lastTime, 80);
    lastTime = time;
    draw((elapsed % 24000) / 1000);
    frame = requestAnimationFrame(animate);
  }
  function sync() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
    button.textContent = paused ? 'Play animation' : 'Pause animation';
    if (!paused && visible && !document.hidden) frame = requestAnimationFrame(animate);
  }
  button.hidden = false;
  button.addEventListener('click', () => { paused = !paused; sync(); });
  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    if (paused) { elapsed = 0; draw(0); }
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(figure);
  sync();
})();
