import { Entity } from '../../../../shared/entity/Entity.js'
import { EntityManager } from '../../../../shared/system/EntityManager.js'
import { ProjectileComponent } from '../../../../shared/component/ProjectileComponent.js'
import { PositionComponent } from '../../../../shared/component/PositionComponent.js'
import { EventSystem } from '../../../../shared/system/EventSystem.js'
import { HealthComponent } from '../../../../shared/component/HealthComponent.js'

export class ProjectileSystem {
  private projectileSpeed = 20.0
  private projectileLifetime = 2000 // milliseconds
  private projectiles = new Map<number, number>() // projectileId -> spawnTime

  update(entities: Entity[], dt: number): void {
    const currentTime = Date.now()
    const entitiesToRemove: number[] = []

    for (const entity of entities) {
      const projectile = entity.getComponent(ProjectileComponent)
      const position = entity.getComponent(PositionComponent)

      if (!projectile || !position) continue

      // Skip if projectile is inactive
      if (!projectile.isActive) continue

      // Check if projectile has exceeded its lifetime
      const spawnTime = this.projectiles.get(entity.id) || currentTime
      if (currentTime - spawnTime > this.projectileLifetime) {
        projectile.isActive = false
        entitiesToRemove.push(entity.id)
        continue
      }

      // Calculate movement
      const distance = projectile.speed * (dt / 1000) // Convert dt to seconds
      position.x += projectile.direction.x * distance
      position.y += projectile.direction.y * distance
      position.z += projectile.direction.z * distance

      // Update distance traveled
      projectile.distanceTraveled += distance

      // Check if projectile has reached max distance
      if (projectile.distanceTraveled >= projectile.maxDistance) {
        projectile.isActive = false
        entitiesToRemove.push(entity.id)
        continue
      }

      // Check for collisions
      this.checkCollisions(entity, projectile, position)
    }


  }

  private checkCollisions(projectileEntity: Entity, projectile: ProjectileComponent, position: any) {
    const potentialTargets = EntityManager.getInstance()
      .getAllEntities()
      .filter(e => e.id !== projectile.ownerId) // Can't hit self
      .filter(e => e.id !== projectileEntity.id) // Can't hit other projectiles
      .filter(e => e.getComponent(PositionComponent))
      .filter(e => e.getComponent(HealthComponent))

    for (const target of potentialTargets) {
      const targetPos = target.getComponent(PositionComponent)!
      const distance = Math.sqrt(
        Math.pow(position.x - targetPos.x, 2) +
        Math.pow(position.y - targetPos.y, 2) +
        Math.pow(position.z - targetPos.z, 2)
      )

      // Simple collision check (you might want to use a more sophisticated method)
      if (distance < 1.5) { // Assuming a hit radius of 1.5 units
        // Apply damage
        const health = target.getComponent(HealthComponent)!
        health.takeDamage(projectile.damage)
        
        console.log(`[Projectile] Hit entity ${target.id} for ${projectile.damage} damage`)
        
        // Deactivate projectile
        projectile.isActive = false
        break
      }
    }
  }
}
