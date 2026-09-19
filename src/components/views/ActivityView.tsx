import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  PlusCircle,
  Edit3,
  Trash2,
  Copy,
  Zap,
  Download,
  Activity,
  Key,
  FileCode,
  Terminal,
  Bookmark,
  Lock,
  FileText,
  CheckSquare,
  Code2,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ActivityItem } from '../../types';

export const ActivityView: React.FC = () => {
  const { activity, t } = useApp();

  const getActionBadge = (action: ActivityItem['action']) => {
    switch (action) {
      case 'created':
        return <Badge variant="success">Created</Badge>;
      case 'updated':
        return <Badge variant="primary">Updated</Badge>;
      case 'deleted':
        return <Badge variant="error">Deleted</Badge>;
      case 'copied':
        return <Badge variant="neutral">Copied</Badge>;
      case 'tested':
        return <Badge variant="warning">Tested</Badge>;
      case 'exported':
        return <Badge variant="neutral">Exported</Badge>;
      default:
        return <Badge variant="neutral">{action}</Badge>;
    }
  };

  const getActionIcon = (action: ActivityItem['action']) => {
    switch (action) {
      case 'created':
        return <PlusCircle className="w-4 h-4 text-emerald-500" />;
      case 'updated':
        return <Edit3 className="w-4 h-4 text-blue-500" />;
      case 'deleted':
        return <Trash2 className="w-4 h-4 text-rose-500" />;
      case 'copied':
        return <Copy className="w-4 h-4 text-neutral-400" />;
      case 'tested':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'exported':
        return <Download className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {t('navActivity')}
          </h1>
          <Badge variant="primary">{activity.length} Events</Badge>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Complete audit trail of items created, tested, copied, or exported in your workspace.
        </p>
      </div>

      {activity.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No activity recorded yet"
          description="Actions performed in your workspace will be tracked here."
        />
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
          {activity.map((item) => (
            <div key={item.id} className="relative flex items-start gap-3 text-xs">
              {/* Dot */}
              <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-white dark:bg-neutral-900 border-2 border-blue-500 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              </div>

              {/* Card */}
              <div className="flex-1 p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 shrink-0">
                    {getActionIcon(item.action)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-neutral-400 capitalize">
                      {item.itemType} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {getActionBadge(item.action)}
                  <span className="text-[10px] text-neutral-400">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
