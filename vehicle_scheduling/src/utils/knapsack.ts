import { VehicleTask, KnapsackInput, KnapsackOutput } from '../types';
import { Log } from '../../logging_middleware/src';

/**
 * 0/1 Knapsack using bottom-up dynamic programming.
 *
 * Complexity:
 *   Time:  O(n × W) where n = number of tasks, W = capacity in hours
 *   Space: O(n × W) for the DP table (reducible to O(W) with rolling array)
 *
 * Duration values are treated as integers (hours). If fractional hours are
 * needed, multiply all durations by 10 before calling and divide W accordingly.
 */
export const knapsackOptimize = async (input: KnapsackInput): Promise<KnapsackOutput> => {
  const { capacity, items } = input;
  const n = items.length;

  await Log('backend', 'info', 'service', `Optimization started — ${n} tasks, capacity ${capacity}h`);

  if (n === 0 || capacity <= 0) {
    await Log('backend', 'warn', 'service', 'No tasks or zero capacity — returning empty schedule');
    return { selectedItems: [], totalImpact: 0, totalDuration: 0 };
  }

  // Build DP table: dp[i][w] = max impact using first i items with capacity w
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(capacity + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    const task = items[i - 1];
    const duration = Math.round(task.Duration); // guard against float durations

    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w]; // skip item i
      if (duration <= w) {
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - duration] + task.Impact);
      }
    }
  }

  // Backtrack to identify selected tasks
  const selected: VehicleTask[] = [];
  let remainingCapacity = capacity;

  for (let i = n; i >= 1; i--) {
    if (dp[i][remainingCapacity] !== dp[i - 1][remainingCapacity]) {
      selected.push(items[i - 1]);
      remainingCapacity -= Math.round(items[i - 1].Duration);
    }
  }

  const totalDuration = selected.reduce((acc, t) => acc + t.Duration, 0);
  const totalImpact = selected.reduce((acc, t) => acc + t.Impact, 0);

  await Log(
    'backend',
    'info',
    'service',
    `Optimization completed — selected ${selected.length} tasks, totalImpact=${totalImpact}, totalDuration=${totalDuration}`
  );

  return { selectedItems: selected, totalImpact, totalDuration };
};
