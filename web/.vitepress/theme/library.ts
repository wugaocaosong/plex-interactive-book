export interface LibraryBook { id:string; title:string; subtitle:string; status:'available'|'coming'; cover?:string; manifest?:string; entry?:string; color:string; position:[number,number,number]; radius:number }
export interface LibraryManifest {version:1; books:LibraryBook[]}
export const library:LibraryManifest={version:1,books:[
 {id:'plex-programming',title:'PLEX·星轨编程',subtitle:'Python 与算法的探索之旅',status:'available',cover:'/images/cover.png',manifest:'/book/manifest.json',entry:'/read/title',color:'#54c3cc',position:[5,-1.7,4],radius:2.15},
 ...([[-7,-3,-3],[-3,3,-5],[3,4,-6],[9,3,-8],[10,-4,-4],[-1,-6,-6]] as [number,number,number][]).map((position,i):LibraryBook=>({id:`future-0${i+1}`,title:'待上架',subtitle:'内容尚未提供',status:'coming',color:i%2?'#645a9b':'#44748b',position,radius:.45+(i%3)*.13}))
]};
