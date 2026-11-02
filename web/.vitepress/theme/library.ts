export interface LibraryBook { id:string; title:string; subtitle:string; status:'available'|'coming'; cover?:string; manifest?:string; entry?:string; color:string }
export interface LibraryManifest {version:1; books:LibraryBook[]}
export const library:LibraryManifest={version:1,books:[
 {id:'plex-programming',title:'PLEX·星轨编程',subtitle:'Python 与算法的探索之旅',status:'available',cover:'/images/cover.png',manifest:'/book/manifest.json',entry:'/read/title',color:'#6dbfc3'},
 {id:'future-01',title:'新书席位 01',subtitle:'待上架 · 内容尚未提供',status:'coming',color:'#9d86c5'},
 {id:'future-02',title:'新书席位 02',subtitle:'待上架 · 内容尚未提供',status:'coming',color:'#bf9971'}
]};
