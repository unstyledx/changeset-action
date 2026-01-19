# Cursor Plan: Adding New Features to Changesets Action

## Overview

This document provides a structured approach for adding new features to the Changesets GitHub Action. Follow this plan to ensure consistency, maintainability, and proper testing.

## Feature Addition Workflow

### Phase 1: Planning & Design

1. **Define the Feature**
   - Document the problem it solves
   - Define user-facing API (inputs/outputs)
   - Identify affected modules
   - Consider backward compatibility

2. **Update action.yml**
   - Add new input parameters (if needed)
   - Add new output parameters (if needed)
   - Update descriptions

3. **Update README.md**
   - Document new inputs/outputs
   - Add usage examples
   - Update workflow examples if needed

### Phase 2: Implementation

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement Core Logic**
   - Follow existing code patterns
   - Use TypeScript types strictly
   - Add JSDoc comments
   - Handle errors gracefully

3. **Update Type Definitions**
   - Add types to appropriate files
   - Export types if needed by consumers

4. **Integrate with Main Flow**
   - Update `index.ts` if needed
   - Wire up new functionality
   - Ensure proper error handling

### Phase 3: Testing

1. **Unit Tests**
   - Test new functions in isolation
   - Mock external dependencies
   - Test edge cases and error conditions

2. **Integration Tests**
   - Test with real fixtures
   - Test end-to-end workflows
   - Verify GitHub API interactions

3. **Snapshot Tests**
   - Update snapshots if output changed
   - Verify PR body generation
   - Check output formats

### Phase 4: Documentation & Cleanup

1. **Update Documentation**
   - README.md
   - Code comments
   - Type definitions

2. **Code Review Checklist**
   - [ ] All tests pass
   - [ ] No linting errors
   - [ ] Types are correct
   - [ ] Error handling is comprehensive
   - [ ] Documentation is updated

## Common Feature Patterns

### Pattern 1: Adding a New Input Parameter

**Example: Adding `customTagPrefix` input**

1. **Update action.yml**
```yaml
inputs:
  customTagPrefix:
    description: "Custom prefix for git tags"
    required: false
    default: ""
```

2. **Read in index.ts**
```typescript
const customTagPrefix = getOptionalInput("customTagPrefix") ?? "";
```

3. **Pass to functions**
```typescript
await runPublish({
  // ... other options
  customTagPrefix,
});
```

4. **Use in implementation**
```typescript
// In run.ts
const tagName = customTagPrefix 
  ? `${customTagPrefix}${pkg.packageJson.version}`
  : `${pkg.packageJson.name}@${pkg.packageJson.version}`;
```

5. **Add tests**
```typescript
it("uses custom tag prefix when provided", async () => {
  // Test implementation
});
```

### Pattern 2: Adding a New Output

**Example: Adding `versionBranch` output**

1. **Update action.yml**
```yaml
outputs:
  versionBranch:
    description: "The branch name used for version PRs"
```

2. **Set in index.ts**
```typescript
core.setOutput("versionBranch", versionBranch);
```

3. **Test output**
```typescript
it("sets versionBranch output", async () => {
  // Mock and verify
});
```

### Pattern 3: Adding Conditional Logic

**Example: Skip PR creation if certain condition**

1. **Add input**
```yaml
inputs:
  skipPrCreation:
    description: "Skip PR creation if true"
    required: false
    default: "false"
```

2. **Add condition in index.ts**
```typescript
const skipPrCreation = core.getBooleanInput("skipPrCreation");

if (skipPrCreation && hasChangesets) {
  core.info("Skipping PR creation as requested");
  return;
}
```

3. **Test both paths**
```typescript
it("skips PR creation when skipPrCreation is true", async () => {
  // Test
});

it("creates PR when skipPrCreation is false", async () => {
  // Test
});
```

### Pattern 4: Extending Git Operations

**Example: Adding tag annotation support**

1. **Extend Git class**
```typescript
// In git.ts
async pushTag(tag: string, annotation?: string) {
  if (this.octokit) {
    // Use GitHub API with annotation
  } else {
    if (annotation) {
      await exec("git", ["tag", "-a", tag, "-m", annotation], { cwd: this.cwd });
    }
    await exec("git", ["push", "origin", tag], { cwd: this.cwd });
  }
}
```

