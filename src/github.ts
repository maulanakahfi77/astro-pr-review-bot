import * as github from '@actions/github'
import * as core from '@actions/core'
import { ReviewComment } from './reviewer'

export async function postReview(
  owner: string,
  repo: string,
  prNumber: number,
  comments: ReviewComment[],
  commitSha: string
): Promise<void> {
  const token = process.env.GITHUB_TOKEN || ''
  const octokit = github.getOctokit(token)

  // Separate summary from inline comments
  const summary = comments.find(c => c.path === 'SUMMARY')
  const inlineComments = comments.filter(c => c.path !== 'SUMMARY')

  // Determine review event based on severity
  const hasErrors = comments.some(c => c.severity === 'error')
  const event = hasErrors ? 'REQUEST_CHANGES' : 'COMMENT'

  // Build review body
  let reviewBody = '## 🤖 AI Review\n\n'
  if (summary) {
    reviewBody += summary.body.replace(/^.*?(ERROR|WARNING|INFO):\s*/i, '')
  }

  // Build inline review comments
  const reviewComments = inlineComments
    .filter(c => c.line > 0 && c.path)
    .map(c => ({
      path: c.path,
      line: c.line,
      body: c.body,
    }))

  try {
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: commitSha,
      event: event as 'REQUEST_CHANGES' | 'COMMENT',
      body: reviewBody,
      comments: reviewComments,
    })

    core.info(`Posted review with ${reviewComments.length} inline comments (${event})`)
  } catch (error) {
    // If inline comments fail (e.g., line numbers off), fall back to single comment
    core.warning(`Failed to post inline review, falling back to comment: ${error}`)

    let fallbackBody = reviewBody + '\n\n---\n\n'
    for (const c of inlineComments) {
      fallbackBody += `**${c.path}:${c.line}**\n${c.body}\n\n`
    }

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: fallbackBody,
    })

    core.info('Posted fallback comment')
  }
}
