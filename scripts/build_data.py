"""Reproduce the coordinate-based sample. Do not infer death locations."""
import csv, math, json, hashlib
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/source_snapshot.csv'
CENTER = (35.5086, 12.5929)
NOTES = {
 '2015.MMP00361': 'Location text refers to the Libyan coast; the supplied coordinates are near Lampedusa. Unresolved source discrepancy.',
 '2021.MMP00112': 'Location text says 100 km northwest of Lampedusa; the supplied coordinates give 7.65 km. Unresolved source discrepancy.',
 '2024.MMP0241': 'Location text refers to the Libyan coast; the supplied coordinates are near Lampedusa. Unresolved source discrepancy.',
 '2023.MMP0333': 'Location text says 42 km from Lampedusa; the supplied coordinates give 6.83 km. Unresolved source discrepancy.',
}
def distance(lat, lon):
 p,q=map(math.radians,[lat,CENTER[0]])
 return 12742*math.asin(math.sqrt(math.sin((p-q)/2)**2+math.cos(p)*math.cos(q)*math.sin(math.radians(lon-CENTER[1])/2)**2))
rows=list(csv.DictReader(SOURCE.open(encoding='utf-8-sig')))
assert len({r['Main ID'] for r in rows})==len(rows), 'Duplicate Main IDs require review'
selected=[]
for r in rows:
 try: lat,lon=map(float,r['Coordinates'].split(','))
 except ValueError: continue
 d=distance(lat,lon)
 if not 2014<=int(r['Incident Year'])<=2025 or d>50: continue
 r.update(Latitude=lat,Longitude=lon,Distance_to_Lampedusa_km=f'{d:.8f}',Location_note=NOTES.get(r['Main ID'],''))
 selected.append(r)
selected.sort(key=lambda r:(r['Incident Date'],r['Main ID']))
for r in selected:
 vals=[int(r[k] or 0) for k in ['Number of Dead','Minimum Estimated Number of Missing','Total Number of Dead and Missing']]
 assert min(vals)>=0 and vals[0]+vals[1]==vals[2], r['Main ID']
with (ROOT/'data/lampedusa_nearby_incidents.csv').open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=list(selected[0]),lineterminator="\n");w.writeheader();w.writerows(selected)
years=[]
for year in range(2014,2026):
 subset=[r for r in selected if int(r['Incident Year'])==year]
 years.append(dict(year=year,records=len(subset),dead=sum(int(r['Number of Dead'] or 0) for r in subset),missing=sum(int(r['Minimum Estimated Number of Missing'] or 0) for r in subset),total=sum(int(r['Total Number of Dead and Missing']) for r in subset)))
# Hashed with LF line endings, as committed, so a Windows checkout with
# autocrlf reproduces the same hash.
summary=dict(source_sha256=hashlib.sha256(SOURCE.read_bytes().replace(b'\r\n',b'\n')).hexdigest(),source_date_min=min(r['Incident Date'] for r in rows),source_date_max=max(r['Incident Date'] for r in rows),reference_point=CENTER,radius_km=50,records=len(selected),total=sum(y['total'] for y in years),years=years,flagged_ids=list(NOTES))
(ROOT/'data/summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(summary,indent=2))
