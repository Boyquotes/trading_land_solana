import { NetworkComponent } from '../../../../shared/network/NetworkComponent.js'
import { SerializedComponentType } from '../../../../shared/network/server/serialized.js'

export class TextureComponent extends NetworkComponent {
  textureUrl: string

  constructor(entityId: number, textureUrl: string) {
    super(entityId, SerializedComponentType.TEXTURE)
    this.textureUrl = textureUrl
  }

  serialize() {
    return {
      textureUrl: this.textureUrl,
    }
  }

  deserialize(data: any) {
    this.textureUrl = data.textureUrl
  }

  static type = SerializedComponentType.TEXTURE
}
