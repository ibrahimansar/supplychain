import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { treeAPI } from '../services/api';
import { getApiErrorCode, getApiErrorMessage } from '../utils/apiError';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import RoleBadge from '../components/ui/RoleBadge';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import { useLoadingPhase } from '../hooks/useDelayedLoading';

const InvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const invitePhase = useLoadingPhase(loading);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await treeAPI.getInvite(token);
        setInfo(res.data);
      } catch (e) {
        setError('Invite not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    setError('');
    try {
      await treeAPI.acceptInvite(token);
      const treeId = info?.familyTreeId;
      if (treeId) navigate(`/trees/${treeId}`, { replace: true });
      else navigate('/trees', { replace: true });
    } catch (e) {
      const status = e?.response?.status;
      const code = getApiErrorCode(e?.response?.data);
      let msg = getApiErrorMessage(e?.response?.data, '');
      if (code === 'ADMIN_LIMIT_EXCEEDED') msg = 'You have reached the maximum number of admins for this tree.';
      if (code === 'VERIFIER_LIMIT_EXCEEDED') msg = 'You have reached the maximum number of verifiers for this tree.';
      if (code === 'VIEWER_LIMIT_EXCEEDED') msg = 'You have reached the maximum number of viewers for this tree.';
      if (status === 410) setError('This invite has expired or was revoked.');
      else if (status === 403) setError('This invite is for a different email.');
      else if (msg) setError(msg);
      else setError('Failed to accept invite.');
    } finally {
      setAccepting(false);
    }
  };

  if (invitePhase !== 'content') return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex items-center justify-center px-4">
      <div className={`max-w-md w-full min-h-[300px] ${invitePhase === 'hidden' ? 'invisible' : ''}`}>
        <CardSkeleton rows={4} />
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 text-center">
        <h1 className="heading-2 mb-2">Invitation</h1>
        <p className="text-red-600">{error}</p>
        <div className="mt-4"><Link to="/trees"><Button>Go to Trees</Button></Link></div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8">
        <h1 className="heading-3 mb-1">Invitation</h1>
        <p className="text-muted">You have been invited to join</p>
        <p className="font-medium mt-1">{info?.treeName || 'Family Tree'}</p>
        <div className="mt-2 flex items-center gap-2">
          <RoleBadge role={info?.role || 'VERIFIER'} />
          {info?.status && <Badge>{info.status}</Badge>}
        </div>
        <div className="mt-6 flex gap-2">
          <Button onClick={accept} loading={accepting} className="flex-1">{accepting ? 'Accepting...' : 'Accept Invite'}</Button>
          <Link to="/trees"><Button variant="outline" className="flex-1">Cancel</Button></Link>
        </div>
      </Card>
    </div>
  );
};

export default InvitePage;
