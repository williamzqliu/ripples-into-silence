const fs=require('fs'),path=require('path');
const root=process.cwd();
(async()=>{
 const {execFileSync}=require('child_process');
 const rows=JSON.parse(execFileSync('python',['-c','import csv,json;print(json.dumps(list(csv.DictReader(open("data/lampedusa_nearby_incidents.csv")))))'],{encoding:'utf8'}));
 global.d3={csv:async()=>rows,extent:(a,f)=>[Math.min(...a.map(f)),Math.max(...a.map(f))],scaleSqrt:()=>{let dom,range;const f=x=>range[0]+(Math.sqrt(x)-Math.sqrt(dom[0]))/(Math.sqrt(dom[1])-Math.sqrt(dom[0]))*(range[1]-range[0]);f.domain=d=>(dom=d,f);f.range=r=>(range=r,f);return f;}};
 const {loadAndProcessData}=await import('file://'+root+'/js/data/incidents.js');
 const {paths}=await loadAndProcessData();
 if(paths.length!==95||paths.reduce((s,d)=>s+d.dead,0)!==833)throw Error('Totals mismatch');
 if(paths.some((d,i)=>i&&d.date<paths[i-1].date))throw Error('Date order');
 if(paths.some(d=>!Number.isFinite(d.radius)||!Number.isFinite(d.disappearRatio)))throw Error('Invalid geometry');
 const last=paths.filter(d=>d.year===2025);
 if(last.reduce((s,d)=>s+d.dead,0)!==125)throw Error('Latest year mismatch');
 const {recordTooltip}=await import('file://'+root+'/js/data/tooltip.js');
 if(!recordTooltip(paths.find(d=>d.id==='2021.MMP00112')).includes('100 km'))throw Error('Missing discrepancy note');
 if(recordTooltip({...paths[0],location:'<script>'}).includes('<script>'))throw Error('Unsafe tooltip');
 console.log('PASS: unique sample totals, chronological order, finite geometry, latest-year count, discrepancy note and tooltip escaping');
})();

(async () => {
  const { execFileSync } = require('child_process');
  const rows = JSON.parse(execFileSync('python', ['-c', 'import csv,json;print(json.dumps(list(csv.DictReader(open("data/lampedusa_nearby_incidents.csv")))))'], {encoding:'utf8'}));
  const { expandPeople, CAUSES } = await import('file://' + process.cwd() + '/js/data/people.js');
  const people = expandPeople(rows);
  const expected = [689,56,35,29,15,7,2];
  if (people.length !== 833) throw Error('Person count changed');
  CAUSES.forEach((c,i) => { if (people.filter(p=>p.cause===c.key).length !== expected[i]) throw Error('Cause total: '+c.key); });
  for (const row of rows) {
    if (people.filter(p=>p.recordId===row['Main ID']).length !== Number(row['Total Number of Dead and Missing'])) throw Error('Lost record identity');
  }
  console.log('PASS: 833 people, seven mutually exclusive cause groups, and all 95 source-record mappings');
})();
