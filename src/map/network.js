export function createNetwork() {
  const nodes = [], edges = [], gates = [];
  const radii = [278, 221, 151, 78];
  const addEdge = (a, b, fractureable = true) => {
    const p = nodes.find(n => n.id === a), q = nodes.find(n => n.id === b);
    edges.push({ id: `e${edges.length}`, a, b, length: Math.hypot(q.x - p.x, q.y - p.y), fractureable });
  };
  radii.forEach((r, ring) => {
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6 - Math.PI / 2;
      const id = `n${ring}-${i}`;
      nodes.push({ id, x: 360 + Math.cos(angle) * r, y: 360 + Math.sin(angle) * r, ring, sector: i });
      if (!ring && i % 3 === 0) gates.push({ id, hour: i || 12, direction: ['Nord', 'Est', 'Sud', 'Ovest'][i / 3], symbol: ['N', 'E', 'S', 'O'][i / 3] });
    }
  });
  nodes.push({ id: 'center', x: 360, y: 360, ring: 4, sector: 0 });
  radii.forEach((_, ring) => {
    for (let i = 0; i < 12; i++) {
      addEdge(`n${ring}-${i}`, `n${ring}-${(i + 1) % 12}`, ring > 0);
      if (ring < 3) addEdge(`n${ring}-${i}`, `n${ring + 1}-${i}`, ring > 0);
      if (ring === 3 && i % 2 === 0) addEdge(`n${ring}-${i}`, 'center');
      if (ring > 0 && ring < 3 && i % 3 === 1) addEdge(`n${ring}-${i}`, `n${ring + 1}-${(i + 1) % 12}`);
    }
  });
  return { nodes, edges, gates };
}
export const nodeAt = (map, id) => map.nodes.find(n => n.id === id);
export const edgeAt = (map, id) => map.edges.find(e => e.id === id);
export const edgeBetween = (map, a, b) => map.edges.find(e => e.a === a && e.b === b || e.a === b && e.b === a);
export function midpoint(map, edgeId) {
  const e = edgeAt(map, edgeId), a = nodeAt(map, e.a), b = nodeAt(map, e.b);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
