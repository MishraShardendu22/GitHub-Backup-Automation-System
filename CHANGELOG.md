# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Backup Observatory (GitHub Backup)
- Worker (CLI) for cloning, archiving, and pushing GitHub repositories
- Backend (Dashboard/API) with PostgreSQL-backed metrics, run history, and live logs
- WebSocket endpoint for real-time log streaming
- AI assistant integration via OpenRouter for risk assessment
- REST API for backups, metrics, analytics, and system status
- PDF report generation for backup summaries
- Email notifications via SMTP (Gomail)
- Frontend dashboard built with Next.js, Tailwind CSS, and Recharts
- SSH multiplexing configuration for multiple GitHub accounts
- SQLite metadata tracking for repo hash deduplication and failure logging
- Parallel repository processing with `parallelHashCheck` and `parallelCloneAndArchive`
- Automatic large-file detection (archives >95MB are skipped)