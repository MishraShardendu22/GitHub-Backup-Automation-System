package handlers

import (
	"context"
	"time"

	"github.com/MishraShardendu22/github-backup/backend/db"
	"github.com/MishraShardendu22/github-backup/backend/models"
	"github.com/gofiber/fiber/v2"
)

/*
	Backup Handler

	GetBackupRuns()
	- Returns a paginated list of backup runs.

	GetBackupRun()
	- Backup Run + All repository results belonging to that run

	GetLatestBackup
	- Returns only the newest backup run.
*/

func GetBackupRuns(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 20)
	offset := c.QueryInt("offset", 0)

	// mark the stale run first
	ctx := context.Background()
	if _, err := db.FinalizeStaleRunningRuns(ctx, 30*time.Minute); err != nil {
		_ = err
	}

	rows, err := db.Pool.Query(ctx,
		`SELECT id, status, started_at, completed_at, total_repos, successful, failed, skipped, duration_ms, error_message
		 FROM backup_runs ORDER BY started_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	// populate the run data
	var runs []models.BackupRun
	for rows.Next() {
		var r models.BackupRun

		// if error found while scanning return that
		if err := rows.Scan(&r.ID, &r.Status, &r.StartedAt, &r.CompletedAt, &r.TotalRepos,
			&r.Successful, &r.Failed, &r.Skipped, &r.DurationMs, &r.ErrorMessage); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		// append all indivisual run data
		runs = append(runs, r)
	}

	// no runs
	if runs == nil {
		runs = []models.BackupRun{}
	}

	return c.JSON(runs)
}

func GetBackupRun(c *fiber.Ctx) error {
	id := c.Params("id")

	var r models.BackupRun
	err := db.Pool.QueryRow(context.Background(),
		`SELECT id, status, started_at, completed_at, total_repos, successful, failed, skipped, duration_ms, error_message
		 FROM backup_runs WHERE id = $1`, id).Scan(
		&r.ID, &r.Status, &r.StartedAt, &r.CompletedAt, &r.TotalRepos,
		&r.Successful, &r.Failed, &r.Skipped, &r.DurationMs, &r.ErrorMessage)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "run not found"})
	}

	rows, err := db.Pool.Query(context.Background(),
		`SELECT id, run_id, repo_full_name, status, commit_hash, archive_size_bytes, duration_ms, error_message, created_at
		 FROM backup_results WHERE run_id = $1 ORDER BY created_at`, id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var results []models.BackupResult
	for rows.Next() {
		var br models.BackupResult
		if err := rows.Scan(&br.ID, &br.RunID, &br.RepoFullName, &br.Status, &br.CommitHash,
			&br.ArchiveSizeBytes, &br.DurationMs, &br.ErrorMessage, &br.CreatedAt); err != nil {
			continue
		}
		results = append(results, br)
	}

	if results == nil {
		results = []models.BackupResult{}
	}

	return c.JSON(fiber.Map{"run": r, "results": results})
}

func GetLatestBackup(c *fiber.Ctx) error {
	ctx := context.Background()
	if _, err := db.FinalizeStaleRunningRuns(ctx, 30*time.Minute); err != nil {
		_ = err
	}

	var r models.BackupRun
	err := db.Pool.QueryRow(ctx,
		`SELECT id, status, started_at, completed_at, total_repos, successful, failed, skipped, duration_ms, error_message
		 FROM backup_runs ORDER BY started_at DESC LIMIT 1`).Scan(
		&r.ID, &r.Status, &r.StartedAt, &r.CompletedAt, &r.TotalRepos,
		&r.Successful, &r.Failed, &r.Skipped, &r.DurationMs, &r.ErrorMessage)
	if err != nil {
		return c.JSON(fiber.Map{"run": nil})
	}
	return c.JSON(fiber.Map{"run": r})
}

/*

Query vs QueryRow

Query
	rows, err := db.Pool.Query(...)
	Use when expecting 0..N rows

	Examples:

	all users
	all backup runs
	all logs

QueryRow
	row := db.Pool.QueryRow(...)
	Use when expecting exactly one row

	Examples:

	user by id
	backup by id
	latest backup
*/ 