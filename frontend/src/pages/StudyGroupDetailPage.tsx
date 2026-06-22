import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, BookOpen, AlertCircle, Plus, Trash2, X, ExternalLink, ArrowUpRight, LogOut } from 'lucide-react';
import { studyGroupsAPI } from '../services/api';
import { LoadingSpinner } from '../components/Common';
import Layout from '../components/Layout';
import { InviteMemberModal } from '../components/InviteMemberModal';
import { AddMaterialsModal } from '../components/AddMaterialsModal';
import { useAuthStore } from '../store/auth';

interface SharedLecture {
  lectureId: string;
  title: string;
  courseTitle: string;
}

interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members: Array<{
    id: string;
    groupId: string;
    userId: string;
    role: string;
    joinedAt: string;
    user: { id: string; name: string; email: string };
  }>;
  sharedFlashcardSets: any[];
  sharedQuizSets: any[];
  sharedLectures: SharedLecture[];
  owner?: { id: string; name: string; email: string };
}

export const StudyGroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddMaterialsModal, setShowAddMaterialsModal] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [removingMaterialId, setRemovingMaterialId] = useState<string | null>(null);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchGroupDetail();
  }, [id]);

  const fetchGroupDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await studyGroupsAPI.getGroupDetail(id!);
      const groupData = response?.data?.data || response?.data;

      if (groupData && groupData.id) {
        setGroup({
          ...groupData,
          members: groupData.members || [],
          sharedFlashcardSets: groupData.sharedFlashcardSets || [],
          sharedQuizSets: groupData.sharedQuizSets || [],
          sharedLectures: groupData.sharedLectures || [],
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Remove this member from the group?')) return;
    try {
      setRemovingMemberId(memberId);
      await studyGroupsAPI.removeGroupMember(id!, memberId);
      fetchGroupDetail();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleRemoveMaterial = async (materialId: string, type: 'flashcard' | 'quiz' | 'lecture') => {
    if (!window.confirm('Remove this material from the group?')) return;
    try {
      setRemovingMaterialId(materialId);
      if (type === 'lecture') {
        await studyGroupsAPI.removeLectureFromGroup(id!, materialId);
      } else {
        await studyGroupsAPI.removeMaterialFromGroup(id!, materialId, type);
      }
      fetchGroupDetail();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove material');
    } finally {
      setRemovingMaterialId(null);
    }
  };

  const isOwner = group?.createdBy === userId;

  const handleLeaveGroup = async () => {
    if (!window.confirm(`Leave "${group?.name}"? You will lose access to all shared materials.`)) return;
    try {
      setLeavingGroup(true);
      setLeaveError(null);
      await studyGroupsAPI.leaveGroup(id!);
      setSuccessMessage('You have left the group.');
      setTimeout(() => navigate('/study-groups'), 1500);
    } catch (err: any) {
      setLeaveError(err.response?.data?.error || 'Failed to leave the group. Please try again.');
    } finally {
      setLeavingGroup(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (error || !group) {
    return (
      <Layout>
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-900 border border-red-800 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Error Loading Group</h2>
              <p className="text-slate-400 mb-6">{error || 'Group not found'}</p>
              <button
                onClick={() => navigate('/study-groups')}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
              >
                Back to Study Groups
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const memberCount = group.members?.length || 0;
  const materialCount =
    (group.sharedFlashcardSets?.length || 0) +
    (group.sharedQuizSets?.length || 0) +
    (group.sharedLectures?.length || 0);

  const hasAnyMaterial =
    (group.sharedFlashcardSets?.length > 0) ||
    (group.sharedQuizSets?.length > 0) ||
    (group.sharedLectures?.length > 0);

  return (
    <Layout>
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={() => navigate('/study-groups')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </button>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">{group.name}</h1>
              {group.description && <p className="text-slate-400">{group.description}</p>}
            </div>
            {!isOwner && (
              <button
                onClick={handleLeaveGroup}
                disabled={leavingGroup}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-400 hover:text-red-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-4 h-4" />
                {leavingGroup ? 'Leaving...' : 'Leave Group'}
              </button>
            )}
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-400">{successMessage}</p>
            </div>
          )}

          {leaveError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{leaveError}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Members</h3>
              </div>
              <p className="text-3xl font-bold text-purple-400">{memberCount}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Materials</h3>
              </div>
              <p className="text-3xl font-bold text-blue-400">{materialCount}</p>
            </div>
          </div>

          {/* Members Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Members</h2>
              {isOwner && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Invite Member
                </button>
              )}
            </div>
            {group.members && group.members.length > 0 ? (
              <div className="space-y-3">
                {group.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div>
                      <p className="font-semibold text-white">{member.user.name}</p>
                      <p className="text-sm text-slate-400">{member.user.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-purple-600/20 text-purple-300 text-sm rounded-full">
                        {member.role === 'owner' ? 'Owner' : 'Member'}
                      </div>
                      {isOwner && member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={removingMemberId === member.userId}
                          className="p-2 hover:bg-red-500/10 text-red-400 rounded transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">No members yet</p>
            )}
          </div>

          {/* Materials Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Shared Materials</h2>
              {isOwner && (
                <button
                  onClick={() => setShowAddMaterialsModal(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Materials
                </button>
              )}
            </div>

            {/* Flashcard Sets */}
            {group.sharedFlashcardSets && group.sharedFlashcardSets.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">🃏 Flashcard Sets</h3>
                <div className="space-y-2">
                  {group.sharedFlashcardSets.map((set) => (
                    <div key={set.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 flex items-center justify-between hover:border-purple-600/40 transition-colors group">
                      <button
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        onClick={() => navigate(`/shared/flashcard/${set.shareToken}`)}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-white group-hover:text-purple-300 transition-colors">{set.title}</p>
                          {set.description && <p className="text-sm text-slate-400">{set.description}</p>}
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-purple-400 flex-shrink-0 transition-colors" />
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveMaterial(set.id, 'flashcard')}
                          disabled={removingMaterialId === set.id}
                          className="ml-3 p-2 hover:bg-red-500/10 text-red-400 rounded transition-colors disabled:opacity-50 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quiz Sets */}
            {group.sharedQuizSets && group.sharedQuizSets.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">✓ Quiz Sets</h3>
                <div className="space-y-2">
                  {group.sharedQuizSets.map((set) => (
                    <div key={set.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 flex items-center justify-between hover:border-blue-600/40 transition-colors group">
                      <button
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        onClick={() => navigate(`/shared/quiz/${set.shareToken}`)}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-white group-hover:text-blue-300 transition-colors">{set.title}</p>
                          {set.description && <p className="text-sm text-slate-400">{set.description}</p>}
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveMaterial(set.id, 'quiz')}
                          disabled={removingMaterialId === set.id}
                          className="ml-3 p-2 hover:bg-red-500/10 text-red-400 rounded transition-colors disabled:opacity-50 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shared Lectures */}
            {group.sharedLectures && group.sharedLectures.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">📄 Lectures</h3>
                <div className="space-y-2">
                  {group.sharedLectures.map((lec) => (
                    <div key={lec.lectureId} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 flex items-center justify-between hover:border-emerald-600/40 transition-colors">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="font-medium text-white truncate">{lec.title}</p>
                        {lec.courseTitle && <p className="text-sm text-slate-400 truncate">{lec.courseTitle}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => navigate(`/lectures/${lec.lectureId}`)}
                          className="p-2 hover:bg-blue-500/10 text-blue-400 rounded transition-colors"
                          title="Go to lecture"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => handleRemoveMaterial(lec.lectureId, 'lecture')}
                            disabled={removingMaterialId === lec.lectureId}
                            className="p-2 hover:bg-red-500/10 text-red-400 rounded transition-colors disabled:opacity-50"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasAnyMaterial && (
              <p className="text-slate-400">No materials added yet</p>
            )}
          </div>
        </div>
      </div>

      {id && (
        <>
          <InviteMemberModal
            isOpen={showInviteModal}
            groupId={id}
            onClose={() => setShowInviteModal(false)}
            onSuccess={() => fetchGroupDetail()}
          />
          <AddMaterialsModal
            isOpen={showAddMaterialsModal}
            groupId={id}
            onClose={() => setShowAddMaterialsModal(false)}
            onSuccess={() => fetchGroupDetail()}
          />
        </>
      )}
    </Layout>
  );
};

export default StudyGroupDetailPage;
