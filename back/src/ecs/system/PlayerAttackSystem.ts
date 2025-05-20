import { Entity } from '../../../../shared/entity/Entity.js'
import { EntityManager } from '../../../../shared/system/EntityManager.js'
import { InputComponent } from '../component/InputComponent.js'
import { PositionComponent } from '../../../../shared/component/PositionComponent.js'
import { RotationComponent } from '../../../../shared/component/RotationComponent.js'
import { DamageComponent } from '../../../../shared/component/DamageComponent.js'
import { HealthComponent } from '../../../../shared/component/HealthComponent.js'
import { ProjectileComponent } from '../../../../shared/component/ProjectileComponent.js'
import { EventSystem } from '../../../../shared/system/EventSystem.js'
import { ComponentAddedEvent } from '../../../../shared/component/events/ComponentAddedEvent.js'
import { SerializedEntityType } from '../../../../shared/network/server/serialized.js'
import { PlayerComponent } from '../../../../shared/component/PlayerComponent.js'

export class PlayerAttackSystem {
  private attackCooldown = 500 // Cooldown in milliseconds
  private lastAttackTime = new Map<number, number>() // Player ID -> Last attack time
  private attackRange = 3.0
  private baseDamage = 10
  private heavyAttackMultiplier = 1.5

  update(entities: Entity[]): void {
    const currentTime = Date.now()

    for (const entity of entities) {
      // Skip non-player entities
      const playerComponent = entity.getComponent(PlayerComponent)
      if (!playerComponent) {
        continue
      }

      const inputComponent = entity.getComponent(InputComponent)
      const positionComponent = entity.getComponent(PositionComponent)

      // Skip if entity doesn't have required components
      if (!inputComponent) {
        console.log(`[Combat] Player ${entity.id} (${playerComponent.name}) missing InputComponent`)
        continue
      }
      if (!positionComponent) {
        console.log(`[Combat] Player ${entity.id} (${playerComponent.name}) missing PositionComponent`)
        continue
      }

      // Check if entity is trying to attack and cooldown has passed
      const lastAttack = this.lastAttackTime.get(entity.id) || 0
      const canAttack = currentTime - lastAttack >= this.attackCooldown
      const isAttacking = inputComponent.attack || inputComponent.heavyAttack

      console.log(`[Combat] Player ${entity.id} attack state: `, {
        attack: inputComponent.attack,
        heavyAttack: inputComponent.heavyAttack,
        canAttack,
        timeSinceLastAttack: currentTime - lastAttack,
        cooldown: this.attackCooldown,
        entityId: entity.id,
        hasPosition: !!positionComponent,
        hasRotation: !!entity.getComponent(RotationComponent)
      })

      if (isAttacking && canAttack) {
        this.handleAttack(entity, inputComponent.heavyAttack)
        this.lastAttackTime.set(entity.id, currentTime)
      }
    }
  }

  private handleAttack(attacker: Entity, isHeavyAttack: boolean): void {
    console.log(`[Combat] Handling attack from ${attacker.id} (${isHeavyAttack ? 'HEAVY' : 'NORMAL'})`)
    console.log(`[Combat] Attacker components:`, {
      position: !!attacker.getComponent(PositionComponent),
      rotation: !!attacker.getComponent(RotationComponent),
      input: !!attacker.getComponent(InputComponent)
    })
    const attackerPosition = attacker.getComponent(PositionComponent)
    const attackerRotation = attacker.getComponent(RotationComponent)
    
    if (!attackerPosition || !attackerRotation) {
      console.log('[Combat] Missing position or rotation component on attacker')
      return
    }
    
    // Create a projectile
    this.createProjectile(attacker, attackerPosition, attackerRotation, isHeavyAttack)
  }

  private createProjectile(
    attacker: Entity,
    position: PositionComponent,
    rotation: RotationComponent,
    isHeavyAttack: boolean
  ): number {
    const entityManager = EntityManager.getInstance()
    
    // Create a new entity for the projectile
    const projectile = EntityManager.createEntity(SerializedEntityType.NONE)
    
    // Calculate forward direction from rotation
    const forwardX = Math.sin(rotation.y) * Math.cos(rotation.x)
    const forwardY = Math.sin(rotation.x)
    const forwardZ = Math.cos(rotation.y) * Math.cos(rotation.x)
    
    // Position slightly in front of the attacker
    const spawnDistance = 1.5
    const spawnX = position.x + forwardX * spawnDistance
    const spawnY = position.y + 1.5 // Slightly above the player's feet
    const spawnZ = position.z + forwardZ * spawnDistance
    
    // Create position component
    const projectilePosition = new PositionComponent(projectile.id, spawnX, spawnY, spawnZ)
    
    // Set projectile properties based on attack type
    const damage = isHeavyAttack 
      ? Math.floor(this.baseDamage * this.heavyAttackMultiplier) 
      : this.baseDamage
    
    const speed = isHeavyAttack ? 15.0 : 25.0
    const maxDistance = isHeavyAttack ? 30.0 : 50.0
    
    // Create projectile component
    const projectileComponent = new ProjectileComponent(
      projectile.id,
      attacker.id,
      speed,
      maxDistance,
      damage,
      { x: forwardX, y: forwardY, z: forwardZ }
    )
    
    // Add components to the projectile
    projectile.addComponent(projectilePosition)
    projectile.addComponent(projectileComponent)
    
    console.log(`[Projectile] Created ${isHeavyAttack ? 'heavy' : 'normal'} projectile from player ${attacker.id}`)
    
    // Return the projectile ID for reference
    return projectile.id
  }
}
