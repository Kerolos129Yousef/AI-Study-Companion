import Groq from 'groq-sdk';

let groq: Groq | null = null;

function getGroqClient(): Groq {
  if (!groq) {
    console.log('[GROQ] Initializing Groq client...');
    console.log('[GROQ] API Key present:', !!process.env.GROQ_API_KEY);
    console.log('[GROQ] API Key length:', process.env.GROQ_API_KEY?.length || 0);
    console.log('[GROQ] API Key starts with:', process.env.GROQ_API_KEY?.substring(0, 10) || 'MISSING');

    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    console.log('[GROQ] Groq client initialized');
  }
  return groq;
}

interface SummaryResult {
  title: string;
  keyTopics: string[];
  summary: string;
  importantTerms: Array<{ term: string; definition: string }>;
}

interface FlashcardResult {
  front: string;
  back: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: 'A' | 'B' | 'C' | 'D';
  topic?: string;
}

async function callGroqWithRetry(
  prompt: string,
  fallback: any,
  maxRetries = 2
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[GROQ] Attempt ${attempt + 1}/${maxRetries}, calling API...`);

      // Validate API key before making request
      if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY environment variable is not set');
      }

      const response = await getGroqClient().chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const text = response.choices[0]?.message?.content || '';

      if (!text) {
        throw new Error('Empty response from Groq API');
      }

      console.log('[GROQ] API Response received, length:', text.length);
      console.log('[GROQ] Response preview:', text.substring(0, 200));

      // Strip markdown code fences if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      const parsed = JSON.parse(cleanText);
      console.log('[GROQ] Successfully parsed JSON');
      return parsed;
    } catch (error: any) {
      lastError = error;
      console.error(`[GROQ] Attempt ${attempt + 1} failed:`, error.message);
      console.error('[GROQ] Error type:', error.constructor.name);
      console.error('[GROQ] Error status:', error.status);
      console.error('[GROQ] Full error:', JSON.stringify(error, null, 2));

      // Handle 400 Bad Request - likely model decommissioned or invalid request
      if (error.status === 400 || error.message?.includes('400')) {
        console.error('[GROQ] 400 Bad Request - check model name and API key validity');
        if (attempt === maxRetries - 1) {
          return fallback;
        }
        continue;
      }

      // Handle rate limiting with exponential backoff
      if (error.status === 429 || error.message?.includes('429')) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`[GROQ] Rate limited, backing off for ${backoffMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      // Handle authentication errors
      if (error.status === 401 || error.message?.includes('401')) {
        console.error('[GROQ] Authentication failed - check GROQ_API_KEY');
        return fallback;
      }

      // Handle token limit exceeded
      if (error.message?.includes('max_tokens')) {
        console.error('[GROQ] Token limit exceeded:', error);
        return fallback;
      }

      // On last attempt, add stricter JSON instruction
      if (attempt === maxRetries - 1) {
        try {
          console.log('[GROQ] Final attempt with strict JSON instruction...');
          const retry = await getGroqClient().chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 2000,
            messages: [
              { role: 'system', content: 'You must return ONLY valid JSON. No text before or after. No markdown formatting.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
          });

          const text = retry.choices[0]?.message?.content || '';

          if (!text) {
            throw new Error('Empty response from Groq API on final attempt');
          }

          console.log('[GROQ] Final attempt response received');
          let cleanRetryText = text.trim();
          if (cleanRetryText.startsWith('```')) {
            cleanRetryText = cleanRetryText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
          }
          const parsed = JSON.parse(cleanRetryText);
          console.log('[GROQ] Final attempt succeeded');
          return parsed;
        } catch (retryError: any) {
          console.error('[GROQ] Final attempt failed:', retryError.message);
          console.error('[GROQ] Full error:', JSON.stringify(retryError, null, 2));
          return fallback;
        }
      }
    }
  }

  console.error('[GROQ] All retries exhausted, returning fallback');
  return fallback;
}

export async function generateSummary(lectureText: string): Promise<SummaryResult> {
  console.log('[GENERATESUM] Starting summary generation');
  console.log('[GENERATESUM] Input text length:', lectureText?.length || 0);

  if (!lectureText || lectureText.trim().length === 0) {
    console.error('[GENERATESUM] Empty lecture text provided');
    return {
      title: 'Unable to generate summary',
      keyTopics: [],
      summary: 'No lecture content provided.',
      importantTerms: [],
    };
  }

  const prompt = `You are an academic study assistant. Given the following lecture text, produce a detailed and comprehensive structured summary in JSON format.

Return ONLY valid JSON, no markdown, no explanation.

IMPORTANT: The summary must be thorough and detailed. Write 5-8 substantial paragraphs covering all major concepts, examples, and explanations from the lecture. Each paragraph should be 3-5 sentences minimum. Do NOT write a brief or superficial overview — provide an in-depth summary that would help a student understand the material without reading the original lecture.

Format:
{
  "title": "string",
  "keyTopics": ["string (include at least 5-8 key topics)"],
  "summary": "string (5-8 detailed paragraphs, each 3-5 sentences. Cover all main ideas, supporting details, examples, and conclusions from the lecture.)",
  "importantTerms": [{"term": "string", "definition": "string (provide a clear, complete definition of 2-3 sentences)"}]
}

Lecture text:
${lectureText}`;

  console.log('[GENERATESUM] Prompt created, length:', prompt.length);

  const fallback: SummaryResult = {
    title: 'Unable to generate summary',
    keyTopics: [],
    summary: 'The summary could not be generated. Please try again later.',
    importantTerms: [],
  };

  console.log('[GENERATESUM] Calling Groq API...');
  const result = await callGroqWithRetry(prompt, fallback);
  console.log('[GENERATESUM] Result received:', JSON.stringify(result).substring(0, 100));

  return result;
}

