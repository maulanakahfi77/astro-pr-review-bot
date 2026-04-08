import Anthropic from '@anthropic-ai/sdk'
import * as core from '@actions/core'

export interface ReviewComment {
  path: string
  line: number
  severity: 'error' | 'warning' | 'info'
  body: string
}

const SEVERITY_EMOJI: Record<string, string> = {
  error: '🔴',
  warning: '🟡',
  info: '✅',
}

export async function getReview(
  apiKey: string,
  model: string,
  prompt: string
): Promise<ReviewComment[]> {
  const client = new Anthropic({ apiKey })

  core.info(`Calling Claude (${model})...`)

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  const text = content.text.trim()
  core.info(`Claude response length: ${text.length} chars, stop_reason: ${response.stop_reason}`)

  // Extract JSON from response (handle possible markdown code blocks)
  let jsonStr = text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  try {
    const comments: ReviewComment[] = JSON.parse(jsonStr)
    return comments.map(c => ({
      ...c,
      body: `${SEVERITY_EMOJI[c.severity] || ''} **${c.severity.toUpperCase()}**: ${c.body}`,
    }))
  } catch (parseError) {
    // If JSON is truncated/invalid, post the raw response as a single comment
    core.warning(`Failed to parse Claude response as JSON: ${parseError}`)
    return [{
      path: 'SUMMARY',
      line: 0,
      severity: 'info',
      body: text,
    }]
  }
}
