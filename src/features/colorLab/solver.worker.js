import { solveRecipes } from './engine.js';
self.onmessage=({data})=>{
  try {
    const recipes=solveRecipes(data.pigments,data.target,progress=>self.postMessage({progress}));
    self.postMessage({recipes});
  } catch { self.postMessage({error:'რეცეპტები ვერ გამოითვალა. სცადეთ ხელახლა.'}); }
};
