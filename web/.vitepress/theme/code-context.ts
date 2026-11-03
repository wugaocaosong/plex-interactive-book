import {shallowRef} from 'vue';
export interface CodeContext {file:string;reference:string;language:string;code:string;selection:string;output:string;diagnostics:string;version:string}
// A live editor supplies snapshots only in memory. Nothing is sent before Send.
export const activeCodeProvider=shallowRef<(()=>CodeContext)|null>(null);
export function summonCodeAssistant(provider:()=>CodeContext){activeCodeProvider.value=provider;window.dispatchEvent(new CustomEvent('plex-code-assistant'));}
export function snapshotVersion(text:string){let hash=2166136261;for(const c of text)hash=Math.imul(hash^c.charCodeAt(0),16777619);return 'code-'+(hash>>>0).toString(16);}
