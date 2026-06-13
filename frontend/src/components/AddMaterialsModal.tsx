import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Loader, AlertCircle, Search } from 'lucide-react';
import { studyGroupsAPI, flashcardsAPI, quizzesAPI } from '../services/api';
import { courseService } from '../services';
import { useQuery } from '@tanstack/react-query';

interface Material {
  id: string;
  title: string;
  description?: string;
  flashcardIds?: string[];
}

interface AddMaterialsModalProps {
  isOpen: boolean;
  groupId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type MaterialType = 'flashcard' | 'quiz' | 'lecture';

const AddMaterialsModalContent: React.FC<AddMaterialsModalProps> = ({
  isOpen,
  groupId,
  onClose,
  onSuccess,
}) => {
  const [materialType, setMaterialType] = useState<MaterialType>('flashcard');
  const [loading, setLoading] = useState(false);
  const [fetchingMaterials, setFetchingMaterials] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [setName, setSetName] = useState('');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseService.getCourses(),
    select: (data) => {
      const normalized = data?.data?.data || data?.data || data || [];
      return normalized;
    },
    enabled: isOpen && materialType === 'lecture',
  });

  const fetchMaterials = useCallback(async () => {
    try {
      setFetchingMaterials(true);
      setError(null);

      if (materialType === 'flashcard') {
        const response = await flashcardsAPI.getAllFlashcards();
        const data = response?.data?.data || response?.data || [];
        if (!Array.isArray(data)) { setMaterials([]); return; }
        // Group flashcards by lecture
        const lectureMap = new Map<string, { title: string; course: string; ids: string[] }>();
        for (const f of data) {
          const lectureId = f.lecture?.id || f.lectureId || 'unknown';
          const lectureTitle = f.sourceLectureTitle || f.lecture?.title || 'Unknown Lecture';
          const courseTitle = f.sourceLectureCourse || f.lecture?.course?.title || '';
          if (!lectureMap.has(lectureId)) {
            lectureMap.set(lectureId, { title: lectureTitle, course: courseTitle, ids: [] });
          }
          lectureMap.get(lectureId)!.ids.push(f.id);
        }
        const formatted: Material[] = Array.from(lectureMap.entries()).map(([lectureId, info]) => ({
          id: lectureId,
          title: info.title,
          description: `${info.course ? info.course + ' · ' : ''}${info.ids.length} flashcard${info.ids.length !== 1 ? 's' : ''}`,
          flashcardIds: info.ids,
        }));
        setMaterials(formatted);
      } else if (materialType === 'quiz') {
        const response = await quizzesAPI.getAllQuizzes();
        const data = response?.data?.data || response?.data || [];
        const formatted = Array.isArray(data) ? data.map((q: any) => ({
          id: q.id,
          title: `Quiz — ${q.lectureTitle || q.sourceLectureTitle || 'Unknown'} (${Math.round((q.score / q.total) * 100)}%)`,
          description: `Score: ${q.score}/${q.total} · ${q.takenAt ? new Date(q.takenAt).toLocaleDateString() : ''}`,
        })) : [];
        setMaterials(formatted);
      }
      // lecture type is handled via the courses query, not here
    } catch {
      setError('Failed to load your materials');
    } finally {
      setFetchingMaterials(false);
    }
  }, [materialType]);

  useEffect(() => {
    if (isOpen && groupId) {
      setSelectedIds([]);
      setSetName('');
      setDescription('');
      setError(null);
      setSearchTerm('');
      if (materialType !== 'lecture') {
        fetchMaterials();
      } else {
        setMaterials([]);
      }
    }
  }, [isOpen, materialType, groupId, fetchMaterials]);

  // Build lecture materials from courses cache
  const lectureMaterials: Material[] = React.useMemo(() => {
    if (materialType !== 'lecture' || !Array.isArray(courses)) return [];
    return courses.flatMap((c: any) =>
      (c.lectures || []).map((l: any) => ({
        id: l.id,
        title: l.title,
        description: c.title,
      }))
    );
  }, [courses, materialType]);

  const displayMaterials = materialType === 'lecture' ? lectureMaterials : materials;
  const isLoadingDisplay = materialType === 'lecture' ? false : fetchingMaterials;

  const filteredMaterials = displayMaterials.filter(m =>
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleAddMaterials = useCallback(async () => {
    if (materialType !== 'lecture' && !setName.trim()) {
      setError('Set name is required');
      return;
    }

    if (selectedIds.length === 0) {
      setError('Please select at least one item');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (materialType === 'flashcard') {
        // selectedIds are lecture IDs — resolve to actual flashcard IDs
        const allFlashcardIds = materials
          .filter(m => selectedIds.includes(m.id))
          .flatMap(m => m.flashcardIds || []);
        if (allFlashcardIds.length === 0) {
          setError('No flashcards found for selected lectures');
          setLoading(false);
          return;
        }
        await studyGroupsAPI.addFlashcardSetToGroup(groupId, allFlashcardIds, setName, description);
      } else if (materialType === 'quiz') {
        await studyGroupsAPI.addQuizSetToGroup(groupId, selectedIds, setName, description);
      } else {
        await studyGroupsAPI.addLectureToGroup(groupId, selectedIds);
      }

      setSetName('');
      setDescription('');
      setSelectedIds([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add materials');
    } finally {
      setLoading(false);
    }
  }, [groupId, materialType, selectedIds, setName, description, onSuccess, onClose]);

  const typeLabel = materialType === 'flashcard' ? 'Flashcards' : materialType === 'quiz' ? 'Quizzes' : 'Lectures';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Add Materials to Group</h2>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="p-1 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Material Type Tabs */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Material Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setMaterialType('flashcard'); setSelectedIds([]); }}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  materialType === 'flashcard' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                } disabled:opacity-50`}
              >
                🃏 Flashcards
              </button>
              <button
                type="button"
                onClick={() => { setMaterialType('quiz'); setSelectedIds([]); }}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  materialType === 'quiz' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                } disabled:opacity-50`}
              >
                ✓ Quizzes
              </button>
              <button
                type="button"
                onClick={() => { setMaterialType('lecture'); setSelectedIds([]); }}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  materialType === 'lecture' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                } disabled:opacity-50`}
              >
                📄 Lectures
              </button>
            </div>
          </div>

          {/* Set Name + Description — hidden for lectures */}
          {materialType !== 'lecture' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Set Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Chapter 3 Study Materials"
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 outline-none focus:border-purple-600/50 disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Description (optional)</label>
                <textarea
                  placeholder="Add any notes about this material set..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 outline-none focus:border-purple-600/50 disabled:opacity-50 resize-none"
                />
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Search + Select All */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Select {typeLabel}</label>
              {filteredMaterials.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const allIds = filteredMaterials.map(m => m.id);
                    const allSelected = allIds.every(id => selectedIds.includes(id));
                    if (allSelected) {
                      setSelectedIds(prev => prev.filter(id => !allIds.includes(id)));
                    } else {
                      setSelectedIds(prev => [...new Set([...prev, ...allIds])]);
                    }
                  }}
                  disabled={loading}
                  className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                >
                  {filteredMaterials.every(m => selectedIds.includes(m.id)) ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder={`Search ${typeLabel.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoadingDisplay || loading}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-12 pr-4 py-2 text-slate-200 placeholder-slate-500 outline-none focus:border-purple-600/50 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Materials list */}
          {isLoadingDisplay ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-purple-400 mr-2" />
              <p className="text-slate-300">Loading...</p>
            </div>
          ) : displayMaterials.length === 0 ? (
            <div className="p-6 bg-slate-800/50 rounded-lg border border-slate-700 text-center">
              <p className="text-slate-400">
                No {typeLabel.toLowerCase()} found.{materialType !== 'lecture' ? ' Create some first!' : ''}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-700 rounded-lg p-2">
              {filteredMaterials.length === 0 ? (
                <p className="text-slate-400 text-sm p-2">No results found</p>
              ) : (
                filteredMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer transition-colors"
                    onClick={() => handleToggleSelect(material.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(material.id)}
                      onChange={() => handleToggleSelect(material.id)}
                      className="w-4 h-4 accent-purple-600 cursor-pointer flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{material.title}</p>
                      {material.description && (
                        <p className="text-xs text-slate-400 truncate">{material.description}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Selection summary */}
          {selectedIds.length > 0 && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-purple-300 text-sm">
                ✓ {selectedIds.length} {typeLabel.toLowerCase().replace(/s$/, '')}{selectedIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg py-2 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddMaterials}
              disabled={loading || selectedIds.length === 0 || (materialType !== 'lecture' && setName.trim().length === 0)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add {typeLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AddMaterialsModal: React.FC<AddMaterialsModalProps> = (props) => {
  if (!props.isOpen) return null;
  if (!props.groupId || typeof props.groupId !== 'string') return null;
  return <AddMaterialsModalContent {...props} />;
};

export default AddMaterialsModal;
