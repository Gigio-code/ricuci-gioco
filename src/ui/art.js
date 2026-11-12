// Coordinate dell'atlante: quattro colonne, due righe. Stessa identità su carte e mappa.
export const ART_ORDER = ['ascolto', 'dialogo', 'protezione', 'riparazione', 'riconoscimento', 'mediazione', 'responsabilita', 'comunita'];
export const ART_COLORS = { ascolto:'#2ecbb4', dialogo:'#b48aef', protezione:'#65a7f6', riparazione:'#ffb45e', riconoscimento:'#edc87a', mediazione:'#75d4e5', responsabilita:'#ee9982', comunita:'#a6d17b' };
export function portrait(id, extra = '') {
  const index = Math.max(0, ART_ORDER.indexOf(id));
  return `<span class="portrait ${extra}" aria-hidden="true" style="--portrait-x:${index % 4 / 3 * 100}%;--portrait-y:${Math.floor(index / 4) * 100}%"></span>`;
}
export function sprite(id) {
  const source=new URL(`../../assets/agents/${ART_ORDER.includes(id)?id:'ascolto'}.webp`,import.meta.url).href;
  return `<image class="actor-sprite" href="${source}" x="-27" y="-59" width="54" height="72" pointer-events="none"/>`;
}
