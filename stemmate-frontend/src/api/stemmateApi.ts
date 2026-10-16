const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
export interface Lesson {
  stage: 'attempt' | 'explain' | 'feedback' | 'apply' | 'independent' | 'complete';
  challenge: string; hints: string[]; hints_used: number; max_hints: number;
  direct_used: boolean; explanation?: string; application?: string;
  independent?: string; application_explanation?: string;
  independent_explanation?: string; direct_explanation?: string;
}
export interface TeacherPolicy { max_hints: number; paused: boolean; evaluation_enabled: boolean }
export async function request<T>(path: string, method = 'GET', body?: unknown, key?: string, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(key ? { 'X-Teacher-Key': key } : {}), ...(token ? { 'X-Learning-Token': token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Unable to complete this request. Please try again.');
  }
  return response.json();
}
