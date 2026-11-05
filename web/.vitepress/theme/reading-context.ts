import {shallowRef,ref} from 'vue';
export interface ReadingContext {version:string;section_id:string;block_id:string;text:string;latex:string;image:string}
export const readingMaterial=shallowRef<ReadingContext|null>(null);
export const frameActive=ref(false);
export const pendingQa=shallowRef<{section:string;text:string;ai:boolean;quote?:{text:string;block_id:string}}|null>(null);
export function startFrame(){window.dispatchEvent(new Event('plex-frame-reading'));}
export function offerQa(section:string,text:string,ai=false){pendingQa.value={section,text,ai};window.dispatchEvent(new CustomEvent('plex-open-qa',{detail:{section}}));}
