export const BUILDER_ENGINE_LIMITS = {
  maxConcurrentBuildsPerWorkspace: 1,
  maxBuildsPerBillingPeriod: 25,
  maxPromptLength: 12000,
  maxSessionDurationMs: 20 * 60 * 1000,
  maxValidationAttempts: 2,
  maxStoredEventPayloadBytes: 3000,
  maxProjectsPerUser: 50,
  startRateLimitMs: 30_000,
  jobLeaseMs: 90_000,
  previewPort: 3000,
} as const;
