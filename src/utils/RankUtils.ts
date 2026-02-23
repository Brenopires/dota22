import { RANK_THRESHOLDS } from '../constants';

export function getRank(mmr: number): { name: string; minMMR: number; color: number } {
  let rank: { name: string; minMMR: number; color: number } = RANK_THRESHOLDS[0];
  for (const r of RANK_THRESHOLDS) {
    if (mmr >= r.minMMR) rank = r;
  }
  return rank;
}
