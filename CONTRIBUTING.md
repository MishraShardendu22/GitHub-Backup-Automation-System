# Contributing

Thanks for your interest in contributing. A few quick notes to help you get started:

- Code style: follow existing conventions — idiomatic Go, short functions, clear logging via `util.Logger()`.
- Tests: this repo does not include automated tests; if adding features, include small, focused unit tests where practical.
- Branches: create a feature branch and open a PR against `main` using the [PR template](.github/PULL_REQUEST_TEMPLATE.md).
- Secrets: do not commit tokens or credentials. Use `.env` or environment variables locally.
- Issues: please use the [issue template](.github/ISSUE_TEMPLATE.md) when reporting bugs or suggesting features.
- Changelog: update [CHANGELOG.md](CHANGELOG.md) under the `[Unreleased]` section with your changes.
- Code of Conduct: all contributors must follow our [Code of Conduct](CODE_OF_CONDUCT.md).
- Security: if you find a security vulnerability, see [SECURITY.md](SECURITY.md) for disclosure instructions.
- Licensing: by contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
Just a quick note: please keep PRs focused and small — one feature or fix per PR is preferred.
