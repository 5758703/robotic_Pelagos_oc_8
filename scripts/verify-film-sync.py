import json,pathlib
folder=pathlib.Path('artifacts/film')
t=json.loads((folder/'timeline.json').read_text())
assert len(t['frames'])==1200
clicks=[c for c in t['cues'] if c['kind']=='click'];pops=[c for c in t['cues'] if c['kind']=='separation']
assert len(clicks)==24 and len(pops)==1
pulses=sum(t['frames'][i-1]['valve']==0 and s['valve']>0 for i,s in enumerate(t['frames']) if i>0)
assert all(abs(s['time']-i/30)<1e-9 for i,s in enumerate(t['frames']))
report={'frames':1200,'fps':30,'durationSeconds':40,'buttonClicks':len(clicks),'separationPops':len(pops),'separationTimes':[p['time'] for p in pops],'newJetPulseOnsets':pulses,'startsDuringJetPulse':t['frames'][0]['valve']>0,'browserErrors':t['errors']}
(folder/'sync-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
