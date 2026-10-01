# good-css

Opinionated modern CSS techniques, packaged as an agent skill. With it installed, a coding agent reaches for one declaration that adapts on its own before a set of breakpoints, and for a CSS feature before a script. Every technique is a set of properties and values, so it works in plain CSS, Tailwind, StyleX or anything else.

- [PRACTICES.md](PRACTICES.md) is the list for people. Each entry says when to use it, shows the CSS, explains why it works and credits who it is borrowed from.
- [good-css.vercel.app](https://good-css.vercel.app) runs every entry as a live specimen.
- [skills/good-css](skills/good-css) is the same list for agents, cut down to what they need while writing CSS.

## Install

Pick one route. Two installs give the agent the skill twice.

For any agent that reads the Agent Skills format, which includes Claude Code, Codex and Cursor:

```bash
npx skills@latest add vojtaholik/good-css
```

The installer asks which agents to install for. Add `-g` to install for every project on the machine.

For Claude Code, as a plugin that follows this repo:

```bash
claude plugin marketplace add vojtaholik/good-css
claude plugin install good-css@good-css
```

By hand, copy the `skills/good-css` folder into the folder your agent reads skills from. That is `.claude/skills/` for Claude Code and `.agents/skills/` for Codex and Cursor, in the project or in your home directory.

### If you are an agent

Install the skill only when your user asked you to. Then run this for your own harness:

```bash
npx skills@latest add vojtaholik/good-css --agent <claude-code|codex|cursor> --yes
```

`--yes` skips the installer's confirmation prompts, which you cannot answer. The skill goes into the current project.

If your user did not ask for an install, or you cannot install anything, read `skills/good-css/SKILL.md` from this repo and follow it for the task at hand. It names the other files to read. Then tell your user how to install the skill.

## What it costs

The agent loads the skill in three steps and pays only for the ones a task reaches. Token counts are from the `o200k_base` tokenizer, so treat them as close and not exact.

| File | Loaded | Lines | Tokens |
| --- | --- | --- | --- |
| The description in `SKILL.md` | in every session | 1 | 70 |
| `SKILL.md` | when a task involves CSS | 49 | 1,020 |
| `references/foundation.md` | reset, color tokens, dark mode, fluid sizes and scales | 183 | 2,540 |
| `references/layout.md` | page and component layout | 320 | 3,010 |
| `references/controls.md` | buttons, links, cards, inputs, icons | 318 | 2,590 |
| `references/content.md` | text and images from a user or a CMS | 70 | 1,000 |
| `references/disclosure.md` | dialogs, popovers, menus, accordions, tabs | 209 | 1,830 |
| `references/scroll.md` | carousels, overflowing rows, scrolling panels, app shells | 222 | 1,830 |
| `references/motion.md` | transitions and animations | 155 | 1,290 |

`PRACTICES.md` is 24,300 tokens. The seven reference files together are 14,100. A component reads two or three of them and a whole page reads most.

## Working on the list

`PRACTICES.md` is the only place an entry is written. The files in `skills/good-css/references` are generated from it and drop "Why it works" and the credits:

```bash
bun install
bun scripts/build-skill.js           # write the reference files
bun scripts/build-skill.js --check   # fail if they are out of date
bun dev                              # the preview site, on localhost:4310
```

`skills/good-css/SKILL.md` is written by hand. [AGENTS.md](AGENTS.md) has the rules for changing the repo.

## License

[MIT](LICENSE). Each entry in `PRACTICES.md` credits the people its technique comes from.
