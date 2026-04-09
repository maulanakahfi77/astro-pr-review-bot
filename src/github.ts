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

  // Build inline review comments only (summary goes in edited /review comment)
  const reviewComments = inlineComments
    .filter(c => c.line > 0 && c.path)
    .map(c => ({
      path: c.path,
      line: c.line,
      body: c.body,
    }))

  if (reviewComments.length === 0) {
    core.info('No inline comments to post')
    return
  }

  try {
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: commitSha,
      event: event as 'REQUEST_CHANGES' | 'COMMENT',
      body: '',
      comments: reviewComments,
    })

    core.info(`Posted ${reviewComments.length} inline comments (${event})`)
  } catch (error) {
    core.warning(`Failed to post inline review: ${error}`)
  }
}
