/**
 * SoundFont loader — fetches a SoundFont (.sf2) file as an ArrayBuffer.
 *
 * @module audio/soundfont-loader
 * @see P1-SF-001, P1-SF-002, P1-SF-003, P1-SF-004 in requirements-phase1.md
 */

import { ChopsPlayerError } from "@model/errors.ts";

/**
 * Fetch a SoundFont file from the given URL.
 *
 * @param url - URL to the SF2/SF3 SoundFont file.
 *               Defaults to `/soundfonts/chops-instruments.sf2`.
 * @param onProgress - Optional callback invoked with loading progress (0–100).
 * @throws {ChopsPlayerError} If the fetch fails (network error, 404, invalid format).
 */
export async function fetchSoundFont(
  url: string = "/soundfonts/chops-instruments.sf2",
  onProgress?: (percent: number) => void,
): Promise<ArrayBuffer> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new ChopsPlayerError(
        `SoundFont fetch failed: ${response.status} ${response.statusText}`,
        "SOUNDFONT_FETCH_FAILED",
      );
    }

    // Try to use progress tracking via content-length header and streaming body
    // Only attempt if we have all the required APIs available
    const contentLength = response.headers?.get?.("content-length");
    if (
      contentLength &&
      onProgress &&
      response.body &&
      typeof response.body.getReader === "function"
    ) {
      const total = parseInt(contentLength, 10);
      if (total > 0) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        onProgress(0);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          onProgress(Math.round((received / total) * 100));
        }

        onProgress(100);

        // Combine all chunks
        const combined = new Uint8Array(received);
        let position = 0;
        for (const chunk of chunks) {
          combined.set(chunk, position);
          position += chunk.length;
        }

        return combined.buffer;
      }
    }

    // Fallback: just get the arrayBuffer
    if (onProgress) {
      onProgress(100);
    }
    return await response.arrayBuffer();
  } catch (error) {
    if (error instanceof ChopsPlayerError) {
      throw error;
    }
    throw new ChopsPlayerError(
      `SoundFont fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      "SOUNDFONT_FETCH_FAILED",
    );
  }
}
