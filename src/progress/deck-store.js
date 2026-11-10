import { AGENTS, DEFAULT_DECK } from '../catalog/agents.js';
export const DECK_STORAGE_KEY='ricuci.v03.deck.v1';
export function validDeck(deck){return Array.isArray(deck)&&deck.length===6&&new Set(deck).size===6&&deck.every(id=>Object.hasOwn(AGENTS,id));}
export function createDeckStore(storage){
 return {
  load(){try{const raw=storage?.getItem(DECK_STORAGE_KEY),deck=raw?JSON.parse(raw):null;return validDeck(deck)?[...deck]:[...DEFAULT_DECK];}catch{return [...DEFAULT_DECK];}},
  save(deck){if(!validDeck(deck))return false;try{if(!storage)return false;storage.setItem(DECK_STORAGE_KEY,JSON.stringify(deck));return true;}catch{return false;}}
 };
}
