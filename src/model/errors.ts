/**
 * Typed error classes for chops-player.
 *
 * All expected error scenarios (network failures, invalid files,
 * audio initialization errors) should use one of these typed errors
 * so callers can handle them with `instanceof` checks.
 *
 * @module model/errors
 * @see P1-SF-003 in requirements-phase1.md
 * @see coding-guidelines.md §1.4
 */

/**
 * Base error class for all chops-player errors.
 *
 * Includes a machine-readable `code` string for programmatic handling
 * alongside the human-readable `message`.
 *
 * @example
 * ```typescript
 * throw new ChopsPlayerError("SoundFont fetch failed: 404", "SOUNDFONT_LOAD_FAILED");
 * ```
 */
export class ChopsPlayerError extends Error {
  override readonly name = "ChopsPlayerError" as const;

  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}
