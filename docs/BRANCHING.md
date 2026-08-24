# Branching and production releases

This fork uses two long-lived branches.

## `master`

`master` stays aligned with `mattogodoy/nametag:master`.

Start work here when the change could be contributed upstream. Open the upstream pull request from the feature branch. Do not merge home-only changes into `master`.

## `prod`

`prod` is the reviewed source for Ben's self-hosted Nametag.

Start home-only feature branches from `prod` and merge them back into `prod` through a pull request after checks pass. Production deploys an exact commit from `prod`, not the moving branch name.

Upstream updates reach production by first syncing `master`, then opening a reviewed `master` to `prod` pull request.

## Promotion rules

- No automatic deployment from pushes.
- Require pull request checks before merging to `prod`.
- Build and deploy the exact approved commit.
- Preserve the previous artifact and database/photo backups for rollback.
- Verify health, a real static asset, authenticated People rendering, CardDAV invariants, and integration timers after deployment.
