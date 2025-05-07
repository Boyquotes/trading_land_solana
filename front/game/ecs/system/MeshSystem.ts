import { Renderer } from '@/game/Renderer.js'
import { Entity } from '@shared/entity/Entity.js'
import { EventSystem } from '@shared/system/EventSystem.js'
import { MeshComponent } from '../component/MeshComponent.js'
import { ComponentAddedEvent } from '@shared/component/events/ComponentAddedEvent.js'
import { ComponentRemovedEvent } from '@shared/component/events/ComponentRemovedEvent.js'
import * as THREE from 'three'
import { PositionComponent } from '@shared/component/PositionComponent.js'
import { RotationComponent } from '@shared/component/RotationComponent.js'
import { EntityManager } from '@shared/system/EntityManager.js'

export class MeshSystem {
  update(entities: Entity[], renderer: Renderer) {
    this.handleAddedMeshes(entities, renderer)
    this.handleRemovedMeshes(renderer)
  }

  private handleAddedMeshes(entities: Entity[], renderer: Renderer) {
    const addedMeshEvents = EventSystem.getEventsWrapped(ComponentAddedEvent, MeshComponent)

    for (const addedEvent of addedMeshEvents) {
      const entity = EntityManager.getEntityById(entities, addedEvent.entityId)
      if (!entity) {
        console.error('MeshSystem: Entity not found')
        continue
      }

      const meshComponent = addedEvent.component
      // Apply texture if TextureComponent is present
      // Import TextureComponent directly for type checking
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { TextureComponent } = require('../component/TextureComponent')
      const textureComponent = entity.getComponent(TextureComponent) as typeof TextureComponent | undefined
      if (textureComponent && typeof textureComponent.textureUrl === 'string' && textureComponent.textureUrl.length > 0) {
        const loader = new THREE.TextureLoader();
        const url = textureComponent.textureUrl;
        console.log('[MeshSystem] Attempting to load texture URL:', url);
        loader.load(
          url,
          (texture) => {
            console.log('[MeshSystem] Successfully loaded texture:', url);
            meshComponent.mesh.traverse((child: THREE.Object3D) => {
              if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({ map: texture });
                const mat = (child as THREE.Mesh).material;
                if (mat && !(Array.isArray(mat))) {
                  mat.needsUpdate = true;
                }
              }
            });
          },
          undefined,
          async (err) => {
            console.error('[MeshSystem] Failed to load cube texture:', url, err);
            // Try to download the image locally to /public/logo and use the local path
            try {
              // Extract filename from URL
              const filename = url.split('/').pop() || 'fallback.png';
              const localPath = `/logo/${filename}`;
              // Try to fetch the image and save it locally (server-side API or endpoint required)
              // For now, try to load from localPath directly
              loader.load(
                localPath,
                (localTexture) => {
                  console.log('[MeshSystem] Loaded fallback local texture:', localPath);
                  meshComponent.mesh.traverse((child: THREE.Object3D) => {
                    if ((child as THREE.Mesh).isMesh) {
                      (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({ map: localTexture });
                      const mat = (child as THREE.Mesh).material;
                      if (mat && !(Array.isArray(mat))) {
                        mat.needsUpdate = true;
                      }
                    }
                  });
                },
                undefined,
                (localErr) => {
                  console.error('[MeshSystem] Failed to load local fallback texture:', localPath, localErr);
                  // Fallback to wallet-phantom.png
                  const phantomPath = '/wallet-phantom.png';
                  loader.load(
                    phantomPath,
                    (phantomTexture) => {
                      console.log('[MeshSystem] Loaded ultimate fallback texture:', phantomPath);
                      meshComponent.mesh.traverse((child: THREE.Object3D) => {
                        if ((child as THREE.Mesh).isMesh) {
                          (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({ map: phantomTexture });
                          const mat = (child as THREE.Mesh).material;
                          if (mat && !(Array.isArray(mat))) {
                            mat.needsUpdate = true;
                          }
                        }
                      });
                    },
                    undefined,
                    (phantomErr) => {
                      console.error('[MeshSystem] Failed to load wallet-phantom fallback texture:', phantomPath, phantomErr);
                    }
                  );
                }
              );
            } catch (downloadErr) {
              console.error('[MeshSystem] Error during local fallback logic:', downloadErr);
            }
          }
        );
      }
      this.updateMeshTransform(entity, meshComponent)
      this.addMeshToScene(meshComponent, renderer)
    }
  }

  private handleRemovedMeshes(renderer: Renderer) {
    const removedMeshEvents = EventSystem.getEventsWrapped(ComponentRemovedEvent, MeshComponent)

    for (const removedEvent of removedMeshEvents) {
      const meshComponent = removedEvent.component
      renderer.scene.remove(meshComponent.mesh)
    }
  }

  private updateMeshTransform(entity: Entity, meshComponent: MeshComponent) {
    const positionComponent = entity.getComponent(PositionComponent)
    if (positionComponent) {
      meshComponent.mesh.position.set(positionComponent.x, positionComponent.y, positionComponent.z)
    }

    const rotationComponent = entity.getComponent(RotationComponent)
    if (rotationComponent) {
      meshComponent.mesh.quaternion.set(
        rotationComponent.x,
        rotationComponent.y,
        rotationComponent.z,
        rotationComponent.w
      )
    }
  }

  private addMeshToScene(meshComponent: MeshComponent, renderer: Renderer) {
    console.log('MeshSystem: Adding mesh to scene')
    this.activateShadows(meshComponent)
    renderer.scene.add(meshComponent.mesh)
  }

  private activateShadows(meshComponent: MeshComponent) {
    const object3D = meshComponent.mesh
    object3D.castShadow = true
    object3D.receiveShadow = true

    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.metalness = 0
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }
}
