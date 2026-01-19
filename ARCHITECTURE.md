# Changesets Action - Architecture Analysis

## Overview

This GitHub Action automates the release process for monorepos using Changesets. It creates version PRs when changesets are present, or publishes packages when no changesets exist.

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.ts (Entry Point)                  │
│  - Reads GitHub Action inputs                                   │
│  - Orchestrates the main workflow                              │
│  - Sets GitHub Action outputs                                  │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─────────────────────────────────────────────────────┐
             │                                                      │
             ▼                                                      ▼
    ┌─────────────────┐                                  ┌──────────────────┐
    │  octokit.ts     │                                  │   git.ts         │
    │  - setupOctokit │                                  │   - Git class    │
    │  - Rate limiting│                                  │   - Git CLI ops  │
    │  - Throttling   │                                  │   - GitHub API   │
    └────────┬────────┘                                  └────────┬─────────┘
             │                                                     │
             │                                                     │
             ▼                                                     ▼
    ┌─────────────────┐                                  ┌──────────────────┐
    │  readChangeset  │                                  │    run.ts        │
    │  State.ts       │                                  │  - runVersion    │
    │  - Reads pre    │                                  │  - runPublish    │
    │    state        │                                  │  - createRelease │
    │  - Filters      │                                  │  - getVersionPr  │
    │    changesets   │                                  │    Body          │
    └────────┬────────┘                                  └────────┬─────────┘
             │                                                     │
             │                                                     │
             └──────────────────────┬──────────────────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │   utils.ts       │
                          │  - getVersionsBy │
                          │    Directory     │
                          │  - getChanged    │
                          │    Packages      │
                          │  - getChangelog  │
                          │    Entry         │
                          │  - sortTheThings │
                          │  - fileExists    │
                          └──────────────────┘
```

## Module Dependencies

### Core Modules

1. **index.ts** (Main Entry Point)
   - **Imports from:**
     - `@actions/core` - GitHub Actions core utilities
     - `./git.ts` - Git operations
     - `./octokit.ts` - GitHub API client
     - `./readChangesetState.ts` - Changeset state reader
     - `./run.ts` - Version and publish operations
     - `./utils.ts` - Utility functions

2. **run.ts** (Core Business Logic)
   - **Imports from:**
     - `@actions/core`, `@actions/exec`, `@actions/github`
     - `@changesets/types`, `@manypkg/get-packages`
     - `./git.ts`, `./octokit.ts`, `./readChangesetState.ts`, `./utils.ts`

3. **git.ts** (Git Operations)
   - **Imports from:**
     - `@actions/core`, `@actions/exec`, `@actions/github`
     - `@changesets/ghcommit/git` - GitHub API commits
     - `./octokit.ts`

4. **utils.ts** (Utilities)
   - **Imports from:**
     - `unified`, `remark-parse`, `remark-stringify` - Markdown parsing
     - `@manypkg/get-packages` - Package discovery

5. **octokit.ts** (GitHub API Client)
   - **Imports from:**
     - `@actions/core`, `@actions/github`
     - `@octokit/plugin-throttling` - Rate limiting

6. **readChangesetState.ts** (Changeset State)
   - **Imports from:**
     - `@changesets/types`, `@changesets/pre`, `@changesets/read`

## Data Flow

### Main Workflow (index.ts)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Initialize                                                        │
│    - Read GITHUB_TOKEN from env                                     │
│    - Read action inputs (cwd, commitMode, setupGitUser, etc.)        │
│    - Setup Octokit client                                           │
│    - Initialize Git instance                                        │
└────────────────────┬────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Setup Git User (if enabled)                                      │
│    - Configure git user.name and user.email                         │
│    - Setup GitHub credentials in ~/.netrc                           │
└────────────────────┬────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Read Changeset State                                             │
│    - readChangesetState() → { changesets, preState }                │
│    - Filter changesets based on pre-state                           │
└────────────────────┬────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Decision Tree                                                    │
│                                                                      │
│    ┌──────────────────────────────────────────────┐                │
│    │ No changesets && No publish script           │                │
│    │ → Exit (no action)                           │                │
│    └──────────────────────────────────────────────┘                │
│                      │                                               │
│    ┌──────────────────────────────────────────────┐                │
│    │ No changesets && Has publish script           │                │
│    │ → runPublish()                                │                │
│    │   - Setup .npmrc                              │                │
│    │   - Execute publish script                   │                │
│    │   - Parse published packages                  │                │
│    │   - Create GitHub releases (if enabled)       │                │
│    │   - Set outputs: published, publishedPackages │                │
│    └──────────────────────────────────────────────┘                │
│                      │                                               │
│    ┌──────────────────────────────────────────────┐                │
│    │ Has changesets && All empty                   │                │
│    │ → Exit (no PR created)                       │                │
│    └──────────────────────────────────────────────┘                │
│                      │                                               │
│    ┌──────────────────────────────────────────────┐                │
│    │ Has changesets && Has non-empty changesets    │                │
│    │ → runVersion()                                │                │
│    │   - Prepare version branch                    │                │
│    │   - Run version script                        │                │
│    │   - Get changed packages                      │                │
│    │   - Generate PR body                          │                │
│    │   - Create or update PR                       │                │
│    │   - Set output: pullRequestNumber             │                │
│    └──────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

### Version Flow (runVersion)

```
┌─────────────────────────────────────────────────────────────────────┐
│ runVersion()                                                        │
│                                                                      │
│ 1. Create version branch: changeset-release/{branch}                │
│ 2. Read pre-state                                                   │
│ 3. Prepare branch (checkout/reset)                                  │
│ 4. Get versions before versioning                                   │
│ 5. Run version script (or changeset version)                        │
│ 6. Get changed packages (compare versions)                          │
│ 7. Read changelogs for changed packages                            │
│ 8. Generate PR body (with size limit handling)                     │
│ 9. Check for existing PRs                                           │
│ 10. Push changes                                                    │
│ 11. Create or update PR                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Publish Flow (runPublish)

