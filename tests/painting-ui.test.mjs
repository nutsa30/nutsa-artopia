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
  set('requestAnimationFrame',()=>1); set('cancelAnimationFrame',()=>{});
  dom.window.HTMLCanvasElement.prototype.getContext = type => type === 'webgl2' ? null : ({clearRect(){},drawImage(){},putImageData(){},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})});
  dom.window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({left:0,top:0,width:400,height:300});
  dom.window.HTMLCanvasElement.prototype.setPointerCapture = () => {};
  dom.window.HTMLCanvasElement.prototype.hasPointerCapture = () => false;
  const root = createRoot(document.getElementById('test-root'));
  let needed = 0;
  try {
    await act(()=>root.render(React.createElement(PaintingCanvas,{brush,onSample(){},onNeedPaint(){needed++;}})));
    const canvas = document.querySelector('canvas');
    const pointer = type => {
      const event = new dom.window.MouseEvent(type,{bubbles:true,button:0,clientX:100,clientY:120});
      Object.defineProperties(event,{pointerId:{value:1},pointerType:{value:'mouse'}});
      return act(()=>canvas.dispatchEvent(event));
    };
    await run({pointer,needCount:()=>needed,text:()=>document.body.textContent});
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
