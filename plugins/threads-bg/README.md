# Threads 0.6.1 (claude --bg)

One Claude Code chat (the lead) starts other Claude Code sessions ("threads") on
the models you choose, watches them in a side panel, sends them messages and
gets each one's final answer back in the chat, once. Threads is the Prompt
Advisers mod (0.5.3) ported from tmux to Claude Code's own background
sessions, so it runs on Windows as well as macOS and Linux.

## What a thread is

A real `claude --bg` session: its own process, model, permission mode, Remote
Control link and transcript. It is not a subagent of the lead. The lead reads
its state from `~/.claude/sessions/<pid>.json`, its output from
`~/.claude/projects/<folder>/<session>.jsonl`, its screen from `claude logs
<id>`, and ends it with `claude stop <id>`. An inline backend (a background
agent of the lead chat) remains for when the terminal CLI is not logged in.

## What you need

- Claude Code with the mod API (function hooks) and a CLI that knows
  `claude --bg` (2.1.289 was used). `/threads setup` checks both.
- `claude auth login` done once in a terminal.
- A trusted folder to work in (open Claude Code there once and accept the
  trust prompt). Threads never accept trust for you.
- Windows: nothing else. No tmux, no WSL, no coreutils.

## Install

From the kit folder that holds `.claude-plugin/marketplace.json` (this
repository), after `claude auth login`:

```
claude plugin marketplace add /path/to/claude-mods-computer-use-threads
claude plugin install threads-bg@two-mods
```

Or `python3 scripts/setup.py --component threads-bg --apply` from the kit
root. Start a new chat afterwards. Update later with `claude plugin update
threads-bg@two-mods`. Install either `threads` (tmux) or `threads-bg`, not
both: they share the `/threads` command and the registry under
`~/.claude/threads`.

Developing it: the plugin-authoring skill's hot reload loads the folder in the
current session and reloads it on every save.

## Use it

Plain English works: "start a Haiku thread to list the files and an Opus
thread to review the README", "tell the reviewer to be brief", "wait for both",
"close the scout". Or the command:

| Command | What it does |
|---|---|
| `/threads` | open or close the panel (status dot, model, cost, "new" tag, buttons) |
| `/threads new <model> <title> -- <task>` | start one; flags: `--mode`, `--effort`, `--cwd`, `--worktree`, `--inline`, `--no-report` |
| `/threads list` · `read <id>` · `screen <id>` | what each one is doing (transcript or `claude logs`) |
| `/threads send <id> <message>` | a message it reads mid-task; a stopped thread resumes with it |
| `/threads interrupt <id>` | `claude stop`: the process ends, the conversation stays |
| `/threads model <id> <model>` · `effort <id> <level>` | resumes the same conversation on the new model or effort |
| `/threads open <id>` | Remote Control page, `claude attach <id>`, resume command |
| `/threads close <id>` | end it (the chat's own command needs no confirmation) |
| `/threads plan start <title> -- <model> <Name>: <task> \|\| ...` | phases one at a time with handoff files; gates auto, lead or user |
| `/threads fork` · `handoff` · `rename` · `pin` · `archive` · `adopt` · `history` · `setup` · `mode` · `cap` · `clean` | as in 0.5.3 |

Models: `haiku`, `sonnet`, `opus`, `fable` or a full `claude-*` id.

## Permission modes

A thread runs in the lead chat's own mode by default (`lead`). Claude Code
holds messages between sessions of different permission classes in a dialog,
and a hidden session has nobody to answer it, so same mode means messages
always arrive. `/threads mode <mode>` or `--mode` changes that per install or
per thread. A thread that stops on a permission prompt is answered by you in a
terminal: `claude attach <id>` (the panel shows the command).

## What changed from 0.5.3

- Backend: `claude --bg` instead of tmux. `claude logs`, `claude stop`,
  `claude attach`, `claude --bg --resume`.
- Gone: typing into a thread's prompt, Escape, approve/deny keys, the held
  message auto-delivery, the native-threads skill. `interrupt` now stops.
- New: model and effort changes by resume; a message to a stopped thread
  resumes it; Windows paths, `USERPROFILE`, `cmd.exe` for folders,
  `tasklist` for liveness; Claude Code's own `cost-state` total when present.
- Registry format 2; a 0.5.x registry is read, its tmux rows shown as exited.

## Session ids

`claude --bg` may file a thread under its own session id instead of the one the mod passes; the
short id it prints is the prefix of the real one. The mod follows that prefix (sessions json or
transcript file name) and rewrites the registry row, logging a `session-id` event. Fixed in 0.6.1
after the first live run on Windows.

## Files it writes

`~/.claude/threads/registry.json` (every thread, shared by all chats),
`~/.claude/threads/events.jsonl` (every action), `~/.claude/threads/plans/`
(one JSON and one Markdown per plan), `~/.claude/threads/forks/` (full-transcript
forks), `<project>/handoff/` (what plan phases leave for each other).

## Cost

The number next to each thread is an estimated API-equivalent cost: Claude
Code's own running total from the transcript when it writes one, else list
prices applied to the transcript's usage. It is not your bill.

## Tests

`claude plugin test <this folder>`: 92 cases against a simulated host (POSIX
and Windows worlds), no real sessions. `node tests/core-check.mjs`: the pure
helpers alone. `claude plugin validate <this folder>` must pass after every
change.

## Limits

- A thread that asks for permission waits until you attach to it. Use `lead`,
  `bypassPermissions` or `auto` modes to avoid prompts.
- Remote Control visibility in the desktop sidebar depends on your account.
- Separate worktrees stop two threads from editing the same files; merging can
  still conflict.
- `claude logs` starts a CLI process, so the screen is read only when a thread
  waits on something or when you open the screen view.
