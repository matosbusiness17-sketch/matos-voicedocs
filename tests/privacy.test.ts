import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Privacy & Data Retention Verification (Test F)", () => {
  /**
   * MANDATORY TEST SCENARIO F: Privacy
   * Verify uploaded audio is not unintentionally retained or exposed on disk.
   */
  it("Test F: No temporary or permanent audio files are stored in workspace directories", () => {
    // Scan project directories for any leaked audio files (.wav, .mp3, .m4a, .webm, .ogg)
    const projectDir = process.cwd();
    const disallowedExtensions = [".wav", ".mp3", ".m4a", ".webm", ".ogg", ".aac"];

    function scanDir(dir: string): string[] {
      const found: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (
          entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === ".next"
        ) {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          found.push(...scanDir(fullPath));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (disallowedExtensions.includes(ext)) {
            found.push(fullPath);
          }
        }
      }
      return found;
    }

    const leakedAudioFiles = scanDir(projectDir);
    expect(leakedAudioFiles).toEqual([]);
  });

  it("ensures transcribe endpoint processes binary streams in memory only", () => {
    // Check source code of route.ts to guarantee no fs.writeFile or disk buffering
    const routeSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/transcribe/route.ts"),
      "utf8"
    );

    expect(routeSource).not.toContain("fs.writeFileSync");
    expect(routeSource).not.toContain("fs.writeFile");
    expect(routeSource).not.toContain("createWriteStream");
    expect(routeSource).toContain("arrayBuffer()");
  });
});
