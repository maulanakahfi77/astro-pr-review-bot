"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPRContext = getPRContext;
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
async function getPRContext() {
    const token = process.env.GITHUB_TOKEN || '';
    const octokit = github.getOctokit(token);
    const context = github.context;
    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const prNumber = context.payload.pull_request?.number;
    if (!prNumber) {
        throw new Error('This action can only be run on pull_request events');
    }
    // Get PR diff
    const { data: diff } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
        mediaType: { format: 'diff' },
    });
    // Get changed files with content
    const { data: files } = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
    });
    const maxFiles = parseInt(core.getInput('max_files') || '20');
    const ignorePathsInput = core.getInput('ignore_paths');
    const ignorePaths = ignorePathsInput ? ignorePathsInput.split(',').map(p => p.trim()) : [];
    const changedFiles = [];
    for (const file of files.slice(0, maxFiles)) {
        if (shouldIgnore(file.filename, ignorePaths))
            continue;
        let content = '';
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: file.filename,
                ref: context.payload.pull_request?.head.sha,
            });
            if ('content' in data && data.content) {
                content = Buffer.from(data.content, 'base64').toString('utf-8');
            }
        }
        catch {
            // File might be deleted
        }
        changedFiles.push({
            filename: file.filename,
            status: file.status,
            patch: file.patch || '',
            content,
        });
    }
    // Read CLAUDE.md from repo
    const claudeMd = readFileIfExists('CLAUDE.md');
    // Read Serena memories for affected domains
    const serenaMemories = readSerenaMemories(changedFiles);
    // Read agenticmaterial if WF ticket is referenced
    const agenticMaterial = readAgenticMaterial(context.payload.pull_request?.title || '');
    return {
        owner,
        repo,
        prNumber,
        diff: diff,
        changedFiles,
        claudeMd,
        serenaMemories,
        agenticMaterial,
    };
}
function shouldIgnore(filename, patterns) {
    return patterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filename);
    });
}
function readFileIfExists(filePath) {
    const workspace = process.env.GITHUB_WORKSPACE || '.';
    const fullPath = path_1.default.join(workspace, filePath);
    try {
        return fs_1.default.readFileSync(fullPath, 'utf-8');
    }
    catch {
        return '';
    }
}
function readSerenaMemories(changedFiles) {
    const workspace = process.env.GITHUB_WORKSPACE || '.';
    const memoriesDir = path_1.default.join(workspace, '.serena', 'memories');
    const memories = [];
    if (!fs_1.default.existsSync(memoriesDir))
        return memories;
    // Extract domains from changed file paths
    const domains = new Set();
    for (const file of changedFiles) {
        // e.g., internal/service/packageid/get_list.go → packageid
        const parts = file.filename.split('/');
        const domainIdx = parts.findIndex(p => ['service', 'repository', 'api'].includes(p));
        if (domainIdx >= 0 && parts[domainIdx + 1]) {
            domains.add(parts[domainIdx + 1]);
        }
    }
    // Read memory files matching affected domains
    for (const domain of domains) {
        const memoryFiles = fs_1.default.readdirSync(memoriesDir).filter(f => f.startsWith(domain));
        for (const file of memoryFiles) {
            try {
                const content = fs_1.default.readFileSync(path_1.default.join(memoriesDir, file), 'utf-8');
                memories.push(`# Memory: ${file}\n${content}`);
            }
            catch {
                // skip
            }
        }
    }
    return memories;
}
function readAgenticMaterial(prTitle) {
    const workspace = process.env.GITHUB_WORKSPACE || '.';
    const match = prTitle.match(/WF-(\d+)/);
    if (!match)
        return '';
    const wfDir = path_1.default.join(workspace, 'agenticmaterial', `WF-${match[1]}`);
    if (!fs_1.default.existsSync(wfDir))
        return '';
    let material = '';
    for (const file of ['specs.md', 'plan.md']) {
        const filePath = path_1.default.join(wfDir, file);
        try {
            material += `\n# ${file}\n${fs_1.default.readFileSync(filePath, 'utf-8')}`;
        }
        catch {
            // skip
        }
    }
    return material;
}
//# sourceMappingURL=context.js.map