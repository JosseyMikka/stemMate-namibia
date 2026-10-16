const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
let authToken: string | null = null;
export function setAuthToken(token: string | null) {authToken = token;}
export interface User {id: number; username: string; role: 'teacher' | 'learner'}
export interface Course {id: string; pathway: string; qualification: string; code: string; version: string; grades: number[]; exam_years: number[]; source: string; topics: {id: string; label: string}[]; coverage_notice: string}
export interface TeacherPolicy {max_hints: number; paused: boolean; evaluation_enabled: boolean; voice_input_enabled: boolean}
export interface Classroom extends TeacherPolicy {id: number; name: string; grade: number; course_id: string; exam_year: number; course: Course}
export interface Lesson {
  stage: 'attempt' | 'explain' | 'feedback' | 'apply' | 'independent' | 'complete';
  challenge: string; hints: string[]; hints_used: number; max_hints: number;
  direct_used: boolean; explanation?: string; application?: string;
  independent?: string; application_explanation?: string;
  independent_explanation?: string; direct_explanation?: string; content_source?: string;
}
export async function request<T>(path: string, method = 'GET', body?: unknown, _key?: string, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method, headers: {'Content-Type':'application/json', ...(authToken ? {'Authorization':`Bearer ${authToken}`} : {}), ...(token ? {'X-Learning-Token':token} : {})},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Check the required fields and try again.');
  }
  return response.json();
}
