import { ClientMessage, ClientMessageType } from './base.js'

export interface AttackMessage extends ClientMessage {
  t: ClientMessageType.ATTACK
  targetId: number
  isHeavyAttack: boolean
}

export function createAttackMessage(targetId: number, isHeavyAttack: boolean = false): AttackMessage {
  return {
    t: ClientMessageType.ATTACK,
    targetId,
    isHeavyAttack,
  }
}