2. **Update callers**
```typescript
// In run.ts
await git.pushTag(tagName, changelogEntry.content);
```

3. **Test both modes**
```typescript
it("pushes annotated tag via git-cli", async () => {
  // Test
});

it("pushes annotated tag via github-api", async () => {
  // Test
});
```

## Testing Guidelines

### Unit Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("FeatureName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle normal case", async () => {
    // Arrange
    // Act
    // Assert
  });

  it("should handle edge case", async () => {
    // Test edge cases
  });

  it("should handle errors gracefully", async () => {
    // Test error handling
  });
});
```

### Mocking Patterns

**Mock GitHub API:**
```typescript
vi.mock("@actions/github", () => ({
  context: {
    repo: { owner: "test", repo: "test" },
    ref: "refs/heads/main",
    sha: "abc123",
  },
  getOctokit: () => ({
    rest: {
      pulls: { create: vi.fn(), list: vi.fn() },
      repos: { createRelease: vi.fn() },
    },
  }),
}));
```

**Mock Git class:**
```typescript
vi.mock("./git.ts");
// Then in test:
const git = new Git({ cwd });
```

**Mock file system:**
```typescript
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  // ...
}));
```

### Integration Test Pattern

```typescript
import fixturez from "fixturez";

const f = fixturez(import.meta.dirname);

it("integration test with fixtures", async () => {
  const cwd = f.copy("simple-project");
  await linkNodeModules(cwd);
  
  // Setup mocks
  // Execute function
  // Verify results
  expect(result).toMatchSnapshot();
});
```

## Example Feature Implementations

### Feature 1: Custom PR Labels

**Goal:** Allow users to specify labels for version PRs

**Implementation Steps:**

1. **action.yml**
```yaml
inputs:
  prLabels:
    description: "Comma-separated list of labels to add to PR"
    required: false
```

2. **index.ts**
```typescript
const prLabels = getOptionalInput("prLabels");
const labels = prLabels?.split(",").map(l => l.trim()).filter(Boolean) || [];
```

3. **run.ts - Update runVersion**
```typescript
type VersionOptions = {
  // ... existing options
  labels?: string[];
};

export async function runVersion({
  // ... existing params
  labels = [],
}: VersionOptions): Promise<RunVersionResult> {
  // ... existing code
  
  if (existingPullRequests.data.length === 0) {
    const { data: newPullRequest } = await octokit.rest.pulls.create({
      // ... existing params
    });
    
    if (labels.length > 0) {
      await octokit.rest.issues.addLabels({
        ...github.context.repo,
        issue_number: newPullRequest.number,
        labels,
      });
    }
    
    return { pullRequestNumber: newPullRequest.number };
  } else {
    // Update existing PR with labels
    const [pullRequest] = existingPullRequests.data;
    
    if (labels.length > 0) {
      await octokit.rest.issues.addLabels({
        ...github.context.repo,
        issue_number: pullRequest.number,
        labels,
      });
    }
    
    // ... rest of update logic
  }
}
```

4. **Tests**
```typescript
it("adds labels to new PR", async () => {
  mockedGithubMethods.pulls.list.mockResolvedValue({ data: [] });
  mockedGithubMethods.pulls.create.mockResolvedValue({
    data: { number: 123 },
  });
  mockedGithubMethods.issues.addLabels = vi.fn();
  
  await runVersion({
    // ... params
    labels: ["release", "automated"],
  });
  
  expect(mockedGithubMethods.issues.addLabels).toHaveBeenCalledWith({
    owner: "changesets",
    repo: "action",
    issue_number: 123,
    labels: ["release", "automated"],
  });
});
```

### Feature 2: Dry Run Mode

**Goal:** Allow testing without creating PRs or publishing

**Implementation Steps:**

1. **action.yml**
```yaml
inputs:
  dryRun:
    description: "Run without creating PRs or publishing"
    required: false
    default: "false"
```

2. **index.ts**
```typescript
const dryRun = core.getBooleanInput("dryRun");

