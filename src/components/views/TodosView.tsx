import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckSquare,
  Square,
  Plus,
  Search,
  Filter,
  Star,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  Clock,
  ListTodo,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { TodoItem, Subtask } from '../../types';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const TodosView: React.FC = () => {
  const {
    todos,
    saveTodo,
    deleteTodo,
    toggleTodoStatus,
    toggleTodoFavorite,
    t,
  } = useApp();

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const filteredTodos = useMemo(() => {
    return todos
      .filter((item: TodoItem) => {
        const matchesSearch =
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(search.toLowerCase())) ||
          item.tags.some((tag: string) => tag.toLowerCase().includes(search.toLowerCase()));

        const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

        return matchesSearch && matchesPriority && matchesStatus;
      })
      .sort((a: TodoItem, b: TodoItem) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        if (a.status === 'pending' && b.status === 'completed') return -1;
        if (a.status === 'completed' && b.status === 'pending') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [todos, search, priorityFilter, statusFilter]);

  const openAddModal = () => {
    setEditingTodo(null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setTagsInput('');
    setSubtasks([]);
    setNewSubtaskTitle('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: TodoItem) => {
    setEditingTodo(item);
    setTitle(item.title);
    setDescription(item.description || '');
    setPriority(item.priority);
    setDueDate(item.dueDate || '');
    setTagsInput(item.tags.join(', '));
    setSubtasks(item.subtasks || []);
    setNewSubtaskTitle('');
    setIsModalOpen(true);
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: 'sub_' + Math.random().toString(36).substring(2, 9),
        title: newSubtaskTitle.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    saveTodo({
      id: editingTodo ? editingTodo.id : undefined,
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate || undefined,
      tags,
      status: editingTodo ? editingTodo.status : 'pending',
      subtasks,
      isFavorite: editingTodo ? editingTodo.isFavorite : false,
      completedAt: editingTodo?.completedAt,
    });

    setIsModalOpen(false);
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <Badge variant="error">Urgent</Badge>;
      case 'high':
        return <Badge variant="warning">High</Badge>;
      case 'medium':
        return <Badge variant="primary">Medium</Badge>;
      default:
        return <Badge variant="neutral">Low</Badge>;
    }
  };

  const pendingCount = todos.filter((t) => t.status === 'pending').length;
  const completedCount = todos.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {t('navTodos')}
            </h1>
            <Badge variant="primary">{pendingCount} Pending</Badge>
            {completedCount > 0 && (
              <Badge variant="success">{completedCount} Done</Badge>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Track development roadmap items, technical debt, and sprint tasks.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, descriptions, or tags..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {filteredTodos.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description="Create engineering tasks, subtasks, and track your sprint backlog."
          actionLabel="Add Task"
          onAction={openAddModal}
        />
      ) : (
        <div className="space-y-2.5">
          {filteredTodos.map((todo: TodoItem) => {
            const isCompleted = todo.status === 'completed';
            const completedSubtasks = (todo.subtasks || []).filter((s) => s.completed).length;
            const totalSubtasks = (todo.subtasks || []).length;

            return (
              <div
                key={todo.id}
                className={`p-4 rounded-2xl bg-white dark:bg-neutral-900 border transition-all ${
                  isCompleted
                    ? 'border-neutral-200/60 dark:border-neutral-800/60 opacity-70'
                    : 'border-neutral-200/80 dark:border-neutral-800 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleTodoStatus(todo.id)}
                      className="mt-0.5 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer shrink-0"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-semibold ${
                            isCompleted
                              ? 'line-through text-neutral-400 dark:text-neutral-500'
                              : 'text-neutral-900 dark:text-neutral-100'
                          }`}
                        >
                          {todo.title}
                        </span>
                        {getPriorityBadge(todo.priority)}
                        {todo.dueDate && (
                          <span className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                            <Calendar className="w-3 h-3" />
                            <span>{todo.dueDate}</span>
                          </span>
                        )}
                      </div>

                      {todo.description && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                          {todo.description}
                        </p>
                      )}

                      {/* Subtasks snippet */}
                      {totalSubtasks > 0 && (
                        <div className="pt-1">
                          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                            <ListTodo className="w-3.5 h-3.5" />
                            <span>
                              {completedSubtasks} / {totalSubtasks} subtasks completed
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {todo.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {todo.tags.map((tag: string, tIdx: number) => (
                            <span
                              key={tIdx}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleTodoFavorite(todo.id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        todo.isFavorite
                          ? 'text-amber-500'
                          : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                      }`}
                      title={todo.isFavorite ? 'Unfavorite' : 'Favorite'}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      onClick={() => openEditModal(todo)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(todo.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {editingTodo ? 'Edit Task' : 'New Task'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Implement OAuth client credentials flow"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Description / Specification
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed notes or acceptance criteria..."
                  className="w-full p-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                />
              </div>

              {/* Subtasks Section */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Subtasks checklist
                </label>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    placeholder="Add subtask and press Enter..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {subtasks.length > 0 && (
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {subtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-xs"
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={st.completed}
                            onChange={() => handleToggleSubtask(st.id)}
                            className="rounded border-neutral-300 text-blue-600"
                          />
                          <span className={st.completed ? 'line-through text-neutral-400' : ''}>
                            {st.title}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(st.id)}
                          className="text-neutral-400 hover:text-rose-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="backend, api, sprint-1"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer"
                >
                  {editingTodo ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Task"
        message="Are you sure you want to remove this task and its subtasks?"
        onConfirm={() => {
          if (deleteId) deleteTodo(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
