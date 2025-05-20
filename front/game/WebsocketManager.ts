import { unpack, pack } from 'msgpackr'
import { ServerMessage, ServerMessageType } from '@shared/network/server/base'
import { SnapshotMessage } from '@shared/network/server/serialized'
import { Game } from './Game'
import { ConnectionMessage } from '@shared/network/server/connection'
import { ClientMessage } from '@shared/network/client/base'
import { isNativeAccelerationEnabled } from 'msgpackr'
import pako from 'pako'
import { config } from '@shared/network/config'
import { EntityDestroyedEvent } from '@shared/component/events/EntityDestroyedEvent'
import { EventSystem } from '@shared/system/EventSystem'

// Define a custom message type for coin collection
interface CoinCollectionMessage {
  t: number; // Message type (9 for custom messages)
  content: string; // Message content
  sender: string; // Message sender
  id: number; // Entity ID
  data?: { // Optional additional data
    symbol?: string;
    mintAddress?: string;
    playerEntityId?: number;
    totalCoins?: number;
    entityToDestroy?: number; // Entity ID to destroy on the client
  };
}

if (!isNativeAccelerationEnabled)
  console.warn('Native acceleration not enabled, verify that install finished properly')

type MessageHandler = (message: ServerMessage) => void

export class WebSocketManager {
  private websocket: WebSocket | null = null
  private messageHandlers: Map<ServerMessageType, MessageHandler> = new Map()
  private serverUrl: string
  private game: Game

  timeSinceLastServerUpdate: number = 0
  constructor(game: Game, port: number = 8001) {
    this.game = game
    // Set the serverUrl based on the environment
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? 'ws://localhost'
    console.log("baseUrl")
    this.serverUrl = `${baseUrl}:${port}`

    this.addMessageHandler(ServerMessageType.FIRST_CONNECTION, (message) => {
      const connectionMessage = message as ConnectionMessage
      game.currentPlayerEntityId = connectionMessage.id
      config.SERVER_TICKRATE = connectionMessage.tickRate
      console.log(
        `Connected to server with player ID: ${game.currentPlayerEntityId}, server tick rate: ${connectionMessage.tickRate}`
      )
    })

    this.addMessageHandler(ServerMessageType.SNAPSHOT, (message) => {
      this.timeSinceLastServerUpdate = 0
      game.syncComponentSystem.addSnapshotMessage(message as SnapshotMessage)
    })
  }

