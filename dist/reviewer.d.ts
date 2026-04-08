export interface ReviewComment {
    path: string;
    line: number;
    severity: 'error' | 'warning' | 'info';
    body: string;
}
export declare function getReview(apiKey: string, model: string, prompt: string): Promise<ReviewComment[]>;
