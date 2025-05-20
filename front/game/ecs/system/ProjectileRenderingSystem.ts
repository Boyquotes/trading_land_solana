import { Entity } from '@shared/entity/Entity'
import { PositionComponent } from '@shared/component/PositionComponent.js'
import { ProjectileComponent } from '@shared/component/ProjectileComponent.js'
import * as THREE from 'three'

export class ProjectileRenderingSystem {
  private projectiles = new Map<number, THREE.Mesh>()
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  update(entities: Entity[]): void {
    // Find all projectile entities
    const projectileEntities = entities.filter(entity => {
      return entity.getComponent(ProjectileComponent) && entity.getComponent(PositionComponent)
    })

    // Update existing projectiles and remove ones that are gone
    const currentProjectileIds = new Set<number>()
    
    for (const entity of projectileEntities) {
      const projectileId = entity.id
      currentProjectileIds.add(projectileId)
      
      const position = entity.getComponent(PositionComponent)!
      const projectile = entity.getComponent(ProjectileComponent)!
      
      // Create a new mesh if it doesn't exist
      if (!this.projectiles.has(projectileId)) {
        this.createProjectileMesh(projectileId, position, projectile)
      } else {
        // Update position of existing mesh
        const mesh = this.projectiles.get(projectileId)!
        mesh.position.set(position.x, position.y, position.z)
      }
    }

    // Remove projectiles that no longer exist
    for (const [id, mesh] of this.projectiles.entries()) {
      if (!currentProjectileIds.has(id)) {
        this.scene.remove(mesh)
        this.projectiles.delete(id)
      }
    }
  }

  private createProjectileMesh(id: number, position: PositionComponent, projectile: ProjectileComponent): void {
    // Create a simple sphere for the projectile
    const geometry = new THREE.SphereGeometry(0.2, 8, 8)
    const material = new THREE.MeshBasicMaterial({
      color: projectile.damage > 10 ? 0xff3333 : 0x3333ff, // Red for heavy, blue for normal
      transparent: true,
      opacity: 0.8
    })
    
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(position.x, position.y, position.z)
    
    // Add a trail effect
    const trailGeometry = new THREE.BufferGeometry()
    const trailMaterial = new THREE.LineBasicMaterial({
      color: projectile.damage > 10 ? 0xff6666 : 0x6666ff,
      transparent: true,
      opacity: 0.6
    })
    
    const trail = new THREE.Line(trailGeometry, trailMaterial)
    mesh.add(trail)
    
    this.scene.add(mesh)
    this.projectiles.set(id, mesh)
  }
}
