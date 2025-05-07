import { NetworkComponent } from '@shared/network/NetworkComponent'

export class TextureComponent extends NetworkComponent {
  textureUrl: string

  constructor(entityId: number, textureUrl: string = '') {
    super(entityId)
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
}
