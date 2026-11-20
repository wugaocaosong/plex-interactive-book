import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/** The generated asset is served with the book; no remote model API runs in the browser. */
export async function loadLittleE(height=6.2):Promise<T.Group>{
  const {scene}=await new GLTFLoader().loadAsync('/brand/little-e-3d/model.glb');
  const bounds=new T.Box3().setFromObject(scene),size=bounds.getSize(new T.Vector3());
  if(!Number.isFinite(size.y)||size.y<=0){disposeLittleE(scene);throw new Error('Invalid Little E bounds');}
  const center=bounds.getCenter(new T.Vector3());
  scene.position.sub(center);
  const orient=new T.Group();orient.add(scene);orient.rotation.y=-Math.PI/2;
  const root=new T.Group();root.name='little-e-model';root.add(orient);root.scale.setScalar(height/size.y);
  root.traverse(object=>{if(object instanceof T.Mesh){object.raycast=()=>{};object.frustumCulled=false;}});
  return root;
}

export function disposeLittleE(root:T.Object3D){
  const textures=new Set<T.Texture>(),materials=new Set<T.Material>(),geometries=new Set<T.BufferGeometry>();
  root.traverse(object=>{if(!(object instanceof T.Mesh))return;geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){materials.add(material);Object.values(material).forEach(value=>{if(value instanceof T.Texture)textures.add(value);});}});
  textures.forEach(texture=>{const image=texture.source.data;if(typeof ImageBitmap!=='undefined'&&image instanceof ImageBitmap)image.close();texture.dispose();});
  materials.forEach(material=>material.dispose());geometries.forEach(geometry=>geometry.dispose());root.removeFromParent();
}
