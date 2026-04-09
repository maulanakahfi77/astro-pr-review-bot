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
Object.defineProperty(exports, "__esModule", { value: true });
exports.postReview = postReview;
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
async function postReview(owner, repo, prNumber, comments, commitSha) {
    const token = process.env.GITHUB_TOKEN || '';
    const octokit = github.getOctokit(token);
    // Separate summary from inline comments
    const summary = comments.find(c => c.path === 'SUMMARY');
    const inlineComments = comments.filter(c => c.path !== 'SUMMARY');
    // Determine review event based on severity
    const hasErrors = comments.some(c => c.severity === 'error');
    const event = hasErrors ? 'REQUEST_CHANGES' : 'COMMENT';
    // Build inline review comments only (summary goes in edited /review comment)
    const reviewComments = inlineComments
        .filter(c => c.line > 0 && c.path)
        .map(c => ({
        path: c.path,
        line: c.line,
        body: c.body,
    }));
    if (reviewComments.length === 0) {
        core.info('No inline comments to post');
        return;
    }
    try {
        await octokit.rest.pulls.createReview({
            owner,
            repo,
            pull_number: prNumber,
            commit_id: commitSha,
            event: event,
            body: '',
            comments: reviewComments,
        });
        core.info(`Posted ${reviewComments.length} inline comments (${event})`);
    }
    catch (error) {
        core.warning(`Failed to post inline review: ${error}`);
    }
}
//# sourceMappingURL=github.js.map