if (dryRun) {
  core.info("DRY RUN MODE: No PRs or publishes will be created");
}
```

3. **run.ts - Modify runVersion**
```typescript
export async function runVersion({
  // ... existing params
  dryRun = false,
}: VersionOptions): Promise<RunVersionResult> {
  // ... versioning logic
  
  if (dryRun) {
    core.info("DRY RUN: Would create/update PR");
    core.info(`PR Title: ${finalPrTitle}`);
    core.info(`PR Body: ${prBody}`);
    return { pullRequestNumber: -1 };
  }
  
  // ... existing PR creation logic
}
```

4. **run.ts - Modify runPublish**
```typescript
export async function runPublish({
  // ... existing params
  dryRun = false,
}: PublishOptions): Promise<PublishResult> {
  if (dryRun) {
    core.info("DRY RUN: Would execute publish script");
    return { published: false };
  }
  
  // ... existing publish logic
}
```

### Feature 3: Custom Release Notes Template

**Goal:** Allow custom formatting for GitHub release notes

**Implementation Steps:**

1. **action.yml**
```yaml
inputs:
  releaseNotesTemplate:
    description: "Path to custom release notes template file"
    required: false
```

2. **run.ts - New function**
```typescript
async function getReleaseNotes(
  pkg: Package,
  changelogEntry: { content: string },
  templatePath?: string
): Promise<string> {
  if (!templatePath) {
    return changelogEntry.content;
  }
  
  const template = await fs.readFile(templatePath, "utf8");
  // Simple template replacement
  return template
    .replace("{{packageName}}", pkg.packageJson.name)
    .replace("{{version}}", pkg.packageJson.version)
    .replace("{{changelog}}", changelogEntry.content);
}
```

3. **Update createRelease**
```typescript
const createRelease = async (
  octokit: Octokit,
  { pkg, tagName, releaseNotesTemplate }: { 
    pkg: Package; 
    tagName: string;
    releaseNotesTemplate?: string;
  }
) => {
  // ... existing changelog reading
  
  const body = await getReleaseNotes(pkg, changelogEntry, releaseNotesTemplate);
  
  await octokit.rest.repos.createRelease({
    // ... existing params
    body,
  });
};
```

## Error Handling Patterns

### Pattern: Graceful Degradation

```typescript
try {
  await optionalFeature();
} catch (error) {
  core.warning(`Optional feature failed: ${error.message}`);
  // Continue with main flow
}
```

### Pattern: Required Feature Failure

```typescript
try {
  await requiredFeature();
} catch (error) {
  core.setFailed(`Required feature failed: ${error.message}`);
  throw error; // Re-throw to stop execution
}
```

### Pattern: Validation

```typescript
if (!isValid(input)) {
  core.setFailed(`Invalid input: ${input}`);
  return;
}
```

## Code Style Guidelines

1. **Use TypeScript strictly**
   - No `any` types
   - Define interfaces for complex objects
   - Use type guards for runtime checks

2. **Follow existing patterns**
   - Use `getOptionalInput()` for optional inputs
   - Use `core.getBooleanInput()` for booleans
   - Use `core.setOutput()` for outputs

3. **Error messages**
   - Be descriptive
   - Include context
   - Suggest solutions when possible

4. **Logging**
   - Use `core.info()` for normal flow
   - Use `core.warning()` for recoverable issues
   - Use `core.error()` for errors
   - Use `core.setFailed()` to fail the action

5. **Async/await**
   - Prefer async/await over promises
   - Handle errors with try/catch
   - Use Promise.all() for parallel operations

## Checklist for New Features

- [ ] Feature is documented in README.md
- [ ] Input/output added to action.yml
- [ ] Types are properly defined
- [ ] Error handling is comprehensive
- [ ] Unit tests cover main paths
- [ ] Integration tests cover end-to-end
- [ ] Edge cases are tested
- [ ] Backward compatibility maintained
- [ ] Code follows existing patterns
- [ ] No linting errors
- [ ] All tests pass
- [ ] Snapshots updated (if needed)

## Common Pitfalls to Avoid

1. **Don't break existing functionality**
   - Test with existing workflows
   - Maintain backward compatibility

2. **Don't forget error handling**
   - Network calls can fail
   - File operations can fail
   - GitHub API can rate limit

3. **Don't skip tests**
   - Test happy path
   - Test error cases
   - Test edge cases

4. **Don't ignore TypeScript errors**
   - Fix all type errors
   - Use proper types

5. **Don't hardcode values**
   - Use inputs/outputs
   - Make it configurable

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [Octokit Documentation](https://octokit.github.io/rest.js/)
- [Vitest Documentation](https://vitest.dev/)
