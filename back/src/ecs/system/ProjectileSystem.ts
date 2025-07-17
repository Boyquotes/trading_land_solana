import { Entity } from '../../../../shared/entity/Entity.js'
import { InputComponent } from '../component/InputComponent.js'
import { PositionComponent } from '../../../../shared/component/PositionComponent.js'
import { RotationComponent } from '../../../../shared/component/RotationComponent.js'
import { ProjectileComponent } from '../../../../shared/component/ProjectileComponent.js'
import { HealthComponent } from '../../../../shared/component/HealthComponent.js'
import { PlayerComponent } from '../../../../shared/component/PlayerComponent.js'
import { EntityManager } from '../../../../shared/system/EntityManager.js'
import { SerializedEntityType } from '../../../../shared/network/server/serialized.js'
import { NetworkDataComponent } from '../../../../shared/network/NetworkDataComponent.js'
import { SphereColliderComponent } from '../component/physics/SphereColliderComponent.js'
import { DynamicRigidBodyComponent } from '../component/physics/DynamicRigidBodyComponent.js'
import { ServerMeshComponent } from '../../../../shared/component/ServerMeshComponent.js'
import { ColorComponent } from '../../../../shared/component/ColorComponent.js'
import { SingleSizeComponent } from '../../../../shared/component/SingleSizeComponent.js'
import { EventSystem } from '../../../../shared/system/EventSystem.js'
import { EntityDestroyedEvent } from '../../../../shared/component/events/EntityDestroyedEvent.js'

/**
 * System responsible for handling projectile firing, movement, collision, and cleanup.
 */
export class ProjectileSystem {
  private lastFireTime = new Map<number, number>() // Track last fire time per player
  private fireRate = 500 // Minimum time between shots in milliseconds

  /**
   * Updates all projectiles and handles projectile firing.
   */
  update(dt: number, entities: Entity[]): void {
    // Handle projectile firing for all players
    this.handleProjectileFiring(entities)
    
    // Update all existing projectiles
    this.updateProjectiles(dt, entities)
    
    // Check for projectile collisions
    this.checkProjectileCollisions(entities)
  }

  /**
   * Handles projectile firing for all players with input.
   */
  private handleProjectileFiring(entities: Entity[]): void {
    const currentTime = Date.now()
    
    for (const entity of entities) {
      const inputComponent = entity.getComponent(InputComponent)
      const positionComponent = entity.getComponent(PositionComponent)
      const playerComponent = entity.getComponent(PlayerComponent)
      const healthComponent = entity.getComponent(HealthComponent)
      
      // Skip if not a player or missing required components
      if (!inputComponent || !positionComponent || !playerComponent || !healthComponent) {
        continue
      }
      
      // Skip if player is dead
      if (!healthComponent.isAlive) {
        continue
      }
      
      // Check if player wants to fire and rate limiting
      if (inputComponent.fireProjectile) {
        const lastFire = this.lastFireTime.get(entity.id) || 0
        if (currentTime - lastFire >= this.fireRate) {
          this.fireProjectile(entity, positionComponent, inputComponent.lookingYAngle)
          this.lastFireTime.set(entity.id, currentTime)
        }
      }
    }
  }

  /**
   * Creates and fires a projectile from the given player position.
   */
  private fireProjectile(playerEntity: Entity, playerPosition: PositionComponent, yAngle: number): void {
    // Create new projectile entity
    const projectileEntity = EntityManager.createEntity(SerializedEntityType.SPHERE)
    
    // Calculate projectile spawn position (slightly in front of player)
    const spawnOffset = 1.5
    const spawnX = playerPosition.x + Math.sin(yAngle) * spawnOffset
    const spawnZ = playerPosition.z + Math.cos(yAngle) * spawnOffset
    const spawnY = playerPosition.y + 1.0 // Spawn at chest height
    
    // Add position component
    const positionComponent = new PositionComponent(projectileEntity.id, spawnX, spawnY, spawnZ)
    projectileEntity.addNetworkComponent(positionComponent)
    
    // Add rotation component (facing the same direction as player)
    const rotationComponent = new RotationComponent(projectileEntity.id, 0, yAngle, 0, 1)
    projectileEntity.addNetworkComponent(rotationComponent)
    
    // Add projectile component
    const projectileComponent = new ProjectileComponent(projectileEntity.id, 20, 100, 5, playerEntity.id)
    projectileEntity.addNetworkComponent(projectileComponent)
    
    // Add visual components
    const meshComponent = new ServerMeshComponent(projectileEntity.id, '/assets/sphere.glb')
    projectileEntity.addNetworkComponent(meshComponent)
    
    const sizeComponent = new SingleSizeComponent(projectileEntity.id, 0.2)
    projectileEntity.addNetworkComponent(sizeComponent)
    
    const colorComponent = new ColorComponent(projectileEntity.id, '0xff0000') // Red projectile
    projectileEntity.addNetworkComponent(colorComponent)
    
    // Add physics components
    const rigidBodyComponent = new DynamicRigidBodyComponent(projectileEntity.id)
    projectileEntity.addComponent(rigidBodyComponent)
    
    const colliderComponent = new SphereColliderComponent(projectileEntity.id)
    projectileEntity.addComponent(colliderComponent)
    
    // Add network data component for synchronization
    const networkDataComponent = new NetworkDataComponent(
      projectileEntity.id,
      SerializedEntityType.SPHERE,
      [positionComponent, rotationComponent, projectileComponent, meshComponent, sizeComponent, colorComponent]
    )
    projectileEntity.addComponent(networkDataComponent)
    
    // Remove the addEntity call since createEntity already adds to the manager
  }

