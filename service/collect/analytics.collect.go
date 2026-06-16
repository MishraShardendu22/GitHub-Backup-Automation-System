package collect

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/MishraShardendu22/github-backup/backend/models"
	"github.com/MishraShardendu22/github-backup/config"
	"github.com/MishraShardendu22/github-backup/model"
	"github.com/MishraShardendu22/github-backup/service/helper"
	"github.com/MishraShardendu22/github-backup/service/monitor"
)

type commitItem struct {
	SHA    string `json:"sha"`
	Commit struct {
		Message string `json:"message"`
		Author  struct {
			Date time.Time `json:"date"`
		} `json:"author"`
	} `json:"commit"`
}

type commitResult struct {
	commit commitItem
	err    error
}

type countResult struct {
	count int
	err   error
}

var (
	repoWorkers     = 5
	defaultRepoPath = "_Repos"
	githubOwner     = config.LoadConfig().ProjectAccount
)

// generate the analytics for all the repos and save them to the database using the monitor
func GenerateAnalytics(repoNames []string, mon *monitor.Monitor) error {
	if mon == nil {
		return fmt.Errorf("monitor is nil")
	}

	if len(repoNames) == 0 {
		return nil
	}

	// gets local analytics (this is the same for all repos since its just based on the files in the _Repos directory, so we only need to get it once and pass it to each repo analytics collection)
	local, err := GetLocalAnalytics()
	if err != nil {
		return err
	}

	runID := mon.RunID()
	snapshots := make([]*models.RepoAnalyticsSnapshot, len(repoNames))

	var wg sync.WaitGroup
	sem := make(chan struct{}, repoWorkers)

	var mu sync.Mutex
	var firstErr error

	// iterating through the repo names
	for i, repoName := range repoNames {
		wg.Add(1)
		go func(i int, repoName string) {
			defer wg.Done()

			sem <- struct{}{}
			defer func() { <-sem }()

			// collect repo analytics for this repo
			snapshot, err := CollectRepoAnalytics(repoName, runID, local)
			if err != nil {
				mu.Lock()
				if firstErr == nil {
					firstErr = err
				}
				mu.Unlock()
				return
			}

			snapshots[i] = snapshot
		}(i, repoName)
	}

	wg.Wait()

	if firstErr != nil {
		return firstErr
	}

	// saving the analytics for each repo to the database during that run
	for _, snapshot := range snapshots {
		if snapshot == nil {
			continue
		}
		
		if err := mon.SaveAnalyticsSnapshot(snapshot); err != nil {
			return err
		}
	}

	return nil
}

// collect the analytics for One Repo and return the snapshot 
func CollectRepoAnalytics(repoName string, runID int, local *model.LocalAnalytics) (*models.RepoAnalyticsSnapshot, error) {
	if local == nil {
		return nil, fmt.Errorf("local analytics is nil")
	}

	snapshot := &models.RepoAnalyticsSnapshot{
		CapturedAt: time.Now().UTC(),
		RunID:      &runID,
	}

	analytics, err := GetGitHubRepoAnalytics(repoName)
	if err != nil {
		return nil, err
	}

	snapshot.HeadCommit = analytics.HeadCommit
	snapshot.HeadCommitMessage = analytics.HeadCommitMessage
	snapshot.HeadCommitAt = &analytics.HeadCommitAt
	snapshot.TotalCommits = analytics.TotalCommits
	snapshot.BranchCount = analytics.BranchCount
	snapshot.TagCount = analytics.TagCount

	snapshot.TrackedFiles = local.TrackedFiles

	snapshot.TotalBlobSizeBytes = local.TotalBlobSizeBytes
	snapshot.AvgBlobSizeBytes = local.AvgBlobSizeBytes
	snapshot.LargestBlobPath = local.LargestBlobPath
	snapshot.LargestBlobSizeBytes = local.LargestBlobSizeBytes

	snapshot.ArchiveCount = local.ArchiveCount
	snapshot.TotalArchiveSizeBytes = local.TotalArchiveSizeBytes
	snapshot.AvgArchiveSizeBytes = local.AvgArchiveSizeBytes
	snapshot.LargestArchivePath = local.LargestArchivePath
	snapshot.LargestArchiveSizeBytes = local.LargestArchiveSizeBytes

	return snapshot, nil
}

