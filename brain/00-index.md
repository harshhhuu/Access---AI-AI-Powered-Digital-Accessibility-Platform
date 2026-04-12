# Brain index

Small, focused notes for the AccessAI repo. Add new topics as `NN-short-name.md` and link them here.

| Doc | Topic |
| --- | --- |
| [01-project-overview](01-project-overview.md) | Product intent, repo layout, main stack |
| [02-local-dev](02-local-dev.md) | Env file locations and how to run Node API, frontend, and sign-inference |
| [04-features-and-stack](04-features-and-stack.md) | How each feature works and what we use (stack + services) |
| [03-backend-python-to-node-migration](03-backend-python-to-node-migration.md) | Historical checklist (migration complete; monolith removed) |
| [05-node-migration-phased-plan](05-node-migration-phased-plan.md) | Phased implementation plan: Node API + Python sign service |
| [server/README.md](../server/README.md) | Node Fastify + Prisma API |
| [deploy/README.md](../deploy/README.md) | Phase 9 Compose stack, rollback / canary notes |

## Conventions

- One concern per file; prefer new files over long monoliths.
- Update [CHANGELOG](CHANGELOG.md) when knowledge or process changes in a way that matters to contributors.
