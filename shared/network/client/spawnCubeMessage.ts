import { ClientMessage } from './base'

export interface SpawnCubeMessage extends ClientMessage {
  position: { x: number; y: number; z: number }
  size: { width: number; height: number; depth: number }
  color?: string
  /**
   * Optional URL to an image texture to apply to all faces of the cube.
   */
  textureUrl?: string
}
