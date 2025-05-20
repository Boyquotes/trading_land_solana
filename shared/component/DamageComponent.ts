import { NetworkComponent } from '../network/NetworkComponent.js'
import { SerializedComponentType } from '../network/server/serialized.js'

export class DamageComponent extends NetworkComponent {
  constructor(
    entityId: number,
    public damage: number,
    public sourceEntityId: number,
    public targetEntityId: number,
    public isCritical: boolean = false
  ) {
    super(entityId, SerializedComponentType.DAMAGE)
  }

  serialize() {
    return {
      d: this.damage,
      s: this.sourceEntityId,
      t: this.targetEntityId,
      c: this.isCritical,
    }
  }

  deserialize(data: SerializedDamageComponent): void {
    if (data.d !== undefined) this.damage = data.d
    if (data.s !== undefined) this.sourceEntityId = data.s
    if (data.t !== undefined) this.targetEntityId = data.t
    if (data.c !== undefined) this.isCritical = data.c
  }
}

export interface SerializedDamageComponent {
  d: number // damage
  s: number // sourceEntityId
  t: number // targetEntityId
  c: boolean // isCritical
}
