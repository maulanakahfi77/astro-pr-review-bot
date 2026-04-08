export interface PRContext {
    owner: string;
    repo: string;
    prNumber: number;
    diff: string;
    changedFiles: FileChange[];
    claudeMd: string;
    serenaMemories: string[];
    agenticMaterial: string;
}
export interface FileChange {
    filename: string;
    status: string;
    patch: string;
    content: string;
}
export declare function getPRContext(): Promise<PRContext>;
