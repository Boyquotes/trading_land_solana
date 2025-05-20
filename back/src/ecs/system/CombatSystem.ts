import { Entity } from '../../../../shared/entity/Entity.js'
import { EntityManager } from '../../../../shared/system/EntityManager.js'
import { HealthComponent } from '../../../../shared/component/HealthComponent.js'
import { DamageComponent } from '../../../../shared/component/DamageComponent.js'
import { EventSystem } from '../../../../shared/system/EventSystem.js'
import { ComponentAddedEvent } from '../../../../shared/component/events/ComponentAddedEvent.js'

export class CombatSystem {
  update(entities: Entity[]): void {
    this.processDamageEvents(entities)
  }

  private processDamageEvents(entities: Entity[]): void {
    // Get all damage events
    const damageEvents = EventSystem.getEventsWrapped(ComponentAddedEvent, DamageComponent)
    
    for (const event of damageEvents) {
      const damageComponent = event.component as DamageComponent
      
      // Get the target entity
      const targetEntity = EntityManager.getEntityById(entities, damageComponent.targetEntityId)
      if (!targetEntity) continue
      
      // Get the source entity
      const sourceEntity = EntityManager.getEntityById(entities, damageComponent.sourceEntityId)
      
      // Apply damage to target
      this.applyDamage(targetEntity, damageComponent.damage, sourceEntity)
      
      // Mark the damage component for removal after processing
      targetEntity.removeComponent(DamageComponent, false)
    }
  }

  private applyDamage(target: Entity, amount: number, source?: Entity): void {
    const healthComponent = target.getComponent(HealthComponent)
    if (!healthComponent) return
    
    const previousHealth = healthComponent.currentHealth
    const newHealth = healthComponent.takeDamage(amount)
    const damageDealt = previousHealth - newHealth
    
    console.log(`[CombatSystem] Entity ${target.id} took ${damageDealt} damage. Health: ${newHealth}/${healthComponent.maxHealth}`)
    
    if (healthComponent.isDead) {
      console.log(`[CombatSystem] Entity ${target.id} has been defeated!`)
      this.handleEntityDefeated(target, source)
    }
  }

  private handleEntityDefeated(entity: Entity, source?: Entity): void {
    // Here you can add logic for when an entity is defeated
    // For example, drop items, play death animation, etc.
    
    // For now, just log the event
    if (source) {
      console.log(`[CombatSystem] Entity ${entity.id} was defeated by Entity ${source.id}`)
    } else {
      console.log(`[CombatSystem] Entity ${entity.id} was defeated`)
    }
    
    // You could add respawn logic here
    // this.scheduleRespawn(entity, 5000) // Respawn after 5 seconds
  }
  
  private scheduleRespawn(entity: Entity, delay: number): void {
    setTimeout(() => {
      const healthComponent = entity.getComponent(HealthComponent)
      if (healthComponent) {
        healthComponent.respawn()
        console.log(`[CombatSystem] Entity ${entity.id} has respawned`)
      }
    }, delay)
  }
}
