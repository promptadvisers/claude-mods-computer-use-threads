// The smallest runnable check of the bg-backend helpers: `node tests/core-check.mjs`.
// No engine needed (claude plugin test runs the full suite in threads.test.ts).
import * as c from "../hooks/core.mjs";

let failed = 0;
const assert = (x, m) => {
  if (!x) {
    failed += 1;
    console.error("FAIL", m);
  } else console.log("ok  ", m);
};

const argv = c.buildSpawnArgv({ model: "haiku", sessionId: "6d11ea5f-e0f8-4ffe-a193-a7a36561f5c4", title: "Thread | X", permissionMode: "auto", brief: "B", task: "-weird", effort: "low", worktree: "threads-t6d11e" });
assert(argv[0] === "claude" && argv[1] === "--bg" && argv.includes("--worktree") && argv.at(-1) === "Task: -weird" && argv[argv.indexOf("--permission-mode") + 1] === "auto", "buildSpawnArgv: claude --bg with worktree, effort, mode, task last");
assert(!c.buildSpawnArgv({ model: "haiku", sessionId: "a", title: "t", permissionMode: "default", brief: "b", task: "x" }).includes("--permission-mode"), "buildSpawnArgv: default mode is not passed");
const resume = c.buildResumeArgv({ sessionId: "s", title: "T", model: "opus", effort: "high", permissionMode: "bypassPermissions", prompt: "go on" });
assert(resume.includes("--resume") && resume[resume.indexOf("--model") + 1] === "opus" && resume.at(-1) === "go on", "buildResumeArgv");
assert(c.parseBgStart("backgrounded · 6d11ea5f · Thread | prova", "x") === "6d11ea5f", "parseBgStart reads the printed id");
assert(c.parseBgStart("", "6d11ea5f-e0f8-4ffe-a193-a7a36561f5c4") === "6d11ea5f", "parseBgStart falls back to the uuid head");

const json = JSON.stringify({ projects: { "d:/work/my-project": { hasTrustDialogAccepted: true }, "/tmp/x": { hasTrustDialogAccepted: true } } });
assert(c.isTrusted(json, "D:\\work\\my-project"), "isTrusted: Windows backslashes and case");
assert(c.isTrusted(json, "D:/work/my-project/"), "isTrusted: trailing slash");
assert(c.isTrusted(json, "/private/tmp/x") && !c.isTrusted(json, "D:/work"), "isTrusted: /private spelling, exact folder only");

assert(c.resolvePath("~/x", { home: "C:/Users/tester", base: "D:/w" }) === "C:/Users/tester/x", "resolvePath: ~");
assert(c.resolvePath("sub\\dir", { home: "C:/Users/tester", base: "D:\\w" }) === "D:/w/sub/dir", "resolvePath: relative on Windows");
assert(c.resolvePath("D:\\a\\", { home: "", base: "" }) === "D:/a" && c.resolvePath("/usr/x", { home: "", base: "" }) === "/usr/x", "resolvePath: absolute both ways");

assert(c.statusOf({ previous: "starting", session: null, pidAlive: undefined, screen: null, now: 1000, createdAt: 0 }) === "starting", "statusOf: unregistered and young is starting");
assert(c.statusOf({ previous: "working", session: null, pidAlive: undefined, screen: null, now: 200000, createdAt: 0 }) === "exited", "statusOf: gone after two minutes is exited");
assert(c.statusOf({ previous: "starting", session: { status: "busy" }, pidAlive: true, screen: null, now: 0, createdAt: 0 }) === "working", "statusOf: busy");
assert(c.statusOf({ previous: "working", session: { status: "waiting" }, pidAlive: true, screen: null, now: 0, createdAt: 0 }) === "needs-you", "statusOf: waiting");
assert(c.statusOf({ previous: "working", session: { status: "idle" }, pidAlive: false, screen: null, now: 999999, createdAt: 0 }) === "exited", "statusOf: dead pid is exited");
assert(c.statusOf({ previous: "working", session: { status: "idle" }, pidAlive: true, screen: { needsLogin: true }, now: 0, createdAt: 0 }) === "needs-login", "statusOf: login screen wins");

assert(c.parsePids('"claude.exe","36352","Console","1","250 K"\n"node.exe","7196","Console","1","1 K"\n', true).has(36352), "parsePids: tasklist csv");
assert(c.parsePids(" 4000\n5001\n", false).has(5001), "parsePids: ps");

const reg = c.parseRegistry(JSON.stringify({ version: 1, cap: 4, threads: [{ id: "t1", sessionId: "6d11ea5f-e0f8-4ffe-a193-a7a36561f5c4", tmux: "thread-t1", status: "working", backend: "session" }, { id: "t2", sessionId: "", backend: "inline", status: "idle" }], plans: [] })).registry;
assert(reg.version === 2 && reg.threads[0].backend === "bg" && reg.threads[0].bgId === "6d11ea5f" && reg.threads[0].status === "exited" && !("tmux" in reg.threads[0]) && reg.threads[1].backend === "inline", "registry: version 1 rows migrate to bg");
assert(c.parseRegistry(c.serializeRegistry(reg)).registry.threads[0].bgId === "6d11ea5f", "registry: round trip");

assert(c.remoteLink({ bridgeSessionId: "cse_0136ay" }) === "https://claude.ai/code/session_0136ay", "remoteLink: cse_ id");
assert(c.remoteLink({ remoteUrl: "https://claude.ai/code/session_z" }) === "https://claude.ai/code/session_z", "remoteLink: url kept");
assert(c.attachCommand({ bgId: "6d11ea5f" }) === "claude attach 6d11ea5f", "attachCommand");
assert(c.resumeCommand({ cwd: "D:\\w x", sessionId: "s" }) === 'cd "D:/w x" && claude --resume s', "resumeCommand: Windows quoting");
assert(c.resumeCommand({ cwd: "/w x", sessionId: "s" }) === "cd '/w x' && claude --resume s", "resumeCommand: POSIX quoting");

const cost = c.costFromTranscript([JSON.stringify({ type: "assistant", message: { id: "m1", model: "claude-haiku-4-5-20251001", usage: { input_tokens: 10, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } }), JSON.stringify({ type: "cost-state", totalCostUSD: 0.1214266 })].join("\n"));
assert(Math.abs(cost.usd - 0.1214266) < 1e-9 && cost.source === "cost-state", "cost: Claude Code's own total wins");
assert(c.costFromTranscript(JSON.stringify({ type: "assistant", message: { id: "m1", model: "claude-haiku-4-5-20251001", usage: { input_tokens: 1000000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } })).usd === 1, "cost: price table when no cost-state");

assert(c.shortPath("C:\\Users\\tester\\.claude\\threads", 80) === "~/.claude/threads", "shortPath: Windows home");
assert(c.checkMode("lead").mode === "lead" && c.DEFAULT_MODE === "lead", "lead mode exists and is the default");
assert(c.bandText([{ status: "working", lastReport: null }, { status: "idle", lastReport: { at: 2 }, seenAt: 1 }]) === "⇶ 2 threads · 1 working · 1 new · /threads", "bandText");

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log("all core checks passed");
