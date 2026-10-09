import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const run = promisify(execFile);

test("indexes fabricated export metadata and extracts a safe device tag", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "surveyviewer-index-test-"));
  try {
    const exportsDirectory = join(workspace, "2026-10-07", "exports");
    await mkdir(exportsDirectory, { recursive: true });
    const fileName = "2026-10-07_12-00-00_survey_Fixture_Model_ABCDEF123456_11111111-1111-1111-1111-111111111111.json";
    await writeFile(join(exportsDirectory, fileName), JSON.stringify({ survey_id: "fixture-id", answers: { Q1: { question: "fixture question", answer: "fixture answer" } }, followups: {}, voice_files: [] }));
    await run(process.execPath, [fileURLToPath(new URL("./generate-viewer-index.mjs", import.meta.url)), "--source", "development", "--repository", "example/exports-dev", "--commit-sha", "fixture-sha", "--generated-at", "2026-10-07T00:00:00Z"], { cwd: workspace });
    const shard = JSON.parse(await readFile(join(workspace, "viewer-index", "v1", "2026-10.json"), "utf8"));
    assert.equal(shard[0].device_tag, "Fixture_Model_ABCDEF123456");
    assert.equal(shard[0].answer_count, 1);
    assert.equal(JSON.stringify(shard).includes("fixture answer"), false);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("counts meaningful answers and excludes missing, blank, null, and follow-up values", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "surveyviewer-answer-count-"));
  try {
    const exportsDirectory = join(workspace, "2026-10-07", "exports");
    await mkdir(exportsDirectory, { recursive: true });
    const fileName = "2026-10-07_12-00-00_survey_Fixture_ABCDEF123456_11111111-1111-1111-1111-111111111111.json";
    const answers = {
      missing: {}, nullValue: { answer: null }, empty: { answer: "" }, whitespace: { answer: "  \t" },
      text: { answer: "fixture" }, zero: { answer: 0 }, falseValue: { answer: false }, objectValue: { answer: { value: "fixture" } },
    };
    await writeFile(join(exportsDirectory, fileName), JSON.stringify({ survey_id: "fixture", answers, followups: { Q1: [{ answer: "excluded fixture follow-up" }] } }));
    await run(process.execPath, [fileURLToPath(new URL("./generate-viewer-index.mjs", import.meta.url)), "--source", "development", "--repository", "example/exports-dev", "--commit-sha", "fixture", "--generated-at", "2026-10-07T00:00:00Z"], { cwd: workspace });
    const shard = JSON.parse(await readFile(join(workspace, "viewer-index", "v1", "2026-10.json"), "utf8"));
    assert.equal(shard[0].answer_count, 4);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