  async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.isConnected()) {
        this.websocket = new WebSocket(this.serverUrl)
        this.websocket.addEventListener('open', (event) => {
          console.log('WebSocket connection opened:', event)
          resolve() // Resolve the promise when the connection is open.
        })
        this.websocket.addEventListener('message', this.onMessage.bind(this))
        this.websocket.addEventListener('error', (errorEvent) => {
          console.error('WebSocket error:', errorEvent)
          reject(errorEvent) // Reject the promise on error.
        })
        this.websocket.addEventListener('close', (closeEvent) => {
          if (closeEvent.wasClean) {
            console.log(
              `WebSocket connection closed cleanly, code=${closeEvent.code}, reason=${closeEvent.reason}`
            )
          } else {
            console.error('WebSocket connection abruptly closed')
          }
        })
      } else {
        resolve() // WebSocket already exists, resolve without a value.
      }
    })
  }
  disconnect() {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
  }

  addMessageHandler(type: ServerMessageType, handler: MessageHandler) {
    this.messageHandlers.set(type, handler)
  }

  removeMessageHandler(type: ServerMessageType) {
    this.messageHandlers.delete(type)
  }

  private onOpen(event: Event) {
    console.log('WebSocket connection opened:', event)
  }

  send(message: ClientMessage) {
    if (!this.isConnected()) {
      console.error("Websocket not connected, can't send message", message)
      return
    }

    if (!this.websocket) {
      console.error("Websocket not initialized, can't send message", message)
      return
    }

    try {
      // Compress with msgpackr
      const packed = pack(message)
      this.websocket.send(packed)
    } catch (error) {
      console.error(
        `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        message
      )
    }
  }
  private isConnected(): boolean {
    return this.websocket != null && this.websocket.readyState === WebSocket.OPEN
  }

  private async onMessage(event: MessageEvent) {
    try {
      let message: ServerMessage;
      
      // Check if the message is a string (JSON) or binary data
      if (typeof event.data === 'string') {
        // Handle JSON string messages
        try {
          // Parse as CoinCollectionMessage first to check if it's a custom message
          const parsedMessage = JSON.parse(event.data);
          console.log('[WebSocketManager] Received JSON message:', parsedMessage);
          
          // Handle custom messages that don't have a registered handler
          if (parsedMessage && typeof parsedMessage === 'object') {
            // Check if this is an entity destruction message
            if ('t' in parsedMessage && parsedMessage.t === 5 && 'id' in parsedMessage) {
              // This is a direct entity destruction message
              console.log('[WebSocketManager] Received entity destruction message for entity:', parsedMessage.id);
              
              // Create and dispatch an EntityDestroyedEvent
              const destroyEvent = new EntityDestroyedEvent(parsedMessage.id as number);
              EventSystem.addEvent(destroyEvent);
              
              // Return early as we've handled this message
              return;
            }
            
            // Check if this is a coin collection message
            if ('content' in parsedMessage) {
              const coinMessage = parsedMessage as CoinCollectionMessage;
              
              if (coinMessage.t === 9 && coinMessage.content === 'COIN_COLLECTED' && coinMessage.sender === 'SYSTEM') {
                console.log('[WebSocketManager] Received coin collection message');
                
                // Only dispatch the event - don't call incrementCoinCount directly
                // This prevents double counting
                document.dispatchEvent(new CustomEvent('coinCollected', { detail: coinMessage }));
                
                // Play coin collection sound
                this.game.audioManager.playSound('/audio/gling_gling_coin.wav', 0.5);
                
                // Check if we need to destroy an entity
                if (coinMessage.data && coinMessage.data.entityToDestroy) {
                  console.log('[WebSocketManager] Destroying entity from coin collection message:', coinMessage.data.entityToDestroy);
                  
                  try {
                    // Check if the entity exists before trying to destroy it
                    // This prevents errors from trying to destroy the same entity twice
                    const entities = this.game.entityManager.getInstance().getAllEntities();
                    const entityExists = entities.some((entity: { id: number }) => entity.id === coinMessage.data?.entityToDestroy);
                    
                    if (entityExists) {
                      // Create and dispatch an EntityDestroyedEvent
                      const destroyEvent = new EntityDestroyedEvent(coinMessage.data.entityToDestroy as number);
                      EventSystem.addEvent(destroyEvent);
                    } else {
                      console.log('[WebSocketManager] Entity already destroyed or not found:', coinMessage.data.entityToDestroy);
                    }
                  } catch (error) {
                    console.error('[WebSocketManager] Error checking entity existence:', error);
                  }
                }
                
                // Return early as we've handled this message
                return;
              }
            }
          }
          
          // If it's not a coin message, treat it as a regular ServerMessage
          message = parsedMessage as ServerMessage;
        } catch (error) {
          console.error('[WebSocketManager] Error parsing JSON message:', error);
          return;
        }
      } else {
        // Handle binary messages (original implementation)
        try {
          const buffer = await event.data.arrayBuffer();
          // Decompress the zlib first
          const decompressed = pako.inflate(buffer);
          // Then decompress the msgpackr
          message = unpack(decompressed);
        } catch (error) {
          console.error('[WebSocketManager] Error processing binary message:', error);
          return;
        }
      }
      
      // Process the message with registered handlers
      const handler = this.messageHandlers.get(message.t);
      if (handler) {
        handler(message);
      }
    } catch (error) {
      console.error('[WebSocketManager] Error in onMessage:', error);
    }
  }
}
