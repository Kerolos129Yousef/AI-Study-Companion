import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/auth';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api';

console.log('[API] Configured base URL:', API_URL);

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log(`[API] Added token to ${config.method?.toUpperCase()} ${config.url}`);
  } else {
    console.warn(`[API] No token available for ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Sharing API
export const sharingAPI = {
  // Flashcard Sets
  createFlashcardSet: (flashcardIds: string[], title: string, description?: string) =>
    api.post('/sharing/flashcard-set', { flashcardIds, title, description }),

  createQuizSet: (quizIds: string[], title: string, description?: string) =>
    api.post('/sharing/quiz-set', { quizIds, title, description }),

  toggleFlashcardPublic: (id: string) =>
    api.patch(`/sharing/flashcard/${id}/toggle-public`),

  toggleQuizPublic: (id: string) =>
    api.patch(`/sharing/quiz/${id}/toggle-public`),

  shareFlashcardWith: (id: string, userIds: string[]) =>
    api.post(`/sharing/flashcard/${id}/share-with`, { userIds }),

  shareQuizWith: (id: string, userIds: string[]) =>
    api.post(`/sharing/quiz/${id}/share-with`, { userIds }),

  getSharedFlashcardsWithMe: () =>
    api.get('/sharing/flashcards/shared-with-me'),

  getSharedQuizzesWithMe: () =>
    api.get('/sharing/quizzes/shared-with-me'),

  getPublicFlashcardSet: (shareToken: string) =>
    api.get(`/sharing/flashcard/public/${shareToken}`),

  getPublicQuizSet: (shareToken: string) =>
    api.get(`/sharing/quiz/public/${shareToken}`),

  getFlashcardSet: (shareToken: string) =>
    api.get(`/sharing/flashcard/${shareToken}`),

  getQuizSet: (shareToken: string) =>
    api.get(`/sharing/quiz/${shareToken}`),

  submitSharedQuiz: (shareToken: string, answers: any[], lectureId?: string) =>
    api.post(`/sharing/quiz/${shareToken}/submit`, { answers, lectureId }),

  duplicateFlashcardSet: (id: string) =>
    api.post(`/sharing/flashcard/${id}/duplicate`),

  duplicateQuizSet: (id: string) =>
    api.post(`/sharing/quiz/${id}/duplicate`),

  removeFlashcardShareUser: (id: string, userId: string) =>
    api.delete(`/sharing/flashcard/${id}/remove-user/${userId}`),

  removeQuizShareUser: (id: string, userId: string) =>
    api.delete(`/sharing/quiz/${id}/remove-user/${userId}`),

  getFlashcardSetForLecture: (lectureId: string) =>
    api.get(`/sharing/flashcard/for-lecture/${lectureId}`),

  getQuizSetForLecture: (lectureId: string) =>
    api.get(`/sharing/quiz/for-lecture/${lectureId}`),
};

// Study Groups API
export const studyGroupsAPI = {
  createGroup: (name: string, description?: string) =>
    api.post('/study-groups', { name, description }),

  getMyGroups: () =>
    api.get('/study-groups'),

  getGroupDetail: (id: string) =>
    api.get(`/study-groups/${id}`),

  updateGroup: (id: string, name: string, description?: string) =>
    api.patch(`/study-groups/${id}`, { name, description }),

  deleteGroup: (id: string) =>
    api.delete(`/study-groups/${id}`),

  inviteUsers: (id: string, userIds?: string[], emails?: string[]) =>
    api.post(`/study-groups/${id}/invite`, { userIds, emails }),

  removeGroupMember: (id: string, userId: string) =>
    api.delete(`/study-groups/${id}/members/${userId}`),

  addFlashcardSetToGroup: (id: string, flashcardIds: string[], title: string, description?: string) =>
    api.post(`/study-groups/${id}/flashcard-set`, { flashcardIds, title, description }),

  addQuizSetToGroup: (id: string, quizIds: string[], title: string, description?: string) =>
    api.post(`/study-groups/${id}/quiz-set`, { quizIds, title, description }),

  removeMaterialFromGroup: (id: string, materialId: string, type: 'flashcard' | 'quiz') =>
    api.delete(`/study-groups/${id}/materials/${materialId}/${type}`),

  addLectureToGroup: (id: string, lectureIds: string[]) =>
    api.post(`/study-groups/${id}/lecture`, { lectureIds }),

  removeLectureFromGroup: (id: string, lectureId: string) =>
    api.delete(`/study-groups/${id}/lectures/${lectureId}`),

  leaveGroup: (id: string) =>
    api.post(`/study-groups/${id}/leave`),

  acceptInvitation: (token: string) =>
    api.post(`/study-groups/invitations/accept/${token}`),
};

// Comments API
export const commentsAPI = {
  createComment: (content: string, targetId: string, targetType: string, parentCommentId?: string) =>
    api.post('/comments', { content, targetId, targetType, parentCommentId }),

  createReply: (parentCommentId: string, content: string) =>
    api.post('/comments', { content, targetId: parentCommentId, targetType: 'reply', parentCommentId }),

  getComments: (targetId: string, targetType: string) =>
    api.get('/comments', { params: { targetId, targetType } }),

  editComment: (id: string, content: string) =>
    api.patch(`/comments/${id}`, { content }),

  deleteComment: (id: string) =>
    api.delete(`/comments/${id}`),

  togglePinComment: (id: string) =>
    api.patch(`/comments/${id}/toggle-pin`),
};

// Flashcards API
export const flashcardsAPI = {
  getAllFlashcards: () =>
    api.get('/flashcards/user/all'),

  getFlashcard: (id: string) =>
    api.get(`/flashcards/${id}`),
};

// Quizzes API
export const quizzesAPI = {
  getAllQuizzes: () =>
    api.get('/quiz/history'),

  getQuiz: (id: string) =>
    api.get(`/quiz/${id}`),
};

export default api;
