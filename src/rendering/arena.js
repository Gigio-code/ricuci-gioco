import { CONSEQUENCES } from '../config.js';
import { effectDescription, isConsequenceActive } from '../engine/consequences.js';
import { nodeAt, edgeAt } from '../map/network.js';
import { AGENTS } from '../catalog/agents.js';
import { CONFLICTS } from '../catalog/conflicts.js';
import { layoutLabels } from './label-layout.js';
import { FRACTURE_STYLES } from './fracture-styles.js';
import { sprite, ART_COLORS } from '../ui/art.js';
const NS='http://www.w3.org/2000/svg';
const element=markup=>{const g=document.createElementNS(NS,'g');g.innerHTML=markup;return g;};
const artURL=new URL('../../assets/neighborhood.webp',import.meta.url).href;
function stitches(points,percent){
  const segments=points.slice(1).map((p,i)=>({a:points[i],b:p,length:Math.hypot(p[0]-points[i][0],p[1]-points[i][1])}));
  const total=segments.reduce((s,e)=>s+e.length,0);let d='';
  for(const t of [.09,.26,.43,.60,.77,.94]){
    if(t*100>percent)continue;let distance=t*total;
    for(const e of segments){if(distance>e.length){distance-=e.length;continue;}const f=distance/e.length,x=e.a[0]+(e.b[0]-e.a[0])*f,y=e.a[1]+(e.b[1]-e.a[1])*f,nx=-(e.b[1]-e.a[1])/e.length*6,ny=(e.b[0]-e.a[0])/e.length*6;d+=`M${x-nx},${y-ny}L${x+nx},${y+ny}`;break;}
  }
  return d;
}
export class ArenaRenderer {
  constructor(svg,map){
    this.svg=svg;this.fractureElements=new Map();this.agentElements=new Map();this.lastLayout=-1;this.layoutSignature='';this.repairUntil=-1;this.repairedCount=0;
    const roads=map.edges.map(e=>{const a=nodeAt(map,e.a),b=nodeAt(map,e.b);return `<path d="M${a.x} ${a.y}L${b.x} ${b.y}"/>`;}).join('');
    const gates=map.gates.map(g=>{const n=nodeAt(map,g.id),dx=(n.x-360)/278,dy=(n.y-360)/278,x=360+dx*310,y=360+dy*310;
      return `<g class="map-gate" data-gate="${g.id}" role="button" tabindex="0" aria-label="Ingresso ${g.direction}: invia l’agente selezionato" transform="translate(${x} ${y})"><title>Ingresso ${g.direction}</title><circle class="gate-confirm" r="29" fill="none" stroke="#ffdb80" stroke-width="4" visibility="hidden"/><path class="gate-marker" d="M0-24C14-24 24-15 24-3S12 18 0 28C-12 18-24 9-24-3S-14-24 0-24Z" fill="#193e52" stroke="#b5e4df" stroke-width="2.5"/><text y="4" text-anchor="middle" font-size="23" font-weight="900" fill="#ffefce">${g.symbol}</text><circle r="40" fill="transparent" pointer-events="all"/></g>`;
    }).join('');
    svg.innerHTML=`<defs><clipPath id="actor-crop"><rect x="-27" y="-59" width="54" height="72"/></clipPath><mask id="road-mask"><rect width="720" height="720" fill="white"/><circle cx="360" cy="360" r="24" fill="black"/></mask><clipPath id="arena-crop"><rect x="24" y="24" width="672" height="672" rx="38"/></clipPath><filter id="piece-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#071a2d" flood-opacity=".65"/></filter><filter id="gold-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter><filter id="route-glow"><feGaussianBlur stdDeviation="2"/></filter></defs><g clip-path="url(#arena-crop)" pointer-events="none"><rect x="24" y="24" width="672" height="672" fill="#14233a"/><image href="${artURL}" x="42" y="52" width="636" height="636"/><g mask="url(#road-mask)" class="road-shadow" fill="none" stroke="#684c38" stroke-opacity=".28" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">${roads}</g><g mask="url(#road-mask)" fill="none" stroke="#e7cba1" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${roads}</g><g mask="url(#road-mask)" fill="none" stroke="#fff0d3" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${roads}</g><g fill="#f8edd5" stroke="#ceb78b" stroke-width="1">${map.nodes.filter(n=>n.ring!==0).map(n=>`<circle cx="${n.x}" cy="${n.y}" r="4.5"/>`).join('')}</g><text class="map-note" x="360" y="401" text-anchor="middle" fill="#283e4d" paint-order="stroke" stroke="#f8e9c7" stroke-width="3" stroke-linejoin="round">LA PIAZZA</text></g><g id="route-layer" pointer-events="none"></g><g id="effect-layer" pointer-events="none"></g><g id="fracture-layer"></g><g id="agent-layer"></g><g id="label-layer"></g><g id="gate-layer">${gates}</g>`;
    this.gateElements=[...svg.querySelectorAll('[data-gate]')];
    for(const id of ['effect','fracture','agent','route','label'])this[`${id}Layer`]=svg.querySelector(`#${id}-layer`);
    const toast=document.getElementById('repair-toast');if(toast)toast.hidden=true;
  }
  render(state,{selectedAgent=null,focusedFracture=null,selectedCard=null,gateFeedback=null}={}){
    for(const gate of this.gateElements){gate.classList.toggle('ready',!!selectedCard);gate.querySelector('.gate-confirm').setAttribute('visibility',gateFeedback?.id===gate.dataset.gate&&gateFeedback.until>performance.now()?'visible':'hidden');}
    const effects=state.fractures.filter(f=>isConsequenceActive(state,f));
    const effectSignature=effects.map(f=>`${f.id}:${f.effectEdge??''}`).join('|');
    if(effectSignature!==this.effectSignature){this.effectSignature=effectSignature;this.effectLayer.innerHTML=effects.map(f=>{
      if(f.effectEdge){const e=edgeAt(state.map,f.effectEdge),a=nodeAt(state.map,e.a),b=nodeAt(state.map,e.b);return `<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke="#e65465" stroke-width="11" stroke-dasharray="7 5"><title>Isolamento: strada chiusa da Esclusione #${f.id}</title></path>`;}
      if(['diffidenza','promessa','manipolazione'].includes(f.type)){const e=edgeAt(state.map,f.edgeId),a=nodeAt(state.map,e.a),b=nodeAt(state.map,e.b);return `<circle cx="${(a.x+b.x)/2}" cy="${(a.y+b.y)/2}" r="${CONSEQUENCES[f.type].radius}" fill="#ed6463" fill-opacity=".06" stroke="#f79b7d" stroke-opacity=".85" stroke-width="2" stroke-dasharray="6 6"><title>${effectDescription(state,f)}</title></circle>`;}return '';
    }).join('');}
    for(const f of state.fractures){
      const percent=Math.min(100,f.progress/f.required*100),repaired=f.status==='repaired',active=f.status==='active';
      const edge=edgeAt(state.map,f.edgeId),a=nodeAt(state.map,edge.a),b=nodeAt(state.map,edge.b),x=(a.x+b.x)/2,y=(a.y+b.y)/2;
      let entry=this.fractureElements.get(f.id);
      if(!entry){
        const style=FRACTURE_STYLES[f.type],angle=Math.atan2(b.y-a.y,b.x-a.x)+Math.PI/2;
        const points=style.points.map(([u,v])=>[u*Math.cos(angle)-v*Math.sin(angle),u*Math.sin(angle)+v*Math.cos(angle)]),d='M'+points.map(p=>p.join(',')).join('L');
        const dx=(b.x-a.x)/edge.length*10,dy=(b.y-a.y)/edge.length*10;
        const el=element(`<title></title><circle class="fracture-hit" r="38" fill="transparent" pointer-events="all"/><path class="road-cut" d="M${-dx} ${-dy}L${dx} ${dy}" stroke="#26392f" stroke-width="16"/><path class="crack-base" d="${d}" fill="none" stroke="#59293c" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path class="crack-branches" d="${style.branch}" transform="rotate(${angle*180/Math.PI})" fill="none" stroke="#e85460" stroke-width="3" stroke-linecap="round"/><path class="crack-red" d="${d}" fill="none" stroke="#ff7d79" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path class="crack-glow" d="${d}" fill="none" stroke="#ffd65d" stroke-width="10" pathLength="100" filter="url(#gold-glow)"/><path class="crack-gold" d="${d}" fill="none" stroke="#ffd26d" stroke-width="5" stroke-linecap="round" pathLength="100"/><path class="stitch-shadow" fill="none" stroke="#78542c" stroke-width="5.5" stroke-linecap="round"/><path class="stitches" fill="none" stroke="#ffe6a4" stroke-width="3" stroke-linecap="round"/>`);
        el.setAttribute('class','map-fracture fracture-alert');el.dataset.fracture=f.id;el.setAttribute('transform',`translate(${x} ${y})`);this.fractureLayer.append(el);
        const label=element(`<title></title><path class="marker-line" d="" fill="none" stroke="#632f3a" stroke-width="2.5" stroke-dasharray="3 4"/><g class="marker-label"><rect class="label-panel" x="-75" y="-23" width="150" height="46" rx="9" fill="#a53e50" stroke="#ffe0cc" stroke-width="1.8"/><svg class="type-symbol" x="-68" y="-15" width="25" height="25" viewBox="0 0 32 32" fill="none" stroke="#fff1d8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${style.icon}</svg><text class="fracture-name" y="-2" font-size="17" font-weight="800" fill="#fff3db">${CONFLICTS[f.type].name}</text><text class="fracture-deadline" y="13" font-size="13" fill="#ffdfc3"></text><rect class="fracture-track" y="18" height="4" rx="2" fill="#6d283b"/><rect class="fracture-work" y="18" height="4" rx="2" fill="#ffdb80"/></g>`);
        label.setAttribute('class','map-fracture');label.dataset.fracture=f.id;label.setAttribute('role','button');label.setAttribute('tabindex','0');this.labelLayer.append(label);
        entry={el,label,points,status:f.status,percent:-1,visual:''};this.fractureElements.set(f.id,entry);
      }
      const {el,label}=entry;
      const description=`Frattura ${f.id}, ${CONFLICTS[f.type].name}, ${Math.floor(percent)}%, ${repaired?'ricucita':active?`${Math.ceil(f.expiresAt-state.time)} secondi rimasti`:'tempo scaduto'}. ${active?effectDescription(state,f):''}`;
      el.setAttribute('aria-label',description);el.querySelector('title').textContent=description;el.setAttribute('role','button');el.setAttribute('tabindex','0');label.setAttribute('aria-label',description);label.querySelector('title').textContent=description;
      label.setAttribute('display',active?'inline':'none');label.setAttribute('tabindex',active?'0':'-1');
      if(entry.percent!==percent){entry.percent=percent;for(const cls of ['.crack-gold','.crack-glow']){el.querySelector(cls).setAttribute('stroke-dasharray',`${percent} ${100-percent}`);el.querySelector(cls).setAttribute('opacity',percent>0?'1':'0');}const d=stitches(entry.points,percent);el.querySelector('.stitches').setAttribute('d',d);el.querySelector('.stitch-shadow').setAttribute('d',d);}
      const visual=`${f.status}:${focusedFracture===f.id}:${isConsequenceActive(state,f)}`;
      if(entry.visual!==visual){entry.visual=visual;el.querySelector('.crack-base').setAttribute('stroke',repaired?'#956733':'#59293c');el.querySelector('.crack-red').setAttribute('opacity',repaired?'0':'1');el.querySelector('.crack-branches').setAttribute('opacity',repaired?'0':'1');el.querySelector('.fracture-hit').setAttribute('stroke',focusedFracture===f.id?'#ffe8ad':'transparent');el.querySelector('.fracture-hit').setAttribute('stroke-width','2');el.setAttribute('opacity',active||repaired?'1':'.55');label.querySelector('.label-panel').setAttribute('fill',isConsequenceActive(state,f)?'#8d3452':'#a53e50');label.querySelector('.label-panel').setAttribute('stroke',focusedFracture===f.id?'#8cf0cf':'#ffdfcc');label.querySelector('.label-panel').setAttribute('stroke-width',focusedFracture===f.id?'3':'1.8');}
      if(entry.status!=='repaired'&&repaired){el.classList.add('new-repair');this.repairUntil=state.time+2.3;this.repairedCount++;const toast=document.getElementById('repair-toast');if(toast){toast.hidden=false;toast.style.animation='none';void toast.offsetWidth;toast.style.animation='';}}
      entry.status=f.status;
      if(active){label.querySelector('.fracture-deadline').textContent=`${Math.floor(percent)}% · ${Math.max(0,Math.ceil(f.expiresAt-state.time))}s`;label.querySelector('.fracture-work').setAttribute('width',Math.max(0,(entry.width??150)-49)*percent/100);}
    }
    const toast=document.getElementById('repair-toast');if(toast&&state.time>this.repairUntil)toast.hidden=true;
    const activeLabels=state.fractures.filter(f=>f.status==='active').map(f=>{const e=edgeAt(state.map,f.edgeId),a=nodeAt(state.map,e.a),b=nodeAt(state.map,e.b);return {id:f.id,name:CONFLICTS[f.type].name,x:(a.x+b.x)/2,y:(a.y+b.y)/2};});
    const signature=activeLabels.map(f=>f.id).join(',');
    if(signature!==this.layoutSignature||state.time-this.lastLayout>.6){
      this.layoutSignature=signature;this.lastLayout=state.time;
      const box=(x,y,r)=>({left:x-r,right:x+r,top:y-r,bottom:y+r});
      const blockers=[...activeLabels.map(f=>box(f.x,f.y,22)),...state.agents.map(a=>box(a.x,a.y-15,22)),...state.map.gates.map(g=>{const n=nodeAt(state.map,g.id);return box(360+(n.x-360)/278*310,360+(n.y-360)/278*310,36);})];
      const labels=layoutLabels(activeLabels,blockers);
      for(const f of activeLabels){const layout=labels.get(f.id),entry=this.fractureElements.get(f.id),{label}=entry,w=layout.width;entry.width=w;label.querySelector('.marker-line').setAttribute('d',`M${f.x},${f.y}L${layout.x},${layout.y}`);label.querySelector('.marker-label').setAttribute('transform',`translate(${layout.x} ${layout.y})`);label.querySelector('.label-panel').setAttribute('x',-w/2);label.querySelector('.label-panel').setAttribute('width',w);label.querySelector('.type-symbol').setAttribute('x',-w/2+7);label.querySelector('.fracture-name').setAttribute('x',-w/2+39);label.querySelector('.fracture-deadline').setAttribute('x',-w/2+39);for(const cls of ['.fracture-track','.fracture-work'])label.querySelector(cls).setAttribute('x',-w/2+39);label.querySelector('.fracture-track').setAttribute('width',w-49);}
    }
    for(const [id,el] of this.agentElements)if(!state.agents.some(a=>a.id===id)){el.remove();this.agentElements.delete(id);}
    for(const a of state.agents){
      let el=this.agentElements.get(a.id);const def=AGENTS[a.type],color=ART_COLORS[a.type];
      if(!el){el=element(`<title></title><circle class="working-halo" cy="-8" r="28" fill="${color}"/><ellipse class="actor-base" cx="0" cy="5" rx="16" ry="9" fill="#203c4b" stroke="${color}" stroke-width="2"/><ellipse class="agent-selection" cx="0" cy="5" rx="22" ry="13" fill="none" stroke="#ffe7a1" stroke-width="3"/><g class="actor-figure">${sprite(a.type)}</g><circle class="actor-hit" cy="-17" r="38" fill="transparent" pointer-events="all"/><path class="capacity-arc" d="M-16 12H16" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" pathLength="100"/><text class="contribution-label" y="-48" text-anchor="middle" font-size="17" font-weight="900" fill="#fff0b8" paint-order="stroke" stroke="#243a45" stroke-width="3"></text>`);el.setAttribute('class','map-agent');el.dataset.agent=a.id;el.setAttribute('role','button');el.setAttribute('tabindex','0');this.agentLayer.append(el);this.agentElements.set(a.id,el);}
      const offset=(a.id%3-1)*3;el.setAttribute('transform',`translate(${a.x+offset} ${a.y+offset})`);
      const description=`${def.name}, agente ${a.id}, capacità ${a.capacity}: seleziona per cambiare meta`;el.setAttribute('aria-label',description);el.querySelector('title').textContent=description;
      el.querySelector('.working-halo').setAttribute('display',a.working>0?'inline':'none');el.querySelector('.agent-selection').setAttribute('display',selectedAgent===a.id?'inline':'none');el.querySelector('.actor-figure').classList.toggle('walking',!!a.to&&state.phase==='playing');el.querySelector('.capacity-arc').setAttribute('stroke-dasharray',`${a.capacity} ${100-a.capacity}`);el.querySelector('.contribution-label').textContent=a.lastContribution?.until>state.time?`+${a.lastContribution.amount}`:'';
    }
    const agent=state.agents.find(a=>a.id===selectedAgent);
    if(agent){const nodes=[{x:agent.x,y:agent.y},...(agent.to?[nodeAt(state.map,agent.to)]:[]),...agent.route.map(id=>nodeAt(state.map,id))],f=state.fractures.find(f=>f.id===agent.targetId);if(f){const e=edgeAt(state.map,f.edgeId),a=nodeAt(state.map,e.a),b=nodeAt(state.map,e.b);nodes.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2});}const d='M'+nodes.map(n=>`${n.x},${n.y}`).join('L');this.routeLayer.innerHTML=`<path d="${d}" fill="none" stroke="#55b7c5" stroke-width="10" opacity=".55" filter="url(#route-glow)"/><path class="route-path" d="${d}" fill="none" stroke="#b1ffeb" stroke-width="3.5"/>`;}else if(this.routeLayer.childElementCount)this.routeLayer.replaceChildren();
  }
}
