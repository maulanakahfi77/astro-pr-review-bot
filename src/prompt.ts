import { PRContext } from './context'

export function buildReviewPrompt(context: PRContext, extraContext: string): string {
  const memoriesSection = context.serenaMemories.length > 0
    ? `\n## Domain Memories (from Serena)\n${context.serenaMemories.join('\n\n')}`
    : ''

  const agenticSection = context.agenticMaterial
    ? `\n## Specs & Plan for this ticket\n${context.agenticMaterial}`
    : ''

  const filesSection = context.changedFiles.map(f => {
    return `### ${f.filename} (${f.status})
\`\`\`diff
${f.patch}
\`\`\``
  }).join('\n\n')

  const extraSection = extraContext
    ? `\n## Additional Review Rules\n${extraContext}`
    : ''

  return `You are a senior code reviewer for a Go gRPC microservice team at Astronauts.

## Your Role
Review this pull request against the project's conventions and standards. Be direct and actionable.
Focus on issues that would cause bugs, 500 errors, or convention violations.
Do NOT comment on style preferences, minor formatting, or things that are correct.

## Project Conventions (from CLAUDE.md)
${context.claudeMd || 'No CLAUDE.md found — review using general Go best practices.'}
${memoriesSection}
${agenticSection}
${extraSection}

## Critical Checks (project-specific)
1. **ErrList mapping**: If a new error is created in constants/error.go, it MUST be added to the relevant ErrList (e.g., ErrListReplenishment, ErrListPackageID). Missing mapping = 500 Internal Server Error instead of proper gRPC status code.
2. **Feature flags**: New behavior changes MUST be gated behind a config-based feature flag (ffRelease* or ffEnable* in FeatureFlagConfig). Check that:
   - Bool field added to FeatureFlagConfig in internal/configs/types.go
   - YAML key added to internal/configs/config.yaml.example
   - Flag checked in service or repository layer
3. **Tracer spans**: Every public service/repository method must have tracer.StartSpanWithContext
4. **Test coverage**: New logic paths should have corresponding test cases. Feature flags need both flag-on and flag-off tests.
5. **Error handling**: Errors from external services should be logged but not necessarily returned as-is. Check if errors need wrapping or mapping.
6. **Commit message format**: Should follow [WF-xxxx] prefix pattern

## Changed Files
${filesSection}

## Instructions
Respond with a JSON array of review comments. Each comment should have:
- "path": the file path
- "line": the line number in the NEW file (from the diff, use the + side line numbers)
- "severity": "error" | "warning" | "info"
- "body": the review comment in markdown

If the line number is not determinable, use line 1.

Also include a final summary object with:
- "path": "SUMMARY"
- "line": 0
- "severity": "info"
- "body": overall PR assessment with a checklist of convention compliance

Only include comments that are actionable. If the PR looks good, say so briefly.

Respond ONLY with valid JSON array, no other text.`
}
