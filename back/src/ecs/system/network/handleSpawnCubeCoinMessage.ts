import { SpawnCubeCoinMessage } from '../../../../../shared/network/client/spawnCubeCoinMessage.js'
import { Player } from '../../entity/Player.js'
import { Mesh } from '../../entity/Mesh.js'
import { Cube } from '../../entity/Cube.js'
import { TextComponent } from '../../../../../shared/component/TextComponent.js'

export function handleSpawnCubeCoinMessage(ws: any, message: SpawnCubeCoinMessage) {
  const player: Player = ws.player
  if (!player) {
    console.error(`Player with WS ${ws} not found.`)
    return
  }
  
  const { position, size, color, textureUrl, symbol, mintAddress } = message
  
  if (!position || !size) {
    console.error('Invalid spawn cube coin message', message)
    return
  }
  
  try {
    // Create a mesh with the GLB model
    const meshParams = {
      position,
      scale: { x: 2, y: 2, z: 2 }, // Scale the model appropriately
      //meshUrl: 'http://localhost:4000/assets/cubee.glb', // Use the specified GLB model
      meshUrl: 'http://localhost:4000/assets/pepeblendwebp.glb', // Use the specified GLB model
      physicsProperties: {
        mass: 1,
        enableCcd: true
      }
    }
    
    // Create the mesh with the GLB model
    const tokenModel = new Mesh(meshParams)
    
    // Add text component to display token symbol above the model
    if (symbol) {
      tokenModel.entity.addNetworkComponent(
        new TextComponent(tokenModel.entity.id, symbol, 0, 3, 0, 20) // Position text above the model
      )
    }
    
    console.log(`[SpawnCubeCoin] Player ${player.entity.id} spawned a token model for ${symbol || 'Unknown'} (${mintAddress || 'No mint'}) at`, position)
  } catch (error) {
    console.error(`[SpawnCubeCoin] Error spawning model:`, error)
    
    // Fallback to a cube if the model fails to load
    const fallbackParams = {
      position,
      size,
      color: color || '#00ff00', // Default to green for coins
      physicsProperties: {
        enableCcd: true,
        mass: 1,
      },
    }
    
    // Create a fallback cube
    const fallbackCube = new Cube(fallbackParams)
    
    // Add text component to the fallback cube
    if (symbol) {
      fallbackCube.entity.addNetworkComponent(
        new TextComponent(fallbackCube.entity.id, symbol, 0, size.height + 0.5, 0, 20)
      )
    }
    
    console.log(`[SpawnCubeCoin] Fallback: Created cube for ${symbol || 'Unknown'} due to model load failure`)
  }
}
