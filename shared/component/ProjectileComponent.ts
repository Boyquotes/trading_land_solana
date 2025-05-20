import { Component } from './Component.js'

export class ProjectileComponent extends Component {
  type: string
  constructor(
    entityId: number,
    public ownerId: number,
    public speed: number,
    public maxDistance: number,
    public damage: number,
    public direction: { x: number; y: number; z: number },
    public distanceTraveled: number = 0,
    public isActive: boolean = true
  ) {
    super(entityId)
    this.type = 'ProjectileComponent'
  }
}

export interface SerializedProjectileComponent {
  ownerId: number
  speed: number
  maxDistance: number
  damage: number
  direction: { x: number; y: number; z: number }
  distanceTraveled: number
  isActive: boolean
}
