import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { mkdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const directory = new URL('../node_modules/.cache/color-lab-test/', import.meta.url);
await mkdir(directory, { recursive: true });
const output = new URL('painting-ui.mjs', directory);
await build({ entryPoints: [fileURLToPath(new URL('../src/features/colorLab/PaintingCanvas.jsx',import.meta.url))], outfile: fileURLToPath(output), bundle: true, format: 'esm', platform: 'browser', loader: { '.css': 'empty' }, external: ['react'], logLevel: 'silent' });
const { default: PaintingCanvas } = await import(output.href);
await unlink(output);

async function withCanvas(brush, run) {
  const dom = new JSDOM('<div id="test-root"></div>', {url:'http://localhost'});
  const previous = new Map();
  const set = (key,value) => { previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key)); Object.defineProperty(globalThis,key,{value,writable:true,configurable:true}); };
  set('window',dom.window); set('document',dom.window.document); set('IS_REACT_ACT_ENVIRONMENT',true);
  let pendingResize;
  set('ResizeObserver',class { constructor(callback) { pendingResize=callback; } observe() {} disconnect() {} });
  set('ImageData',class { constructor(data) { this.data = data; } });
  const gaSent=[]; dom.window.gtag=(_k,name,params)=>gaSent.push({name,params});
  set('requestAnimationFrame',()=>1); set('cancelAnimationFrame',()=>{});
  dom.window.HTMLCanvasElement.prototype.getContext = type => type === 'webgl2' ? null : ({clearRect(){},drawImage(){},putImageData(){},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})});
  dom.window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({left:0,top:0,width:400,height:300});
  dom.window.HTMLCanvasElement.prototype.setPointerCapture = () => {};
  dom.window.HTMLCanvasElement.prototype.hasPointerCapture = () => false;
  const root = createRoot(document.getElementById('test-root'));
  let needed = 0, samples = 0;
  try {
    await act(()=>root.render(React.createElement(PaintingCanvas,{brush,onSample(){samples++;},onNeedPaint(){needed++;}})));
    const canvas = document.querySelector('canvas');
    const pointer = (type, { id = 1, primary = true, x = 100, target = canvas } = {}) => {
      const event = new dom.window.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:120});
      Object.defineProperties(event,{pointerId:{value:id},pointerType:{value:'touch'},isPrimary:{value:primary}});
      return act(()=>target.dispatchEvent(event));
    };
    await run({pointer,needCount:()=>needed,sampleCount:()=>samples,text:()=>document.body.textContent,window:dom.window,gaSent});
  } finally {
    await act(()=>root.unmount());
    assert.doesNotThrow(()=>pendingResize(), 'a queued resize after navigation/unmount must be ignored');
    dom.window.close();
    for (const [key,descriptor] of previous) { if(descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key]; }
  }
}
test('first-stroke instructions disappear on pointerdown while the brush is still held',async()=>{
  const pigment={id:'blue',hex:'#002185'};
  await withCanvas({hex:pigment.hex,components:[{pigment,weight:1}]},async({pointer,text})=>{
    assert.ok(text().includes('მოსვი აქ'));
    await pointer('pointerdown');
    assert.ok(!text().includes('მოსვი აქ'),'must disappear before pointerup');
    await pointer('pointerup');
  });
});
test('an empty brush requests prepared paint and keeps instructions until actual paint touches the canvas',async()=>{
  await withCanvas(null,async({pointer,text,needCount})=>{
    await pointer('pointerdown');
    assert.equal(needCount(),1); assert.ok(text().includes('ჯერ ფერი შეურიე'));
  });
});
test('a stroke whose pointerup never reaches the canvas does not block the next one',async()=>{
  const pigment={id:'blue',hex:'#002185'};
  await withCanvas({hex:pigment.hex,components:[{pigment,weight:1}]},async({pointer,sampleCount,window})=>{
    const settled=sampleCount();
    await pointer('pointerdown',{id:5});
    // the phone loses this finger's pointerup; the next touch is a new primary pointer
    await pointer('pointerdown',{id:6});
    assert.equal(sampleCount(),settled+1,'the lost stroke was closed');
    await pointer('pointerup',{id:6});
    assert.equal(sampleCount(),settled+2,'and the new one painted and ended');
    // a pointerup that lands outside the canvas still ends the stroke
    await pointer('pointerdown',{id:7});
    await pointer('pointerup',{id:7,target:window.document.body});
    assert.equal(sampleCount(),settled+3);
    // so does a touchend with no fingers left
    await pointer('pointerdown',{id:8});
    const touchEnd=new window.Event('touchend',{bubbles:true}); Object.defineProperty(touchEnd,'touches',{value:[]});
    window.document.body.dispatchEvent(touchEnd);
    assert.equal(sampleCount(),settled+4);
  });
});
test('painting reports the first stroke per tool once, and tool changes',async()=>{
  const pigment={id:'blue',hex:'#002185'};
  await withCanvas({hex:pigment.hex,components:[{pigment,weight:1}]},async({pointer,gaSent})=>{
    for (const id of [11,12,13]) { await pointer('pointerdown',{id}); await pointer('pointerup',{id}); }
    const paints=gaSent.filter(e=>e.name==='color_lab_paint');
    assert.ok(paints.length<=1,'one event for several flat strokes');
    const knife=document.querySelector('[aria-label^="პალიტრის დანა"]');
    await act(()=>knife.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
    assert.deepEqual(gaSent.filter(e=>e.name==='color_lab_tool').map(e=>e.params.tool),['knife']);
  });
});
