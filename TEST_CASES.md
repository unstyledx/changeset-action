# Test Cases Template for Changesets Action

This document provides test case templates and examples for adding new features to the Changesets Action.

## Test Case Categories

### 1. Unit Tests
Test individual functions in isolation with mocked dependencies.

### 2. Integration Tests
Test complete workflows with real fixtures and mocked external APIs.

### 3. Snapshot Tests
Test output formats and ensure consistency.

## Test Case Templates

### Template 1: New Input Parameter

**Feature:** Adding a new input parameter

**Test Cases:**

```typescript
describe("New Input Parameter", () => {
  it("should use default value when input is not provided", async () => {
    // Arrange
    // Act
    // Assert - verify default behavior
  });

  it("should use provided value when input is set", async () => {
    // Arrange - set input
    // Act
    // Assert - verify custom value is used
  });

  it("should handle empty string input", async () => {
    // Arrange - set empty input
    // Act
    // Assert - verify fallback to default
  });

  it("should handle invalid input gracefully", async () => {
    // Arrange - set invalid input
    // Act
    // Assert - verify error handling
  });
});
```

### Template 2: New Output Parameter

**Feature:** Adding a new output parameter

**Test Cases:**

```typescript
describe("New Output Parameter", () => {
  it("should set output when condition is met", async () => {
    // Arrange
    const setOutputSpy = vi.spyOn(core, "setOutput");
    
    // Act
    await functionThatSetsOutput();
    
    // Assert
    expect(setOutputSpy).toHaveBeenCalledWith("outputName", expectedValue);
  });

  it("should not set output when condition is not met", async () => {
    // Arrange
    const setOutputSpy = vi.spyOn(core, "setOutput");
    
    // Act
    await functionThatDoesNotSetOutput();
    
    // Assert
    expect(setOutputSpy).not.toHaveBeenCalledWith("outputName", expect.anything());
  });

  it("should set output with correct format", async () => {
    // Arrange
    // Act
    // Assert - verify output format (JSON, string, etc.)
  });
});
```

### Template 3: Conditional Logic

**Feature:** Adding conditional behavior

**Test Cases:**

```typescript
describe("Conditional Logic", () => {
  it("should execute path A when condition is true", async () => {
    // Arrange - setup condition to be true
    // Act
    // Assert - verify path A was executed
  });

  it("should execute path B when condition is false", async () => {
    // Arrange - setup condition to be false
    // Act
    // Assert - verify path B was executed
  });

  it("should handle edge case values", async () => {
    // Arrange - setup edge case (null, undefined, empty, etc.)
    // Act
    // Assert - verify appropriate handling
  });
});
```

### Template 4: Git Operations

**Feature:** Adding new Git operations

**Test Cases:**

```typescript
describe("Git Operations", () => {
  it("should execute git command via CLI when commitMode is git-cli", async () => {
    // Arrange
    const git = new Git({ cwd: testCwd });
    const execSpy = vi.spyOn(exec, "exec");
    
    // Act
    await git.newOperation();
    
    // Assert
    expect(execSpy).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["expected", "args"]),
      expect.objectContaining({ cwd: testCwd })
    );
  });

  it("should use GitHub API when commitMode is github-api", async () => {
    // Arrange
    const octokit = setupOctokit("token");
    const git = new Git({ octokit, cwd: testCwd });
    const apiSpy = vi.spyOn(octokit.rest.git, "expectedMethod");
    
    // Act
    await git.newOperation();
    
    // Assert
    expect(apiSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        ...github.context.repo,
        // expected params
      })
    );
  });

  it("should handle git errors gracefully", async () => {
    // Arrange - mock git command to fail
    // Act
    // Assert - verify error handling
  });
});
```

### Template 5: GitHub API Interactions

**Feature:** Adding new GitHub API calls

**Test Cases:**

```typescript
describe("GitHub API Interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call API with correct parameters", async () => {
    // Arrange
    const apiSpy = vi.fn().mockResolvedValue({ data: mockResponse });
    mockedGithubMethods.expectedMethod = apiSpy;
    
    // Act
    await functionThatCallsAPI();
    
    // Assert
    expect(apiSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        ...github.context.repo,
        // expected params
      })
    );
  });

  it("should handle API errors", async () => {
    // Arrange
    const apiSpy = vi.fn().mockRejectedValue(new Error("API Error"));
    mockedGithubMethods.expectedMethod = apiSpy;
    
    // Act & Assert
    await expect(functionThatCallsAPI()).rejects.toThrow("API Error");
  });

  it("should handle rate limiting", async () => {
    // Arrange - setup rate limit response
    // Act
    // Assert - verify retry logic
  });

  it("should handle 404 errors appropriately", async () => {
    // Arrange - mock 404 response
    // Act
    // Assert - verify graceful handling
  });
});
```

