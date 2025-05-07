import { SpawnCubeMessage } from '../../../../../shared/network/client/spawnCubeMessage.js'
import { Player } from '../../entity/Player.js'
import { Cube } from '../../entity/Cube.js'

export function handleSpawnCubeMessage(ws: any, message: SpawnCubeMessage) {
  const player: Player = ws.player
  if (!player) {
    console.error(`Player with WS ${ws} not found.`)
    return
  }
  const { position, size, color } = message
  if (!position || !size) {
    console.error('Invalid spawn cube message', message)
    return
  }
  const cubeParams = {
    position,
    size,
    color,
    physicsProperties: {
      enableCcd: true,
    },
  }
  const cube = new Cube(cubeParams)
  // Optionally, you can add a TextComponent or other networked components here
  console.log(`[SpawnCube] Player ${player.entity.id} spawned a cube at`, position)
}
