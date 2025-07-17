import { EntityManager } from '@shared/system/EntityManager.js'
import { Renderer } from '@/game/Renderer.js'
import { EntityDestroyedEvent } from '@shared/component/events/EntityDestroyedEvent.js'
import { Entity } from '@shared/entity/Entity.js'
import { EventSystem } from '@shared/system/EventSystem.js'

/**
 * System responsible for handling entity destruction events.
 * This system processes EntityDestroyedEvent events and removes the corresponding entities.
 */
export class DestroySystem {
  // Track entities that have already been destroyed to prevent duplicate processing
  private destroyedEntityIds: Set<number> = new Set<number>();
  
  /**
   * First phase: Remove all components from entities marked for destruction
   */
  update(entities: Entity[], renderer: Renderer) {
    const destroyedEvents = EventSystem.getEvents(EntityDestroyedEvent)

    for (const destroyedEvent of destroyedEvents) {
      // Skip if we've already processed this entity ID
      if (this.destroyedEntityIds.has(destroyedEvent.entityId)) {
        continue;
      }
      
      const entity = EntityManager.getEntityById(entities, destroyedEvent.entityId)
      if (!entity) {
        // Entity not found - it may have already been destroyed
        // Add to our tracking set to prevent future errors
        this.destroyedEntityIds.add(destroyedEvent.entityId);
        console.log(`DestroySystem: Entity ${destroyedEvent.entityId} already removed or not found`);
        continue;
      }

      // Remove all components
      entity.removeAllComponents();
      
      // Add to our tracking set
      this.destroyedEntityIds.add(destroyedEvent.entityId);
    }
  }
  
  /**
   * Second phase: Actually remove the entities from the entity manager
   */
  afterUpdate(entities: Entity[]) {
    const destroyedEvents = EventSystem.getEvents(EntityDestroyedEvent)

    for (const destroyedEvent of destroyedEvents) {
      const entity = EntityManager.getEntityById(entities, destroyedEvent.entityId)
      if (!entity) {
        // Entity not found - it may have already been destroyed
        // No need to log an error since we're tracking destroyed entities
        continue;
      }

      // Remove the entity from the entity manager
      EntityManager.removeEntity(entity);
    }
    
    // Clear the tracking set after processing all events
    // We only want to track entities within a single update cycle
    this.destroyedEntityIds.clear();
  }
}
