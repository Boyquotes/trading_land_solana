import { ClientMessage } from './base'

export interface FireProjectileMessage extends ClientMessage {
  // Position where projectile is fired from
  x: number
  y: number
  z: number
  // Direction the projectile is fired (Y rotation angle)
  yAngle: number
}
