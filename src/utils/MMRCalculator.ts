import { PlayerData } from '../types';
import { MMR_K_FACTOR, MMR_INITIAL } from '../constants';

export class MMRCalculator {
  static calculate(currentMMR: number, won: boolean, draw: boolean, playerData: PlayerData): number {
    // Simulate opponent MMR based on streak
    const recentMatches = playerData.matchHistory.slice(0, 5);
    let streak = 0;
    for (const match of recentMatches) {
      if (match.won) streak++;
      else break;
    }

    // Opponent MMR adjusts with streak (win streak = stronger opponents)
    const opponentMMR = currentMMR + streak * 50;

    // ELO expected score
    const expected = 1 / (1 + Math.pow(10, (opponentMMR - currentMMR) / 400));

    let actual: number;
    if (draw) {
      actual = 0.5;
    } else if (won) {
      actual = 1;
    } else {
      actual = 0;
    }

    const change = Math.round(MMR_K_FACTOR * (actual - expected));
    return change;
  }
}
