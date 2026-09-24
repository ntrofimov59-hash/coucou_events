# Contributing

Coucou Events is **proprietary software**. External contributions are accepted only with prior written agreement from the copyright holder.

## Invited / internal contributors

1. Agree on scope before large changes (issue or direct message).
2. Branch from `main`; keep commits focused.
3. Do not commit secrets, `agent/data/`, or production dumps.
4. If agent behavior or ops steps change, update **AGENTS.md**.
5. Prefer small PRs: either agent module **or** site feature, not both mixed without need.

## Code guidelines

- **Agent:** ESM (`import` / `export`), clear modules (`core`, `channels`, `store`, …)
- **Site:** Astro patterns already used under `src/`
- Avoid drive-by dependency upgrades in the same PR as feature work

## License of contributions

By submitting a contribution under an invitation, you assign or license that contribution to the copyright holder under the same proprietary terms as the project **LICENSE**, unless a separate written agreement says otherwise.
