import bpy, math, json, pathlib
from mathutils import Vector
base=pathlib.Path(__file__).resolve().parent
p=json.loads((base/'scene-data.json').read_text(encoding='utf-8-sig'))['parameters']
scene=bpy.context.scene
errors=[];max_error=0;max_joint_error=0
for phase in [0,.25,.5,.75,1]:
 scene.frame_set(round(1+phase*144));bpy.context.view_layer.update()
 deps=bpy.context.evaluated_depsgraph_get()
 for i in range(8):
  a=i*2*math.pi/8+math.pi/8
  curl=p['curlBase']+p['curlStroke']*(1-math.cos(2*math.pi*phase))/2+p['curlWave']*math.sin(2*math.pi*phase+i*math.pi/4)
  r=p['armRoot'];h=p['armY']
  for j in range(12):
   obj=bpy.data.objects[f'arm{i+1}_segment{j+1}'].evaluated_get(deps)
   expected=Vector((math.sin(a)*r,-math.cos(a)*r,h));actual=obj.matrix_world.translation
   max_error=max(max_error,(actual-expected).length)
   if j<11:
    tip=obj.matrix_world@Vector((0,0,p['armLengths'][j]))
    nxt=bpy.data.objects[f'arm{i+1}_segment{j+2}'].evaluated_get(deps).matrix_world.translation
    max_joint_error=max(max_joint_error,(tip-nxt).length)
   bend=p['armStartAngle']+p['armBend']*((j+.5)/12)**2*curl
   r+=p['armLengths'][j]*math.cos(bend);h+=p['armLengths'][j]*math.sin(bend)
 for obj in bpy.data.objects:
  if obj.animation_data:
   for driver in obj.animation_data.drivers:
    if not driver.driver.is_valid:errors.append(obj.name+': '+driver.data_path)
report={'objects':len(bpy.data.objects),'invalidDrivers':errors,'maxPositionErrorMeters':max_error,'maxJointErrorMeters':max_joint_error,'testedPhases':[0,.25,.5,.75,1]}
(base.parent/'artifacts'/'blender-validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
assert not errors,errors[:5]
assert max_error<1e-5,max_error
assert max_joint_error<1e-5,max_joint_error
print('BLENDER VALIDATION PASSED')
