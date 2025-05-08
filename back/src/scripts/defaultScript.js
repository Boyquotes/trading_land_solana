function randomHexColor() {
  const hex = Math.floor(Math.random() * 16777215).toString(16)
  return '#' + '0'.repeat(6 - hex.length) + hex
}

// Load the game world
// Can also be hosted on a github repo : https://github.com/iErcann/Notblox-Assets + https://rawcdn.githack.com
new MapWorld('https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/world/FlatMap.glb')

// === Basic Entity Creation Examples ===

// Create a basic cube
const basicCubeParams = {
  position: { x: 0, y: 5, z: -50 },
  size: { width: 3, height: 3, depth: 3 },
}
new Cube(basicCubeParams)

// Create physics-enabled sphere with a white color
const basicSphereParams = {
  position: { x: 5, y: 10, z: -10 },
  radius: 6,
  color: '#ffffff',
}
new Sphere(basicSphereParams)

// === Interactive Trigger Zone Example ===
// Creates an invisible trigger zone that detects when players enter/exit
const triggerCube = new TriggerCube(
  -100,
  -5,
  -200, // position
  8,
  8,
  8, // size
  (entity) => {
    // onEnter callback
    if (entity.getComponent(PlayerComponent)) {
      console.log('Invisible trigger zone: Player entered the zone!')
      // You could add game logic here, like:
      // - Giving points
      // - Triggering events
      // - Spawning enemies
      entity
        .getComponent(DynamicRigidBodyComponent)
        .body.applyImpulse(new Rapier.Vector3(0, 9000, 0), true)
    }
  },
  (entity) => {
    // onExit callback
    if (entity.getComponent(PlayerComponent)) {
      console.log('Invisible trigger zone: Player left the zone!')
    }
  },
  true // Set to true to see the trigger zone (useful for debugging)
)
triggerCube.entity.addNetworkComponent(
  new TextComponent(triggerCube.entity.id, 'Trampoline', 0, 2, 0, 30)
)

// === Interactive Object Example ===
// Create a cube that reacts to player collision
for (let i = 0; i < 2; i++) {
  const interactiveCubeParams = {
    position: { x: 0, y: 5, z: -100 },
    size: { width: 2, height: 2, depth: 2 },
    physicsProperties: {
      enableCcd: true,
    },
  }
  const interactiveCube = new Cube(interactiveCubeParams)
  interactiveCube.entity.addComponent(
    new OnCollisionEnterEvent(interactiveCube.entity.id, (collidedWithEntity) => {
      // Only react to players
      if (collidedWithEntity.getComponent(PlayerComponent)) {
        // Change color of the cube on collision
        EventSystem.addEvent(new ColorEvent(interactiveCube.entity.id, randomHexColor()))

        // Apply upward force
        const rigidBody = interactiveCube.entity.getComponent(DynamicRigidBodyComponent)
        if (rigidBody) {
          rigidBody.body.applyImpulse(new Rapier.Vector3(0, 5000, 0), true)
        }
      }
    })
  )
}

// Zombie
const zombie = new Mesh({
  position: {
    x: -100,
    y: 10,
    z: 100,
  },
  meshUrl:
    'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/character/MiniCharacter.glb',
  physicsProperties: {
    mass: 1,
    angularDamping: 0.5,
    enableCcd: true,
  },
  colliderProperties: {
    restitution: 0.7,
  },
})
zombie.entity.addNetworkComponent(new ColorComponent(zombie.entity.id, 'default'))
zombie.entity.addComponent(new ZombieComponent(zombie.entity.id))
zombie.entity.addNetworkComponent(new TextComponent(zombie.entity.id, '🤪 Zombie guy', 0, 2, 0))

// === Create Multiple Objects Example ===
// Creates a line of cubes with alternating colors
// const colors = ['#ff0000', '#00ff00', '#0000ff']
// for (let i = 0; i < 2; i++) {
//   const cubeParams = {
//     position: { x: i * 3, y: 5, z: -40 },
//     size: { width: 1, height: 1, depth: 1 },
//     color: colors[i % colors.length],
//   }
//   const cube = new Cube(cubeParams)
//   cube.entity.addComponent(new RandomizeComponent(cube.entity.id))
//   const sphereParams = {
//     position: { x: i * 3, y: 5, z: -40 },
//     radius: 1,
//     color: colors[i % colors.length],
//   }
//   const sphere = new Sphere(sphereParams)
//   sphere.entity.addComponent(new RandomizeComponent(sphere.entity.id))
// }

