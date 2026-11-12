// Etichette compatte con collegamento alla crepa e area di tocco separata.
// L’ordine stabile riduce gli spostamenti durante gli aggiornamenti.
export function layoutLabels(items, obstacles = []) {
  const placed=[],result=new Map();
  const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  for(const item of [...items].sort((a,b)=>a.id-b.id)){
    const width=Math.max(132,item.name.length*9.4+77),height=48,candidates=[];
    for(const radius of [49,75,105,145,190,235,285])for(let i=0;i<16;i++){
      const angle=-Math.PI/2+i*Math.PI/8;
      const x=Math.max(31+width/2,Math.min(689-width/2,item.x+radius*Math.cos(angle)));
      const y=Math.max(65,Math.min(652,item.y+radius*Math.sin(angle)));
      const rect={left:x-width/2,right:x+width/2,top:y-height/2,bottom:y+height/2};
      const collisions=[...placed,...obstacles].reduce((s,o)=>s+overlap(rect,o),0);
      candidates.push({x,y,width,rect,score:collisions*10000+Math.hypot(x-item.x,y-item.y)});
    }
    candidates.sort((a,b)=>a.score-b.score);const best=candidates[0];placed.push(best.rect);result.set(item.id,best);
  }
  return result;
}
