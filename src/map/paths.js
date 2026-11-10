import { edgeAt } from './network.js';
export function blockedEdges(state, extra = []) {
  return new Set([...state.fractures.filter(f => f.status !== 'repaired').map(f => f.edgeId), ...state.fractures.filter(f=>f.status==='active'&&f.effectEdge).map(f=>f.effectEdge), ...extra]);
}
// Dijkstra: tutte le distanze seguono strade reali, mai la distanza in linea d'aria.
export function shortestPaths(map, start, blocked = new Set()) {
  const distances = new Map([[start, 0]]), previous = new Map(), pending = new Set(map.nodes.map(n => n.id));
  while (pending.size) {
    let current = null, best = Infinity;
    for (const id of pending) if ((distances.get(id) ?? Infinity) < best) { current = id; best = distances.get(id); }
    if (current === null) break;
    pending.delete(current);
    for (const edge of map.edges) {
      if (blocked.has(edge.id)) continue;
      const next = edge.a === current ? edge.b : edge.b === current ? edge.a : null;
      if (!pending.has(next)) continue;
      const d = best + edge.length;
      if (d < (distances.get(next) ?? Infinity)) { distances.set(next, d); previous.set(next, current); }
    }
  }
  const pathTo = end => {
    if (!distances.has(end)) return null;
    const path = [end];
    while (path[0] !== start) path.unshift(previous.get(path[0]));
    return path;
  };
  return { distances, pathTo };
}
export function routeToFracture(state, start, fracture, blocked = blockedEdges(state)) {
  const edge = edgeAt(state.map, fracture.edgeId);
  if (!edge) return null;
  const paths = shortestPaths(state.map, start, blocked);
  const endpoint = [edge.a, edge.b].sort((a, b) => (paths.distances.get(a) ?? Infinity) - (paths.distances.get(b) ?? Infinity))[0];
  const path = paths.pathTo(endpoint);
  return path ? { path, distance: paths.distances.get(endpoint), endpoint } : null;
}
export function reachableFromGates(state, fractures, extra = []) {
  const blocked = blockedEdges(state, extra);
  const reachable = new Set();
  // Una ricerca multi-ingresso controlla anche i settori già separati dalla rete.
  const pending = state.map.gates.map(g => g.id);
  for (const id of pending) reachable.add(id);
  while (pending.length) {
    const id = pending.pop();
    for (const edge of state.map.edges) {
      if (blocked.has(edge.id)) continue;
      const next = edge.a === id ? edge.b : edge.b === id ? edge.a : null;
      if (next && !reachable.has(next)) { reachable.add(next); pending.push(next); }
    }
  }
  return fractures.every(f => { const e = edgeAt(state.map, f.edgeId); return e && (reachable.has(e.a) || reachable.has(e.b)); });
}

// Nella Formazione 4 ogni nodo deve rimanere raggiungibile da almeno un ingresso.
export function allNodesReachable(state, extra = []) {
  const blocked=blockedEdges(state,extra), seen=new Set(state.map.gates.map(g=>g.id)), pending=[...seen];
  while(pending.length){const id=pending.pop();for(const e of state.map.edges){if(blocked.has(e.id))continue;const n=e.a===id?e.b:e.b===id?e.a:null;if(n&&!seen.has(n)){seen.add(n);pending.push(n);}}}
  return state.map.nodes.every(n=>seen.has(n.id));
}
