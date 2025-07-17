import { NetworkComponent } from '../network/NetworkComponent.js'
import { SerializedComponent, SerializedComponentType } from '../network/server/serialized.js'

export class HealthComponent extends NetworkComponent {
  public health: number
  public maxHealth: number
  public isAlive: boolean
  
  constructor(entityId: number, maxHealth: number = 100) {
    super(entityId, SerializedComponentType.HEALTH)
    this.health = maxHealth
    this.maxHealth = maxHealth
    this.isAlive = true
  }

  takeDamage(damage: number): void {
    this.health = Math.max(0, this.health - damage)
    this.isAlive = this.health > 0
    this.updated = true
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount)
    this.updated = true
  }

  reset(): void {
    this.health = this.maxHealth
    this.isAlive = true
    this.updated = true
  }

  serialize(): SerializedHealthComponent {
    return {
      h: this.health,
      mh: this.maxHealth,
      a: this.isAlive,
    }
  }

  deserialize(data: SerializedHealthComponent): void {
    this.health = data.h
    this.maxHealth = data.mh
    this.isAlive = data.a
  }
}

export interface SerializedHealthComponent extends SerializedComponent {
  h: number // health
  mh: number // maxHealth
  a: boolean // isAlive
}
