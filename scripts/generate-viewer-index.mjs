#!/usr/bin/env node
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";

const args = parseArgs(process.argv.slice(2));
const source = requiredArg(args, "source");
const repository = requiredArg(args, "repository");
const commitSha = requiredArg(args, "commit-sha");
const generatedAt = args.get("generated-at") ?? new Date().toISOString();
const root = process.cwd();
const indexRoot = join(root, "viewer-index", "v1");
const files = await findExportJsonFiles(root);
const malformed = [];
const entries = [];

for (const file of files) {
  const path = relative(root, file).replaceAll("\\", "/");
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    const entry = buildEntry(parsed, path, source, repository);
    if (entry === null) malformed.push({ path, reason: "missing or invalid survey_id" });
    else entries.push(entry);
  } catch (error) {
    malformed.push({ path, reason: error instanceof Error ? error.message : "unreadable JSON" });
  }
}

entries.sort((left, right) => left.uploader_date.localeCompare(right.uploader_date) || left.path.localeCompare(right.path));
const byMonth = new Map();
for (const entry of entries) {
  const month = entry.uploader_date.slice(0, 7);
  const bucket = byMonth.get(month) ?? [];
  bucket.push(entry);
  byMonth.set(month, bucket);
}

await rm(indexRoot, { recursive: true, force: true });
await mkdir(indexRoot, { recursive: true });
const months = [...byMonth.keys()].sort().reverse();
for (const month of months) await writeJson(join(indexRoot, `${month}.json`), byMonth.get(month));
await writeJson(join(indexRoot, "manifest.json"), {
  version: 1,
  generated_at: generatedAt,
  source,
  repository,
  commit_sha: commitSha,
  malformed_export_count: malformed.length,
  months: months.map((month) => ({ month, file: `${month}.json`, count: byMonth.get(month).length })),
});

for (const failure of malformed) console.error(`Malformed export: ${failure.path} (${failure.reason})`);
console.log(JSON.stringify({ source, indexed: entries.length, malformed: malformed.length, shards: months }));

async function findExportJsonFiles(directory) {
  const discovered = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "viewer-index") continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) discovered.push(...await findExportJsonFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".json") && isDatedExportPath(relative(root, fullPath))) discovered.push(fullPath);
  }
  return discovered;
}

function isDatedExportPath(path) {
  return /^\d{4}-\d{2}-\d{2}\/exports\/[^/]+\.json$/.test(path.replaceAll("\\", "/"));
}

function buildEntry(value, path, sourceId, repo) {
  if (!isObject(value) || typeof value.survey_id !== "string" || value.survey_id.trim() === "") return null;
  const answers = isObject(value.answers) ? value.answers : {};
  const followups = isObject(value.followups) ? value.followups : {};
  const audioFiles = new Set();
  for (const answer of Object.values(answers)) {
    if (!isObject(answer) || !Array.isArray(answer.audio)) continue;
    for (const audio of answer.audio) if (isObject(audio) && typeof audio.file === "string" && audio.file) audioFiles.add(audio.file);
  }
  if (Array.isArray(value.voice_files)) for (const voice of value.voice_files) if (isObject(voice) && typeof voice.file === "string" && voice.file) audioFiles.add(voice.file);
  const uploaderDate = path.slice(0, 10);
  const fileName = basename(path);
  return {
    source: sourceId,
    path,
    github_blob_url: `https://github.com/${repo}/blob/main/${path.split("/").map(encodeURIComponent).join("/")}`,
    raw_json_url: `https://raw.githubusercontent.com/${repo}/main/${path.split("/").map(encodeURIComponent).join("/")}`,
    uploader_date: uploaderDate,
    exported_at: optionalString(value.exported_at),
    survey_id: value.survey_id,
    device_tag: deviceTagFromFileName(fileName),
    build: optionalString(value.build),
    question_count: Object.keys(answers).length,
    followup_count: Object.values(followups).reduce((count, entries) => count + (Array.isArray(entries) ? entries.length : 0), 0),
    audio_reference_count: audioFiles.size,
    availability: { build: typeof value.build === "string", ai_outcomes: value.ai_outcomes !== null && isObject(value.ai_outcomes), followups: isObject(value.followups), audio_references: audioFiles.size > 0 },
  };
}

function deviceTagFromFileName(fileName) {
  const match = /_survey_(.+_[A-F0-9]{12})_[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.json$/i.exec(fileName);
  return match?.[1];
}
function optionalString(value) { return typeof value === "string" ? value : undefined; }
function isObject(value) { return typeof value === "object" && value !== null && !Array.isArray(value); }
function parseArgs(values) {
  const result = new Map();
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index]; const value = values[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error("Expected --name value arguments.");
    result.set(key.slice(2), value);
  }
  return result;
}
function requiredArg(args, name) { const value = args.get(name); if (value === undefined || value === "") throw new Error(`Missing --${name}.`); return value; }
async function writeJson(path, value) { await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