const cube = new Cube({
  position: {
    x: 100,
    y: 10,
    z: 100,
  },
  physicsProperties: {
    mass: 1,
    angularDamping: 0.5,
  },
})
const proximityPromptComponent = new ProximityPromptComponent(cube.entity.id, {
  text: 'Press E to change color',
  onInteract: (interactingEntity) => {
    cube.entity
      .getComponent(DynamicRigidBodyComponent)
      .body.applyImpulse(new Rapier.Vector3(0, 5, 0), true)

    const colorComponent = cube.entity.getComponent(ColorComponent)
    if (colorComponent) {
      // randomize color
      colorComponent.color = '#' + Math.floor(Math.random() * 16777215).toString(16)
      colorComponent.updated = true
    }
  },
  maxInteractDistance: 10,
  interactionCooldown: 200,
  holdDuration: 0,
})
cube.entity.addNetworkComponent(proximityPromptComponent)

for (let i = -3; i < 6; i++) {
  if (i === 0) continue
  const x = 5 * -i
  const y = 5
  const z = 20 * i
  const car = new Car({
    position: { x, y, z },
  })
  car.entity.addComponent(new SpawnPositionComponent(car.entity.id, x, y, z))
}

// Create a row of cars with varying wheel sizes
for (let i = 1; i < 10; i++) {
  const x = -140 + 5 * -i
  const y = 5
  const z = 20 * i

  // Configure wheels with varying sizes
  let wheelConfig = {}
  if (i < 5) {
    // Small front wheels for first set of cars
    wheelConfig = {
      frontLeft: Math.max(1, i / 2.5),
      frontRight: Math.max(1, i / 2.5),
      backLeft: 1.4,
      backRight: 1.4,
    }
  } else {
    // Small back wheels for second set of cars
    wheelConfig = {
      frontLeft: 1.4,
      frontRight: 1.4,
      backLeft: Math.max(1, (10 - i) / 2.5),
      backRight: Math.max(1, (10 - i) / 2.5),
    }
  }

  const car = new Car({
    position: { x, y, z },
    name: 'Weird Car',
    meshUrl:
      'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/vehicle/CarNoWheel.glb',
    wheelRadius: wheelConfig,
    color: randomHexColor(),
  })
  car.entity.addComponent(new SpawnPositionComponent(car.entity.id, x, y, z))
}

const noWheelCar = new Car({
  position: { x: 0, y: 5, z: -500 },
  name: 'Weird Car',
  meshUrl: 'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/vehicle/CarNoWheel.glb',
})
noWheelCar.entity.addComponent(new SpawnPositionComponent(noWheelCar.entity.id, 250, 20, -500))

const car = new Car({
  position: { x: 0, y: 5, z: -500 },
  name: 'Weird Car',
  meshUrl: 'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/vehicle/EzCar.glb',
})
car.entity.addComponent(new SpawnPositionComponent(car.entity.id, 150, 20, -500))

// Flying Car (different gravity scale, slow motion)
new Car({
  position: { x: 0, y: 20, z: -500 },
  physicsProperties: {
    gravityScale: 0.05,
    enableCcd: true,
  },
  name: 'Flying Car',
  color: '#78b5ff',
})
console.log('Flying Car spawned')
console.log('Flying Car entity id:', car.entity.id)
console.log('Flying Car mesh url:', car.meshUrl)

// === Spawn 3D Models using Mesh class (THREE.js) ===

// Try multiple approaches to ensure at least one works

// Approach 1: Use a known working model (EzCar) as a test
const testMesh1 = new Mesh({
  position: {
    x: 0,
    y: 5,
    z: -20 // Closer to starting position
  },
  scale: {
    x: 2,
    y: 2,
    z: 2
  },
  meshUrl: 'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/vehicle/EzCar.glb', // Known working model
  physicsProperties: {
    mass: 1,
    enableCcd: true
  }
})

testMesh1.entity.addNetworkComponent(
  new TextComponent(testMesh1.entity.id, 'Test Model 1 (CDN)', 0, 3, 0, 20)
)

console.log('Test Model 1 spawned')
console.log('Test Model 1 entity id:', testMesh1.entity.id)
console.log('Test Model 1 mesh url:', testMesh1.meshUrl)

// Approach 2: Try with MiniCharacter model
const testMesh2 = new Mesh({
  position: {
    x: 10,
    y: 5,
    z: -20
  },
  scale: {
    x: 2,
    y: 2,
    z: 2
  },
  meshUrl: 'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/character/MiniCharacter.glb',
  physicsProperties: {
    mass: 1,
    enableCcd: true
  }
})

testMesh2.entity.addNetworkComponent(
  new TextComponent(testMesh2.entity.id, 'Test Model 2 (Mini)', 0, 3, 0, 20)
)

