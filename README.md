# Backup Observatory (GitHub Backup)

A compact, multi-service system that clones, archives, and stores GitHub repositories into a single backup repository. It features a Go-based CLI worker, a Go/Postgres REST API & WebSocket backend, a Next.js frontend dashboard, and an AI-driven Agentic Observatory.

## Live

- **Live Demo**: https://github.mishrashardendu22.is-a.dev
- **YouTube Video**: https://www.youtube.com/watch?v=be0UBwk2asc

---

## Architecture Overview

This repository is structured as a monorepo containing the following core services:

1. **[Worker (CLI)](#worker-cli)**: The root-level Go application that handles the core logic of walking GitHub, deduplicating repositories, checking remote HEAD hashes, cloning, and archiving to a central `_Repos` git repository.
2. **[Backend API (`backend/`)](./backend/README.md)**: A Go web server connected to PostgreSQL that serves metrics, run history, and real-time logs via REST APIs and WebSockets.
3. **[Frontend Dashboard (`frontend/`)](./frontend/README.md)**: A Next.js application that provides a sleek, real-time UI for monitoring backup runs, metrics, and logs.
4. **[Agentic Observatory (`agentic-observatory/`)](./agentic-observatory/README.md)**: A Python-based agentic layer using FastAPI and OpenRouter to analyze and interact with the backup data.

---

## Worker (CLI)

The core backup engine is located in the root directory. It uses a lightweight SQLite database for local state management and metadata.

### Key Behaviors
- **Phase 1 (Hash Check)**: Computes remote HEAD concurrently to determine if a repository has changed.
- **Phase 2 (Clone & Archive)**: Shallow clones changed repositories, removes `.git`, and creates a `tar.gz` archive.
- **Phase 3 (Commit & Push)**: Commits the archive to the central `_Repos` git repository and pushes to a remote.

### Configuration & Environment
Create a `.env` file in the root directory (see `sample.env`):
- `ORG_ACCOUNT` / `PROJECT_ACCOUNT`: GitHub account targets.
- `DB_PATH`: SQLite file path (defaults to `./app.db`).
- `BACKUP_REPO_PATH`: The remote git URL for the `_Repos` directory.
- `GITHUB_TOKEN_PRIVATE` / `GITHUB_TOKEN_PERSONAL`: Authentication tokens.

### How to Run the Worker
Ensure you have the Go toolchain installed, along with `git` and `tar`.

```bash
# configure .env or export env vars
go run main.go
```

---

## Service Documentation

For detailed instructions on running and developing each service, please refer to their respective README files:

- 📖 **[Backend Documentation](./backend/README.md)**
- 📖 **[Frontend Documentation](./frontend/README.md)**
- 📖 **[Agentic Observatory Documentation](./agentic-observatory/README.md)**

---

## Contributing
Please follow the coding conventions already present in the repsitory. See `CONTRIBUTING.md` for a short guide.
