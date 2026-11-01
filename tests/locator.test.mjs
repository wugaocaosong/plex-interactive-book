import test from 'node:test';
import assert from 'node:assert/strict';
import {locateLeaf} from '../web/.vitepress/theme/pagination.ts';

test('a search anchor resolves to the first occurrence, including a block starting mid-page',()=>{
  const leaves=[
    {blockId:'b0',offset:0,html:'<p data-block="b0">intro</p><p data-block="b1">beginning</p>'},
    {blockId:'b1',offset:100,html:'<p data-block="b1">continuation</p>'},
    {blockId:'b1',offset:220,html:'<p data-block="b1">ending</p>'},
  ];
  assert.equal(locateLeaf(leaves,'b1'),0);
  assert.equal(locateLeaf(leaves,'b1',150),1);
  assert.equal(locateLeaf(leaves,'b1',230),2);
  assert.equal(locateLeaf(leaves,'missing'),0);
});
