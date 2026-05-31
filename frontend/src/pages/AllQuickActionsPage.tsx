import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAnonymousAuth } from '../hooks/useAnonymousAuth';
import { ActionDocument, isNewSchema, isCurrentSchema, NewActionDocument, FirestoreAction } from '../types/actions';
import { generateActionDisplay } from '../utils/actionDisplay';
import { ArrowPathIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

type ActionWithId = (NewActionDocument | FirestoreAction) & { id: string };

const AllQuickActionsPage: React.FC = () => {
  const [actions, setActions] = useState<ActionWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const { user, loading: authLoading } = useAnonymousAuth();

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      loadQuickActions();
    } else {
      setLoading(false);
    }
  }, [filter, user, authLoading]);

  const loadQuickActions = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const actionsRef = collection(db, 'quickActions', user.uid, 'actions');
      let q = query(actionsRef, orderBy('createdAt', 'desc'));

      // Apply filter if not showing all
      if (filter === 'pending') {
        q = query(actionsRef, where('completed', '==', false), orderBy('createdAt', 'desc'));
      } else if (filter === 'completed') {
        q = query(actionsRef, where('completed', '==', true), orderBy('createdAt', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      const actionsData: ActionWithId[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        actionsData.push({ id: doc.id, ...data } as ActionWithId);
      });

      setActions(actionsData);
    } catch (err) {
      console.error('Error loading quick actions:', err);
      setError('Failed to load quick actions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusIcon = (action: ActionWithId) => {
    if (isCurrentSchema(action) && action.completed) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    }
    return <ClockIcon className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusText = (action: ActionWithId) => {
    if (isCurrentSchema(action) && action.completed) {
      return 'Completed';
    }
    return 'Pending';
  };

  const getStatusColor = (action: ActionWithId) => {
    if (isCurrentSchema(action) && action.completed) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-yellow-100 text-yellow-800';
  };

  const isCompleted = (action: ActionWithId) => {
    return isCurrentSchema(action) && action.completed;
  };

  const getCreatedAt = (action: ActionWithId) => {
    if (isCurrentSchema(action)) {
      return action.dateSuggested;
    }
    if (isNewSchema(action)) {
      return action.created_at;
    }
    return null;
  };

  const getCompletedAt = (action: ActionWithId) => {
    if (isCurrentSchema(action)) {
      return action.completed ? action.dateSuggested : null; // Assuming completion time is same as suggestion time for now
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-gray-600">Loading quick actions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-600 text-4xl">⚠️</div>
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={loadQuickActions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quick Actions</h1>
          <p className="text-gray-600">
            Manage and track your product improvement actions
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            {[
              { key: 'all', label: 'All Actions', count: actions.length },
              { key: 'pending', label: 'Pending', count: actions.filter(a => !isCompleted(a)).length },
              { key: 'completed', label: 'Completed', count: actions.filter(a => isCompleted(a)).length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as 'all' | 'pending' | 'completed')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Actions Grid */}
        {actions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No quick actions found</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'You don\'t have any quick actions yet.'
                : `No ${filter} actions found.`
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {actions.map((action) => {
              const display = isNewSchema(action) ? generateActionDisplay(action) : {
                title: isCurrentSchema(action) ? action.title : 'Untitled Action',
                details: isCurrentSchema(action) ? action.details : 'No details available',
                summary: isCurrentSchema(action) ? action.summary : 'No summary available'
              };

              return (
                <div
                  key={action.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                          {display.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(action)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(action)}`}>
                            {getStatusText(action)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {display.summary}
                    </p>

                    {/* Product Info - Only for new schema */}
                    {isNewSchema(action) && action.product_name && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900">{action.product_name}</p>
                        {action.product_description && (
                          <p className="text-xs text-blue-700 mt-1">{action.product_description}</p>
                        )}
                      </div>
                    )}

                    {/* Details */}
                    <div className="mb-4">
                      <p className="text-gray-700 text-sm line-clamp-4">
                        {display.details}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        Created: {formatDate(getCreatedAt(action))}
                      </span>
                      {getCompletedAt(action) && (
                        <span className="text-xs text-green-600">
                          Completed: {formatDate(getCompletedAt(action))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={loadQuickActions}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh Actions
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllQuickActionsPage; 