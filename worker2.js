importScripts('https://d3js.org/d3.v4.min.js');
// in worker.onmessage add : `if (e.data.log) console.log.apply(this, e.data.log);`
console.log = function() {
  self.postMessage({ log: [...arguments] });
}

  function levenshtein(a, b) {
  var t = [], u, i, j, m = a.length, n = b.length;
  if (!m) { return n; }
  if (!n) { return m; }
  for (j = 0; j <= n; j++) { t[j] = j; }
  for (i = 1; i <= m; i++) {
    for (u = [i], j = 1; j <= n; j++) {
      u[j] = a[i - 1] === b[j - 1] ? t[j - 1] : Math.min(t[j - 1], t[j], u[j - 1]) + 1;
    } t = u;
  } return u[n];
}

let iterations = 0,
    model;
 let K=18,
      centers = d3.range(K).map(i => [ 0, 0 ]);

self.onmessage = function(e) {
  const msg = e.data,
        data = msg.data,
        maxIter = msg.maxIter || 500,
        perplexity = msg.perplexity || 30;

  let dists = msg.dist;
  if (data && !dists){
    let now = performance.now();
    dists = data.map(
      a => data.map(
        b => d3.range(4).map(n => levenshtein(a.name.substring(0,n).toLowerCase(), b.name.substring(0,n).toLowerCase()) * Math.pow(1/2, n))
                      .reduce((a,b)=>a+b, 0)
      )
    );
    console.log('computed', data.length * data.length,'distances in', Math.round(performance.now()-now),'ms');
  }
  if (dists) {
      model = new tsnejs.tSNE({
          dim: msg.dim,
          perplexity: perplexity,
      });
      model.initDataDist(dists);
  }

  let startpos = model.getSolution().map(d=>d.slice()),
      pos;

  
 
  
  while (iterations++ < maxIter) {
       // every time you call this, solution gets better
       model.step();
    
    pos = model.getSolution();

    // each K-center moves to the barycenter of its group
    var m = pos[Math.floor(Math.random() * pos.length)];

    centers.forEach((c,i) => {
      let p = pos.filter(d => d[2] == i);
      if (p.length < 10) c = m;
      else {
            c[0] = d3.mean(p.map(d => d[0])); 
            c[1] = d3.mean(p.map(d => d[1])); 
      }
          });
    // group each point according to its closest K-center
   pos.forEach(d => { 
       d[2] = d3.scan(centers.map(c => {
               var dx = d[0] - c[0],
                   dy = d[1] - c[1];
               return  (dx*dx + dy*dy);
             }));
    });
   
    
    
       // Y is an array of 2-D points that you can plot
       self.postMessage({
         iterations: iterations - 1,
         pos: pos,
         //log: [ 'step', iterations-1 ]
       });

   }

  let cost = startpos
       .map((d,i) => sqdist(d, pos[i]))
       .reduce ((a,b) => a + b, 0) / pos.length / Math.max(...pos.map(d => Math.abs(d[0]) + Math.abs(d[1])));
  
   self.postMessage({
     done: iterations - 1,
     cost: cost,
     log: [ 'done', iterations - 1 ]
   });
};

function sqdist (a,b) {
  let d = [a[0] - b[0], a[1] - b[1]].map(Math.abs);
  return Math.max(d[0], d[1]); 
}