### Template 6: File System Operations

**Feature:** Adding file system operations

**Test Cases:**

```typescript
describe("File System Operations", () => {
  it("should read file when it exists", async () => {
    // Arrange - create test file
    // Act
    // Assert - verify file content
  });

  it("should handle file not found", async () => {
    // Arrange - file doesn't exist
    // Act
    // Assert - verify error handling or default behavior
  });

  it("should write file with correct content", async () => {
    // Arrange
    // Act
    // Assert - verify file content
  });

  it("should handle permission errors", async () => {
    // Arrange - mock permission error
    // Act
    // Assert - verify error handling
  });
});
```

## Example Test Cases

### Example 1: Custom PR Labels Feature

```typescript
describe("PR Labels Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGithubMethods.pulls.list.mockResolvedValue({ data: [] });
    mockedGithubMethods.pulls.create.mockResolvedValue({
      data: { number: 123 },
    });
    mockedGithubMethods.issues.addLabels = vi.fn();
  });

  it("should add labels to new PR when labels are provided", async () => {
    const cwd = f.copy("simple-project");
    await linkNodeModules(cwd);
    await writeChangesets([{ releases: [{ name: "pkg-a", type: "minor" }] }], cwd);

    await runVersion({
      octokit: setupOctokit("token"),
      git: new Git({ cwd }),
      cwd,
      labels: ["release", "automated"],
    });

    expect(mockedGithubMethods.issues.addLabels).toHaveBeenCalledWith({
      owner: "changesets",
      repo: "action",
      issue_number: 123,
      labels: ["release", "automated"],
    });
  });

  it("should not add labels when labels array is empty", async () => {
    const cwd = f.copy("simple-project");
    await linkNodeModules(cwd);
    await writeChangesets([{ releases: [{ name: "pkg-a", type: "minor" }] }], cwd);

    await runVersion({
      octokit: setupOctokit("token"),
      git: new Git({ cwd }),
      cwd,
      labels: [],
    });

    expect(mockedGithubMethods.issues.addLabels).not.toHaveBeenCalled();
  });

  it("should add labels to existing PR when updating", async () => {
    const cwd = f.copy("simple-project");
    await linkNodeModules(cwd);
    await writeChangesets([{ releases: [{ name: "pkg-a", type: "minor" }] }], cwd);

    mockedGithubMethods.pulls.list.mockResolvedValue({
      data: [{ number: 456 }],
    });
    mockedGithubMethods.pulls.update = vi.fn();

    await runVersion({
      octokit: setupOctokit("token"),
      git: new Git({ cwd }),
      cwd,
      labels: ["release"],
    });

    expect(mockedGithubMethods.issues.addLabels).toHaveBeenCalledWith({
      owner: "changesets",
      repo: "action",
      issue_number: 456,
      labels: ["release"],
    });
  });

  it("should handle label addition errors gracefully", async () => {
    const cwd = f.copy("simple-project");
    await linkNodeModules(cwd);
    await writeChangesets([{ releases: [{ name: "pkg-a", type: "minor" }] }], cwd);

    mockedGithubMethods.issues.addLabels = vi.fn().mockRejectedValue(
      new Error("Label not found")
    );

    // Should not throw, just log warning
    await expect(
      runVersion({
        octokit: setupOctokit("token"),
        git: new Git({ cwd }),
        cwd,
        labels: ["invalid-label"],
      })
    ).resolves.toBeDefined();
  });
});
```

### Example 2: Dry Run Mode Feature

```typescript
describe("Dry Run Mode", () => {
  it("should skip PR creation in dry run mode", async () => {
    const cwd = f.copy("simple-project");
    await linkNodeModules(cwd);
    await writeChangesets([{ releases: [{ name: "pkg-a", type: "minor" }] }], cwd);

    const infoSpy = vi.spyOn(core, "info");
    const createSpy = vi.fn();
    mockedGithubMethods.pulls.create = createSpy;

    const result = await runVersion({
      octokit: setupOctokit("token"),
      git: new Git({ cwd }),
      cwd,
      dryRun: true,
    });

    expect(result.pullRequestNumber).toBe(-1);
    expect(createSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining("DRY RUN")
    );
  });

  it("should skip publish in dry run mode", async () => {
    const execSpy = vi.spyOn(exec, "getExecOutput");
    const infoSpy = vi.spyOn(core, "info");

    const result = await runPublish({
      script: "yarn publish",
      git: new Git({ cwd: testCwd }),
      octokit: setupOctokit("token"),
      createGithubReleases: true,
      cwd: testCwd,
      dryRun: true,
    });

    expect(result.published).toBe(false);
    expect(execSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining("DRY RUN")
    );
  });

  it("should still run version script in dry run mode", async () => {
    const cwd = f.copy("simple-project");
    await linkNodeModules(cwd);
    await writeChangesets([{ releases: [{ name: "pkg-a", type: "minor" }] }], cwd);

    const execSpy = vi.spyOn(exec, "exec");

    await runVersion({
      octokit: setupOctokit("token"),
      git: new Git({ cwd }),
      cwd,
      dryRun: true,
    });

    // Version script should still run to update versions
    expect(execSpy).toHaveBeenCalled();
  });
});
```

