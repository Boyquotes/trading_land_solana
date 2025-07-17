import { NetworkComponent } from '../network/NetworkComponent.js'
import { SerializedComponent, SerializedComponentType } from '../network/server/serialized.js'

export class ProjectileComponent extends NetworkComponent {
  public speed: number
  public damage: number
  public lifeTime: number
  public currentLifeTime: number
  public ownerId: number // ID of the player who fired this projectile
  
  constructor(
    entityId: number, 
    speed: number = 20, 
    damage: number = 100, 
    lifeTime: number = 5, 
    ownerId: number
  ) {
    super(entityId, SerializedComponentType.PROJECTILE)
    this.speed = speed
    this.damage = damage
    this.lifeTime = lifeTime
    this.currentLifeTime = 0
    this.ownerId = ownerId
  }

  serialize(): SerializedProjectileComponent {
    return {
      s: this.speed,
      d: this.damage,
      lt: this.lifeTime,
      clt: this.currentLifeTime,
      o: this.ownerId,
    }
  }

  deserialize(data: SerializedProjectileComponent): void {
    this.speed = data.s
    this.damage = data.d
    this.lifeTime = data.lt
    this.currentLifeTime = data.clt
    this.ownerId = data.o
  }
}

export interface SerializedProjectileComponent extends SerializedComponent {
  s: number // speed
  d: number // damage
  lt: number // lifeTime
  clt: number // currentLifeTime
  o: number // ownerId
}
