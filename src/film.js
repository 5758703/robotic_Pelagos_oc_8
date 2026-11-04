// A reproducible current demonstration for the scored 40-second tour.
// The visitor's slider stays independent of this export-only automation.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function filmCurrent(t){return .3+2.7*smooth((t-5)/4)-3*smooth((t-33)/5);}
