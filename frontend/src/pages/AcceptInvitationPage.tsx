import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { studyGroupsAPI } from '../services/api';
import { useAuthStore } from '../store/auth';
import Layout from '../components/Layout';

export const AcceptInvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/accept-invitation/${token}`);
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    acceptInvitation();
  }, [token, user, isAuthenticated]);

  const acceptInvitation = async () => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link');
      setLoading(false);
      return;
    }

    // Validate token format
    if (typeof token !== 'string' || token.length < 10) {
      setStatus('error');
      setMessage('Invalid invitation token format');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await studyGroupsAPI.acceptInvitation(token);

      const data = response?.data?.data || response?.data;

      if (data?.group) {
        setGroupName(data.group.name || 'Study Group');
        setMessage(data.message || 'Successfully joined the study group!');
        setStatus('success');
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err: any) {
      setStatus('error');

      if (err.response?.status === 410) {
        setMessage('This invitation has expired. Please ask the group owner to send you a new invitation.');
      } else if (err.response?.status === 403) {
        setMessage(`${err.response?.data?.error || 'This invitation is not for your email address'}`);
      } else if (err.response?.status === 400) {
        setMessage(err.response?.data?.error || 'You are already a member of this group');
      } else if (err.response?.status === 404) {
        setMessage('Invitation not found. It may have expired or been deleted.');
      } else {
        const errorMsg = err.response?.data?.error || err.message || 'Failed to accept invitation';
        setMessage(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = () => {
    navigate('/study-groups');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-slate-300 text-lg">Processing your invitation...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            {status === 'success' ? (
              <>
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
                <p className="text-slate-300 mb-6">
                  You have successfully joined <span className="font-semibold text-purple-400">{groupName}</span> study group.
                </p>
                <p className="text-slate-400 text-sm mb-8">
                  {message}
                </p>
                <button
                  onClick={handleRedirect}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
                >
                  View Study Group
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Invitation Error</h2>
                <p className="text-slate-300 mb-6">
                  {message}
                </p>
                <p className="text-slate-400 text-sm mb-8">
                  Please ask the group owner to send you a new invitation, or contact support if you believe this is an error.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/study-groups')}
                    className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-all"
                  >
                    Back to Groups
                  </button>
                  <button
                    onClick={handleRedirect}
                    className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all"
                  >
                    Retry
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AcceptInvitationPage;

