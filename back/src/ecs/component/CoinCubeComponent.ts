import { Component } from '../../../../shared/component/Component.js'
import { Entity } from '../../../../shared/entity/Entity.js'
import { PlayerComponent } from '../../../../shared/component/PlayerComponent.js'
import { EventSystem } from '../../../../shared/system/EventSystem.js'
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
    // This uses the WebSocket connection to send a custom message to the client
    // The message will be handled by the client-side code to update the coin counter
    try {
      // Get the player's WebSocket component
      const websocketComponent = playerEntity.getComponent(WebSocketComponent);
      
      if (websocketComponent && websocketComponent.ws) {
        // Create a simple notification message
        const coinCollectionMessage = {
          t: 9, // SerializedComponentType.MESSAGE
          content: 'COIN_COLLECTED',
          sender: 'SYSTEM',
          id: this.entityId
        };
        
        // Send the message to the client
        websocketComponent.ws.send(JSON.stringify(coinCollectionMessage));
        console.log('[CoinCube] Sent coin collection message to client');
      } else {
        console.warn('[CoinCube] Player WebSocket component not found');
      }
    } catch (error) {
      console.error('[CoinCube] Failed to send coin counter update:', error);
    }
    
    // Add an EntityDestroyedEvent to destroy this entity
    // This is the proper way to destroy an entity in this ECS system
    EventSystem.addEvent(new EntityDestroyedEvent(this.entityId));
  }
}
