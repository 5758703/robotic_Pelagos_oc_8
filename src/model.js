import parameters from './parameters.json' with { type: 'json' };
export const P = Object.freeze(parameters);
export const TAU = Math.PI * 2;
export const wrap = p => ((p % 1) + 1) % 1;
export function stateAt(phase, current=0) {
  if (!Number.isFinite(phase)) throw new TypeError('phase must be finite');
  if (!Number.isFinite(current)) throw new TypeError('current must be finite');
  current=Math.max(0,Math.min(P.currentMax,current));
  const normalized=current/P.currentMax;
  const area=Math.PI*P.nozzleDiameter**2/4;
  const basePeak=P.density*(P.displacement*Math.PI/P.period)**2/area;
  const drag=.5*P.density*P.currentDragCoefficient*P.currentDragArea*current**2;
  const meanThrust=basePeak/4+drag;
  const flowGain=Math.sqrt(4*meanThrust/basePeak);
  const strokeGain=1+P.currentStrokeGain*normalized**2;
  const displacement=P.displacement*strokeGain,period=P.period*strokeGain/flowGain;
  const peakThrust=basePeak*flowGain**2;
  const peakPressure=peakThrust/(2*P.discharge**2*area);
  const p=wrap(phase), wave=Math.sin(TAU*p), x=(1-Math.cos(TAU*p))/2;
  const maxVolume=4*Math.PI*P.innerAxes.reduce((a,b)=>a*b,1)/3;
  const volume=maxVolume-displacement*x;
  const flow=Math.max(0,displacement*Math.PI/period*wave);
  const refill=Math.max(0,-displacement*Math.PI/period*wave);
  const velocity=flow/area;
  return { current,period,frequency:1/period,displacement,drag,meanThrust,peakThrust,peakPressure,strokeGain,flowGain,
    sway:P.currentSway*normalized**1.5*(.65+.35*Math.sin(TAU*p)),phase:p, x, volume, maxVolume, flow, refill, velocity,
    pressure:P.density*(flow/(P.discharge*area))**2/2,
    thrust:P.density*flow*velocity, scale:Math.sqrt(volume/maxVolume),
    piston:.018*strokeGain*x, ringAngle:20*strokeGain*x*Math.PI/180, valve:Math.max(0,wave),
    optics:8*wave*Math.PI/180,
    curls:Array.from({length:P.armCount},(_,i)=>P.curlBase+P.curlStroke*x+(P.curlWave+.025*normalized**2)*Math.sin(TAU*p+i*Math.PI/4)),
    stage:flow>1e-8?'JET / 喷射':refill>1e-8?'REFILL / 补水':'DWELL / 换向'
  };
}
export function armPoints(index,phase,current=0) {
  const s=stateAt(phase,current), a=index*TAU/P.armCount+Math.PI/8;
  const points=[], root=[Math.sin(a)*P.armRoot,P.armY,Math.cos(a)*P.armRoot];
  points.push(root);
  for(let j=0;j<P.segments;j++) {
    const u=(j+.5)/P.segments;
    const bend=P.armStartAngle+s.curls[index]*P.armBend*u*u;
    const length=P.armLengths[j], last=points.at(-1);
    const azimuth=a-s.sway*Math.sin(a)*u*u;
    points.push([last[0]+Math.sin(azimuth)*Math.cos(bend)*length,last[1]+Math.sin(bend)*length,last[2]+Math.cos(azimuth)*Math.cos(bend)*length]);
  }
  return points;
}
export function pressureHistory(phase, samples=65, current=0) {
  const {period}=stateAt(phase,current);
  return Array.from({length:samples},(_,i)=>stateAt(phase-(1-i/(samples-1))*P.historySeconds/period,current).pressure);
}
export const peak = stateAt(.25);