export async function generateFlashcards(summary: string): Promise<FlashcardResult[]> {
  console.log('[FLASHCARDS] Starting flashcard generation');
  const prompt = `You are an academic flashcard generator. Based on the lecture summary below, generate exactly 15 flashcards as a JSON array.

Return ONLY valid JSON, no markdown.

Format:
[{"front": "question or term", "back": "answer or definition"}]

Keep fronts concise (under 15 words). Backs should be complete but brief.

Summary:
${summary}`;

  const fallback: FlashcardResult[] = [];

  const result = await callGroqWithRetry(prompt, fallback);
  console.log('[FLASHCARDS] Generated flashcards count:', Array.isArray(result) ? result.length : 0);
  if (Array.isArray(result) && result.length === 0) {
    console.log('[FLASHCARDS] Empty array returned. Full result:', JSON.stringify(result, null, 2));
  }
  return result;
}

export async function generateQuiz(summary: string): Promise<QuizQuestion[]> {
  console.log('[QUIZ] Starting quiz generation');
  const prompt = `You are an exam question generator. Generate exactly 10 multiple-choice questions from the content below.

Return ONLY valid JSON, no markdown.

Format:
[{
  "question": "string",
  "options": ["A. text", "B. text", "C. text", "D. text"],
  "correct": "A" | "B" | "C" | "D",
  "topic": "main topic or concept being tested"
}]

Content:
${summary}`;

  const fallback: QuizQuestion[] = [];

  const result = await callGroqWithRetry(prompt, fallback);
  console.log('[QUIZ] Generated quiz questions count:', Array.isArray(result) ? result.length : 0);
  if (Array.isArray(result) && result.length === 0) {
    console.log('[QUIZ] Empty array returned. Full result:', JSON.stringify(result, null, 2));
  }
  if (Array.isArray(result) && result.length > 0) {
    console.log('[QUIZ] First question structure:', JSON.stringify(result[0], null, 2));
  }
  return result;
}

export function logTokenUsage(feature: string, tokens: number): void {
  const costPerMTok = 0.003; // Claude Sonnet 4.6 input cost
  const cost = (tokens / 1000000) * costPerMTok;
  console.log(`[COST] ${feature}: ${tokens} tokens (~$${cost.toFixed(4)})`);
}

export interface StudyPlanContext {
  examDate: string;
  daysUntilExam: number;
  courseCount: number;
  courseTitles: string[];
  lectureCount: number;
  lectureTitles: string[];
  totalFlashcards: number;
  flashcardsDueToday: number;
  quizzesTaken: number;
  avgQuizScore: number;
  weakAreas: Array<{ topic: string; percentage: number }>;
}

export async function generateStudyPlan(
  context: StudyPlanContext
): Promise<{ plan: string; dailyGoals: string[] }> {
  console.log('[STUDY_PLAN] Starting study plan generation');

  const weakAreasList = context.weakAreas
    .slice(0, 5)
    .map((a) => `${a.topic} (${a.percentage}% mastery)`)
    .join(', ');

  const prompt = `You are an academic study advisor. Create a highly personalized study plan for a student based on their actual learning data:

STUDENT PROFILE:
- Exam date: ${context.examDate} (${context.daysUntilExam} days away)
- Courses: ${context.courseCount} (${context.courseTitles.slice(0, 5).join(', ')})
- Lectures to review: ${context.lectureCount} (${context.lectureTitles.slice(0, 5).join(', ')}${context.lectureTitles.length > 5 ? '...' : ''})
- Flashcards: ${context.totalFlashcards} total, ${context.flashcardsDueToday} due today
- Quizzes taken: ${context.quizzesTaken}, average score: ${context.avgQuizScore}%
- Weak areas: ${weakAreasList || 'None identified yet — take quizzes to identify weak areas'}

Generate a concise, actionable study plan that:
1. Prioritizes weak areas and low-scoring topics
2. Distributes flashcard review and quiz practice across available days
3. References specific lectures and courses by name
4. Accounts for the flashcards due today

Return ONLY valid JSON with no markdown:
{
  "plan": "2-3 paragraph study strategy referencing specific courses and topics",
  "dailyGoals": ["Day 1: specific goal", "Day 2: specific goal", ...]
}`;

  const fallback = {
    plan: 'Unable to generate personalized study plan. Focus on reviewing weak areas and practicing with quizzes.',
    dailyGoals: [],
  };

  const result = await callGroqWithRetry(prompt, fallback);
  console.log('[STUDY_PLAN] Generated study plan');
  return result;
}
