// Local preview only. Uses the existing Vite process; no new hosted server or service.
process.env.VITE_API_BASE='http://127.0.0.1:5173/api';
process.env.VITE_API_OVERRIDE='';
const {createServer}=await import('vite');
const server=await createServer({
  plugins:[{name:'local-read-only-catalog',configureServer(vite){
    vite.middlewares.use((req,res,next)=>{
      if(req.url?.startsWith('/api/')&&!['GET','HEAD','OPTIONS'].includes(req.method)){
        res.statusCode=405;res.setHeader('Content-Type','application/json');
        res.end(JSON.stringify({message:'Local color-lab preview permits read-only API requests.'}));return;
      }
      next();
    });
  }}],
  server:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{'/api':{
    target:'https://artopia-backend-2024-54872c79acdd.herokuapp.com',changeOrigin:true,
    rewrite:path=>path.replace(/^\/api/,''),
  }}},
});
await server.listen();server.printUrls();
