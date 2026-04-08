import * as core from '@actions/core'
import * as github from '@actions/github'
import { getPRContext } from './context'
import { buildReviewPrompt } from './prompt'
import { getReview } from './reviewer'
import { postReview } from './github'

async function run(): Promise<void> {
  try {
    const apiKey = core.getInput('anthropic_api_key', { required: true })
    const model = core.getInput('model') || 'claude-sonnet-4-6'
    const extraContext = core.getInput('extra_context') || ''

    core.info('Fetching PR context...')
    const prContext = await getPRContext()

    if (prContext.changedFiles.length === 0) {
      core.info('No files to review')
      return
    }

    core.info(`Reviewing ${prContext.changedFiles.length} files...`)

    const prompt = buildReviewPrompt(prContext, extraContext)
    const comments = await getReview(apiKey, model, prompt)

    core.info(`Got ${comments.length} comments from Claude`)

    // Get commit SHA - for issue_comment, fetch from PR API
    let commitSha = github.context.payload.pull_request?.head.sha || ''
    if (!commitSha) {
      const token = process.env.GITHUB_TOKEN || ''
      const octokit = github.getOctokit(token)
      const { data: pr } = await octokit.rest.pulls.get({
        owner: prContext.owner,
        repo: prContext.repo,
        pull_number: prContext.prNumber,
      })
      commitSha = pr.head.sha
    }
    await postReview(
      prContext.owner,
      prContext.repo,
      prContext.prNumber,
      comments,
      commitSha
    )

    // Set outputs
    const errorCount = comments.filter(c => c.severity === 'error').length
    const warningCount = comments.filter(c => c.severity === 'warning').length
    core.setOutput('error_count', errorCount)
    core.setOutput('warning_count', warningCount)
    core.setOutput('comment_count', comments.length)

    if (errorCount > 0) {
      core.warning(`Review found ${errorCount} error(s) and ${warningCount} warning(s)`)
    } else {
      core.info(`Review complete: ${warningCount} warning(s), no errors`)
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

run()
