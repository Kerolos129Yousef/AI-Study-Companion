import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseService, lectureService } from '../services';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { FileUpload, LoadingSpinner } from '../components/Common';
import { DropdownMenu } from '../components/DropdownMenu';
import { Plus, X, Calendar, BookOpen, Edit2, Trash2 } from 'lucide-react';

export default function CoursesPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lectureTitle, setLectureTitle] = useState('');
  const [courseError, setCourseError] = useState('');
  const [lectureError, setLectureError] = useState('');
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editExamDate, setEditExamDate] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await courseService.getCourses();
      console.log('[COURSES QUERY] Full API response:', response);
      console.log('[COURSES QUERY] Response data:', response.data);
      return response;
    },
    select: (data) => {
      const normalized = data?.data?.data || data?.data || data || [];
      console.log('[COURSES SELECT] Normalized to:', normalized);
      return normalized;
    },
  });

  const { data: lectures } = useQuery({
    queryKey: ['lectures', selectedCourseId],
    queryFn: () => lectureService.getLectures(selectedCourseId!),
    enabled: !!selectedCourseId,
    select: (response) => {
      // Handle both { data: [...] } and [...] response formats
      return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: () => courseService.createCourse(title, description),
    onSuccess: () => {
      console.log('[CREATE COURSE] Success - invalidating courses query');
      setTitle('');
      setDescription('');
      setShowForm(false);
      setCourseError('');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (error: any) => {
      console.error('[CREATE COURSE] Error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create course. Please try again.';
      setCourseError(errorMessage);
    },
  });

  const uploadLectureMutation = useMutation({
    mutationFn: (file: File) =>
      lectureService.uploadLecture(selectedCourseId!, lectureTitle, file),
    onSuccess: () => {
      setLectureTitle('');
      setLectureError('');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['lectures', selectedCourseId] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to upload lecture. Please try again.';
      setLectureError(errorMessage);
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: (data: any) => courseService.updateCourse(editingCourseId!, data),
    onSuccess: () => {
      setEditingCourseId(null);
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (error: any) => {
      console.error('[UPDATE COURSE] Error:', error);
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (courseId: string) => courseService.deleteCourse(courseId),
    onSuccess: () => {
      setDeleteConfirmId(null);
      if (selectedCourseId === deleteConfirmId) {
        setSelectedCourseId(null);
      }
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (error: any) => {
      console.error('[DELETE COURSE] Error:', error);
    },
  });

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">My Courses</h1>
          <p className="text-slate-400">Manage your courses and learning materials</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Courses Grid */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
                <span className="ml-3 text-gray-400">Loading courses...</span>
              </div>
            ) : courses && courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map((course: any) => (
                  <div
                    key={course.id}
                    className={`group relative bg-slate-900 border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                      selectedCourseId === course.id
                        ? 'border-purple-500 bg-slate-800'
                        : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    {/* Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-slate-700 text-slate-300 text-xs font-medium rounded-full">
                            {course._count.lectures} lectures
                          </span>
                          <DropdownMenu
                            items={[
                              {
                                label: 'Edit',
                                icon: <Edit2 className="w-4 h-4" />,
                                onClick: () => {
                                  setEditingCourseId(course.id);
                                  setEditTitle(course.title);
                                  setEditDescription(course.description || '');
                                  setEditExamDate(course.examDate ? new Date(course.examDate).toISOString().split('T')[0] : '');
                                },
                              },
                              {
                                label: 'Delete',
                                icon: <Trash2 className="w-4 h-4" />,
                                isDanger: true,
                                onClick: () => setDeleteConfirmId(course.id),
                              },
                            ]}
                          />
                        </div>
                      </div>

                      <div onClick={() => setSelectedCourseId(course.id)}>
                        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{course.title}</h3>
                        <p className="text-slate-400 text-sm mb-4 line-clamp-2">{course.description}</p>

                        {course.examDate && (
                          <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(course.examDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Delete Confirmation */}
                      {deleteConfirmId === course.id && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-sm text-red-300 mb-3">Delete {course.title}? This will delete all lectures inside.</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => deleteCourseMutation.mutate(course.id)}
                              disabled={deleteCourseMutation.isPending}
                              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
                            >
                              {deleteCourseMutation.isPending ? 'Deleting...' : 'Delete'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
                <BookOpen className="w-16 h-16 text-slate-700 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No courses yet</h3>
                <p className="text-slate-400 mb-6">Create your first course to get started</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Create Course
                </button>
              </div>
            )}
          </div>

          {/* Sidebar - Lectures & Upload */}
          <div>
            {selectedCourseId ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sticky top-8">
                <h3 className="text-lg font-bold text-white mb-6">Lectures</h3>

                {/* Upload Section */}
                <div className="mb-6 pb-6 border-b border-slate-800">
                  <label className="block text-sm font-medium text-slate-300 mb-3">Lecture Title</label>
                  <input
                    type="text"
                    value={lectureTitle}
                    onChange={(e) => setLectureTitle(e.target.value)}
                    placeholder="e.g., Chapter 1"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 mb-4 text-sm"
                  />
                  <FileUpload
                    onFileSelect={(file) => {
                      if (lectureTitle) {
                        setLectureError('');
                        uploadLectureMutation.mutate(file);
                      } else {
                        setLectureError('Please enter a lecture title');
                      }
                    }}
                  />
                  {uploadLectureMutation.isPending && (
                    <div className="mt-4 flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2 text-sm text-slate-400">Uploading...</span>
                    </div>
                  )}
                  {lectureError && (
                    <p className="mt-3 text-sm text-red-400">{lectureError}</p>
                  )}
                </div>

                {/* Lectures List */}
                <div className="space-y-2">
                  {lectures && Array.isArray(lectures) && lectures.length > 0 ? (
                    lectures.map((lecture: any) => (
                      <div
                        key={lecture.id}
                        className="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors group"
                      >
                        <button
                          onClick={() => navigate(`/lectures/${lecture.id}`)}
                          className="flex-1 text-left"
                        >
                          <p className="font-medium text-white group-hover:text-purple-400 transition-colors text-sm">{lecture.title}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(lecture.createdAt).toLocaleDateString()}
                          </p>
                        </button>
                        <DropdownMenu
                          items={[
                            {
                              label: 'Edit',
                              icon: <Edit2 className="w-4 h-4" />,
                              onClick: () => {
                                // Edit lecture title
                                const newTitle = prompt('Edit lecture title:', lecture.title);
                                if (newTitle && newTitle !== lecture.title) {
                                  lectureService.updateLecture(lecture.id, { title: newTitle }).then(() => {
                                    queryClient.invalidateQueries({ queryKey: ['lectures', selectedCourseId] });
                                  });
                                }
                              },
                            },
                            {
                              label: 'Delete',
                              icon: <Trash2 className="w-4 h-4" />,
                              isDanger: true,
                              onClick: () => {
                                if (confirm(`Delete lecture "${lecture.title}"? This will delete all associated data.`)) {
                                  lectureService.deleteLecture(lecture.id).then(() => {
                                    queryClient.invalidateQueries({ queryKey: ['lectures', selectedCourseId] });
                                  });
                                }
                              },
                            },
                          ]}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No lectures yet</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Select a course to view lectures</p>
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
        >
          {showForm ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>

        {/* Create Course Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create Course</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCourseError('');
                  createCourseMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Course Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="e.g., Advanced Calculus"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe your course..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                  />
                </div>

                {courseError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">{courseError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={createCourseMutation.isPending}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createCourseMutation.isPending ? 'Creating...' : 'Create Course'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Edit Course Modal */}
      {editingCourseId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Edit Course</h2>
              <button
                onClick={() => setEditingCourseId(null)}
                className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateCourseMutation.mutate({
                  title: editTitle,
                  description: editDescription,
                  examDate: editExamDate ? new Date(editExamDate) : null,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Course Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Exam Date</label>
                <input
                  type="date"
                  value={editExamDate}
                  onChange={(e) => setEditExamDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={updateCourseMutation.isPending}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateCourseMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
