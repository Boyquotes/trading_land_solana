import { ClientMessage, ClientMessageType } from './base.js'

export interface SpawnCubeCoinMessage extends ClientMessage {
  t: ClientMessageType.SPAWN_CUBE_COIN
  position: {
    x: number
    y: number
    z: number
  }
  size: {
    width: number
    height: number
    depth: number
  }
  color?: string
  textureUrl?: string
  symbol?: string
  mintAddress?: string
}
