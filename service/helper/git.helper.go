package helper

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/MishraShardendu22/github-backup/model"
	"github.com/MishraShardendu22/github-backup/util"
	"go.uber.org/zap"
)

const (
	pushTimeout  = 20 * time.Minute
	cloneTimeout = 20 * time.Minute
)

/*
Ensure the repo exist, it does always,
if it does not it is created via initialisation script this is just for safety
*/
func EnsureReposDirExists() error {
	cmd := exec.Command("mkdir", "-p", "_Repos")
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to create _Repos directory: %v: %s", err, string(out))
	}

	return nil
}

/*
Ensure that backup directory(_Repos) exist locally
if it exists and there is no .git (basically empty) then we will set its remote url (alwasy exist on github)
*/
func EnsureBackupRepoInitialized(config *model.ConfigModel) error {
	if _, err := os.Stat("_Repos/.git"); err == nil {
		util.Logger().Info("Backup repository already initialized; skipping init")

		if config.BackupRepoPath != "" {
			// Try updating existing remote.
			// If remote doesn't exist - create it.
			updateRemoteCmd := exec.Command("sh", "-c", fmt.Sprintf("cd _Repos && git remote set-url origin '%s' 2>/dev/null || git remote add origin '%s'", config.BackupRepoPath, config.BackupRepoPath))
			if out, err := updateRemoteCmd.CombinedOutput(); err != nil {
				util.Logger().Warn("Failed to update remote URL",
					zap.Error(err),
					zap.String("output", string(out)),
				)
			}
		}

		return nil
	}

	backupRepoPath := config.BackupRepoPath
	if backupRepoPath == "" {
		return fmt.Errorf("BACKUP_REPO_PATH is not set; cannot initialize backup repository")
	}

	initScript := buildInitScript(backupRepoPath)
	return retryCommand(func() *exec.Cmd {
		return exec.Command("sh", "-c", initScript)
	}, "Initial git setup", pushTimeout)
}

/*
git ls-remote, gets the latest commit hash of the repository
basically what commit does HEAD currently point to

// this usually happens when the repo exist but its empty (exprience lol)

	if len(fields) == 0 {
		return "", fmt.Errorf("git ls-remote returned no hash")
	}
*/
func GetRemoteHeadHash(repoURL string) (string, error) {
	out, err := exec.Command("git", "ls-remote", repoURL, "HEAD").CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("git ls-remote failed: %v: %s", err, strings.TrimSpace(string(out)))
	}

	fields := strings.Fields(string(out))
	if len(fields) == 0 {
		return "", fmt.Errorf("git ls-remote returned no hash")
	}

	return fields[0], nil
}

/*
remove a certain repository
*/
func CleanupExistingRepo(repoName string) {
	cleanupCmd := exec.Command("sh", "-c", fmt.Sprintf("cd _Repos && rm -rf '%s' '%s.tar.gz'", repoName, repoName))
	if _, err := cleanupCmd.CombinedOutput(); err != nil {
		util.Logger().Warn("Repository cleanup failed",
			zap.String("repository", repoName),
			zap.Error(err),
		)
	}
}

/*
Shallow clone the working tree (non-bare)
then remove the .git directory so only the latest code remains
*/
func CloneRepo(url string, repoName string) error {
	return retryCommand(func() *exec.Cmd {
		return exec.Command("sh", "-c", fmt.Sprintf("cd _Repos && git clone --depth=1 '%s' '%s' && rm -rf '%s/.git'", url, repoName, repoName))
	}, fmt.Sprintf("Clone %s", repoName), cloneTimeout)
}

/*
	    create a shell instace
		go inside the _Repos,
		archive (compressed) the repo (tar -czf)
			-c: Create a new archive (bundling).
			-z: Compress the archive using gzip (compression).
			-f: Specify the filename of the archive.
*/
func ArchiveRepo(repoName string) error {
	repoDir := fmt.Sprintf("%s", repoName)
	archiveName := fmt.Sprintf("%s.tar.gz", repoName)

	return retryCommand(func() *exec.Cmd {
		return exec.Command(
			"sh",
			"-c",
			fmt.Sprintf(
				"cd _Repos && tar -czf '%s' '%s' && rm -rf '%s'",
				archiveName,
				repoDir,
				repoDir,
			),
		)
	}, fmt.Sprintf("Archive %s", repoName), cloneTimeout)
}

/*
stages a file and creates a git commit only if there are actual changes.
git diff --staged --quiet
0 -> no staged changes
1 -> staged changes exist

--quiet (Don't print output, Just tell me through the exit code whether differences exist.)
--staged (Only check the staging area)
*/
func StageAndCommitRepo(repoName string, commitMsg string) error {
	operation := fmt.Sprintf("Commit %s", repoName)
	// Use retryCommand to handle transient/local locking issues and give multiple attempts
	return retryCommand(func() *exec.Cmd {
		return exec.Command("sh", "-c",
			fmt.Sprintf("cd _Repos && git add '%s' && "+
				"if git diff --staged --quiet; then "+
				"  echo 'no changes'; "+
				"else "+
				"  git commit -m '%s' -s; "+
				"fi", repoName, commitMsg))
	}, operation, 2*time.Minute)
}

/*
this is used to push the commited repo
core.compression = 0
  - git push normally compresses objects before sending them.
  - i am already compressing the files
  - compressing the commit will be bad as it will waste CPU and gains little.
*/
func PushBackupRepo(label string) error {
	return retryCommand(func() *exec.Cmd {
		cmd := exec.Command(
			"git",
			"-c", "core.compression=0",
			"push",
			"origin",
			"main",
		)

		cmd.Dir = "_Repos"
		return cmd
	}, fmt.Sprintf("Push (%s)", label), pushTimeout)
}

/*
Initialisation script, usually runs only the first time
*/
func buildInitScript(backupRepoPath string) string {
	return fmt.Sprintf(`cd _Repos && \
		git init && \
		git config user.email "shardendumishra01@gmail.com" && \
		git config user.name "ShardenduMishra22" && \
		git checkout -B main && \
		touch README.md && \
		git add README.md && \
		git commit -m 'init: Initial commit' -s && \
		git remote add origin '%s' && \
		git push origin main || (git pull --no-rebase --allow-unrelated-histories origin main --no-edit && git push origin main) && \
		cd ..`, backupRepoPath)
}