### Example 3: Custom Release Notes Template

```typescript
describe("Custom Release Notes Template", () => {
  it("should use template when provided", async () => {
    const cwd = f.copy("simple-project");
    await linkNodeModules(cwd);
    
    const templatePath = path.join(cwd, "release-template.md");
    await fs.writeFile(
      templatePath,
      "Release {{packageName}} v{{version}}\n\n{{changelog}}"
    );

    const pkg = { packageJson: { name: "test-pkg", version: "1.0.0" } };
    const changelogEntry = { content: "Fixed bug" };

    const notes = await getReleaseNotes(pkg, changelogEntry, templatePath);

    expect(notes).toBe("Release test-pkg v1.0.0\n\nFixed bug");
  });

  it("should use default changelog when template not provided", async () => {
    const pkg = { packageJson: { name: "test-pkg", version: "1.0.0" } };
    const changelogEntry = { content: "Fixed bug" };

    const notes = await getReleaseNotes(pkg, changelogEntry);

    expect(notes).toBe("Fixed bug");
  });

  it("should handle template file not found", async () => {
    const pkg = { packageJson: { name: "test-pkg", version: "1.0.0" } };
    const changelogEntry = { content: "Fixed bug" };

    await expect(
      getReleaseNotes(pkg, changelogEntry, "/nonexistent/template.md")
    ).rejects.toThrow();
  });
});
```

## Integration Test Patterns

### Pattern: Full Workflow Test

```typescript
describe("Full Workflow Integration", () => {
  it("should complete full version workflow", async () => {
    const cwd = f.copy("simple-project");
    await linkNodeModules(cwd);

    // Setup
    await writeChangesets(
      [
        {
          releases: [
            { name: "simple-project-pkg-a", type: "minor" },
            { name: "simple-project-pkg-b", type: "patch" },
          ],
          summary: "New features",
        },
      ],
      cwd
    );

    // Mock GitHub API
    mockedGithubMethods.pulls.list.mockResolvedValue({ data: [] });
    mockedGithubMethods.pulls.create.mockResolvedValue({
      data: { number: 123 },
    });

    // Execute
    const result = await runVersion({
      octokit: setupOctokit("token"),
      git: new Git({ cwd }),
      cwd,
    });

    // Verify
    expect(result.pullRequestNumber).toBe(123);
    expect(mockedGithubMethods.pulls.create).toHaveBeenCalled();
    
    // Verify PR body contains expected content
    const prCall = mockedGithubMethods.pulls.create.mock.calls[0][0];
    expect(prCall.body).toContain("simple-project-pkg-a");
    expect(prCall.body).toContain("simple-project-pkg-b");
  });
});
```

## Snapshot Test Patterns

### Pattern: PR Body Snapshot

```typescript
it("should generate correct PR body", async () => {
  const cwd = f.copy("simple-project");
  await linkNodeModules(cwd);
  await writeChangesets([{ releases: [{ name: "pkg-a", type: "minor" }] }], cwd);

  mockedGithubMethods.pulls.list.mockResolvedValue({ data: [] });
  mockedGithubMethods.pulls.create.mockResolvedValue({
    data: { number: 123 },
  });

  await runVersion({
    octokit: setupOctokit("token"),
    git: new Git({ cwd }),
    cwd,
  });

  expect(mockedGithubMethods.pulls.create.mock.calls[0]).toMatchSnapshot();
});
```

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage for utility functions
- **Integration Tests**: All main workflows covered
- **Edge Cases**: Error conditions, empty inputs, invalid data
- **Regression Tests**: Existing functionality still works

## Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run specific test file
yarn test run.test.ts

# Run with coverage
yarn test --coverage
```

## Test Data Management

- Use `fixturez` for test fixtures
- Keep fixtures in `__fixtures__` directory
- Use `linkNodeModules` helper to link dependencies
- Clean up after tests (fixturez handles this)

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Clear Names**: Test names should describe what they test
3. **Arrange-Act-Assert**: Follow AAA pattern
4. **Mock External Dependencies**: Don't make real API calls
5. **Test Edge Cases**: Null, undefined, empty, invalid inputs
6. **Verify Side Effects**: Check that mocks were called correctly
7. **Use Snapshots**: For complex output verification
8. **Clean Up**: Reset mocks between tests
