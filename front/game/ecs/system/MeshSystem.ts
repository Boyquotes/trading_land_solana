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

// --- Sound Management ---
const globalPlayingSounds: HTMLAudioElement[] = (window as any)._globalPlayingSounds || [];
(window as any)._globalPlayingSounds = globalPlayingSounds;
// Global mute flag
(window as any)._soundsMuted = (window as any)._soundsMuted || false;
// Flag to prevent sounds on initial load
(window as any)._initialLoadComplete = (window as any)._initialLoadComplete || false;
// Set initial load complete after a short delay
if (typeof window !== 'undefined' && !(window as any)._initialLoadComplete) {
  setTimeout(() => {
    console.log('[Sound Debug] Initial load complete, sounds will play on future events');
    (window as any)._initialLoadComplete = true;
  }, 3000); // 3 seconds delay
}
// Listen to mute state from GameHud
if (typeof window !== 'undefined') {
  window.addEventListener('setMuteState', (e: any) => {
    console.log('[Sound Debug] MeshSystem received mute state:', e.detail);
    (window as any)._soundsMuted = e.detail;
    if (e.detail) {
      console.log('[Sound Debug] Stopping all sounds');
      if (typeof window.stopAllSounds === 'function') window.stopAllSounds();
    }
  });
}

function stopAllSounds() {
  console.log('[Sound Debug] stopAllSounds called, active sounds:', globalPlayingSounds.length);
  globalPlayingSounds.forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });
  globalPlayingSounds.length = 0;
  (window as any)._soundsMuted = true;
  console.log('[Sound Debug] All sounds stopped, muted state:', (window as any)._soundsMuted);
}
(window as any).stopAllSounds = stopAllSounds;
// --- End Sound Management ---

      // Play sound for each spawned box
      console.log('[Sound Debug] Attempting to play sound, muted state:', (window as any)._soundsMuted, 'initial load complete:', (window as any)._initialLoadComplete);
      // Only play if not muted AND initial load is complete
      if (!(window as any)._soundsMuted && (window as any)._initialLoadComplete) {
        try {
          const audio = new window.Audio('/audio/gling_gling_coin.wav');
          audio.currentTime = 0;
          audio.play().catch((e) => {
            // Some browsers may block autoplay
            console.warn('Unable to play gling_gling_coin.wav:', e);
          });
          globalPlayingSounds.push(audio);
          audio.addEventListener('ended', () => {
            const idx = globalPlayingSounds.indexOf(audio);
            if (idx > -1) globalPlayingSounds.splice(idx, 1);
          });
        } catch (err) {
          console.error('Failed to play gling_gling_coin.wav:', err);
        }
      }
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
