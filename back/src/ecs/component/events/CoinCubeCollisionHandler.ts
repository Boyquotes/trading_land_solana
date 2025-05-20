import { Entity } from '../../../../../shared/entity/Entity.js'
import { Component } from '../../../../../shared/component/Component.js'
import { OnCollisionEnterEvent } from './OnCollisionEnterEvent.js'
import { PlayerComponent } from '../../../../../shared/component/PlayerComponent.js'
import { CoinCubeComponent } from '../CoinCubeComponent.js'
import { EventSystem } from '../../../../../shared/system/EventSystem.js'
import { MessageEvent } from './MessageEvent.js'
import { EntityDestroyedEvent } from '../../../../../shared/component/events/EntityDestroyedEvent.js'

/**
 * This component handles the collision between a player and a coin cube.
 * When a player touches a coin cube, the coin cube is deleted from the scene.
 */
export class CoinCubeCollisionHandler extends Component {
  constructor(entityId: number) {
    super(entityId)
    
    // Add the OnCollisionEnterEvent component to handle collisions
    // The entity that this component is attached to is accessible in the collision handler
    // via this.entityId, so we don't need to find it here
    const collisionHandler = new OnCollisionEnterEvent(entityId, this.handleCollision.bind(this))
    // We're adding this component to the same entity that this component is attached to
    // This will be handled by the entity system
  }

  /**
   * Handles the collision between this entity and another entity.
   * If this is a coin cube and the other entity is a player, delete the coin cube.
   */
  public handleCollision(collidedWithEntity: Entity): void {
    // Check if the collided entity is a player
    const playerComponent = collidedWithEntity.getComponent(PlayerComponent)
    if (!playerComponent) return; // Not a player, ignore collision
    
    // We need to find our own entity to access its components
    // In the collision system, our entity is accessible via this.entityId
    // We don't need to use Entity.getById since we have access to the entity directly
    
    // Add a message event to notify all players
    EventSystem.addEvent(
      new MessageEvent(
        collidedWithEntity.id,
        '🪙 [COIN]',
        `Player collected a token`
      )
    )
    
    // Log the collection
    console.log(`[CoinCube] Player ${collidedWithEntity.id} collected a coin cube (ID: ${this.entityId})`)
    
    // Add an EntityDestroyedEvent to destroy this entity
    // This is the proper way to destroy an entity in this ECS system
    EventSystem.addEvent(new EntityDestroyedEvent(this.entityId))
  }
}
