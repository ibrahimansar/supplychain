import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { treeAPI } from '../services/api';
import { TreePine, Users, Globe, MapPin, ArrowLeft, Loader2, Calendar, Info, Eye } from 'lucide-react';
import Button from '../components/ui/Button';

export default function ExploreTreeDetailPage() {
  const { treeId } = useParams();
  const navigate = useNavigate();
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await treeAPI.getExplorableTree(treeId);
        if (active) setTree(res.data);
      } catch (err) {
        if (active) {
          if (err.response?.status === 404) {
            setError('This tree is not publicly available or does not exist.');
          } else if (err.response?.status === 403) {
            setError('This tree is private and cannot be viewed.');
          } else {
            setError('Failed to load tree details.');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [treeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center py-16">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <Info className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cannot view tree</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <Button onClick={() => navigate('/explore')} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 me-2" /> Back to Explore
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Back */}
        <button
          onClick={() => navigate('/explore')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </button>

        {/* Tree Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-50 to-violet-50 dark:from-primary-950/30 dark:to-violet-950/30 p-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                <TreePine className="h-7 w-7 text-primary-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tree?.name || tree?.treeName || 'Family Tree'}
                </h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> Public
                  </span>
                  {tree?.region && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {tree.region}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {tree?.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Description</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{tree.description}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {tree?.memberCount != null && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                  <Users className="w-5 h-5 text-primary-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{tree.memberCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Members</p>
                </div>
              )}
              {tree?.generationCount != null && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                  <TreePine className="w-5 h-5 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{tree.generationCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Generations</p>
                </div>
              )}
              {tree?.createdAt && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                  <Calendar className="w-5 h-5 text-violet-500 mx-auto mb-2" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {new Date(tree.createdAt).getFullYear()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                </div>
              )}
            </div>

            {/* Owner info */}
            {tree?.ownerName && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Shared by</h3>
                <p className="text-gray-900 dark:text-white font-medium">{tree.ownerName}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate(`/explore/${treeId}/view`)}
                className="flex-1 rounded-xl"
              >
                <Eye className="w-4 h-4 me-2" /> View Tree
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/trees')}
                className="flex-1 rounded-xl"
              >
                My Trees
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
