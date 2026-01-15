/**
 * Priority queue for bidirectional BFS frontier management.
 *
 * Min-heap implementation that returns items with lowest priority first.
 * Includes duplicate prevention and iteration support.
 *
 * Time Complexity:
 * - push: O(log n)
 * - pop: O(log n)
 * - contains: O(1)
 * - length: O(1)
 *
 * Space Complexity: O(n) for heap array and item set
 *
 * @template T - Type of items stored in the queue
 * @example
 * ```typescript
 * const queue = new PriorityQueue<string>();
 * queue.push('nodeA', 10);  // Low-degree node (high priority)
 * queue.push('nodeB', 100); // High-degree node (low priority)
 *
 * const next = queue.pop(); // Returns 'nodeA' (lower degree = higher priority)
 * ```
 */
export class PriorityQueue<T> {
  private heap: Array<{ item: T; priority: number }> = [];
  private itemSet = new Set<T>(); // Track items for duplicate prevention

  /**
   * Add an item to the queue with given priority.
   * Silently ignores duplicates.
   *
   * @param item - Item to add
   * @param priority - Priority value (lower values = higher priority)
   */
  push(item: T, priority: number): void {
    if (this.itemSet.has(item)) return; // Prevent duplicates

    this.heap.push({ item, priority });
    this.itemSet.add(item);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove and return the item with lowest priority.
   *
   * @returns Item with minimum priority, or undefined if queue is empty
   */
  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) {
      const result = this.heap.pop();
      if (result) {
        this.itemSet.delete(result.item);
        return result.item;
      }
      return undefined;
    }

    const result = this.heap[0];
    const last = this.heap.pop();
    if (last && result) {
      this.heap[0] = last;
      this.bubbleDown(0);
      this.itemSet.delete(result.item);
      return result.item;
    }
    return undefined;
  }

  /**
   * Get the number of items in the queue.
   */
  get length(): number {
    return this.heap.length;
  }

  /**
   * Check if an item is in the queue.
   *
   * @param item - Item to check
   * @returns true if item is in queue
   */
  contains(item: T): boolean {
    return this.itemSet.has(item);
  }

  /**
   * Make the queue iterable for checking connections.
   * Iterates over items in no particular order (not sorted by priority).
   */
  *[Symbol.iterator](): Iterator<T> {
    yield* this.itemSet;
  }

  /**
   * Bubble up an element to maintain min-heap property.
   * @param index
   * @internal
   */
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].priority >= this.heap[parentIndex].priority) break;
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  /**
   * Bubble down an element to maintain min-heap property.
   * @param index
   * @internal
   */
  private bubbleDown(index: number): void {
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < this.heap.length && this.heap[leftChild].priority < this.heap[smallest].priority) {
        smallest = leftChild;
      }
      if (rightChild < this.heap.length && this.heap[rightChild].priority < this.heap[smallest].priority) {
        smallest = rightChild;
      }
      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}
