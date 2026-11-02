import type {SavedBookmark} from './types';
export interface BookmarkGroup {id:string;name:string}
export interface Importance {id:string;name:string;color:string}
export const defaultLevels:Importance[]=[{id:'normal',name:'普通',color:'#99a2ae'},{id:'important',name:'重点',color:'#d9b873'},{id:'review',name:'必复习',color:'#f18080'}];
export interface OrganizedBookmark extends SavedBookmark {id:string;bookId:string;groupId:string;tags:string[];importance:string;createdAt:string}
export function organizeBookmarks(rows:SavedBookmark[]):OrganizedBookmark[]{return rows.map((raw)=>{const r=raw as Partial<OrganizedBookmark>;return {...raw,id:r.id||`legacy:${raw.sectionId}:${raw.blockId}:${raw.offset}`,bookId:r.bookId||'plex-programming',groupId:r.groupId||'',tags:Array.isArray(r.tags)?[...new Set(r.tags.filter(t=>typeof t==='string'))]:[],importance:r.importance||'normal',createdAt:r.createdAt||''};});}
export function removeGroup(rows:OrganizedBookmark[],id:string){return rows.map(r=>r.groupId===id?{...r,groupId:''}:r);}
export function removeLevel(rows:OrganizedBookmark[],id:string){return rows.map(r=>r.importance===id?{...r,importance:'normal'}:r);}
