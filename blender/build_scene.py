"""Create editable Blender source from the exact Three.js procedural assembly.
Run: blender --background --python blender/build_scene.py
All dimensions are estimates, SI units. Geometry and phase drivers are editable.
"""
import bpy, json, math, pathlib
from mathutils import Matrix, Vector
HERE=pathlib.Path(__file__).resolve().parent
D=json.loads((HERE/'scene-data.json').read_text(encoding='utf-8-sig'))
P=D['parameters']
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=1
B=Matrix.Rotation(math.pi/2,4,'X')
BI=B.inverted()
materials={}
for key,d in D['materials'].items():
    mat=bpy.data.materials.new(d['name']);mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=d['color']
    bsdf.inputs['Metallic'].default_value=d['metalness']
    bsdf.inputs['Roughness'].default_value=d['roughness']
    bsdf.inputs['Transmission Weight'].default_value=d['transmission']
    if d['name']=='glass': bsdf.inputs['Alpha'].default_value=.3
    materials[key]=mat
geometries={}
for key,d in D['geometry'].items():
    v=d['positions'];verts=[B.to_3x3()@Vector(v[i:i+3]) for i in range(0,len(v),3)]
    ids=d['indices'] or list(range(len(verts)))
    faces=[ids[i:i+3] for i in range(0,len(ids),3)]
    me=bpy.data.meshes.new(key);me.from_pydata(verts,[],faces);me.update()
    for poly in me.polygons:poly.use_smooth=True
    geometries[key]=me
objects={}
for d in D['objects']:
    mesh=geometries.get(d.get('geometry'))
    # Copy only mesh datablock when a material differs; instances still share geometry otherwise.
    o=bpy.data.objects.new(d['name'] or 'Assembly',mesh)
    scene.collection.objects.link(o);objects[d['id']]=o
    if d.get('parent') in objects:o.parent=objects[d['parent']]
    a=d['matrix'];m=Matrix([a[i::4] for i in range(4)])
    o.matrix_local=B@m@BI
    if mesh and d.get('material'):
        if len(mesh.materials)==0:mesh.materials.append(materials[d['material']])
        o.material_slots[0].link='OBJECT';o.material_slots[0].material=materials[d['material']]
    o.hide_render=not d['visible']
    if d.get('subsystem'):o['subsystem']=d['subsystem']
    o['source']='my guess; procedural reconstruction, not measured hardware'
root=objects[D['objects'][0]['id']]
root['jet_phase']=.25;root['service_open']=.85
root.id_properties_ui('jet_phase').update(min=0,max=1,description='Only physical input. 0..1 jet phase, period 2.4 seconds.')
root.id_properties_ui('service_open').update(min=0,max=1,description='Presentation only: opens the shell for service inspection.')
def driver(obj,path,index,expr,var='p',prop='jet_phase'):
    dr=obj.driver_add(path,index).driver;dr.type='SCRIPTED'
    v=dr.variables.new();v.name=var;v.type='SINGLE_PROP';v.targets[0].id=root;v.targets[0].data_path='["'+prop+'"]'
    assert len(expr)<255, (obj.name, len(expr))
    dr.expression=expr
