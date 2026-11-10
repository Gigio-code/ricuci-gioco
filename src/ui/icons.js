const paths = {
  ear: '<path d="M10 23c0-4-5-4-5-10a9 9 0 0 1 18 0c0 6-6 6-6 10a4 4 0 0 1-7 3M10 13a4 4 0 0 1 8 0c0 3-4 3-4 6"/>',
  eye: '<path d="M2 16s5-8 14-8 14 8 14 8-5 8-14 8S2 16 2 16Z"/><circle cx="16" cy="16" r="4"/><path d="M16 2v3M5 5l2 2m18-2-2 2"/>',
  shield: '<path d="m16 3 11 5v9c0 6-11 12-11 12S5 23 5 17V8Z"/><path d="m11 16 4 4 7-9"/>',
  hand: '<path d="m4 21 6-3h10a3 3 0 0 1 0 6h-6m6-6 5-5a3 3 0 0 1 4 4l-7 9a5 5 0 0 1-4 2H9l-5-7ZM5 14V6m-3 5 3 3 3-3M16 3v9m-3-3 3 3 3-3"/>',
  chat: '<path d="M4 4h21v16H13l-7 6v-6H4ZM11 10h8m-8 5h5M27 10h3v17h-5l-5 4v-4h-5v-4"/>',
  balance: '<path d="M16 3v25M7 29h18M5 9h22M16 5l-3 4m3-4 3 4M5 9l-4 11h8ZM27 9l-4 11h8Z"/>',
  stitch: '<path d="M5 28 27 4M4 16l12 12M16 4l12 12M10 10l12 12"/>',
  people: '<circle cx="16" cy="8" r="4"/><circle cx="5" cy="14" r="3"/><circle cx="27" cy="14" r="3"/><path d="M9 28v-8a7 7 0 0 1 14 0v8M1 28v-6a4 4 0 0 1 5-4m25 10v-6a4 4 0 0 0-5-4"/>',
};
export const icon = name => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.stitch}</svg>`;