```
┌─────────────────────────────────────────────────────────────────────┐
│ runPublish()                                                        │
│                                                                      │
│ 1. Execute publish script                                           │
│ 2. Parse stdout for "New tag:" lines                                │
│ 3. Match published packages by name                                 │
│ 4. For each published package:                                      │
│    - Push tag (via Git class)                                       │
│    - Create GitHub release (if enabled)                             │
│      - Read CHANGELOG.md                                            │
│      - Extract changelog entry                                      │
│      - Create release via Octokit                                   │
│ 5. Return published packages array                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Data Structures

### Inputs (from action.yml)
- `publish`: Command to publish packages
- `version`: Command to version packages
- `commit`: Commit message
- `title`: PR title
- `setupGitUser`: Boolean
- `createGithubReleases`: Boolean
- `commitMode`: "git-cli" | "github-api"
- `cwd`: Working directory
- `branch`: Branch name

### Outputs
- `published`: Boolean
- `publishedPackages`: JSON array of `{name, version}`
- `hasChangesets`: Boolean
- `pullRequestNumber`: Number

### Internal Types

```typescript
// ChangesetState
{
  preState: PreState | undefined;
  changesets: NewChangeset[];
}

// PublishedPackage
{
  name: string;
  version: string;
}

// PublishResult
{
  published: true;
  publishedPackages: PublishedPackage[];
} | {
  published: false;
}

// RunVersionResult
{
  pullRequestNumber: number;
}
```

## External Dependencies

### GitHub Actions
- `@actions/core` - Core utilities
- `@actions/exec` - Execute commands
- `@actions/github` - GitHub context and Octokit

### Changesets
- `@changesets/cli` - Changesets CLI
- `@changesets/types` - Type definitions
- `@changesets/pre` - Pre-release state
- `@changesets/read` - Read changesets
- `@changesets/ghcommit` - GitHub API commits

### Package Management
- `@manypkg/get-packages` - Discover packages in monorepo

### Utilities
- `unified`, `remark-parse`, `remark-stringify` - Markdown parsing
- `semver` - Version comparison
- `mdast-util-to-string` - Markdown AST utilities

## Testing Strategy

### Current Test Coverage
- **run.test.ts**: Tests `runVersion` function
  - PR creation scenarios
  - Package filtering
  - PR body size limits
  - Snapshot testing

- **utils.test.ts**: Tests utility functions
  - Changelog entry extraction
  - Package sorting

### Test Patterns
- Uses `vitest` for testing
- Uses `fixturez` for test fixtures
- Mocks GitHub API calls
- Snapshot testing for PR bodies
- Tests both monorepo and single-package scenarios
