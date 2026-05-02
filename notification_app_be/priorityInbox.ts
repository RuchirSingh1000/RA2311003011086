/**
 * Priority Inbox — Stage 6
 *
 * Fetches notifications from the evaluation API and maintains the top N
 * unread notifications ranked by:
 *   priority = TYPE_WEIGHT + recency_score
 *
 * Uses a min-heap for O(log N) insertion, supporting efficient streaming updates.
 *
 * Type Weights: Placement (300) > Result (200) > Event (100)
 * Recency: Normalized unix timestamp contributes up to 100 additional points.
 *
 * No database required — operates entirely in-memory.
 */

import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// ─── Types ──────────────────────────────────────────────────────────────────

type NotificationType = 'Placement' | 'Result' | 'Event';

interface RawNotification {
  ID: string;
  Type: NotificationType;
  Message: string;
  Timestamp: string;
}

interface NotificationsApiResponse {
  notifications: RawNotification[];
}

interface ScoredNotification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  priorityScore: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_WEIGHTS: Record<NotificationType, number> = {
  Placement: 300,
  Result: 200,
  Event: 100,
};

const BASE_URL =
  process.env.EVALUATION_API_BASE_URL ?? 'http://20.207.122.201/evaluation-service';
const BEARER_TOKEN = process.env.EVALUATION_BEARER_TOKEN ?? '';
const TOP_N = 10;

// Normalisation anchor — all timestamps relative to this epoch base
const EPOCH_BASE = new Date('2026-01-01T00:00:00Z').getTime();
const EPOCH_RANGE = 365 * 24 * 60 * 60 * 1000; // 1 year in ms

// ─── Priority Score ───────────────────────────────────────────────────────────

const computePriorityScore = (type: NotificationType, timestamp: string): number => {
  const typeWeight = TYPE_WEIGHTS[type];
  const ms = new Date(timestamp).getTime();
  const recencyScore = Math.max(0, Math.min(100, ((ms - EPOCH_BASE) / EPOCH_RANGE) * 100));
  return typeWeight + recencyScore;
};

// ─── Min-Heap Implementation ─────────────────────────────────────────────────

class MinHeap {
  private readonly heap: ScoredNotification[] = [];

  private parentIdx(i: number): number {
    return Math.floor((i - 1) / 2);
  }
  private leftIdx(i: number): number {
    return 2 * i + 1;
  }
  private rightIdx(i: number): number {
    return 2 * i + 2;
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = this.parentIdx(idx);
      if (this.heap[parent].priorityScore <= this.heap[idx].priorityScore) break;
      this.swap(parent, idx);
      idx = parent;
    }
  }

  private bubbleDown(idx: number): void {
    const size = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = this.leftIdx(idx);
      const right = this.rightIdx(idx);

      if (left < size && this.heap[left].priorityScore < this.heap[smallest].priorityScore) {
        smallest = left;
      }
      if (right < size && this.heap[right].priorityScore < this.heap[smallest].priorityScore) {
        smallest = right;
      }
      if (smallest === idx) break;
      this.swap(idx, smallest);
      idx = smallest;
    }
  }

  get size(): number {
    return this.heap.length;
  }

  peek(): ScoredNotification | undefined {
    return this.heap[0];
  }

  push(item: ScoredNotification): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): ScoredNotification | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return min;
  }

  /**
   * Extract all items sorted descending by priority score.
   * O(N log N)
   */
  extractSortedDesc(): ScoredNotification[] {
    const result: ScoredNotification[] = [];
    const copy = new MinHeap();
    for (const item of this.heap) copy.push({ ...item });
    while (copy.size > 0) result.unshift(copy.pop()!);
    return result;
  }
}

// ─── Priority Inbox Engine ────────────────────────────────────────────────────

/**
 * Processes a stream of raw notifications and maintains the top N
 * by priority score using a bounded min-heap.
 *
 * Time: O(M log N) — M = total notifications, N = top-N cap
 * Space: O(N)
 */
const buildPriorityInbox = (notifications: RawNotification[], topN: number): ScoredNotification[] => {
  const heap = new MinHeap();

  for (const raw of notifications) {
    const score = computePriorityScore(raw.Type, raw.Timestamp);
    const scored: ScoredNotification = {
      id: raw.ID,
      type: raw.Type,
      message: raw.Message,
      timestamp: raw.Timestamp,
      priorityScore: parseFloat(score.toFixed(2)),
    };

    if (heap.size < topN) {
      heap.push(scored);
    } else if (heap.peek() && scored.priorityScore > heap.peek()!.priorityScore) {
      heap.pop();
      heap.push(scored);
    }
  }

  return heap.extractSortedDesc();
};

// ─── API Fetch ────────────────────────────────────────────────────────────────

const fetchNotifications = async (): Promise<RawNotification[]> => {
  const response = await axios.get<NotificationsApiResponse>(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
    timeout: 8000,
  });
  return response.data.notifications;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  process.stdout.write(`\nFetching notifications from ${BASE_URL}/notifications...\n`);

  const raw = await fetchNotifications();
  process.stdout.write(`Fetched ${raw.length} total notifications.\n`);
  process.stdout.write(`Building Priority Inbox (top ${TOP_N})...\n\n`);

  const topNotifications = buildPriorityInbox(raw, TOP_N);

  process.stdout.write('═'.repeat(80) + '\n');
  process.stdout.write(`  PRIORITY INBOX — Top ${TOP_N} Notifications\n`);
  process.stdout.write('═'.repeat(80) + '\n\n');

  topNotifications.forEach((n, idx) => {
    process.stdout.write(
      `${String(idx + 1).padStart(2)}. [${n.type.padEnd(9)}] Score: ${String(n.priorityScore).padEnd(8)} | ${n.timestamp} | ${n.message}\n`
    );
    process.stdout.write(`    ID: ${n.id}\n\n`);
  });

  process.stdout.write('═'.repeat(80) + '\n');
  process.stdout.write('\nSample JSON output:\n');
  process.stdout.write(JSON.stringify({ topNotifications }, null, 2).slice(0, 800) + '\n...\n');
};

main().catch((err: Error) => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
