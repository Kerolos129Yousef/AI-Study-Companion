import React, { useState } from 'react';
import { X, Copy, Check, Search, Trash2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  title: string;
  type: 'flashcard' | 'quiz';
  shareToken?: string;
  isPublic?: boolean;
  sharedUsers?: Array<{ id: string; name: string; email: string }>;
  onClose: () => void;
  onTogglePublic?: () => Promise<void>;
  onShareWithUsers?: (userIds: string[]) => Promise<void>;
  onRemoveUser?: (userId: string) => Promise<void>;
  isLoading?: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  title,
  type,
  shareToken,
  isPublic = false,
  sharedUsers = [],
  onClose,
  onTogglePublic,
  onShareWithUsers,
  onRemoveUser,
  isLoading = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  if (!isOpen) return null;

  const publicUrl = shareToken ? `${window.location.origin}/shared/${type}/${shareToken}` : '';

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWithUsers = async () => {
    if (selectedUsers.length > 0 && onShareWithUsers) {
      await onShareWithUsers(selectedUsers);
      setSelectedUsers([]);
      setSearchQuery('');
    }
  };

  const handleTogglePublic = async () => {
    if (onTogglePublic) {
      await onTogglePublic();
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (onRemoveUser) {
      await onRemoveUser(userId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900">
          <h2 className="text-xl font-bold text-white">Share "{title}"</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Public Link Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Public Link</h3>
              <button
                onClick={handleTogglePublic}
                disabled={isLoading}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  isPublic
                    ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                    : 'bg-slate-700 text-slate-400 border border-slate-600 hover:bg-slate-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isPublic ? '✓ Public' : 'Make Public'}
              </button>
            </div>

            {isPublic && publicUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-slate-800 p-3 rounded-lg border border-slate-700">
                  <input
                    type="text"
                    value={publicUrl}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-slate-300 outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                    title="Copy link"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Anyone with this link can view and use this content
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800"></div>

          {/* Share with Users Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Share with Specific Users</h3>

            {/* User Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="Enter email or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-200 placeholder-slate-500 outline-none focus:border-purple-600/50 focus:ring-1 focus:ring-purple-600/20 transition-all"
              />
            </div>

            {/* Selected Users to Share */}
            {selectedUsers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">Selected ({selectedUsers.length}):</p>
                <div className="space-y-1">
                  {selectedUsers.map((userId) => (
                    <div
                      key={userId}
                      className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700"
                    >
                      <span className="text-sm text-slate-300 truncate">{userId}</span>
                      <button
                        onClick={() => setSelectedUsers(selectedUsers.filter((id) => id !== userId))}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                      >
                        <X className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (searchQuery.trim()) {
                    setSelectedUsers([...selectedUsers, searchQuery.trim()]);
                    setSearchQuery('');
                  }
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!searchQuery.trim() || selectedUsers.includes(searchQuery.trim())}
              >
                Add User
              </button>
              <button
                onClick={handleShareWithUsers}
                disabled={selectedUsers.length === 0 || isLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sharing...' : 'Share'}
              </button>
            </div>
          </div>

          {/* Already Shared With */}
          {sharedUsers.length > 0 && (
            <>
              <div className="border-t border-slate-800"></div>
              <div className="space-y-3">
                <h3 className="font-semibold text-white">Shared with ({sharedUsers.length})</h3>
                <div className="space-y-2">
                  {sharedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        disabled={isLoading}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove user"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg py-2 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
