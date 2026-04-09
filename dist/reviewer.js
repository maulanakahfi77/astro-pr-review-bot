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
exports.getReview = getReview;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const core = __importStar(require("@actions/core"));
const SEVERITY_EMOJI = {
    error: '🔴',
    warning: '🟡',
    info: '✅',
};
async function getReview(apiKey, model, prompt) {
    const client = new sdk_1.default({ apiKey });
    core.info(`Calling Claude (${model})...`);
    const response = await client.messages.create({
        model,
        max_tokens: 8192,
        messages: [
            {
                role: 'user',
                content: prompt,
            },
        ],
    });
    const content = response.content[0];
    if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
    }
    const text = content.text.trim();
    core.info(`Claude response length: ${text.length} chars, stop_reason: ${response.stop_reason}`);
    // Extract JSON from response (handle possible markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }
    try {
        const comments = JSON.parse(jsonStr);
        return comments.map(c => ({
            ...c,
            body: `${SEVERITY_EMOJI[c.severity] || ''} **${c.severity.toUpperCase()}**: ${c.body}`,
        }));
    }
    catch (parseError) {
        // If JSON is truncated/invalid, post the raw response as a single comment
        core.warning(`Failed to parse Claude response as JSON: ${parseError}`);
        return [{
                path: 'SUMMARY',
                line: 0,
                severity: 'info',
                body: text,
            }];
    }
}
//# sourceMappingURL=reviewer.js.map