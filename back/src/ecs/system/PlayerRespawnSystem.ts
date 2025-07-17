import { Entity } from '../../../../shared/entity/Entity.js'
import { PlayerComponent } from '../../../../shared/component/PlayerComponent.js'
import { HealthComponent } from '../../../../shared/component/HealthComponent.js'
import { PositionComponent } from '../../../../shared/component/PositionComponent.js'
import { DynamicRigidBodyComponent } from '../component/physics/DynamicRigidBodyComponent.js'
import { SpawnPositionComponent } from '../component/SpawnPositionComponent.js'
import { EventSystem } from '../../../../shared/system/EventSystem.js'
import { MessageEvent } from '../component/events/MessageEvent.js'
import { SerializedMessageType } from '../../../../shared/network/server/serialized.js'
import { EntityManager } from '../../../../shared/system/EntityManager.js'
import { ChatComponent } from '../component/tag/TagChatComponent.js'
import Rapier from '../../physics/rapier.js'

/**
 * System responsible for handling player death and respawning.
 */
export class PlayerRespawnSystem {
  private respawnDelay = 3000 // 3 seconds respawn delay
  private pendingRespawns = new Map<number, number>() // entityId -> respawn timestamp

  /**
   * Updates the respawn system.
   */
  update(dt: number, entities: Entity[]): void {
    this.checkForDeadPlayers(entities)
    this.handlePendingRespawns(entities)
  }

  /**
   * Checks for players who have died and schedules them for respawn.
   */
  private checkForDeadPlayers(entities: Entity[]): void {
    const currentTime = Date.now()

    for (const entity of entities) {
      const playerComponent = entity.getComponent(PlayerComponent)
      const healthComponent = entity.getComponent(HealthComponent)
      
      if (!playerComponent || !healthComponent) {
        continue
      }

      // Check if player has died and is not already scheduled for respawn
      if (!healthComponent.isAlive && !this.pendingRespawns.has(entity.id)) {
        // Schedule respawn
        this.pendingRespawns.set(entity.id, currentTime + this.respawnDelay)
        
        // Send death notification
        this.sendDeathNotification(entity, entities)
        
        console.log(`Player ${playerComponent.name} (${entity.id}) has died and will respawn in ${this.respawnDelay/1000} seconds`)
      }
    }
  }

  /**
   * Handles pending respawns when their time has come.
   */
  private handlePendingRespawns(entities: Entity[]): void {
    const currentTime = Date.now()
    const toRespawn: number[] = []

    // Check which players are ready to respawn
    for (const [entityId, respawnTime] of this.pendingRespawns) {
      if (currentTime >= respawnTime) {
        toRespawn.push(entityId)
      }
    }

    // Respawn the players
    for (const entityId of toRespawn) {
      const entity = EntityManager.getEntityById(entities, entityId)
      if (entity) {
        this.respawnPlayer(entity, entities)
      }
      this.pendingRespawns.delete(entityId)
    }
  }

  /**
   * Respawns a player at their spawn position.
   */
  private respawnPlayer(entity: Entity, entities: Entity[]): void {
    const playerComponent = entity.getComponent(PlayerComponent)
    const healthComponent = entity.getComponent(HealthComponent)
    const positionComponent = entity.getComponent(PositionComponent)
    const rigidBodyComponent = entity.getComponent(DynamicRigidBodyComponent)
    
    if (!playerComponent || !healthComponent || !positionComponent || !rigidBodyComponent?.body) {
      console.error('PlayerRespawnSystem: Missing required components for respawn')
      return
    }

    // Determine respawn position
    const spawnPosition = this.getSpawnPosition(entity)
    
    // Reset health
    healthComponent.health = healthComponent.maxHealth
    healthComponent.isAlive = true
    healthComponent.updated = true
    
    // Teleport player to spawn position
    rigidBodyComponent.body.setTranslation(
      new Rapier.Vector3(spawnPosition.x, spawnPosition.y, spawnPosition.z),
      true
    )
    
    // Reset velocity
    rigidBodyComponent.body.setLinvel(new Rapier.Vector3(0, 0, 0), true)
    
    // Send respawn notification
    this.sendRespawnNotification(entity, entities)
    
    console.log(`Player ${playerComponent.name} (${entity.id}) respawned at (${spawnPosition.x}, ${spawnPosition.y}, ${spawnPosition.z})`)
  }

  /**
   * Gets the spawn position for a player.
   */
  private getSpawnPosition(entity: Entity): { x: number, y: number, z: number } {
    const spawnPositionComponent = entity.getComponent(SpawnPositionComponent)
    
    if (spawnPositionComponent) {
      // Use custom spawn position (checkpoint)
      return {
        x: spawnPositionComponent.x,
        y: spawnPositionComponent.y,
        z: spawnPositionComponent.z
      }
    } else {
      // Use default spawn position
      return {
        x: 0,
        y: 10,
        z: 0
      }
    }
  }

  /**
   * Sends a death notification to all players.
   */
  private sendDeathNotification(deadPlayer: Entity, entities: Entity[]): void {
    const playerComponent = deadPlayer.getComponent(PlayerComponent)
    if (!playerComponent) return

    const chatEntity = EntityManager.getFirstEntityWithComponent(entities, ChatComponent)
    if (!chatEntity) return

    // Send global death message
    EventSystem.addEvent(
      new MessageEvent(
        chatEntity.id,
        '💀 [DEATH]',
        `${playerComponent.name} was eliminated!`,
        SerializedMessageType.GLOBAL_CHAT
      )
    )

    // Send targeted respawn message to the dead player
    EventSystem.addEvent(
      new MessageEvent(
        chatEntity.id,
        '💀 You Died',
        `You will respawn in ${this.respawnDelay/1000} seconds...`,
        SerializedMessageType.TARGETED_NOTIFICATION,
        [deadPlayer.id]
      )
    )
  }

  /**
   * Sends a respawn notification to the respawned player.
   */
  private sendRespawnNotification(respawnedPlayer: Entity, entities: Entity[]): void {
    const playerComponent = respawnedPlayer.getComponent(PlayerComponent)
    if (!playerComponent) return

    const chatEntity = EntityManager.getFirstEntityWithComponent(entities, ChatComponent)
    if (!chatEntity) return

    // Send targeted respawn message
    EventSystem.addEvent(
      new MessageEvent(
        chatEntity.id,
        '✨ Respawned',
        'You have respawned! Good luck!',
        SerializedMessageType.TARGETED_NOTIFICATION,
        [respawnedPlayer.id]
      )
    )
  }
}
