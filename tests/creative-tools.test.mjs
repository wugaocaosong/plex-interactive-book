import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultControls,mappingConflict,sanitizeControls} from '../web/.vitepress/theme/reader-controls.ts';
import {boardWorkspace,createBoard,validBoardDocument,validMark} from '../web/.vitepress/theme/blackboard-model.ts';
test('fullscreen mapping stays independent, rejects turn aliases and old preferences migrate',()=>{
 assert.equal(sanitizeControls({previous:'PageUp',next:'PageDown'}).fullscreen,'');
 for(const key of ['PageUp','PageDown','ArrowLeft','ArrowRight','Escape'])assert.equal(mappingConflict(key,'fullscreen',defaultControls),true);
 assert.equal(mappingConflict('KeyF','fullscreen',defaultControls),false);
 const p={...defaultControls,fullscreen:'KeyF'};assert.equal(mappingConflict('KeyF','next',p),true);assert.deepEqual(sanitizeControls(p),p);
 assert.equal(sanitizeControls({...p,fullscreen:'PageDown'}).fullscreen,'');
});
test('legacy board becomes first named board without altering objects or old source',()=>{
 const old={version:2,sectionId:'chapter/s',marks:[{id:'text1',kind:'text',text:'保留旧笔记',x:10,y:20,color:'#F7EEDB'}],updatedAt:'old'};
 const w=boardWorkspace('chapter/s',old);assert.equal(w.version,3);assert.deepEqual(w.boards[0].marks,old.marks);assert.equal(w.updatedAt,'old');assert.equal(w.activeId,w.boards[0].id);assert.deepEqual(boardWorkspace('chapter/s',w),w);
 w.boards[0].marks[0].text='new';assert.equal(old.marks[0].text,'保留旧笔记');assert.equal(validBoardDocument(w),true);
});
test('board backups validate bounds, ten-board limit, image sources and unique identities',()=>{
 const w=boardWorkspace('s');for(let n=1;n<10;n++)w.boards.push(createBoard('板 '+n));assert.equal(validBoardDocument(w),true);w.boards.push(createBoard());assert.equal(validBoardDocument(w),false);w.boards.pop();
 w.boards[1].id=w.boards[0].id;assert.equal(validBoardDocument(w),false);
 const image={id:'i',kind:'image',color:'#ffffff',src:'data:image/png;base64,AA==',x:20,y:20,width:100,height:100};assert.equal(validMark(image),true);
 for(const src of ['https://tracker/image.png','data:image/svg+xml;base64,PHN2Zz4=','javascript:alert(1)'])assert.equal(validMark({...image,src}),false);
 assert.equal(validMark({...image,strokeWidth:NaN}),false);assert.equal(validMark({...image,dx:Infinity}),false);
 const fresh=boardWorkspace('s');fresh.boards[0].width=0;assert.equal(validBoardDocument(fresh),false);
});