  /**
   * Updates all projectiles - movement and lifetime.
   */
  private updateProjectiles(dt: number, entities: Entity[]): void {
    for (const entity of entities) {
      const projectileComponent = entity.getComponent(ProjectileComponent)
      if (!projectileComponent) continue
      
      // Update lifetime
      projectileComponent.currentLifeTime += dt
      
      // Check if projectile should be destroyed due to lifetime
      if (projectileComponent.currentLifeTime >= projectileComponent.lifeTime) {
        this.destroyProjectile(entity)
        continue
      }
      
      // Move projectile
      const positionComponent = entity.getComponent(PositionComponent)
      const rotationComponent = entity.getComponent(RotationComponent)
      const rigidBodyComponent = entity.getComponent(DynamicRigidBodyComponent)
      
      if (positionComponent && rotationComponent && rigidBodyComponent) {
        // Calculate forward direction based on Y rotation
        const forwardX = Math.sin(rotationComponent.y)
        const forwardZ = Math.cos(rotationComponent.y)
        
        // Set velocity
        const speed = projectileComponent.speed
        const velocity = rigidBodyComponent.body?.linvel()
        if (velocity) {
          rigidBodyComponent.body?.setLinvel({ x: forwardX * speed, y: velocity.y, z: forwardZ * speed }, true)
        }
      }
      
      // Mark as updated for network sync
      projectileComponent.updated = true
    }
  }

  /**
   * Checks for collisions between projectiles and players.
   */
  private checkProjectileCollisions(entities: Entity[]): void {
    const projectiles = entities.filter(e => e.getComponent(ProjectileComponent))
    const players = entities.filter(e => e.getComponent(PlayerComponent) && e.getComponent(HealthComponent))
    
    for (const projectile of projectiles) {
      const projectileComponent = projectile.getComponent(ProjectileComponent)
      const projectilePosition = projectile.getComponent(PositionComponent)
      
      if (!projectileComponent || !projectilePosition) continue
      
      for (const player of players) {
        // Skip collision with projectile owner
        if (player.id === projectileComponent.ownerId) continue
        
        const playerPosition = player.getComponent(PositionComponent)
        const healthComponent = player.getComponent(HealthComponent)
        
        if (!playerPosition || !healthComponent || !healthComponent.isAlive) continue
        
        // Simple distance-based collision detection
        const distance = Math.sqrt(
          Math.pow(projectilePosition.x - playerPosition.x, 2) +
          Math.pow(projectilePosition.y - playerPosition.y, 2) +
          Math.pow(projectilePosition.z - playerPosition.z, 2)
        )
        
        // If collision detected (within 1 unit)
        if (distance < 1.0) {
          // Deal damage to player
          healthComponent.takeDamage(projectileComponent.damage)
          
          // Log hit
          const playerComponent = player.getComponent(PlayerComponent)
          const ownerEntity = EntityManager.getEntityById(entities, projectileComponent.ownerId)
          const ownerName = ownerEntity?.getComponent(PlayerComponent)?.name || 'Unknown'
          
          console.log(`${ownerName} hit ${playerComponent?.name} for ${projectileComponent.damage} damage. Health: ${healthComponent.health}/${healthComponent.maxHealth}`)
          
          // If player is killed, log it
          if (!healthComponent.isAlive) {
            console.log(`${playerComponent?.name} was eliminated by ${ownerName}!`)
          }
          
          // Destroy projectile
          this.destroyProjectile(projectile)
          break
        }
      }
    }
  }

  /**
   * Destroys a projectile entity.
   */
  private destroyProjectile(projectileEntity: Entity): void {
    // Add entity destroyed event for network cleanup
    EventSystem.addNetworkEvent(new EntityDestroyedEvent(projectileEntity.id))
    
    // Remove from entity manager
    EntityManager.removeEntity(projectileEntity)
  }
}
