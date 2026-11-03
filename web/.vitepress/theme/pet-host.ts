import {reactive} from 'vue';
export const petHost=reactive({sectionId:'library',sectionTitle:'银河书库',suspended:false,open:false,dictating:false,pendingLogin:false,bottomInset:0});
export function showPet(){window.dispatchEvent(new Event('plex-pet-show'));}
export function openPet(){window.dispatchEvent(new Event('plex-pet-open'));}
