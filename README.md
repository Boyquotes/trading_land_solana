# Trading land Solana Game Demo

DeFi on-chain games to manage our portfolio in 3D and 2D, launch in-game trade on principal DEX/CEX, stay focused on market movement with a gamification system to make more good trade.
 
### Online Demo  



### Controls

- W : Forward
- S : Backward
- A : Left
- D : Right
- Space : Jump
- Mouse Left click : Rotate screen
- E : Interact

## Features

- Multiplayer
- Only TypeScript
- 3D Physics (Rapier.js)
- Vanilla Three.js
- Server Authoritative
- ECS (Entity Component System) with Network Sync (NetworkComponent)
- ~Delta Compression~ (needs rework)
- Interpolation
- Fast to load (small assets)
- Run on low end devices : [My Three.JS Performance Guide](PERFORMANCE.md)
- Shared code between server and client (useful for component replication)
- Trimesh Collider
- Cars

## How to run locally

### Clone the repo
```bash
git clone git@github.com:Boyquotes/trading_land_solana
cd trading_land_solana
npm run install
npm run start
```

Go on your browser to http://localhost:4000/play/tld

## Backend Configuration (Game Server)

The backend can be configured through environment variables in `./back/.env`:

### Local dev mode 
```bash
NODE_ENV=development 
GAME_TICKRATE=20 # Game tickrate in Hz (20Hz = 50ms)
GAME_SCRIPT=defaultScript.js # Script to run 
NEXT_PUBLIC_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY

# Commented in dev mode : 
# FRONTEND_URL=https://www.notblox.online # Only accept connections from this URL
```

### In production
```bash
NODE_ENV=production 
GAME_TICKRATE=20 # Game tickrate in Hz (20Hz = 50ms)
GAME_SCRIPT=defaultScript.js # Script to run 

# To prevent hijacking
FRONTEND_URL=https://www.notblox.online 

# To get WSS, set your path:
SSL_KEY_FILE=/etc/letsencrypt/live/npm-3/privkey.pem
SSL_CERT_FILE=/etc/letsencrypt/live/npm-3/cert.pem
```

#### Game Scripts
The `GAME_SCRIPT` system allows for modular gameplay modes similar to Garry's Mod's LUA scripts:
- Scripts are loaded dynamically at runtime
- Multiple servers can run different game modes
- No rebuild required when modifying game logic, just change the `GAME_SCRIPT` variable in the `.env` file and restart
- Located in `back/src/scripts/`

#### Tickrate Configuration

The `GAME_TICKRATE` setting controls how frequently the server updates game state:

| Tickrate | Use Case | Description | Server CPU Usage |
|----------|----------|-------------|-----------------|
| 60 ticks/s | Vehicle/Physics-heavy | Smooth physics interactions, highest precision vehicle control | High |
| 40 ticks/s | Mixed Gameplay | Good physics interactions, balanced vehicle control | Medium |
| 20 ticks/s | Standard Gameplay | Good balance of responsiveness and performance | Low |

**Performance Considerations:**
- Higher tickrates = smoother gameplay but increased:
  - Server CPU usage
  - Network bandwidth
  - Client-server messages
- Choose based on your game's requirements and server capacity
- [View Stress Test (20 ticks/s)](https://www.youtube.com/watch?v=KDODRyYXBcc)

## Front end Configuration

To configure the front end, set the `NEXT_PUBLIC_SERVER_URL` environment variable in your `.env.local` file:

```bash
# Development
NEXT_PUBLIC_SERVER_URL=ws://localhost

# Production (SSL Required)
# NEXT_PUBLIC_SERVER_URL=wss://back.notblox.online
```
