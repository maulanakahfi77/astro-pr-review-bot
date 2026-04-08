import * as github from '@actions/github'
import * as core from '@actions/core'
import path from 'path'
import fs from 'fs'

export interface PRContext {
  owner: string
  repo: string
  prNumber: number
  diff: string
  changedFiles: FileChange[]
  claudeMd: string
  serenaMemories: string[]
  agenticMaterial: string
}

export interface FileChange {
  filename: string
  status: string
  patch: string
  content: string
}

export async function getPRContext(): Promise<PRContext> {
  const token = process.env.GITHUB_TOKEN || ''
  const octokit = github.getOctokit(token)
  const context = github.context

  const owner = context.repo.owner
  const repo = context.repo.repo
  const prNumber = context.payload.pull_request?.number

  if (!prNumber) {
    throw new Error('This action can only be run on pull_request events')
  }

  // Get PR diff
  const { data: diff } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: 'diff' },
  })

  // Get changed files with content
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  })

  const maxFiles = parseInt(core.getInput('max_files') || '20')
  const ignorePathsInput = core.getInput('ignore_paths')
  const ignorePaths = ignorePathsInput ? ignorePathsInput.split(',').map(p => p.trim()) : []

  const changedFiles: FileChange[] = []

  for (const file of files.slice(0, maxFiles)) {
    if (shouldIgnore(file.filename, ignorePaths)) continue

    let content = ''
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: file.filename,
        ref: context.payload.pull_request?.head.sha,
      })
      if ('content' in data && data.content) {
        content = Buffer.from(data.content, 'base64').toString('utf-8')
      }
    } catch {
      // File might be deleted
    }

    changedFiles.push({
      filename: file.filename,
      status: file.status,
      patch: file.patch || '',
      content,
    })
  }

  // Read CLAUDE.md from repo
  const claudeMd = readFileIfExists('CLAUDE.md')

  // Read Serena memories for affected domains
  const serenaMemories = readSerenaMemories(changedFiles)

  // Read agenticmaterial if WF ticket is referenced
  const agenticMaterial = readAgenticMaterial(context.payload.pull_request?.title || '')

  return {
    owner,
    repo,
    prNumber,
    diff: diff as unknown as string,
    changedFiles,
    claudeMd,
    serenaMemories,
    agenticMaterial,
  }
}

function shouldIgnore(filename: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return regex.test(filename)
  })
}

function readFileIfExists(filePath: string): string {
  const workspace = process.env.GITHUB_WORKSPACE || '.'
  const fullPath = path.join(workspace, filePath)
  try {
    return fs.readFileSync(fullPath, 'utf-8')
  } catch {
    return ''
  }
}

function readSerenaMemories(changedFiles: FileChange[]): string[] {
  const workspace = process.env.GITHUB_WORKSPACE || '.'
  const memoriesDir = path.join(workspace, '.serena', 'memories')
  const memories: string[] = []

  if (!fs.existsSync(memoriesDir)) return memories

  // Extract domains from changed file paths
  const domains = new Set<string>()
  for (const file of changedFiles) {
    // e.g., internal/service/packageid/get_list.go → packageid
    const parts = file.filename.split('/')
    const domainIdx = parts.findIndex(p =>
      ['service', 'repository', 'api'].includes(p)
    )
    if (domainIdx >= 0 && parts[domainIdx + 1]) {
      domains.add(parts[domainIdx + 1])
    }
  }

  // Read memory files matching affected domains
  for (const domain of domains) {
    const memoryFiles = fs.readdirSync(memoriesDir).filter(f => f.startsWith(domain))
    for (const file of memoryFiles) {
      try {
        const content = fs.readFileSync(path.join(memoriesDir, file), 'utf-8')
        memories.push(`# Memory: ${file}\n${content}`)
      } catch {
        // skip
      }
    }
  }

  return memories
}

function readAgenticMaterial(prTitle: string): string {
  const workspace = process.env.GITHUB_WORKSPACE || '.'
  const match = prTitle.match(/WF-(\d+)/)
  if (!match) return ''

  const wfDir = path.join(workspace, 'agenticmaterial', `WF-${match[1]}`)
  if (!fs.existsSync(wfDir)) return ''

  let material = ''
  for (const file of ['specs.md', 'plan.md']) {
    const filePath = path.join(wfDir, file)
    try {
      material += `\n# ${file}\n${fs.readFileSync(filePath, 'utf-8')}`
    } catch {
      // skip
    }
  }

  return material
}
