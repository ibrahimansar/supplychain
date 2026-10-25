import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Trash, Plus, ChevronLeft, ChevronRight, Edit, ShieldCheck } from '../components/ui/Icons';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Dialog, { DialogHeader, DialogBody, DialogFooter } from '../components/ui/Dialog';
import Tooltip from '../components/ui/Tooltip';
// LoadingSpinner removed - using ListSkeleton instead
import { TableSkeleton } from '../components/ui/SkeletonLoader';
import { getApiErrorCode, getApiErrorMessage } from '../utils/apiError';
import Avatar from '../components/ui/Avatar';
import RoleBadge from '../components/ui/RoleBadge';
import { useFormValidation, validators, sanitizers } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';
import { readLastCount, writeLastCount, scopedKey, STORAGE_KEYS } from '../utils/skeletonCount';
import { useLoadingPhase } from '../hooks/useDelayedLoading';
import { peekCachedData, treeAPI } from '../services/api';

const RolesTab = ({ treeId, showToast }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  // Seed from the last-known response so a revisit paints real rows immediately
  // and refreshes in place, instead of showing a skeleton for a request that
  // will very likely come back 304.
  const cachedMembers = useCallback(() => {
    const cached = peekCachedData(`admin:${treeId}:members`);
    return Array.isArray(cached) ? cached : [];
  }, [treeId]);
  const [members, setMembers] = useState(cachedMembers);
  const membersPhase = useLoadingPhase(loading && members.length === 0);
  const hasLoadedRef = useRef(false);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [userQuery, setUserQuery] = useState('');
  const [userQueryDebounced, setUserQueryDebounced] = useState('');
  const searchInputRef = useRef(null);
  // const [inviteForm, setInviteForm] = useState({ email: '', role: 'VERIFIER' }); // Unused
  const [createdInvite, setCreatedInvite] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null, variant: 'danger' });
  const [editRoleModal, setEditRoleModal] = useState(null);
  const [roleLimits, setRoleLimits] = useState(null);
  const [ownershipModal, setOwnershipModal] = useState(null);
  const [ownershipRole, setOwnershipRole] = useState('ADMIN');
  const [ownershipError, setOwnershipError] = useState('');
  const [ownershipSubmitting, setOwnershipSubmitting] = useState(false);

  const currentMember = useMemo(() => members.find(m => m.userId === user?.id), [members, user?.id]);
  const ownerMember = useMemo(() => members.find(m => m.isOwner), [members]);
  const roleCounts = useMemo(() => {
    return members.reduce((acc, member) => {
      const role = member.role || 'VIEWER';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, { ADMIN: 0, VERIFIER: 0, VIEWER: 0 });
  }, [members]);

  const ownershipOptions = useMemo(() => {
    if (!ownershipModal || !ownerMember) return null;
    const limits = roleLimits || {};
    const adminLimit = limits?.admin?.limit ?? Number.POSITIVE_INFINITY;
    const verifierLimit = limits?.verifier?.limit ?? Number.POSITIVE_INFINITY;
    const viewerLimit = limits?.viewer?.limit ?? Number.POSITIVE_INFINITY;

    const simulate = (desiredRole) => {
      const target = ownershipModal.member;
      let adminUsed = roleCounts.ADMIN || 0;
      let verifierUsed = roleCounts.VERIFIER || 0;
      let viewerUsed = roleCounts.VIEWER || 0;

      const targetRole = target.role || 'VIEWER';
      if (targetRole === 'VERIFIER') {
        verifierUsed = Math.max(0, verifierUsed - 1);
        adminUsed += 1;
      } else if (targetRole === 'VIEWER') {
        viewerUsed = Math.max(0, viewerUsed - 1);
        adminUsed += 1;
      }

      const ownerRole = ownerMember.role || 'ADMIN';
      if (ownerRole === 'ADMIN') {
        adminUsed = Math.max(0, adminUsed - 1);
      } else if (ownerRole === 'VERIFIER') {
        verifierUsed = Math.max(0, verifierUsed - 1);
      } else if (ownerRole === 'VIEWER') {
        viewerUsed = Math.max(0, viewerUsed - 1);
      }

      if (desiredRole === 'ADMIN') {
        adminUsed += 1;
      } else if (desiredRole === 'VERIFIER') {
        verifierUsed += 1;
      } else if (desiredRole === 'VIEWER') {
        viewerUsed += 1;
      }

      return { adminUsed, verifierUsed, viewerUsed };
    };

    const roles = ['ADMIN', 'VERIFIER', 'VIEWER'];
    return roles.reduce((acc, role) => {
      const counts = simulate(role);
      const allowed = counts.adminUsed <= adminLimit && counts.verifierUsed <= verifierLimit && counts.viewerUsed <= viewerLimit;
      acc[role] = {
        allowed,
        counts,
        limits: { admin: adminLimit, verifier: verifierLimit, viewer: viewerLimit }
      };
      return acc;
    }, {});
  }, [ownershipModal, ownerMember, roleLimits, roleCounts]);
  const askConfirm = (title, message, onConfirm, variant='danger') => setConfirmState({ open: true, title, message, onConfirm, variant });
  const closeConfirm = () => setConfirmState(c => ({ ...c, open: false }));

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Form validation
  const {
    values: formValues,
    errors: formErrors,
    touched: formTouched,
    handleChange: handleFormChange,
    handleBlur: handleFormBlur,
    validateForm,
    resetForm
  } = useFormValidation({ email: '', role: 'VERIFIER' });

  const loadData = useCallback(async () => {
    // Only blank the list on the first load — keep prior rows visible on refresh
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const res = await treeAPI.getMembers(treeId);
      const list = res.data || [];
      setMembers(list);
      writeLastCount(scopedKey(STORAGE_KEYS.members, treeId), list.length);
      hasLoadedRef.current = true;
    } catch (e) {
      if (e?.response?.status === 403) { navigate('/trees', { replace: true }); return; }
      showToast('Failed to load members', 'error');
    } finally {
      setLoading(false);
    }
  }, [treeId, navigate, showToast]);

  useEffect(() => {
    hasLoadedRef.current = false;
    setMembers(cachedMembers());
    setLoading(true);
    loadData();
  }, [treeId, loadData, cachedMembers]);

  useEffect(() => {
    let cancelled = false;
    const fetchLimits = async () => {
      if (!currentMember?.isOwner) {
        setRoleLimits(null);
        return;
      }
      try {
        const res = await treeAPI.getRoleLimits(treeId);
        if (!cancelled) {
          setRoleLimits(res.data || null);
        }
      } catch (err) {
        if (!cancelled) {
          setRoleLimits(null);
        }
      }
    };
    fetchLimits();
    return () => { cancelled = true; };
  }, [currentMember?.isOwner, treeId, members.length]);

  const filteredMembers = members.filter(m => (roleFilter==='ALL' || m.role === roleFilter) && (
    !userQueryDebounced || (m.email || '').toLowerCase().includes(userQueryDebounced.toLowerCase()) || (m.displayName || '').toLowerCase().includes(userQueryDebounced.toLowerCase())
  ));
  const totalPages = Math.max(1, Math.ceil((filteredMembers?.length || 0) / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pagedMembers = filteredMembers.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  // Debounce search with validation
  useEffect(() => {
    const t = setTimeout(() => {
      const sanitizedQuery = sanitizers.trim(sanitizers.printable(userQuery));
      const validationError = validators.searchQuery(sanitizedQuery);
      if (!validationError) {
        setUserQueryDebounced(sanitizedQuery);
      } else if (userQuery) {
        showToast(validationError, 'warning');
      }
    }, 200);
    return () => clearTimeout(t);
  }, [userQuery, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.key === 'f' || e.key === 'F')) { e.preventDefault(); searchInputRef.current?.focus(); }
      if ((e.key === 'i' || e.key === 'I')) { e.preventDefault(); setInviteOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!ownershipModal) {
      setOwnershipError('');
      setOwnershipRole('ADMIN');
      return;
    }
    if (!ownershipOptions) return;
    const availableRoles = ['ADMIN', 'VERIFIER', 'VIEWER'].filter(role => ownershipOptions[role]?.allowed);
    if (availableRoles.length === 0) {
      setOwnershipError('Cannot transfer ownership because all role limits are exhausted.');
      setOwnershipRole('');
    } else {
      setOwnershipError('');
      setOwnershipRole(prev => availableRoles.includes(prev) ? prev : availableRoles[0]);
    }
  }, [ownershipModal, ownershipOptions]);

  const inviteMember = async (e) => {
    e.preventDefault();

    // Validate form
    const isValid = validateForm({
      email: { validator: 'email', sanitizer: 'trim' },
      role: { validator: 'role' }
    });

    if (!isValid) {
      showToast('Please fix the form errors', 'error');
      return;
    }

    setCreatedInvite(null);
    const payload = {
      email: sanitizers.trim(formValues.email),
      role: formValues.role
    };

    try {
      const res = await treeAPI.inviteMember(treeId, payload);
      const status = res?.data?.status;
      if (status === 'invited' && res?.data?.invitePath) {
        setCreatedInvite({ invitePath: res.data.invitePath });
        showToast('Invite link created');
        setInviteOpen(false);
      } else if (status === 'added') {
        showToast('Member added');
        await loadData();
        setInviteOpen(false);
      } else if (status === 'already_member') {
        showToast('User is already a member');
        setInviteOpen(false);
      } else if (status === 'already_invited') {
        showToast('User already invited');
        setInviteOpen(false);
      } else {
        showToast('Invite sent');
        await loadData();
        setInviteOpen(false);
      }
      resetForm();
    } catch (err) {
      const code = getApiErrorCode(err?.response?.data);
      let msg = getApiErrorMessage(err?.response?.data, 'Failed to invite member');
      if (code === 'ADMIN_LIMIT_EXCEEDED') msg = 'You have reached the maximum number of admins for this tree.';
      if (code === 'VERIFIER_LIMIT_EXCEEDED') msg = 'You have reached the maximum number of verifiers for this tree.';
      if (code === 'VIEWER_LIMIT_EXCEEDED') msg = 'You have reached the maximum number of viewers for this tree.';
      showToast(msg, 'error');
    }
  };

  const removeMember = (userId) => {
    askConfirm('Remove Member', 'Are you sure you want to remove this member from the tree?', async () => {
      closeConfirm();
      // Drop the row immediately; restore it if the server refuses.
      const previous = members;
      setMembers(current => current.filter(m => m.userId !== userId));
      try {
        await treeAPI.removeMember(treeId, userId);
        showToast('Member removed');
        loadData(); // reconcile in the background
      } catch (e) {
        setMembers(previous);
        showToast(e?.response?.data?.message || 'Failed to remove member', 'error');
      }
    });
  };

  const openOwnershipModal = useCallback(async (member) => {
    if (!currentMember?.isOwner) return;
    setOwnershipSubmitting(false);
    setOwnershipError('');
    setOwnershipModal({ member });
    if (!roleLimits) {
      try {
        const res = await treeAPI.getRoleLimits(treeId);
        setRoleLimits(res.data || null);
      } catch (err) {
        setOwnershipError('Failed to load role limits.');
        showToast('Failed to load role limits', 'error');
      }
    }
  }, [currentMember, roleLimits, treeId, showToast]);

  const closeOwnershipModal = useCallback(() => {
    setOwnershipModal(null);
    setOwnershipSubmitting(false);
    setOwnershipError('');
  }, []);

  const confirmOwnershipChange = useCallback(async () => {
    if (!ownershipModal || !ownershipRole) return;
    setOwnershipSubmitting(true);
    setOwnershipError('');
    try {
      await treeAPI.transferOwnership(treeId, {
        newOwnerId: ownershipModal.member.userId,
        previousOwnerRole: ownershipRole
      });
      showToast('Ownership transferred');
      closeOwnershipModal();
      await loadData();
      try {
        const res = await treeAPI.getRoleLimits(treeId);
        setRoleLimits(res.data || null);
      } catch (err) {
        setRoleLimits(null);
      }
    } catch (err) {
      const errorKey = getApiErrorCode(err?.response?.data);
      let message = getApiErrorMessage(err?.response?.data, 'Failed to transfer ownership');
      if (errorKey === 'ADMIN_LIMIT_EXCEEDED') message = 'Cannot change ownership because admin limit would be exceeded.';
      if (errorKey === 'VERIFIER_LIMIT_EXCEEDED') message = 'Cannot change ownership because verifier limit would be exceeded.';
      if (errorKey === 'VIEWER_LIMIT_EXCEEDED') message = 'Cannot change ownership because viewer limit would be exceeded.';
      if (errorKey === 'MEMBER_NOT_FOUND') message = 'Selected member is no longer part of this tree.';
      if (errorKey === 'ALREADY_OWNER') message = 'Selected member is already the owner.';
      setOwnershipError(message);
    } finally {
      setOwnershipSubmitting(false);
    }
  }, [ownershipModal, ownershipRole, treeId, closeOwnershipModal, loadData, showToast]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Members List</h2>
      </div>

      {/* Invite Member Modal */}
      <Dialog open={inviteOpen} onClose={()=>{ setInviteOpen(false); setCreatedInvite(null); }} labelledBy="invite-member-title" maxWidth="max-w-md">
        <DialogHeader title="invite-member-title" onClose={()=>{ setInviteOpen(false); setCreatedInvite(null); }}>Invite Member</DialogHeader>
        <DialogBody>
          <form onSubmit={inviteMember} className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-12 md:col-span-7">
              <label className="form-label">Email</label>
              <input
                className={`form-input ${formErrors.email && formTouched.email ? 'border-red-500' : ''}`}
                type="email"
                placeholder="user@example.com"
                value={formValues.email}
                onChange={handleFormChange('email', 'email', 'trim')}
                onBlur={handleFormBlur('email')}
                required
              />
              {formErrors.email && formTouched.email && (
                <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className="form-label">Role</label>
              <select
                className={`form-input ${formErrors.role && formTouched.role ? 'border-red-500' : ''}`}
                value={formValues.role}
                onChange={handleFormChange('role', 'role')}
                onBlur={handleFormBlur('role')}
              >
                {['ADMIN','VERIFIER','VIEWER'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {formErrors.role && formTouched.role && (
                <p className="mt-1 text-sm text-red-600">{formErrors.role}</p>
              )}
            </div>
            <div className="col-span-6 md:col-span-2 flex md:justify-end">
              <Button type="submit" className="w-full md:w-auto">Send Invite</Button>
            </div>
          </form>
          {createdInvite && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-gray-900 dark:text-gray-100">
              Invite link created. Share this link:
              <div className="mt-1 font-mono text-sm select-all">{window.location.origin}{createdInvite.invitePath}</div>
              <Button variant="outline" className="mt-2" onClick={() => navigator.clipboard?.writeText(window.location.origin + createdInvite.invitePath)}>Copy</Button>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={()=>{ setInviteOpen(false); setCreatedInvite(null); }}>Close</Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Role Modal */}
      <Dialog open={!!editRoleModal} onClose={() => setEditRoleModal(null)} labelledBy="edit-role-title" maxWidth="max-w-sm">
        <DialogHeader title="edit-role-title" onClose={() => setEditRoleModal(null)}>Edit Role</DialogHeader>
        <DialogBody>
          {editRoleModal && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar src={editRoleModal.photoURL} name={editRoleModal.displayName || editRoleModal.email} size={48} />
                <div>
                  <div className="font-medium">{editRoleModal.displayName || 'Unknown'}</div>
                  <div className="text-sm text-gray-600">{editRoleModal.email}</div>
                </div>
              </div>
              <div>
                <label className="form-label">Role</label>
                <select
                  className="form-input"
                  defaultValue={editRoleModal.role}
                  onChange={async (e) => {
                    const role = e.target.value;
                    const { userId } = editRoleModal;
                    // Show the new role and close straight away; put the old one
                    // back if the server refuses.
                    const previous = members;
                    setMembers(current => current.map(m => (m.userId === userId ? { ...m, role } : m)));
                    setEditRoleModal(null);
                    try {
                      await treeAPI.updateRole(treeId, userId, role);
                      showToast('Role updated successfully');
                      loadData(); // reconcile in the background
                    } catch (err) {
                      setMembers(previous);
                      showToast(err?.response?.data?.message || 'Failed to update role', 'error');
                    }
                  }}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="VERIFIER">VERIFIER</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditRoleModal(null)}>Cancel</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!ownershipModal} onClose={closeOwnershipModal} labelledBy="transfer-ownership-title" maxWidth="max-w-md">
        <DialogHeader title="transfer-ownership-title" onClose={closeOwnershipModal}>Transfer Ownership</DialogHeader>
        <DialogBody>
          {ownershipModal && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar src={ownershipModal.member.photoURL} name={ownershipModal.member.displayName || ownershipModal.member.email} size={48} />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{ownershipModal.member.displayName || 'Unknown'}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{ownershipModal.member.email}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Current role: {ownershipModal.member.role}</div>
                </div>
              </div>
              {ownershipOptions ? (
                <div>
                  <label className="form-label">Your role after transfer</label>
                  <select
                    className="form-input"
                    value={ownershipRole}
                    onChange={(e) => setOwnershipRole(e.target.value)}
                    disabled={!ownershipOptions || ownershipSubmitting || Object.values(ownershipOptions).every(opt => !opt?.allowed)}
                  >
                    {['ADMIN', 'VERIFIER', 'VIEWER'].map(role => {
                      const option = ownershipOptions[role];
                      const limitKey = role.toLowerCase();
                      const limit = roleLimits?.[limitKey]?.limit ?? Infinity;
                      const finalCount = option ? (
                        role === 'ADMIN' ? option.counts.adminUsed : role === 'VERIFIER' ? option.counts.verifierUsed : option.counts.viewerUsed
                      ) : 0;
                      const disabled = !option?.allowed;
                      const label = `${role}${Number.isFinite(limit) ? ` (final ${finalCount}/${limit})` : ''}`;
                      return (
                        <option key={role} value={role} disabled={disabled}>{label}</option>
                      );
                    })}
                  </select>
                  {ownershipOptions && ['ADMIN','VERIFIER','VIEWER'].some(role => !ownershipOptions[role]?.allowed) && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Options shown in gray exceed their role limits.</p>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading role limits...</div>
              )}
              {ownershipError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                  {ownershipError}
                </div>
              )}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={closeOwnershipModal}>Cancel</Button>
          <Button
            onClick={confirmOwnershipChange}
            disabled={!ownershipModal || !ownershipRole || !!ownershipError || !ownershipOptions || ownershipSubmitting}
            loading={ownershipSubmitting}
          >
            Confirm Transfer
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Roles toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-2.5 sm:p-3 flex flex-wrap items-end gap-1.5 sm:gap-2.5">
        <div className="w-36 sm:w-auto">
          <label className="form-label text-[11px] sm:text-sm dark:text-gray-300">Filter</label>
          <select className="form-input h-8 py-1 text-xs sm:h-9 sm:py-1.5 sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600" value={roleFilter} onChange={(e)=>{ setRoleFilter(e.target.value); setPage(1); }}>
            {['ALL','ADMIN','VERIFIER','VIEWER'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="form-label text-[11px] sm:text-sm dark:text-gray-300">Search users</label>
          <input ref={searchInputRef} className="form-input h-8 py-1 text-xs sm:h-9 sm:py-1.5 sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="Search by name or email" value={userQuery} onChange={(e)=>{ setUserQuery(e.target.value); setPage(1); }} />
        </div>
        <div className="ms-auto flex items-end gap-1 sm:gap-1.5">
          <label className="form-label invisible dark:text-gray-300">Invite</label>
          <Tooltip label="Invite Member"><Button variant="outline" size="sm" className="h-8 sm:h-9" onClick={() => setInviteOpen(true)}><Plus className="h-4 w-4" /></Button></Tooltip>
        </div>
      </div>

      <div className="card w-full overflow-hidden dark:bg-gray-800 dark:border-gray-700">
        {membersPhase !== 'content' ? (
          <div className={`p-4 ${membersPhase === 'hidden' ? 'invisible' : ''}`} aria-busy="true">
            <TableSkeleton rows={readLastCount(scopedKey(STORAGE_KEYS.members, treeId), 3, { min: 2, max: 8 })} columns={4} />
          </div>
        ) : (
          <>
            <div className={`overflow-x-auto p-4 ${loading ? 'opacity-60 pointer-events-none' : ''} animate-content-in`}>
              <table className="w-full text-xs sm:text-sm dark:bg-gray-800">
                <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <th className="p-2 text-start text-gray-900 dark:text-white">Email</th>
                  <th className="p-2 text-start text-gray-900 dark:text-white">Name</th>
                  <th className="p-2 text-start text-gray-900 dark:text-white">Role</th>
                  <th className="p-2 text-start text-gray-900 dark:text-white">Actions</th>
                </tr>
                </thead>
                <tbody>
                {pagedMembers.map((m, idx) => (
                  <tr key={m.userId || idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2 flex items-center gap-2">
                      <Avatar src={m.photoURL} name={m.displayName || m.email} size={32} />
                      <span className="text-gray-900 dark:text-white">{m.email}</span>
                    </td>
                    <td className="p-2 text-gray-900 dark:text-white">{m.displayName || '-'}</td>
                    <td className="p-2">
                      <RoleBadge role={m.role} isOwner={!!m.isOwner} />
                    </td>
                    <td className="p-2">
                      {!m.isOwner && (
                        <div className="flex items-center gap-2">
                          {currentMember?.isOwner && (
                            <Tooltip label="Transfer Ownership">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-10 h-10 p-0"
                                onClick={() => openOwnershipModal(m)}
                                aria-label={`Transfer ownership to ${m.email || 'member'}`}
                                title="Transfer Ownership"
                              >
                                <ShieldCheck className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                              </Button>
                            </Tooltip>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-10 h-10 p-0"
                            onClick={() => setEditRoleModal(m)}
                            aria-label={`Edit role for ${m.email || 'member'}`}
                            title="Edit Role"
                          >
                            <Edit className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-10 h-10 p-0"
                            onClick={()=>removeMember(m.userId)}
                            aria-label={`Remove ${m.email || 'member'}`}
                            title="Remove"
                          >
                            <Trash className="h-5 w-5 text-rose-600" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (<tr><td className="p-4 text-gray-500 dark:text-gray-400" colSpan={4}>No members yet</td></tr>)}
                </tbody>
              </table>
            </div>
            {/* Pagination controls — hidden while loading */}
            {!loading && (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</div>
                <div className="flex gap-2">
                  <Tooltip label="Previous">
                    <Button variant="outline" size="sm" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                  <Tooltip label="Next">
                    <Button variant="outline" size="sm" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message} variant={confirmState.variant} onCancel={closeConfirm} onConfirm={confirmState.onConfirm || closeConfirm} />
    </section>
  );
};

export default RolesTab;
