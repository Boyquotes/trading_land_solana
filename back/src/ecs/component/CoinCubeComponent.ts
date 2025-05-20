import { Component } from '../../../../shared/component/Component.js'
import { Entity } from '../../../../shared/entity/Entity.js'
import { PlayerComponent } from '../../../../shared/component/PlayerComponent.js'
import { EventSystem } from '../../../../shared/system/EventSystem.js'
import { EntityManager } from '../../../../shared/system/EntityManager.js'
import { EntityDestroyedEvent } from '../../../../shared/component/events/EntityDestroyedEvent.js'
import { CoinCollectionComponent } from '../../../../shared/component/CoinCollectionComponent.js'
import { WebSocketComponent } from './WebsocketComponent.js'
import { SerializedMessageType } from '../../../../shared/network/server/serialized.js'

/**
 * Component that identifies an entity as a coin cube.
 * Contains information about the token it represents.
 */
export class CoinCubeComponent extends Component {
  public symbol: string | undefined
  public mintAddress: string | undefined
  public collectable: boolean = true
  
  constructor(
    entityId: number,
    symbol: string | undefined,
    mintAddress: string | undefined
  ) {
    super(entityId)
    this.symbol = symbol
    this.mintAddress = mintAddress
  }

  /**
   * Called when a player collides with this coin cube.
   * Destroys the coin cube and increments the player's coin collection count.
   * 
   * @param playerEntity The player entity that collided with this coin cube
   */
  public onPlayerCollision(playerEntity: Entity): void {
    if (!this.collectable) return; // Prevent multiple collisions
    
    // Mark as not collectable to prevent multiple collection events
    this.collectable = false;
    
    // Get or create the coin collection component for the player
    let coinCollectionComponent = playerEntity.getComponent(CoinCollectionComponent);
    
    if (!coinCollectionComponent) {
      // If the player doesn't have a coin collection component, create one
      coinCollectionComponent = new CoinCollectionComponent(playerEntity.id);
      playerEntity.addComponent(coinCollectionComponent);
    }
    
    // Increment the player's coin collection count
    const totalCoins = coinCollectionComponent.incrementCoinsCollected();
    
    // Log the collection
    console.log(`[CoinCube] Player ${playerEntity.id} collected coin ${this.symbol || 'Unknown'} (${this.mintAddress || 'No mint'}). Total coins: ${totalCoins}`);
    
    // Send a message to the client to increment the coin counter in the UI
    try {
      // Get the player's WebSocket component
      const websocketComponent = playerEntity.getComponent(WebSocketComponent);
      
      if (websocketComponent && websocketComponent.ws) {
        // Create a simple notification message using the standard format
        // This will be handled by the WebSocketManager's message handlers
        const coinCollectionMessage = {
          t: 9, // SerializedComponentType.MESSAGE
          content: 'COIN_COLLECTED',
          sender: 'SYSTEM',
          id: this.entityId,
          // Include additional data about the coin
          data: {
            symbol: this.symbol,
            mintAddress: this.mintAddress,
            playerEntityId: playerEntity.id,
            totalCoins: totalCoins,
            entityToDestroy: this.entityId // Include the entity ID to destroy on the client
          }
        };
        
        // Send the message to the client
        // Use the raw WebSocket.send method with a string payload
        // This avoids issues with binary message formats
        websocketComponent.ws.send(JSON.stringify(coinCollectionMessage));
        console.log('[CoinCube] Sent coin collection message to client');
        
        // Also send a direct entity destruction message to ensure it's removed on the client
        const destroyMessage = {
          t: 5, // SerializedComponentType.ENTITY_DESTROYED_EVENT
          id: this.entityId
        };
        websocketComponent.ws.send(JSON.stringify(destroyMessage));
        console.log('[CoinCube] Sent direct entity destruction message to client');
      } else {
        console.warn('[CoinCube] Player WebSocket component not found');
      }
    } catch (error) {
      console.error('[CoinCube] Failed to send coin counter update:', error);
    }
    
    // Create and add an EntityDestroyedEvent to destroy this entity
    // This is the proper way to destroy an entity in this ECS system
    const destroyEvent = new EntityDestroyedEvent(this.entityId);
    EventSystem.addEvent(destroyEvent);
    
    // Log the entity destruction for debugging
    console.log(`[CoinCube] Destroying coin cube entity ${this.entityId} (${this.symbol || 'Unknown'})`);
    
    // Get the entity to ensure it's properly destroyed
    const entity = EntityManager.getEntityById([], this.entityId);
    if (entity) {
      // Add the destroy event as a network component to ensure it's synchronized to clients
      // This is crucial for the client to know that this entity should be destroyed
      entity.addNetworkComponent(destroyEvent);
      
      // Remove all components to ensure it's properly cleaned up
      entity.removeAllComponents();
      console.log(`[CoinCube] Removed all components from entity ${this.entityId}`);
    } else {
      console.warn(`[CoinCube] Could not find entity ${this.entityId} to destroy`);
    }
  }
}
