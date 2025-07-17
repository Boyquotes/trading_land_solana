import { Component } from './Component.js'

/**
 * Component that tracks the number of coins collected by a player.
 */
export class CoinCollectionComponent extends Component {
  public coinsCollected: number = 0
  
  constructor(entityId: number) {
    super(entityId)
  }
  
  /**
   * Increment the number of coins collected by this player.
   * @returns The new total number of coins collected
   */
  public incrementCoinsCollected(): number {
    this.coinsCollected++
    return this.coinsCollected
  }
}
