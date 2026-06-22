import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useAuthStore } from './store/auth';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import LecturesPage from './pages/LecturesPage';
import LectureDetailPage from './pages/LectureDetailPage';
import FlashcardReviewPage from './pages/FlashcardReviewPage';
import FlashcardLectureSelectPage from './pages/FlashcardLectureSelectPage';
import QuizPage from './pages/QuizPage';
import QuizResultsPage from './pages/QuizResultsPage';
import StudyGroupsPage from './pages/StudyGroupsPage';
import StudyGroupDetailPage from './pages/StudyGroupDetailPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import SharedWithMePage from './pages/SharedWithMePage';
import SharedFlashcardViewPage from './pages/SharedFlashcardViewPage';
import SharedQuizViewPage from './pages/SharedQuizViewPage';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <CoursesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lectures"
            element={
              <ProtectedRoute>
                <LecturesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lectures/:id"
            element={
              <ProtectedRoute>
                <LectureDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review"
            element={
              <ProtectedRoute>
                <FlashcardLectureSelectPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lectures/:lectureId/review"
            element={
              <ProtectedRoute>
                <FlashcardReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:lectureId"
            element={
              <ProtectedRoute>
                <QuizPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/results/:quizId"
            element={
              <ProtectedRoute>
                <QuizResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/study-groups"
            element={
              <ProtectedRoute>
                <StudyGroupsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/study-groups/:id"
            element={
              <ProtectedRoute>
                <StudyGroupDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accept-invitation/:token"
            element={
              <ProtectedRoute>
                <AcceptInvitationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shared-with-me"
            element={
              <ProtectedRoute>
                <SharedWithMePage />
              </ProtectedRoute>
            }
          />
          <Route path="/shared/flashcard/:shareToken" element={<SharedFlashcardViewPage />} />
          <Route path="/shared/quiz/:shareToken" element={<SharedQuizViewPage />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
