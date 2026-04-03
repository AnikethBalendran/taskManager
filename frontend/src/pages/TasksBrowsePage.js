import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTasks } from '../services/api';
import {
  getStatusBadge,
  formatApprovalStatusLabel,
  formatDueDate,
  dueDateColor
} from '../utils/taskDisplay';
import { downloadTasksExcel } from '../utils/exportExcel';

const PAGE_SIZE = 5;

const snippet = (text, maxLen = 180) => {
  if (!text) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
};

const taskMatchesQuery = (task, q) => {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const parts = [
    task.title,
    task.description,
    task.capId,
    task.assignedTo?.email,
    task.assignedBy?.email
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return parts.includes(needle);
};

const TasksBrowsePage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const dashboardPath = `/${user.role.toLowerCase()}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getTasks();
        if (!cancelled) setTasks(res.tasks || []);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Failed to load tasks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => tasks.filter((t) => taskMatchesQuery(t, search)),
    [tasks, search]
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageTasks = filtered.slice(start, start + PAGE_SIZE);

  const btnSecondary =
    'px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors';
  const inputClass =
    'w-full max-w-2xl px-4 py-3 border border-slate-300 rounded-full text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" onClick={() => navigate(dashboardPath)} className={btnSecondary}>
                ← Dashboard
              </button>
              <h1 className="text-xl font-semibold text-slate-800">Tasks</h1>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                disabled={!filtered.length}
                onClick={() => {
                  const q = search.trim().replace(/\s+/g, '-').slice(0, 40) || 'all';
                  downloadTasksExcel(filtered, `tasks-browse-${q}`);
                }}
                className={btnSecondary}
              >
                Download Excel
              </button>
              <span className="text-sm text-slate-600">{user.email}</span>
              <button type="button" onClick={onLogout} className={btnSecondary}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <label htmlFor="task-search" className="sr-only">
            Search tasks
          </label>
          <input
            id="task-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by title, description, ID, or email…"
            className={inputClass}
            autoComplete="off"
          />
        </div>

        {loading && <p className="text-slate-600">Loading…</p>}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {!loading && !error && (
          <>
            <p className="text-sm text-slate-600 mb-6">
              About {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              {search.trim() ? ` for "${search.trim()}"` : ''}
            </p>

            <ul className="space-y-8">
              {pageTasks.map((task) => (
                <li key={task.id} className="max-w-full">
                  <Link
                    to={`/tasks/${task.id}`}
                    className="text-xl text-primary-600 hover:underline visited:text-violet-700 font-medium leading-snug"
                  >
                    {task.title}
                  </Link>
                  {task.capId && (
                    <span className="ml-2 font-mono text-xs text-slate-500 align-middle">{task.capId}</span>
                  )}
                  <p className="text-sm text-slate-700 mt-1 line-clamp-2">{snippet(task.description)}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-600">
                    <span className={dueDateColor(task.deadline, task.isOverdue)}>
                      {formatDueDate(task.deadline)}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span>{getStatusBadge(task.status)}</span>
                    {task.approvalStatus && task.approvalStatus !== 'NONE' && (
                      <>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-700">{formatApprovalStatusLabel(task.approvalStatus)}</span>
                      </>
                    )}
                    {task.assignedTo?.email && (
                      <>
                        <span className="text-slate-400">·</span>
                        <span>Assignee: {task.assignedTo.email}</span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {filtered.length === 0 && (
              <p className="text-slate-600 text-sm">No tasks match your search.</p>
            )}

            {filtered.length > PAGE_SIZE && (
              <nav
                className="flex flex-wrap items-center justify-center gap-2 mt-10 pt-6 border-t border-slate-200"
                aria-label="Pagination"
              >
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`${btnSecondary} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600 px-2">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={`${btnSecondary} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TasksBrowsePage;
