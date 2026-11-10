// Disegni vettoriali leggibili anche senza colore: simbolo e diramazioni propri.
export const FRACTURE_STYLES = {
  sfotto: { icon: '<circle cx="7" cy="7" r="3"/><path d="M4 13q3-3 6 0v8M5 8q2 2 4 0M10 14l8 3 3-2M18 17l3 2"/><circle cx="25" cy="13" r="3"/><path d="M22 23v-4q3-3 6 0v4"/>', branch: 'M-12 0l-3 -8m18 8l3 -8', points: [[-22,0],[-16,-3],[-10,3],[-4,-3],[2,3],[8,-3],[14,3],[22,0]] },
  insulto: { icon: '<circle cx="14" cy="15" r="10"/><path d="M8 10l4 2m8-2-4 2M10 15h.1m8 0h.1M11 20q3-5 6 0-3 4-6 0M26 11l3-3m-2 7h4m-5 4 3 3"/>', branch: 'M-8 0l-5 -12m13 12l4 11m5 -11l6 -12', points: [[-22,0],[-15,-7],[-10,6],[-4,-8],[2,7],[8,-7],[14,5],[22,0]] },
  esclusione: { icon: '<circle cx="7" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 22v-3q0-5 5-5t5 5v3m-1 0v-3q0-5 5-5t5 5v3M24 6v18"/><circle cx="28" cy="12" r="2.5"/><path d="M26 23v-4q2-2 4 0v4"/>', branch: 'M-15 1q15 -18 30 0M-15 1q15 18 30 0', points: [[-22,0],[-15,-2],[-10,4],[-5,0],[0,-5],[5,0],[10,4],[15,-2],[22,0]] },
  pettegolezzo: { icon: '<circle cx="8" cy="13" r="4"/><circle cx="24" cy="13" r="4"/><path d="M3 26v-4q0-5 5-5t5 5v4m6 0v-4q0-5 5-5t5 5v4M13 9q2-2 4 0m-3 3q2-2 4 0"/>', branch: 'M-12 0l-8 -9m8 9l-8 8M0 0l0 -12m9 12l9 -8m-9 8l9 8', points: [[-22,0],[-17,3],[-12,-3],[-6,3],[0,-3],[6,3],[12,-3],[17,3],[22,0]] },
  diffidenza: { icon: '<path d="M13 6q-7-3-8 5l-3 3 3 1q0 6 7 7m7-16q7-3 8 5l3 3-3 1q0 6-7 7M13 25q-7 0-10 5m16-5q7 0 10 5M16 5v21"/>', branch: 'M-14 -2l-4 -7m8 12l-2 7M11 -2l5 -7m-1 12l3 7', points: [[-22,0],[-15,-2],[-10,2],[-4,0],[0,-4],[4,0],[10,2],[15,-2],[22,0]] },
  rivalsa: { icon: '<path d="M3 13h4v-3q0-2 2-2l2 2V8q0-2 2-2t2 2v8l-4 5H7l-4-3zM29 13h-4v-3q0-2-2-2l-2 2V8q0-2-2-2t-2 2v8l4 5h4l4-3zM15 23l-2 3m4-3 2 3m-3-6v3"/>', branch: 'M-13 -2q-8 -12 3 -12m23 12q8 12 -3 12', points: [[-22,0],[-16,-5],[-10,3],[-5,-6],[0,8],[5,-6],[10,3],[16,-5],[22,0]] },
  manipolazione: { icon: '<path d="M5 4q3-2 5 1l3 2 3-3 3 3 3-2q3-1 5 2l-7 4H11zM10 10l3 7m9-7-3 7"/><circle cx="16" cy="18" r="2.5"/><path d="M16 21v4m-4-2h8m-4 2-3 5m3-5 3 5"/>', branch: 'M-18 -9C-8 -19 8 19 18 9M-18 9C-8 19 8 -19 18 -9', points: [[-22,0],[-17,5],[-12,-5],[-7,5],[-2,-5],[3,5],[8,-5],[13,5],[18,-4],[22,0]] },
  promessa: { icon: '<path d="M2 12l6-4 5 3 2-1m2 1 5-3 8 4-4 9-5-1-3 3-2-2m-3 0-3 2-5-4-3-4zM8 13l5 5m11-5-5 5M15 14l2-3-1 5 2 2-2 3"/>', branch: 'M-8 -3l-5 -9m21 9l5 -9M-8 3l-5 9m21 -9l5 9', points: [[-22,0],[-15,-4],[-9,2],[-4,-3],[0,8],[4,-3],[9,2],[15,-4],[22,0]] },
};

// Lo stesso disegno è usato sulla mappa e nell’elenco testuale.
export function fractureIcon(type) {
  return `<svg class="fracture-icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${FRACTURE_STYLES[type].icon}</svg>`;
}
