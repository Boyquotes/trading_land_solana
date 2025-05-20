import { InputComponent } from '../component/InputComponent.js'
import { Entity } from '../../../../shared/entity/Entity.js'
import { InputMessage } from '../../../../shared/network/client/inputMessage.js'

export class InputProcessingSystem {
  constructor() {}

  receiveInputPacket(playerEntity: Entity, inputMessage: InputMessage) {
    // Debug log all input messages
    const hasAttackInput = inputMessage.a || inputMessage.h
    if (hasAttackInput) {
      console.log(`[InputProcessing] Received attack input for entity ${playerEntity.id}:`, {
        normalAttack: inputMessage.a,
        heavyAttack: inputMessage.h,
        hasInputComponent: !!playerEntity.getComponent(InputComponent)
      })
    }

    let inputComponent = playerEntity.getComponent(InputComponent)

    if (!inputComponent) {
      console.log(`[InputProcessing] Creating new InputComponent for entity ${playerEntity.id}`)
      inputComponent = new InputComponent(playerEntity.id)
      playerEntity.addComponent(inputComponent)
    }

    // Debug log attack inputs
    if (inputMessage.a || inputMessage.h) {
      console.log(`[Server] Received attack input: `, {
        playerId: playerEntity.id,
        attack: inputMessage.a ? 'NORMAL' : '',
        heavyAttack: inputMessage.h ? 'HEAVY' : ''
      })
    }

    // Update the InputComponent based on the received packet
    inputComponent.down = inputMessage.d
    inputComponent.up = inputMessage.u
    inputComponent.left = inputMessage.l
    inputComponent.right = inputMessage.r
    inputComponent.space = inputMessage.s
    inputComponent.lookingYAngle = inputMessage.y
    inputComponent.interact = inputMessage.i
    inputComponent.attack = inputMessage.a
    inputComponent.heavyAttack = inputMessage.h
  }
}
