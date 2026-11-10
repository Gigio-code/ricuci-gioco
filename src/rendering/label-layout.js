// Posiziona i contrassegni senza coprire crepe, agenti, accessi e altri nomi.
// Le coordinate sono indipendenti dalla dimensione dello schermo.
export function layoutLabels(items, obstacles = []) {
  const placed=[], result=new Map();
  const intersects=(a,b)=>a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  for(const item of [...items].sort((a,b)=>a.id-b.id)) {
    const width=Math.max(58,item.name.length*11+14),height=88,candidates=[];
    for(const radius of [75,110,150,190,230,280])for(let i=0;i<16;i++){
      const angle=-Math.PI/2+i*Math.PI/8;
      const x=Math.max(35+width/2,Math.min(685-width/2,item.x+radius*Math.cos(angle)));
      const y=Math.max(60,Math.min(640,item.y+radius*Math.sin(angle)));
      const rect={left:x-width/2,right:x+width/2,top:y-33,bottom:y+height-33};
      // Much higher cost for any intersection than for moving the label farther away.
      const collisions=[...placed,...obstacles].reduce((sum,other)=>sum+(intersects(rect,other)?overlap(rect,other)+3000:0),0);
      candidates.push({x,y,rect,score:collisions*1000+Math.hypot(x-item.x,y-item.y)});
    }
    candidates.sort((a,b)=>a.score-b.score);
    const best=candidates[0];placed.push(best.rect);result.set(item.id,best);
  }
  return result;
}
