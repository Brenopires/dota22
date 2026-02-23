import { PlayerData } from '../types';

export class MMRCalculator {
  static calculate(_currentMMR: number, won: boolean, draw: boolean, _playerData: PlayerData): number {
    if (draw) return 0;
    return won ? 40 : -40;
  }
}
