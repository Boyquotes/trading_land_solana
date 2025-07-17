export enum ClientMessageType {
  INPUT = 1,
  CHAT_MESSAGE = 2,
  PROXIMITY_PROMPT_INTERACT = 3,
  SET_PLAYER_NAME = 4,
  SPAWN_CUBE = 5,
  SPAWN_CUBE_COIN = 6,
  FIRE_PROJECTILE = 7,
}

export interface ClientMessage {
  t: ClientMessageType
}
