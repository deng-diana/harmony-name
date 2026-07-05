import { defineConfig } from "vitest/config";

// Restrict discovery to src/ — without this, agent worktrees under
// .claude/worktrees/ get their test files swept into the run (double count).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
