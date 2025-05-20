import { NetworkComponent } from '../network/NetworkComponent.js'
import { SerializedComponentType } from '../network/server/serialized.js'

export class HealthComponent extends NetworkComponent {
  constructor(
    entityId: number,
    public maxHealth: number = 100,
    public currentHealth: number = 100,
    public isDead: boolean = false
  ) {
    super(entityId, SerializedComponentType.HEALTH)
  }

  serialize() {
    return {
      m: this.maxHealth,
      c: this.currentHealth,
      d: this.isDead,
    }
  }

  deserialize(data: SerializedHealthComponent): void {
    if (data.m !== undefined) this.maxHealth = data.m
    if (data.c !== undefined) this.currentHealth = data.c
    if (data.d !== undefined) this.isDead = data.d
  }

  takeDamage(amount: number): number {
    if (this.isDead) return 0
    
    this.currentHealth = Math.max(0, this.currentHealth - amount)
    
    if (this.currentHealth <= 0) {
      this.currentHealth = 0
      this.isDead = true
    }
    
    return this.currentHealth
  }

  heal(amount: number): number {
    if (this.isDead) return 0
    
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount)
    return this.currentHealth
  }

  respawn(health: number = this.maxHealth): void {
    this.currentHealth = health
    this.isDead = false
  }
}

export interface SerializedHealthComponent {
  m: number // maxHealth
  c: number // currentHealth
  d: boolean // isDead
}
