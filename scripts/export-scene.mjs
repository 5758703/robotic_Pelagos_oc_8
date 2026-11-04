import {createMachine} from '../src/machine.js';
import {stateAt,P} from '../src/model.js';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const machine=createMachine();machine.update(stateAt(.25),{mode:'exploded',explode:.85,wake:false});
const geometry={},materials={},objects=[],canonical=new Map(),geometryIds=new Map();
machine.root.traverse(o=>{
  if(o.isLineSegments)return;
  if(o.isMesh){
    const g=o.geometry;
    if(!geometryIds.has(g.uuid)){
      const hash=createHash('sha256').update(Buffer.from(g.attributes.position.array.buffer));
      if(g.index)hash.update(Buffer.from(g.index.array.buffer));
      const key=hash.digest('hex'),id=canonical.get(key)||g.uuid;canonical.set(key,id);geometryIds.set(g.uuid,id);
      if(!geometry[id])geometry[id]={positions:Array.from(g.attributes.position.array),indices:g.index?Array.from(g.index.array):null};
    }
    const m=o.material;if(!materials[m.uuid])materials[m.uuid]={name:Object.entries(machine.materials).find(([,v])=>v===m)?.[0]||m.name,color:[m.color.r,m.color.g,m.color.b,1],roughness:m.roughness??.5,metalness:m.metalness??0,alpha:m.opacity,transmission:m.transmission??0};
  }
  objects.push({id:o.uuid,parent:o.parent?.uuid,name:o.name,geometry:geometryIds.get(o.geometry?.uuid),material:o.material?.uuid,matrix:o.matrix.toArray(),visible:o.visible,subsystem:o.userData.subsystem});
});
await fs.writeFile('blender/scene-data.json',JSON.stringify({parameters:P,phase:.25,explode:.85,geometry,materials,objects}));
console.log(`Exported ${objects.length} objects, ${Object.keys(geometry).length} geometry blocks`);
