import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'

export class LoadManager {
  private static instance: LoadManager
  private cache = new Map<string, THREE.Mesh>()
  dracoLoader = new DRACOLoader()
  gltfLoader = new GLTFLoader()

  private constructor() {
    this.dracoLoader.setDecoderPath('/draco/') // Replace with the actual path to the Draco decoder
    this.gltfLoader.setDRACOLoader(this.dracoLoader)
    
    // Log that we're initializing the loader
    console.log('[LoadManager] Initialized GLTFLoader - Note: KHR_materials_pbrSpecularGlossiness warnings may appear but models will still load')
  }

  static getInstance(): LoadManager {
    if (!LoadManager.instance) {
      LoadManager.instance = new LoadManager()
    }
    return LoadManager.instance
  }

  static glTFLoad(path: string): Promise<THREE.Mesh> {
    const instance = LoadManager.getInstance()

    // // Check if the mesh is already in the cache
    if (instance.cache.has(path)) {
      const cachedMesh = instance.cache.get(path)!
      const clonedMesh = instance.cloneMesh(cachedMesh)
      return Promise.resolve(clonedMesh)
    }

    // If not, load the model and store the mesh in the cache
    return new Promise((resolve, reject) => {
      instance.gltfLoader.load(
        path,
        (gltf) => {
          // Extract the first mesh from the loaded model
          const mesh = instance.extractMesh(gltf)
          if (mesh) {
            // Cache the original mesh
            instance.cache.set(path, mesh)
            // Resolve with a clone of the mesh
            const clonedMesh = instance.cloneMesh(mesh)
            resolve(clonedMesh)
          } else {
            reject(new Error('No mesh found in the GLTF model'))
          }
        },
        // called as loading progresses
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        // called when loading has errors
        (error) => {
          console.error('An error happened', error)
          reject(error)
        }
      )
    })
  }

  private cloneMesh(mesh: THREE.Mesh): THREE.Mesh {
    const clonedMesh = SkeletonUtils.clone(mesh)
    clonedMesh.animations = mesh.animations
    // Clone materials to avoid sharing the same material instance
    clonedMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material
        if (Array.isArray(material)) {
          child.material = material.map((m) => m.clone())
        } else {
          child.material = material.clone()
        }
      }
    })
    return clonedMesh as THREE.Mesh
  }

  private extractMesh(gltf: any): THREE.Mesh | null {
    let mesh: THREE.Mesh = new THREE.Mesh()
    mesh.add(gltf.scene)
    mesh.animations = gltf.animations
    
    // Apply fallback materials for models with unsupported extensions or missing textures
    this.applyFallbackMaterials(mesh);
    
    return mesh
  }
  
  /**
   * Applies fallback materials to models with missing textures or unsupported extensions
   * This helps with models that use KHR_materials_pbrSpecularGlossiness or other unsupported features
   */
  private applyFallbackMaterials(mesh: THREE.Mesh): void {
    // Check if the model has any mesh children
    let hasMeshChildren = false;
    
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        hasMeshChildren = true;
        
        // Check if material is missing or has errors
        if (!child.material || child.material.userData?.hasErrors) {
          console.log('[LoadManager] Applying fallback material to mesh with missing or error materials');
          
          // Create a basic material with a random color
          const color = new THREE.Color(Math.random() * 0xffffff);
          child.material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.7,
            metalness: 0.3
          });
        }
        
        // If this is a model with KHR_materials_pbrSpecularGlossiness extension
        // We can detect this by checking for warnings in the console or material properties
        if (child.material && (child.material as any).specularMap) {
          console.log('[LoadManager] Converting specular-glossiness material to standard material');
          
          // Keep the existing color but update the material type
          const color = child.material.color ? child.material.color : new THREE.Color(0x808080);
          child.material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.5,  // Default roughness
            metalness: 0.5   // Default metalness
          });
        }
      }
    });
    
    // If no mesh children were found, add a default cube as a fallback
    if (!hasMeshChildren) {
      console.log('[LoadManager] No mesh children found, adding fallback cube');
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0xff00ff });
      const cube = new THREE.Mesh(geometry, material);
      mesh.add(cube);
    }
  }
}
