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
 if(!paths.find(d=>d.id==='2021.MMP00112').note.includes('100 km'))throw Error('Missing discrepancy note');
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

(async () => {
  // The record's schedule: date order, the opening one at a time, and every
  // year starting where its first record bursts.
  const { execFileSync } = require('child_process');
  const rows = JSON.parse(execFileSync('python', ['-c', 'import csv,json;print(json.dumps(list(csv.DictReader(open("data/lampedusa_nearby_incidents.csv",encoding="utf-8")))))'], {encoding:'utf8'}));
  global.d3 = { csv: async () => rows, extent: (a, f) => [Math.min(...a.map(f)), Math.max(...a.map(f))],
    scaleSqrt: () => { let dom, range; const f = x => range[0] + (Math.sqrt(x) - Math.sqrt(dom[0])) / (Math.sqrt(dom[1]) - Math.sqrt(dom[0])) * (range[1] - range[0]); f.domain = d => (dom = d, f); f.range = r => (range = r, f); return f; } };
  const root = 'file://' + process.cwd();
  const { loadAndProcessData } = await import(root + '/js/data/incidents.js');
  const { planRecord } = await import(root + '/js/scenes/record/drawPaths.js');
  const { travelMs } = await import(root + '/js/scenes/record/renderPath.js');
  const C = await import(root + '/js/config.js');
  const { paths, allYears } = await loadAndProcessData();
  const least = 37 / 1120, lead = 20 / 1120;             // a 1440 wide window
  const { queue, bounds } = planRecord(paths, allYears, { lead, least });
  const byBurst = [...queue].sort((a, b) => a.burst - b.burst);
  if (byBurst.some((it, k) => k && it.d.date < byBurst[k - 1].d.date)) throw Error('Bursts out of date order');
  const settle = it => it.legend ? C.LABEL_FADE * 2 + C.LABEL_HOLD : C.RIPPLE_TRANS_DURATION + C.RIPPLE_SHOWING + C.RIPPLE_OUTER_FADING_DURATION;
  for (let k = 1; k <= 5; k++) {
    if (byBurst[k].launch < byBurst[k - 1].burst + settle(byBurst[k - 1])) throw Error('Opening record ' + (k + 1) + ' sets out early');
  }
  for (const b of bounds) {
    const first = byBurst.find(it => it.d.year === b.year);
    if (Math.abs(first.burst / 76000 - b.from) > 1e-9) throw Error('Year ' + b.year + ' does not start at its first burst');
  }
  if (bounds.some((b, k) => k && b.from - bounds[k - 1].from < least - 1e-9)) throw Error('Year labels overlap');
  if (queue.some(it => Math.abs(it.burst - it.launch - travelMs(it.speed, it.tail)) > 1e-6)) throw Error('Launch does not lead its burst by its travel');
  console.log('PASS: record schedule in date order, opening one at a time, years lit at their first burst, labels clear');
})().catch(e => { console.error(e); process.exit(1); });
