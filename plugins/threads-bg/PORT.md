# Threads 0.6 · port to `claude --bg` (Windows first)

Source: Two Mods kit, threads 0.5.3 (tmux backend, macOS). Decision:
2026-10-05: full port, not a minimal rewrite. Spike proved on Windows 11 /
CLI 2.1.289: `claude --bg` helpers start hidden, register in
`~/.claude/sessions/<pid>.json`, write `~/.claude/projects/<slug>/<sid>.jsonl`,
get a Remote Control link, answer `claude logs <id>` / `claude stop <id>`.
`Start-Process -WindowStyle Hidden` does NOT work. tmux is gone.

## Backend mapping (tmux → bg)

| 0.5.3 (tmux)                         | 0.6 (bg)                                                        |
|--------------------------------------|-----------------------------------------------------------------|
| `tmux new-session -d … claude …`     | `claude --bg --session-id … -n … --remote-control … <task>`     |
| `tmux list-panes` (alive/dead)       | `~/.claude/sessions/*.json` + pid alive (`tasklist` / `ps`)     |
| `tmux capture-pane` (screen)         | `claude logs <bgId>` (readScreen still parses it)               |
| `tmux send-keys` (type / Enter)      | not available → message channel only (`$.session.send`)         |
| `send-keys Escape` (interrupt)       | `claude stop <bgId>` (hard stop, resumable)                     |
| `/model`, `/effort` typed            | stop + `claude --bg --resume <sid> --model … --effort …`        |
| approve / deny keys                  | not available → tell the user `claude attach <bgId>`            |
| held-message Down+Enter              | avoided: helper runs in the LEAD's permission mode by default   |
| `kill-session`                       | `claude stop <bgId>`                                            |
| `tmux attach`                        | `claude attach <bgId>`                                          |
| `mkdir -p`, `tee`, `mv`, `rm`, `rmdir`, `tail`, `ps`, `sleep`, `uuidgen`, `open` | `$.fs` + `$.clock.sleep` + `crypto.randomUUID` + host adapter (`cmd /c mkdir|rmdir|start` on Windows, posix tools elsewhere) |
| `HOME`, `startsWith("/")`, `/private/tmp` | `HOME ?? USERPROFILE`, `isAbsolute()` for `C:\`, `/`, `\\`, trust keys compared slash- and case-insensitively on Windows |
| transcript at `projects/<slug(cwd)>` | same, else scan `projects/*/<sid>.jsonl` once and cache          |
| Codex computer-use lease (daemon.sock) | kept behind an exists() check; never present on Windows        |

## Registry

`version: 2`. Session rows carry `backend: "bg"`, `bgId`, `remoteUrl`. Version 1
rows (tmux) are read and shown as `exited` unless a sessions json still claims
their session id.

## Order (the build prompt's)

1. core.mjs host-neutral helpers + spawn argv  → unit tests
2. threads.mjs: paths/host adapter, create, refresh, watcher, close, open  → one real Haiku helper in the pane
3. message + report back (same permission mode)  → real check
4. plans, worktrees, fork/handoff, model/effort via resume, setup, README
5. two real Haiku helpers in a trusted project folder, gated plan, worktree

## Status (2026-10-05, end of the first build turn)

- Steps 1-4 of the order above are written: core.mjs, threads.mjs, types, plugin.json 0.6.0, README.
- `claude plugin validate`: clean. `claude plugin test`: 90 pass, 0 fail (POSIX world + Windows world).
  `node tests/core-check.mjs`: 31 checks pass.
- Permanent copy: the kit's `plugins/threads-bg` (0.5.3 kept beside it as
  `plugins/threads-0.5.3-tmux`); install from there with the marketplace commands in README.
- Still to do: the live checks of step 5 in this lead chat once the mod is loaded (one Haiku helper,
  a message, one report; two helpers; a small gated plan; a worktree thread), then install.
- Validator gotchas met: a function that takes `$` but is no longer called from any hook makes
  `plugin validate` fail with a misleading error about a state const (SURFACE); an escaped backslash
  before a closing quote and a regex literal holding quotes were also removed to be safe. The test
  runner on Windows resolves POSIX paths to `C:\...` before a stub sees them: the stub normalizes.

## Dropped (not portable, documented in README)

- `/threads type`, `approve`, `deny`, `interrupt` (Escape). `interrupt` now stops.
- native-threads skill (ccd_* desktop tools recipe): not part of the bg route.
- tmux env scrubbing: the spike showed a nested `claude --bg` works with the
  lead's env; `ponytail:` revisit if a helper ever mistakes itself for a child.

## Status (2026-10-06, first live test on Windows, CLI 2.1.289)

- `/threads setup` passed; `/threads new haiku prova -- ...` started a real `claude --bg` session and it answered.
- Bug found live: `claude --bg` DROPS the `--session-id` it is given and relaunches itself under a
  fresh id (the printed short id is that fresh id's prefix). The mod looked up state and transcript
  under the id it had passed, saw nothing, marked the thread `exited` after two minutes and never
  reported. Fix in 0.6.1: `sessionByPrefix` / `resolveSessionId` (settle and the refresh loop follow
  the printed short id through the sessions json or the transcript file name; a `session-id` event
  is logged; the registry row is patched). Tests: two cases under "reports and monitoring" with the
  stub option `ownIds`. 92 pass.
- Seen, not fixed: the lead's permission mode read from its transcript came back `default` while the
  lead was in `auto` (the permission-mode row was not there yet at spawn time). The thread still
  accepts the lead's messages (`crossSessionInbound: accept` is passed), and the report path is the
  watcher, which does not depend on message classes.
- Still to prove live: send mid-task, two threads at once, a gated plan, a worktree thread.
