# SLT Changelog

Releases of the SLT-maintained Directus v11 line. Each release is based on upstream Directus v11.17.4 plus the changes
listed here.

Add a changeset for every change in `.changeset/`, naming it `<short-description>-slt.md`. Changesets that come in with
upstream backports keep their original names. To cut a release, run `node .github/scripts/release-slt.js <version>`,
review this file, commit and tag `v<version>`.

## 11.18.0-slt.1 (2026-10-22)

### SLT

- **@directus/api, @directus/app**: Updated dependencies to address known CVEs, including sharp 0.35, nodemailer 10 and
  pm2 7 ([0d7cf49b0](https://github.com/musadimas/directus/commit/0d7cf49b0))

### Backported from upstream

- **@directus/api**: Added a namespace to shares cache keys (GHSA-c6w9-5g5j-jh2p)
  ([2d218678a](https://github.com/musadimas/directus/commit/2d218678a))
- **@directus/api**: Updated IP blocking to deny 0.0.0.0/8 and :: (GHSA-j5h6-vqc3-phqh)
  ([0e9ac0376](https://github.com/musadimas/directus/commit/0e9ac0376))
- **@directus/app**: Updated MapLibre GL JS from 1.15.3 to 6.9.0
  ([fce133a8d](https://github.com/musadimas/directus/commit/fce133a8d))

  ::: notice

  The map layout and the geometry interface now require WebGL2, which MapLibre has mandated since v3. Browsers that only
  support WebGL1, chiefly Safari 14 and earlier and older Android devices, will no longer render maps.

  Dragging with a pointer or a mouse wheel keeps the hovered item popup pinned to the cursor as before. Touch drags no
  longer reposition it, since the underlying touch event carries no cursor coordinates.

  :::

- **@directus/api**: Updated stream-json from 1.9.1 to 3.6.0
  ([7b7570f54](https://github.com/musadimas/directus/commit/7b7570f54))
