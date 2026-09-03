# BlueSpice versions

We have 2 active versions we are making releases for
- 5.1.x - corresponds to branch `REL1_43-5.1.x` on extensions (some extensions have different versioning on branches, but not imporatnat for now)
- 5.2.x - corresponds to branch `REL1_43-5.2.x` on extensions

Future new versions:
- 5.3.0 OR 6.0 (not fully decided yet, but probably will be 6.0) - corresponding branch `REL1_43`
- Galaxy (old name: Neo) - will be using the same codebase as 6.0, but with different set of extensions/features - also uses branch `REL1_43`

`master`/`main` branches are currently not used in any build/release, but they are kept up to date.

# Main code repositories

- gerrit (most of the extensions are on gerrit)
- https://gitlab.hallowelt.com/ - very few extensions
- https://github.com/BlueSpice-Wiki/mediawiki-extensions-... - new extensions used for Galaxy release  (they mostly only have `main` branch)

For all changes to non-gerrit repos, please make your change on a feature branch and submit a pull request.


# Commit message schema

When composing a commit message, make sure it has:

- title
- description
- target version tag
- ticket number

## Target version tag

Target version is written in square brackets. If ticket is planned for next patch release, you would write `[5.1.x]` or `[5.2.x]` (depending in the target version),
and if its planned for the next major/galaxy, you would write `[5.x]` (you will also see `[5.3]` or `[6.0]`, its all the same)

## Ticket number

Always write ticket number as `ERM123345`, as this convention is used for auto linking in tickets (when it works).

Example: see any of https://gerrit.wikimedia.org/r/q/ownerin:bluespice



