import { PlayerData, MatchResult } from '../types';
import { MMR_INITIAL } from '../constants';

const STORAGE_KEY = 'dota22_player_data';

export class StorageManager {
  static load(): PlayerData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as PlayerData;
      }
    } catch {
      // ignore
    }
    return this.defaultData();
  }

  static save(data: PlayerData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  static saveMatchResult(result: MatchResult): void {
    const data = this.load();
    data.mmr += result.mmrChange;
    data.mmr = Math.max(0, data.mmr);
    data.gamesPlayed++;

    if (result.draw) {
      data.draws++;
    } else if (result.won) {
      data.wins++;
    } else {
      data.losses++;
    }

    data.matchHistory.unshift(result);
    if (data.matchHistory.length > 20) {
      data.matchHistory = data.matchHistory.slice(0, 20);
    }

    this.save(data);
  }

  static defaultData(): PlayerData {
    return {
      mmr: MMR_INITIAL,
      wins: 0,
      losses: 0,
      draws: 0,
      matchHistory: [],
      gamesPlayed: 0,
    };
  }
}
