import * as THREE from 'three';
// Render copies of repeated mechanical links as GPU instances. The editable assembly
// remains the authority for transforms, picking, export and visibility.
export function batchMachine(machine){
  const root=new THREE.Group(),buckets=new Map(),lines=[];
  const geometryKeys=new WeakMap();
  function geometryKey(g){
    if(geometryKeys.has(g))return geometryKeys.get(g);
    let hash=2166136261;
    const data=new Uint32Array(g.attributes.position.array.buffer);
    for(const n of data){hash^=n;hash=Math.imul(hash,16777619);}
    const key=`${data.length}:${g.index?.count||0}:${hash>>>0}`;geometryKeys.set(g,key);return key;
  }
  machine.root.traverse(o=>{
    if(o.isMesh){const material=o.userData.baseMaterial||o.material,key=geometryKey(o.geometry)+material.uuid;let bucket=buckets.get(key);if(!bucket){bucket={geometry:o.geometry,material,sources:[]};buckets.set(key,bucket);}bucket.sources.push(o);}
    if(o.isLineSegments){const clone=new THREE.LineSegments(o.geometry,o.material);clone.matrixAutoUpdate=false;root.add(clone);lines.push({source:o,clone});}
  });
  const batches=[];
  for(const bucket of buckets.values()){
    const mesh=new THREE.InstancedMesh(bucket.geometry,bucket.material,bucket.sources.length);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
    const ghost=new THREE.InstancedMesh(bucket.geometry,machine.materials.ghost,bucket.sources.length);ghost.instanceMatrix.setUsage(THREE.DynamicDrawUsage);ghost.frustumCulled=false;root.add(ghost);
    batches.push({...bucket,mesh,ghost});
  }
  const zero=new THREE.Matrix4().makeScale(0,0,0);
  function visible(o){while(o){if(!o.visible)return false;o=o.parent;}return true;}
  function update(){
    for(const b of batches){let live=0,ghosts=0;
      for(const s of b.sources){if(!visible(s))continue;if(s.material===machine.materials.ghost)b.ghost.setMatrixAt(ghosts++,s.matrixWorld);else b.mesh.setMatrixAt(live++,s.matrixWorld);}
      b.mesh.count=live;b.mesh.visible=live>0;b.mesh.instanceMatrix.needsUpdate=true;
      b.ghost.count=ghosts;b.ghost.visible=ghosts>0;b.ghost.instanceMatrix.needsUpdate=true;
    }
    for(const {source,clone}of lines){clone.visible=visible(source);clone.matrix.copy(source.matrixWorld);}
  }
  update();return{root,update,batches};
}
