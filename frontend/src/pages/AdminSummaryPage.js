import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminSummary, getAdminSummaryDrilldown } from '../services/api';
import { formatInr } from '../utils/currency';
import {
  formatLocalDateString,
  startOfLocalDayFromYmd,
  exclusiveEndAfterInclusiveLocalDay
} from '../utils/adminSummaryRange';
import { formatDueDate, dueDateColor, getStatusBadge } from '../utils/taskDisplay';

const AdminSummaryPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownTitle, setDrilldownTitle] = useState('');
  const [drilldownTasks, setDrilldownTasks] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState('');

  useEffect(() => {
    const now = new Date();
    const defaultTo = formatLocalDateString(now);
    const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const defaultFrom = formatLocalDateString(fromDate);
    setFrom(defaultFrom);
    setTo(defaultTo);
  }, []);

  useEffect(() => {
    if (from && to) {
      loadSummary();
    }
  }, [from, to]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError('');
      if (!from || !to) return;
      const fromStart = startOfLocalDayFromYmd(from);
      const toExclusive = exclusiveEndAfterInclusiveLocalDay(to);
      if (fromStart >= toExclusive) {
        setError('The end date must be on or after the start date.');
        setSummary(null);
        return;
      }
      const res = await getAdminSummary({
        from: fromStart.toISOString(),
        to: toExclusive.toISOString()
      });
      setSummary(res);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load summary');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const getRangeIso = useCallback(() => {
    if (!from || !to) return null;
    const fromStart = startOfLocalDayFromYmd(from);
    const toExclusive = exclusiveEndAfterInclusiveLocalDay(to);
    if (fromStart >= toExclusive) return null;
    return { fromIso: fromStart.toISOString(), toIso: toExclusive.toISOString() };
  }, [from, to]);

  const openDrilldown = async (category, title) => {
    const range = getRangeIso();
    if (!range) {
      setError('The end date must be on or after the start date.');
      return;
    }
    setDrilldownTitle(title);
    setDrilldownOpen(true);
    setDrilldownError('');
    setDrilldownTasks([]);
    setDrilldownLoading(true);
    try {
      const res = await getAdminSummaryDrilldown({
        from: range.fromIso,
        to: range.toIso,
        category
      });
      setDrilldownTasks(res.tasks || []);
    } catch (err) {
      setDrilldownError(err.response?.data?.error || 'Failed to load tasks');
    } finally {
      setDrilldownLoading(false);
    }
  };

  const closeDrilldown = () => {
    setDrilldownOpen(false);
    setDrilldownTitle('');
    setDrilldownTasks([]);
    setDrilldownError('');
  };

  const btnPrimary =
    'px-4 py-2 rounded-lg font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 transition-colors';
  const btnSecondary =
    'px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors';
  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  const tileBtn =
    'w-full text-left p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors cursor-pointer';
  const financialRowBtn =
    'w-full flex items-center justify-between gap-4 p-3 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors cursor-pointer text-left';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-xl font-semibold text-slate-800">Admin Summary</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Welcome, {user.email}</span>
              <button
                type="button"
                onClick={() => navigate('/admin/users')}
                className={btnSecondary}
              >
                Manage Users
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/tasks')}
                className={btnSecondary}
              >
                Manage Tasks
              </button>
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className={btnSecondary}
              >
                Find tasks
              </button>
              <button type="button" onClick={onLogout} className={btnSecondary}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="bg-white rounded-xl shadow-card border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Timeframe</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
              <input
                type="date"
                className={inputClass}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
              <input
                type="date"
                className={inputClass}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const toVal = formatLocalDateString(now);
                  const fromVal = formatLocalDateString(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
                  );
                  setFrom(fromVal);
                  setTo(toVal);
                }}
                className={btnSecondary}
              >
                Last 7 days
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const toVal = formatLocalDateString(now);
                  const fromVal = formatLocalDateString(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
                  );
                  setFrom(fromVal);
                  setTo(toVal);
                }}
                className={btnSecondary}
              >
                Last 30 days
              </button>
              <button
                type="button"
                onClick={loadSummary}
                disabled={loading}
                className={btnPrimary}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-card border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-800 mb-4">
                Task Overview
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                Click a metric to see matching tasks for this period.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  className={tileBtn}
                  onClick={() => openDrilldown('created', 'Created (in period)')}
                >
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Created
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-800">
                    {summary.counts?.created ?? 0}
                  </div>
                </button>
                <button
                  type="button"
                  className={tileBtn}
                  onClick={() => openDrilldown('inProgress', 'In progress')}
                >
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    In progress
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-amber-600">
                    {summary.counts?.inProgress ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-tight">Not yet submitted for approval</p>
                </button>
                <button
                  type="button"
                  className={tileBtn}
                  onClick={() => openDrilldown('completed', 'Approved')}
                >
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Approved
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-emerald-600">
                    {summary.counts?.completed ?? 0}
                  </div>
                </button>
                <button
                  type="button"
                  className={tileBtn}
                  onClick={() => openDrilldown('pending', 'Awaiting review')}
                >
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Awaiting review
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-700">
                    {summary.counts?.pending ?? 0}
                  </div>
                </button>
                <button
                  type="button"
                  className={tileBtn}
                  onClick={() => openDrilldown('overdue', 'Overdue')}
                >
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Overdue
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-red-600">
                    {summary.counts?.overdue ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-tight">Past deadline, not completed</p>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-800 mb-4">
                CAPEX / REVEX Expenditure
              </h2>
              <p className="text-xs text-slate-500 mb-2">
                Click a row to list tasks included in that total.
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  className={financialRowBtn}
                  onClick={() => openDrilldown('capex', 'CAPEX tasks')}
                >
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      CAPEX Total
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-slate-800 shrink-0">
                    {formatInr(summary.financial?.capexTotal)}
                  </div>
                </button>
                <button
                  type="button"
                  className={financialRowBtn}
                  onClick={() => openDrilldown('revex', 'REVEX tasks')}
                >
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      REVEX Total
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-slate-800 shrink-0">
                    {formatInr(summary.financial?.revexTotal)}
                  </div>
                </button>
                <button
                  type="button"
                  className={`${financialRowBtn} pt-3 mt-1 border-t border-slate-200 rounded-none rounded-b-lg`}
                  onClick={() => openDrilldown('capexOrRevex', 'CAPEX and REVEX tasks')}
                >
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Grand Total
                    </div>
                    <div className="text-xs text-slate-500">
                      CAPEX + REVEX within selected period
                    </div>
                  </div>
                  <div className="text-xl font-semibold text-primary-600 shrink-0">
                    {formatInr(summary.financial?.grandTotal)}
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {!summary && !loading && !error && (
          <div className="text-sm text-slate-500">
            Adjust the timeframe or click <span className="font-semibold">Refresh</span> to
            load summary data.
          </div>
        )}
      </div>

      {drilldownOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="presentation"
          onClick={closeDrilldown}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drilldown-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <h2 id="drilldown-heading" className="text-lg font-semibold text-slate-800">
                {drilldownTitle}
              </h2>
              <button type="button" onClick={closeDrilldown} className={btnSecondary}>
                Close
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 min-h-0">
              {drilldownLoading && (
                <p className="text-sm text-slate-600">Loading tasks…</p>
              )}
              {drilldownError && (
                <p className="text-sm text-red-600">{drilldownError}</p>
              )}
              {!drilldownLoading && !drilldownError && drilldownTasks.length === 0 && (
                <p className="text-sm text-slate-600">No tasks.</p>
              )}
              {!drilldownLoading && !drilldownError && drilldownTasks.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-3 py-2 font-semibold text-slate-600">Title</th>
                        <th className="px-3 py-2 font-semibold text-slate-600">Assigned to</th>
                        <th className="px-3 py-2 font-semibold text-slate-600">Deadline</th>
                        <th className="px-3 py-2 font-semibold text-slate-600">Status</th>
                        <th className="px-3 py-2 font-semibold text-slate-600" />
                      </tr>
                    </thead>
                    <tbody>
                      {drilldownTasks.map((task) => (
                        <tr key={task.id} className="border-b border-slate-100">
                          <td className="px-3 py-2 text-slate-800 font-medium">{task.title}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {task.assignedTo?.email || '—'}
                          </td>
                          <td className={`px-3 py-2 ${dueDateColor(task.deadline, task.isOverdue)}`}>
                            {task.deadline ? formatDueDate(task.deadline) : '—'}
                          </td>
                          <td className="px-3 py-2">{getStatusBadge(task.status)}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="text-primary-600 hover:text-primary-700 font-medium"
                              onClick={() => {
                                closeDrilldown();
                                navigate(`/tasks/${task.id}`);
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSummaryPage;
