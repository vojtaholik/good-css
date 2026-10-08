# Contributing

good-css is an opinionated list, and the opinions are its author's. Pull requests are welcome for fixes. New entries and changes of opinion start as issues.

## Pull requests for fixes

A fix makes the list right on its own terms:

- Code in an entry that does not work, or does not do what the entry says.
- A browser version, a support note or a link that is wrong or out of date.
- A specimen that is broken or misleading.
- A typo, or a sentence that says something other than what it means.
- A bug in the site or the build.

Edit `PRACTICES.md`, never the files in `skills/good-css/references`. Run `bun run build` before you open the pull request. It fails on stale skill files and on CSS that breaks a rule in `SKILL.md`. [AGENTS.md](AGENTS.md) has the rest of the rules.

## Issues for everything else

Open an issue to propose a technique, to change an entry, or to argue with a rule. Say what an agent writes today, what it should write instead, and where the technique comes from. A pull request that adds an entry or changes an opinion is closed with a pointer to an issue, where the idea can still make it into the list.