x='(1-cos(2*pi*p))/2'
volume=4*math.pi*.14*.14*.16/3
scale=f'sqrt(1-{P["displacement"]}/{volume}*({x}))'
for d in D['objects']:
    o=objects[d['id']];name=d['name']
    if name=='mantle':
        driver(o,'scale',0,scale);driver(o,'scale',1,scale)
    elif name.startswith('hinge_'):
        o.rotation_mode='XYZ';driver(o,'rotation_euler',0,f'e*{P["shellOpenAngle"]*math.pi/180}','e','service_open')
    elif name=='lid':driver(o,'location',2,f'.747+e*{P["lidLift"]}','e','service_open')
    elif name=='core':driver(o,'location',2,f'e*{P["coreLift"]}','e','service_open')
    elif name=='glass pressure liner':
        driver(o,'scale',0,'.14*'+scale);driver(o,'scale',1,'.14*'+scale)
    elif name=='valve':driver(o,'scale',0,'1-.3*max(0,sin(2*pi*p))')
    elif name=='rotor':
        o.rotation_mode='XYZ';driver(o,'rotation_euler',2,f'{20*math.pi/180}*({x})')
    elif name.startswith('piston_'):driver(o,'location',2,'.018*'+x)
    elif name.startswith('optic_'):
        sign=int(name.split('_')[-1]);o.rotation_mode='XYZ'
        driver(o,'rotation_euler',2,f'{sign*.42}+{sign*8*math.pi/180}*sin(2*pi*p)')
        driver(o,'location',1,'-.133-e*.06','e','service_open')
    elif name.startswith('arm') and '_segment' in name:
        first,second=name.split('_segment');i=int(first[3:])-1;j=int(second)-1
        a=i*2*math.pi/8+math.pi/8
        def native(path,expr,refs,index=None):
            curve=o.driver_add(path) if index is None else o.driver_add(path,index)
            dr=curve.driver;dr.type='SCRIPTED'
            for key,target,prop in refs:
                v=dr.variables.new();v.name=key;v.type='SINGLE_PROP'
                v.targets[0].id=target;v.targets[0].data_path='["'+prop+'"]'
            assert len(expr)<255
            dr.expression=expr
        o['bend']=0.0;o['radial']=P['armRoot'];o['height']=P['armY']
        curl=f'({P["curlBase"]}+{P["curlStroke"]}*(1-cos(2*pi*p))/2+{P["curlWave"]}*sin(2*pi*p+{i*math.pi/4:.9f}))'
        native('["bend"]',f'{P["armStartAngle"]}+{P["armBend"]*((j+.5)/12)**2:.12f}*{curl}', [('p',root,'jet_phase')])
        if j:
            previous=bpy.data.objects[f'arm{i+1}_segment{j}']
            length=P['armLengths'][j-1]
            native('["radial"]',f'r+{length}*cos(b)', [('r',previous,'radial'),('b',previous,'bend')])
            native('["height"]',f'h+{length}*sin(b)', [('h',previous,'height'),('b',previous,'bend')])
        native('location',f'{math.sin(a):.12f}*r',[('r',o,'radial')],0)
        native('location',f'{-math.cos(a):.12f}*r',[('r',o,'radial')],1)
        native('location','h',[('h',o,'height')],2)
        o.rotation_mode='QUATERNION'
        half='((pi/2-b)/2)'
        native('rotation_quaternion',f'{-math.sin(a/2):.12f}*cos({half})',[('b',o,'bend')],0)
        native('rotation_quaternion',f'{math.sin(a/2):.12f}*sin({half})',[('b',o,'bend')],1)
        native('rotation_quaternion',f'{-math.cos(a/2):.12f}*sin({half})',[('b',o,'bend')],2)
        native('rotation_quaternion',f'{math.cos(a/2):.12f}*cos({half})',[('b',o,'bend')],3)
# One phase property is the only animated physical driver; no hand-authored part animation.
root['jet_phase']=0.0;root.keyframe_insert(data_path='["jet_phase"]',frame=1)
root['jet_phase']=1.0;root.keyframe_insert(data_path='["jet_phase"]',frame=145)
if root.animation_data:
    action=root.animation_data.action
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for fcurve in bag.fcurves:
                    for key in fcurve.keyframe_points:key.interpolation='LINEAR'
scene.frame_start=1;scene.frame_end=145;scene.render.fps=60;scene.frame_set(37)
# Studio camera and lighting.
def track(o,point):o.rotation_euler=(Vector(point)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1.35,-1.85,1.38));camera=bpy.context.object;camera.name='Hero camera';camera.data.lens=48;track(camera,(0,0,.34));scene.camera=camera
for name,location,power,size in [('Key softbox',(-1.5,-2,3),180,3),('Fill softbox',(2,1,2),90,2)]:
    bpy.ops.object.light_add(type='AREA',location=location);light=bpy.context.object;light.name=name;light.data.energy=power;light.data.shape='DISK';light.data.size=size;track(light,(0,0,.3))
scene.world.color=(.55,.58,.52)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,P['floorY']));floor=bpy.context.object;floor.name='Studio ground'
mat=bpy.data.materials.new('Studio paper');mat.diffuse_color=(.85,.88,.82,1);floor.data.materials.append(mat)
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
notes=bpy.data.texts.new('READ ME — Model provenance')
notes.write('Pelagos OC-8. All dimensions are MY GUESS. Source: user supplied octopus reference.\nSI units. Root object custom properties: jet_phase (physical), service_open (presentation).\nAll mesh transforms derive from the same phase equations as src/model.js.\nEditable geometry, materials, assembly hierarchy and native expression drivers. No external scripts required for playback.\n')
source=bpy.data.texts.new('build_scene.py');source.write(pathlib.Path(__file__).read_text(encoding='utf-8-sig'))
# Make a useful initial viewport.
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_distance=2.7
            area.spaces.active.region_3d.view_location=(0,0,.35)
            area.spaces.active.shading.type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT');root.select_set(True);bpy.context.view_layer.objects.active=root
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'Pelagos_OC8.blend'))
print('SAVED_BLEND',len(objects),'objects')
