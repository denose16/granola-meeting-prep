/**
 * Thin wrapper around the Parallel SDK's Task API.
 *
 * Responsibilities:
 *  - create a task run with a JSON output schema, block until it resolves
 *  - normalise the vendor response into our clean `Researched<T>` type
 *    (value + per-field reasoning/citations)
 *  - basic retry on transient errors
 *
 * Nothing above this layer imports `parallel-web` directly.
 */
import Parallel from "parallel-web";
import type { Citation, Researched } from "../types.js";

export interface RunOptions {
  /** Processor tier: lite | base | core | pro | ultra. */
  processor: string;
  /** Free-text run label, stored on the run for traceability. */
  label?: string;
}

export class ParallelClient {
  private readonly sdk: Parallel;

  constructor(apiKey: string) {
    this.sdk = new Parallel({ apiKey });
  }

  /**
   * Run one Task with a JSON output schema and return the typed result plus
   * the research basis (reasoning + citations) for each field.
   */
  async research<T extends object>(
    input: string,
    outputSchema: unknown,
    opts: RunOptions,
  ): Promise<Researched<T>> {
    const run = await this.withRetry(() =>
      this.sdk.taskRun.create({
        input,
        processor: opts.processor,
        task_spec: { output_schema: outputSchema as never },
        ...(opts.label ? { metadata: { label: opts.label.slice(0, 512) } } : {}),
      }),
    );

    // Blocking fetch — Parallel holds the connection open until the run resolves.
    const result = await this.sdk.taskRun.result(run.run_id);

    if (result.run.status === "failed") {
      throw new Error(`Task run ${run.run_id} failed: ${result.run.error?.message ?? "unknown error"}`);
    }

    return normalise<T>(result);
  }

  private async withRetry<R>(fn: () => Promise<R>, attempts = 3): Promise<R> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        // Don't retry auth / bad-request errors — only transient ones.
        const status = (err as { status?: number })?.status;
        if (status && status >= 400 && status < 500 && status !== 429) throw err;
        await sleep(1000 * (i + 1));
      }
    }
    throw lastErr;
  }
}

/** Map a Parallel TaskRunResult into our `Researched<T>`. */
function normalise<T extends object>(result: {
  output: { content: unknown; basis?: Array<{ field: string; reasoning: string; citations?: Array<{ url: string; title?: string | null; excerpts?: string[] | null }>; confidence?: string | null }> };
}): Researched<T> {
  const value = (result.output.content ?? {}) as T;
  const evidence: Researched<T>["evidence"] = {};
  for (const b of result.output.basis ?? []) {
    evidence[b.field] = {
      reasoning: b.reasoning,
      confidence: b.confidence ?? undefined,
      citations: (b.citations ?? []).map(
        (c): Citation => ({ url: c.url, title: c.title ?? undefined, excerpt: c.excerpts?.[0] ?? undefined }),
      ),
    };
  }
  return { value, evidence };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
