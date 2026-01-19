import { exec } from "@actions/exec";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Git } from "./git.ts";
import { setupOctokit } from "./octokit.ts";

vi.mock("@actions/exec");
vi.mock("@actions/github", () => ({
  context: {
    repo: {
      owner: "test-owner",
      repo: "test-repo",
    },
    ref: "refs/heads/main",
    sha: "abc123",
  },
  getOctokit: () => ({
    rest: {
      git: {
        createRef: vi.fn(),
      },
    },
  }),
}));

describe("Git.setupUser", () => {
  const testCwd = "/test/cwd";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use default values when no parameters provided", async () => {
    const git = new Git({ cwd: testCwd });

    await git.setupUser();

    expect(exec).toHaveBeenCalledTimes(2);
    expect(exec).toHaveBeenNthCalledWith(
      1,
      "git",
      ["config", "user.name", "github-actions[bot]"],
      { cwd: testCwd }
    );
    expect(exec).toHaveBeenNthCalledWith(
      2,
      "git",
      ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"],
      { cwd: testCwd }
    );
  });

  it("should use custom username when provided", async () => {
    const git = new Git({ cwd: testCwd });
    const customName = "Custom User";

    await git.setupUser(customName);

    expect(exec).toHaveBeenCalledTimes(2);
    expect(exec).toHaveBeenNthCalledWith(
      1,
      "git",
      ["config", "user.name", customName],
      { cwd: testCwd }
    );
    expect(exec).toHaveBeenNthCalledWith(
      2,
      "git",
      ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"],
      { cwd: testCwd }
    );
  });

  it("should use custom email when provided", async () => {
    const git = new Git({ cwd: testCwd });
    const customEmail = "custom@example.com";

    await git.setupUser(undefined, customEmail);

    expect(exec).toHaveBeenCalledTimes(2);
    expect(exec).toHaveBeenNthCalledWith(
      1,
      "git",
      ["config", "user.name", "github-actions[bot]"],
      { cwd: testCwd }
    );
    expect(exec).toHaveBeenNthCalledWith(
      2,
      "git",
      ["config", "user.email", customEmail],
      { cwd: testCwd }
    );
  });

  it("should use both custom username and email when provided", async () => {
    const git = new Git({ cwd: testCwd });
    const customName = "Custom User";
    const customEmail = "custom@example.com";

    await git.setupUser(customName, customEmail);

    expect(exec).toHaveBeenCalledTimes(2);
    expect(exec).toHaveBeenNthCalledWith(
      1,
      "git",
      ["config", "user.name", customName],
      { cwd: testCwd }
    );
    expect(exec).toHaveBeenNthCalledWith(
      2,
      "git",
      ["config", "user.email", customEmail],
      { cwd: testCwd }
    );
  });

  it("should skip setup when using github-api mode (octokit provided)", async () => {
    const octokit = setupOctokit("test-token");
    const git = new Git({ octokit, cwd: testCwd });

    await git.setupUser("Custom User", "custom@example.com");

    expect(exec).not.toHaveBeenCalled();
  });

  it("should handle empty string username by using default", async () => {
    const git = new Git({ cwd: testCwd });

    await git.setupUser("", "custom@example.com");

    expect(exec).toHaveBeenCalledTimes(2);
    expect(exec).toHaveBeenNthCalledWith(
      1,
      "git",
      ["config", "user.name", ""],
      { cwd: testCwd }
    );
  });

  it("should handle empty string email by using default", async () => {
    const git = new Git({ cwd: testCwd });

    await git.setupUser("Custom User", "");

    expect(exec).toHaveBeenCalledTimes(2);
    expect(exec).toHaveBeenNthCalledWith(
      2,
      "git",
      ["config", "user.email", ""],
      { cwd: testCwd }
    );
  });
});