// get the analytics snapshot for a repo and save it to the database using the monitor
func GetGitHubRepoAnalytics(repo string) (*model.GitHubRepoAnalytics, error) {
	// get the github token from the environment variable, to avoid rate limits
	token := config.LoadConfig().GitHubTokenPersonal
	if token == "" {
		return nil, fmt.Errorf("GITHUB_TOKEN_PERSONAL is not configured")
	}

	// since we have 4 seperate go rountien we need 4 channels to store the results
	// each channel will have a buffer of 1, since we only need to store one result in each channel
	tagCh := make(chan countResult, 1)
	totalCh := make(chan countResult, 1)
	branchCh := make(chan countResult, 1)
	commitCh := make(chan commitResult, 1)

	// getting the latest commit
	// only need the latest so we can just get the first one from the commits endpoint
	go func() {
		var commits []commitItem
		err := helper.FetchGitHubJSON(
			http.MethodGet,
			fmt.Sprintf("https://api.github.com/repos/%s/%s/commits?per_page=1", githubOwner, repo),
			token,
			&commits,
		)
		if err != nil {
			commitCh <- commitResult{err: err}
			return
		}
		if len(commits) == 0 {
			commitCh <- commitResult{err: fmt.Errorf("no commits found for repo %s", repo)}
			return
		}
		commitCh <- commitResult{commit: commits[0]}
	}()

	// paginated fetch to get the total number of commits, branches, and tags
	go func() {
		count, err := helper.CountGitHubItems(
			fmt.Sprintf("https://api.github.com/repos/%s/%s/commits", githubOwner, repo),
			token,
		)
		totalCh <- countResult{count: count, err: err}
	}()
	go func() {
		count, err := helper.CountGitHubItems(
			fmt.Sprintf("https://api.github.com/repos/%s/%s/branches", githubOwner, repo),
			token,
		)
		branchCh <- countResult{count: count, err: err}
	}()
	go func() {
		count, err := helper.CountGitHubItems(
			fmt.Sprintf("https://api.github.com/repos/%s/%s/tags", githubOwner, repo),
			token,
		)
		tagCh <- countResult{count: count, err: err}
	}()

	// wait for all the results to come in
	tagRes := <-tagCh
	totalRes := <-totalCh
	commitRes := <-commitCh
	branchRes := <-branchCh
	
	// then check for errors (this is pushing the results to the channels)
	if commitRes.err != nil {
		return nil, commitRes.err
	}
	if totalRes.err != nil {
		return nil, totalRes.err
	}
	if branchRes.err != nil {
		return nil, branchRes.err
	}
	if tagRes.err != nil {
		return nil, tagRes.err
	}

	// save and return the results
	return &model.GitHubRepoAnalytics{
		HeadCommit:        commitRes.commit.SHA,
		HeadCommitMessage: commitRes.commit.Commit.Message,
		HeadCommitAt:      commitRes.commit.Commit.Author.Date,
		TotalCommits:      totalRes.count,
		BranchCount:       branchRes.count,
		TagCount:          tagRes.count,
	}, nil
}

// get the local analytics by iterating through the files in the defaultRepoPath directory (_Repos) and collecting stats about the tracked files and archives
func GetLocalAnalytics() (*model.LocalAnalytics, error) {
	stats := &model.LocalAnalytics{}

	// iterate thorugh the files in the defaultRepoPath directory (_Repos) and collect analytics
	err := filepath.Walk(defaultRepoPath, func(path string, info os.FileInfo, err error) error {
		// if there is an error, return it
		if err != nil {
			return err
		}

		// if there is a directory, skip it
		if info.IsDir() {
			return nil
		}

		// skip non-.tar.gz files
		if !strings.HasSuffix(info.Name(), ".tar.gz") {
			return nil
		}

		// if there is a file, collect its analytics
		// size in bytes
		size := info.Size()

		// update the stats
		stats.TrackedFiles++
		stats.TotalBlobSizeBytes += size

		// update the largest blob size and path if this file is larger than the current largest
		if size > stats.LargestBlobSizeBytes {
			stats.LargestBlobSizeBytes = size
			stats.LargestBlobPath = info.Name()
		}

		// if the file is a .tar.gz file, update the archive stats
		stats.ArchiveCount++
		stats.TotalArchiveSizeBytes += size

		// update the largest archive size and path if this file is larger than the current largest
		if size > stats.LargestArchiveSizeBytes {
			stats.LargestArchiveSizeBytes = size
			stats.LargestArchivePath = info.Name()
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// calculate the average blob size and average archive size
	if stats.TrackedFiles > 0 {
		stats.AvgBlobSizeBytes = stats.TotalBlobSizeBytes / int64(stats.TrackedFiles)
	}

	// calculate the average archive size
	if stats.ArchiveCount > 0 {
		stats.AvgArchiveSizeBytes = stats.TotalArchiveSizeBytes / int64(stats.ArchiveCount)
	}

	return stats, nil
}
