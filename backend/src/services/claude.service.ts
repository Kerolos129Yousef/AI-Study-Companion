import Groq from 'groq-sdk';

let groq: Groq | null = null;

function getGroqClient(): Groq {
  if (!groq) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
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

// Calls Groq LLM API with automatic retry (exponential backoff on 429, final
// attempt uses a stricter system prompt for JSON compliance). Returns `fallback`
// on unrecoverable errors rather than throwing, so callers always get a result.
async function callGroqWithRetry(
  prompt: string,
  fallback: unknown,
  maxRetries = 2
): Promise<unknown> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
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

      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      return JSON.parse(cleanText);
    } catch (error: any) {

      if (error.status === 400 || error.message?.includes('400')) {
        if (attempt === maxRetries - 1) {
          return fallback;
        }
        continue;
      }

      if (error.status === 429 || error.message?.includes('429')) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      if (error.status === 401 || error.message?.includes('401')) {
        return fallback;
      }

      if (error.message?.includes('max_tokens')) {
        return fallback;
      }

      if (attempt === maxRetries - 1) {
        try {
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

          let cleanRetryText = text.trim();
          if (cleanRetryText.startsWith('```')) {
            cleanRetryText = cleanRetryText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
          }
          return JSON.parse(cleanRetryText);
        } catch {
          return fallback;
        }
      }
    }
  }

  return fallback;
}

export async function generateSummary(lectureText: string): Promise<SummaryResult> {
  if (!lectureText || lectureText.trim().length === 0) {
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

  const fallback: SummaryResult = {
    title: 'Unable to generate summary',
    keyTopics: [],
    summary: 'The summary could not be generated. Please try again later.',
    importantTerms: [],
  };

  const result = await callGroqWithRetry(prompt, fallback);
  return result as SummaryResult;
}

export async function generateFlashcards(summary: string): Promise<FlashcardResult[]> {
  const prompt = `You are an academic flashcard generator. Based on the lecture summary below, generate exactly 15 flashcards as a JSON array.

Return ONLY valid JSON, no markdown.

Format:
[{"front": "question or term", "back": "answer or definition"}]

Keep fronts concise (under 15 words). Backs should be complete but brief.

Summary:
${summary}`;

  const fallback: FlashcardResult[] = [];

  const result = await callGroqWithRetry(prompt, fallback);
  return result as FlashcardResult[];
}

export async function generateQuiz(summary: string): Promise<QuizQuestion[]> {
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
  return result as QuizQuestion[];
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
  return result as { plan: string; dailyGoals: string[] };
}
