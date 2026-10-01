# good-css

`PRACTICES.md` is the list, written for people, and the only place an entry is written. Two things are built from it: the agent skill in `skills/good-css`, and the preview site in `harness/` and `deploy/`.

## If you were sent here to use the skill

Install it the way `README.md` says. If you cannot install anything, read `skills/good-css/SKILL.md` and follow it.

## If you are changing the repo

- Never edit `skills/good-css/references/`. Edit `PRACTICES.md`, then run `bun scripts/build-skill.js`. With `--check` the script writes nothing and fails when the files are out of date.
- A new entry needs a place in the `files` map in `scripts/build-skill.js`, and the script stops until it has one. If the entry is for a kind of task the table in `SKILL.md` does not name, add that task to the table.
- `SKILL.md` is written by hand and loads on every CSS task. Put in it only what every task needs, and keep entry text out of it.
- After a change to `SKILL.md`, give each prompt in `scripts/skill-evals.json` to a fresh agent, once with the skill and once without, and check the output against the expectations listed there.
- `.claude-plugin/plugin.json` has no `version` on purpose. Without one Claude Code uses the commit as the version, so an installed plugin follows the repo.
- The repo is public. Write no path from your own machine into any file.
- Every code block in an entry runs verbatim in that entry's specimen. `harness/README.md` has the rules for entries and fixtures.
