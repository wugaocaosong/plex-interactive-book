export interface StellarOrbit {radius:number;speed:number;size:number;color:string}
export const stellarOrbits:StellarOrbit[]=[{radius:1.18,speed:.26,size:.14,color:'#83cad7'},{radius:1.48,speed:.205,size:.12,color:'#c2a6df'},{radius:1.84,speed:.15,size:.18,color:'#83cad7'}];
export interface LibraryBook { id:string; title:string; subtitle:string; status:'available'|'coming'; cover?:string; manifest?:string; entry?:string; color:string; position:[number,number,number]; radius:number; orbits?:StellarOrbit[] }
export interface LibraryManifest {version:1; books:LibraryBook[]}
export const library:LibraryManifest={version:1,books:[
 {id:'plex-programming',title:'PLEX·星轨编程',subtitle:'Python 与算法的探索之旅',status:'available',cover:'/images/cover.png',manifest:'/book/manifest.json',entry:'/library/plex-programming/contents',color:'#54c3cc',position:[4,-.2,4],radius:3.15,orbits:stellarOrbits},
 ...([[-8,-.5,1],[-6,4,-4],[1,5,-5],[10,3,-5],[10,-4,-3],[-2,-5,-3]] as [number,number,number][]).map((position,i):LibraryBook=>({id:`future-0${i+1}`,title:'待上架',subtitle:['光环秘境','冰晶之境','双子星港','绯红沙丘','潮汐深蓝','碎星回廊'][i],status:'coming',color:i%2?'#aa95db':'#81c3db',position,radius:1.15+(i%3)*.18,orbits:stellarOrbits}))
]};