console.log('Test Model 2 spawned')
console.log('Test Model 2 entity id:', testMesh2.entity.id)
console.log('Test Model 2 mesh url:', testMesh2.meshUrl)

// Approach 3: Try with local path (if pepe.glb exists)
const testMesh3 = new Mesh({
  position: {
    x: 20,
    y: 5,
    z: -20
  },
  scale: {
    x: 20,
    y: 20,
    z: 20
  },
  meshUrl: 'http://localhost:4000/assets/craft_racer.glb', // Local path
  physicsProperties: {
    mass: 1,
    enableCcd: true
  }
})

testMesh3.entity.addNetworkComponent(
  new TextComponent(testMesh3.entity.id, 'Test Model 3 (Local)', 0, 3, 0, 20)
)

console.log('Test Model 3 spawned')
console.log('Test Model 3 entity id:', testMesh3.entity.id)
console.log('Test Model 3 mesh url:', testMesh3.meshUrl)


// Approach 4: Try with local path (if pepe.glb exists)
const testMesh4 = new Mesh({
  position: {
    x: 200,
    y: 50,
    z: -40
  },
  scale: {
    x: 2,
    y: 2,
    z: 2
  },
  meshUrl: 'http://localhost:4000/assets/pepeblendwebp.glb', // Local path
  disableTextures: true, // Disable textures
  customMaterial: {
    color: '#00ff00', // Green color
    roughness: 0.5,
    metalness: 0.5
  }
})

testMesh4.entity.addNetworkComponent(
  new TextComponent(testMesh3.entity.id, 'Test Model 3 (Local)', 0, 3, 0, 20)
)

console.log('Test Model 4 spawned')
console.log('Test Model 4 entity id:', testMesh4.entity.id)
console.log('Test Model 4 mesh url:', testMesh4.meshUrl)



const testMesh5 = new Mesh({
  position: {
    x: 20,
    y: 5,
    z: -20
  },
  scale: {
    x: 20,
    y: 20,
    z: 20
  },
  meshUrl: 'http://localhost:4000/assets/cubee.glb', // Local path
  physicsProperties: {
    mass: 1,
    enableCcd: true
  }
})

testMesh5.entity.addNetworkComponent(
  new TextComponent(testMesh5.entity.id, 'Test Model 5 (Local)', 0, 3, 0, 20)
)

console.log('Test Model 5 spawned')
console.log('Test Model 5 entity id:', testMesh5.entity.id)
console.log('Test Model 5 mesh url:', testMesh5.meshUrl)

// Football test
function spawnFootballBall() {
  const ballSpawnPosition = { x: 0, y: 20, z: -10 }

  const sphereParams = {
    radius: 1.4,
    position: {
      x: ballSpawnPosition.x,
      y: ballSpawnPosition.y,
      z: ballSpawnPosition.z,
    },
    meshUrl: 'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/base/Ball.glb',
    physicsProperties: {
      mass: 1,
      // Enable continuous collision detection to prevent the ball from going through the walls
      enableCcd: true,
      angularDamping: 0.5,
      linearDamping: 0.5,
    },
    colliderProperties: {
      friction: 0.4,
      restitution: 0.8,
    },
  }

  let ball
  // Initialize the ball using SphereParams
  ball = new Sphere(sphereParams)
  ball.entity.addComponent(
    new SpawnPositionComponent(
      ball.entity.id,
      ballSpawnPosition.x,
      ballSpawnPosition.y,
      ballSpawnPosition.z
    )
  )

  const proximityPromptComponent = new ProximityPromptComponent(ball.entity.id, {
    text: 'Kick',
    onInteract: (playerEntity) => {
      const ballRigidbody = ball.entity.getComponent(DynamicRigidBodyComponent)
      const playerRotationComponent = playerEntity.getComponent(RotationComponent)

      if (ballRigidbody && playerRotationComponent && playerEntity.getComponent(InputComponent)) {
        // Convert rotation to direction vector
        const direction = playerRotationComponent.getForwardDirection()
        // Calculate player looking direction
        // sendChatMessage('⚽', `Player shot the ball !`)
        const playerLookingDirectionVector = new Rapier.Vector3(
          direction.x * 1500,
          0,
          direction.z * 1500
        )

        ballRigidbody.body.applyImpulse(playerLookingDirectionVector, true)
      }
    },
    maxInteractDistance: 10,
    interactionCooldown: 2000,
    holdDuration: 0,
  })
  ball.entity.addNetworkComponent(proximityPromptComponent)
}

spawnFootballBall()
