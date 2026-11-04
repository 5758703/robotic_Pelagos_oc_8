export const beats = [
  {name:'全貌 / System overview', camera:'hero', subsystem:'all', mode:'assembled', target:'view-hero'},
  {name:'喷射 / Jet cycle', camera:'front', subsystem:'siphon', mode:'assembled', target:'sub-siphon'},
  {name:'外套膜 / Mantle service', camera:'hero', subsystem:'mantle', mode:'exploded', target:'mode-exploded'},
  {name:'视觉 / Optic array', camera:'front', subsystem:'optics', mode:'solo', target:'sub-optics'},
  {name:'臂链 / Arm kinematics', camera:'top', subsystem:'arm2', mode:'solo', target:'sub-arm2'},
  {name:'虹吸 / Flow path', camera:'side', subsystem:'siphon', mode:'cut', target:'sub-siphon'},
  {name:'腹侧 / Beak assembly', camera:'underside', subsystem:'beak', mode:'assembled', target:'view-underside'},
  {name:'复位 / Return to station', camera:'hero', subsystem:'all', mode:'assembled', target:'reset'}
];
export const beatSeconds=5;
export const tourDuration=beats.length*beatSeconds;
export function tourAt(time) {
  const t=((time%tourDuration)+tourDuration)%tourDuration;
  const index=Math.floor(t/beatSeconds);
  return {index,progress:t/tourDuration,local:t-index*beatSeconds,beat:beats[index]};
}
