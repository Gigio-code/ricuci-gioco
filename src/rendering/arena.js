import { CONSEQUENCES } from '../config.js';
import { effectDescription, isConsequenceActive } from '../engine/consequences.js';
import { nodeAt, edgeAt } from '../map/network.js';
import { AGENTS } from '../catalog/agents.js';
import { CONFLICTS } from '../catalog/conflicts.js';
import { layoutLabels } from './label-layout.js';
import { FRACTURE_STYLES } from './fracture-styles.js';
const NS = 'http://www.w3.org/2000/svg';
function element(markup) { const group = document.createElementNS(NS, 'g'); group.innerHTML = markup; return group; }
const point = (r, angle) => [360 + r * Math.cos(angle), 360 + r * Math.sin(angle)];
export class ArenaRenderer {
  constructor(svg, map) {
    this.svg = svg; this.fractureElements = new Map(); this.agentElements = new Map();
    let parcels = '', details = '';
    const palette = ['#d5dfc8', '#cedbbf', '#dde4cf', '#c6d5b8', '#d9e0c7', '#d4ddc0'];
    // Quartieri tra le strade: geometria decorativa indipendente dalla rete di navigazione.
    for (let ring = 0; ring < 3; ring++) for (let sector = 0; sector < 12; sector++) {
      const outer = [272, 216, 145][ring], inner = [227, 157, 84][ring];
      const a = sector * Math.PI / 6 - Math.PI / 2 + .038, b = a + Math.PI / 6 - .076;
      const corners = [point(outer,a), point(outer,b), point(inner,b), point(inner,a)];
      parcels += `<path d="M${corners.map(p=>p.join(',')).join('L')}Z" fill="${palette[(ring * 3 + sector) % palette.length]}" stroke="#e6ecdd" stroke-width="5" stroke-linejoin="round"/>`;
      const c = point((outer + inner) / 2, (a+b)/2), angle = (a+b)/2*180/Math.PI+90;
      if (sector % 3 !== 1) {
        details += `<g transform="translate(${c}) rotate(${angle})" opacity=".75"><rect x="-13" y="-7" width="10" height="15" rx="2" fill="#efe9d5" stroke="#bec7ab" stroke-width="1"/><rect x="1" y="-10" width="11" height="20" rx="2" fill="#e8e3ce" stroke="#b8c3a5" stroke-width="1"/><path d="M-10-2h4M4-5h5M4 0h5" stroke="#c1c3a7" stroke-width="1.5"/></g>`;
      } else {
        for(let t=0;t<4;t++) details+=`<circle cx="${c[0]+Math.cos(t*2.4)*11}" cy="${c[1]+Math.sin(t*2.4)*9}" r="${4+t%2}" fill="#91a67c" opacity=".65"/>`;
      }
    }
    const roads = map.edges.map(e => {const a=nodeAt(map,e.a),b=nodeAt(map,e.b);return `<path d="M${a.x} ${a.y}L${b.x} ${b.y}"/>`;}).join('');
    const gateMarkup = map.gates.map(g => {
      const n=nodeAt(map,g.id), dx=(n.x-360)/278,dy=(n.y-360)/278;
      return `<g class="map-gate" data-gate="${g.id}" role="button" tabindex="0" aria-label="Invia un agente" transform="translate(${360+dx*311} ${360+dy*311})"><title>Ingresso ${g.direction}</title><circle class="gate-confirm" r="28" fill="none" stroke="#b88b36" stroke-width="4" visibility="hidden"/><circle class="gate-marker" r="21" fill="#f5f4e9" stroke="#758e70" stroke-width="2"/><text text-anchor="middle" y="4" font-size="12" fill="#617654">${g.symbol}</text><circle class="gate-hit" r="48" fill="transparent" pointer-events="all"/></g>`;
    }).join('');
    this.svg.innerHTML = `<defs><radialGradient id="land"><stop stop-color="#e8eddb"/><stop offset="1" stop-color="#dce5ce"/></radialGradient><filter id="map-shadow" x="-.2" y="-.2" width="1.4" height="1.4"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#718364" flood-opacity=".12"/></filter><filter id="route-glow"><feGaussianBlur stdDeviation="2"/></filter></defs><circle cx="360" cy="360" r="291" fill="url(#land)" stroke="#bacbae" stroke-width="1" filter="url(#map-shadow)"/><circle cx="360" cy="360" r="298" fill="none" stroke="#c8d3bb" stroke-dasharray="1 7"/><g>${parcels}</g><g>${details}</g><g fill="none" stroke="#c4c9ad" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">${roads}</g><g fill="none" stroke="#f6f1dd" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${roads}</g><g>${map.nodes.filter(n=>n.ring!==0).map(n=>`<circle cx="${n.x}" cy="${n.y}" r="4" fill="#faf5e5"/>`).join('')}</g><circle cx="360" cy="360" r="24" fill="#e4d9b6" stroke="#d2c69e"/><circle cx="360" cy="360" r="16" fill="none" stroke="#f4efdb" stroke-width="2"/><path d="M354 360h12m-6-6v12" stroke="#b8ae82" stroke-width="2"/><text x="360" y="405" text-anchor="middle" font-size="8" letter-spacing="2" fill="#8a9475">PIAZZA</text><g opacity=".6" font-size="7" letter-spacing="1.5" fill="#7b8c68"><text x="177" y="191">GLI ORTI</text><text x="480" y="221">IL BORGO</text><text x="478" y="513">LE CORTI</text><text x="156" y="510">I GIARDINI</text></g><g id="route-layer"></g><g id="effect-layer"></g><g id="fracture-layer"></g><g id="agent-layer"></g><g id="gate-layer">${gateMarkup}</g>`;
    this.gateElements = [...this.svg.querySelectorAll('[data-gate]')];
    this.gateElements.forEach(el => { const gate=map.gates.find(g=>g.id===el.dataset.gate); el.setAttribute('aria-label',`Ingresso ${gate.direction}: invia l’agente selezionato`); });
    this.effectLayer=this.svg.querySelector('#effect-layer');this.fractureLayer=this.svg.querySelector('#fracture-layer');this.agentLayer=this.svg.querySelector('#agent-layer');this.routeLayer=this.svg.querySelector('#route-layer');
  }
  render(state, { selectedAgent = null, focusedFracture = null, selectedCard = null, gateFeedback = null } = {}) {
    for(const gate of this.gateElements) { gate.querySelector('.gate-marker').setAttribute('fill',selectedCard?'#f9e2a0':'#f5f4e9'); gate.querySelector('.gate-confirm').setAttribute('visibility',gateFeedback?.id===gate.dataset.gate && gateFeedback.until>performance.now()?'visible':'hidden'); gate.classList.toggle('ready',!!selectedCard); }
    this.effectLayer.innerHTML=state.fractures.filter(f=>f.status==='active'&&f.effectEdge).map(f=>{const e=edgeAt(state.map,f.effectEdge),a=nodeAt(state.map,e.a),b=nodeAt(state.map,e.b);return `<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke="#9e3e36" stroke-width="9" stroke-dasharray="7 5" opacity=".9"><title>Isolamento: strada chiusa da Esclusione #${f.id}</title></path>`;}).join('') + state.fractures.filter(f=>isConsequenceActive(state,f)&&['diffidenza','promessa','manipolazione'].includes(f.type)).map(f=>{const e=edgeAt(state.map,f.edgeId),a=nodeAt(state.map,e.a),b=nodeAt(state.map,e.b),radius=CONSEQUENCES[f.type].radius;return `<circle cx="${(a.x+b.x)/2}" cy="${(a.y+b.y)/2}" r="${radius}" fill="#b94a3c" fill-opacity=".035" stroke="#a14b3e" stroke-opacity=".65" stroke-width="2" stroke-dasharray="6 6" pointer-events="none"><title>${effectDescription(state,f)}</title></circle>`;}).join('');
    for(const f of state.fractures) {
      const percent=Math.min(100,Math.round(f.progress/f.required*100));
      let el=this.fractureElements.get(f.id);
      const edge=edgeAt(state.map,f.edgeId),a=nodeAt(state.map,edge.a),b=nodeAt(state.map,edge.b),x=(a.x+b.x)/2,y=(a.y+b.y)/2;
      if(!el) {
        const angle=Math.atan2(b.y-a.y,b.x-a.x)+Math.PI/2;
        const style=FRACTURE_STYLES[f.type];
        const p=style.points.map(([u,v])=>[u*Math.cos(angle)-v*Math.sin(angle),u*Math.sin(angle)+v*Math.cos(angle)]);
        const d='M'+p.map(t=>t.join(',')).join('L');
        const dx=(b.x-a.x)/edge.length*10,dy=(b.y-a.y)/edge.length*10;
        el=element(`<title>${CONFLICTS[f.type].name}: ${CONFLICTS[f.type].description}</title><circle class="fracture-hit" r="26" fill="transparent"/><path d="M${-dx} ${-dy}L${dx} ${dy}" stroke="#d6dfc8" stroke-width="14"/><path d="${d}" class="crack-base" fill="none" stroke="#9a3c34" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path class="crack-branches" d="${style.branch}" transform="rotate(${angle*180/Math.PI})" fill="none" stroke="#b94a3c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path class="crack-red" d="${d}" fill="none" stroke="#c85a4a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path class="crack-gold" d="${d}" fill="none" stroke="#d4ac52" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" pathLength="100"/><line class="marker-line" x1="0" y1="0" x2="0" y2="0" stroke="#a86952" stroke-width="1.5" stroke-dasharray="3 3" pointer-events="none"/><circle class="fracture-badge" cx="20" cy="-18" r="9" fill="#fbf3df" stroke="#b66b52"/><circle class="effect-mark" cx="-20" cy="-20" r="10" fill="#7d322c" stroke="#fff8e7" stroke-width="2"/><text class="effect-mark" x="-20" y="-16" text-anchor="middle" font-size="13" font-weight="bold" fill="white">!</text><text class="fracture-id" x="20" y="-15" text-anchor="middle" font-size="8" fill="#995442">${f.id}</text><g class="marker-label"><circle class="type-badge" cx="0" cy="0" r="30" fill="#b94a3c" stroke="#fff8e7" stroke-width="2"/><svg class="type-symbol" x="-20" y="-20" width="40" height="40" viewBox="0 0 32 32" fill="none" stroke="#fff8e7" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${style.icon}</svg><text class="fracture-name" y="49" text-anchor="middle" font-size="20" font-weight="700" fill="#752f27" paint-order="stroke" stroke="#f9f7eb" stroke-width="5" stroke-linejoin="round" pointer-events="none">${CONFLICTS[f.type].name}</text></g><text class="fracture-percent" y="29" text-anchor="middle" font-size="8" fill="#925b3a" paint-order="stroke" stroke="#eef0de" stroke-width="3"></text>`);
        el.setAttribute('class','map-fracture');el.dataset.fracture=f.id;el.setAttribute('transform',`translate(${x} ${y})`);
        this.fractureLayer.append(el);this.fractureElements.set(f.id,el);
      }
      const repaired=f.status==='repaired',active=f.status==='active';
      el.querySelectorAll('.effect-mark').forEach(mark=>mark.setAttribute('visibility',isConsequenceActive(state,f)?'visible':'hidden'));
      el.setAttribute('aria-label',`Frattura ${f.id}, ${CONFLICTS[f.type].name}, ${percent}%, ${repaired?'ricucita':active?`${Math.ceil(f.expiresAt-state.time)} secondi rimasti`:'tempo scaduto'}. ${active?effectDescription(state,f):''}`);
      el.setAttribute('role',active?'button':'img');el.setAttribute('tabindex',active?'0':'-1');
      el.querySelector('.crack-gold').setAttribute('stroke-dasharray',`${percent} ${100-percent}`);
      el.querySelector('.crack-gold').setAttribute('opacity',f.progress?1:0);
      el.querySelector('.crack-base').setAttribute('stroke',repaired?'#a17c32':'#9a3c34');
      el.querySelector('.fracture-hit').setAttribute('stroke',focusedFracture===f.id?'#b58e3a':'transparent');
      el.querySelector('.type-badge').setAttribute('fill',repaired?'#a17c32':'#b94a3c');
      el.querySelector('.crack-branches').setAttribute('stroke',repaired?'#c49b43':'#b94a3c');
      el.querySelector('.fracture-badge').setAttribute('fill',repaired?'#d7b45d':active?'#fff3dc':'#d6d5c3');
      el.querySelector('.fracture-id').setAttribute('fill',repaired?'#655025':'#995442');
      el.querySelector('.fracture-name').setAttribute('fill',repaired?'#846524':'#752f27');
      el.querySelector('.fracture-percent').textContent=active?`${percent}%`:'';
      el.querySelector('.marker-label').setAttribute('visibility',active?'visible':'hidden');el.querySelector('.marker-line').setAttribute('visibility',active?'visible':'hidden');
      el.setAttribute('opacity',active||repaired?1:.6);
    }
    const activeLabels=state.fractures.filter(f=>f.status==='active').map(f=>{
      const e=edgeAt(state.map,f.edgeId),a=nodeAt(state.map,e.a),b=nodeAt(state.map,e.b);
      return {id:f.id,name:CONFLICTS[f.type].name,x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    });
    const box=(x,y,r)=>({left:x-r,right:x+r,top:y-r,bottom:y+r});
    const blockers=[...activeLabels.map(f=>box(f.x,f.y,23)),...state.agents.map(a=>box(a.x,a.y,30)),...state.map.gates.map(g=>{const n=nodeAt(state.map,g.id),dx=(n.x-360)/278,dy=(n.y-360)/278;return box(360+dx*311,360+dy*311,50);})];
    const labels=layoutLabels(activeLabels,blockers);
    for(const f of activeLabels){const label=labels.get(f.id),el=this.fractureElements.get(f.id),dx=label.x-f.x,dy=label.y-f.y;el.querySelector('.marker-label').setAttribute('transform',`translate(${dx} ${dy})`);el.querySelector('.marker-line').setAttribute('x2',dx);el.querySelector('.marker-line').setAttribute('y2',dy);}
    for(const [id,el] of this.agentElements) if(!state.agents.some(a=>a.id===id)){el.remove();this.agentElements.delete(id);}
    for(const a of state.agents){
      let el=this.agentElements.get(a.id);const def=AGENTS[a.type];
      if(!el){
        el=element(`<circle class="working-halo" r="23" fill="${def.color}"/><circle class="agent-selection" r="21" fill="none" stroke="#fff8ce" stroke-width="2"/><ellipse cx="0" cy="14" rx="12" ry="4" fill="#506943" opacity=".2"/><rect class="agent-body" x="-10" y="-3" width="20" height="20" rx="8" fill="${def.color}" stroke="#f9f6e8" stroke-width="1.5"/><circle cy="-7" r="6" fill="#eee5cd" stroke="${def.color}" stroke-width="2"/><text y="11" text-anchor="middle" font-size="9" font-weight="600" fill="#fff7df">${def.short}</text><path class="capacity-arc" d="M-14-12A19 19 0 1 1-15 11" fill="none" stroke="${def.color}" stroke-width="2" pathLength="100"/><text class="contribution-label" y="-30" text-anchor="middle" font-size="11" font-weight="600" fill="${def.color}" paint-order="stroke" stroke="#f8f6e5" stroke-width="3"></text>`);
        el.setAttribute('class','map-agent');el.dataset.agent=a.id;el.setAttribute('role','button');el.setAttribute('tabindex','0');this.agentLayer.append(el);this.agentElements.set(a.id,el);
      }
      const offset=(a.id%3-1)*5;
      el.setAttribute('transform',`translate(${a.x+offset} ${a.y+offset})`);
      el.setAttribute('aria-label',`${def.name}, agente ${a.id}, capacità ${a.capacity}: seleziona per cambiare meta`);
      el.querySelector('.working-halo').setAttribute('display',a.working>0?'block':'none');
      el.querySelector('.agent-selection').setAttribute('display',selectedAgent===a.id?'block':'none');
      el.querySelector('.capacity-arc').setAttribute('stroke-dasharray',`${a.capacity} ${100-a.capacity}`);
      el.querySelector('.contribution-label').textContent=a.lastContribution?.until>state.time?`+${a.lastContribution.amount}`:'';
    }
    const agent=state.agents.find(a=>a.id===selectedAgent);
    if(agent){
      const nodes=[{x:agent.x,y:agent.y},...(agent.to?[nodeAt(state.map,agent.to)]:[]),...agent.route.map(id=>nodeAt(state.map,id))];
      const f=state.fractures.find(f=>f.id===agent.targetId);
      if(f){const e=edgeAt(state.map,f.edgeId),a=nodeAt(state.map,e.a),b=nodeAt(state.map,e.b);nodes.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2});}
      const d='M'+nodes.map(n=>`${n.x},${n.y}`).join('L');
      this.routeLayer.innerHTML=`<path d="${d}" fill="none" stroke="#fff2a8" stroke-width="9" opacity=".9" filter="url(#route-glow)"/><path class="route-path" d="${d}" fill="none" stroke="#fff9d0" stroke-width="3"/>`;
    }else this.routeLayer.innerHTML='';
  }
}
