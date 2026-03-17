import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminSummary } from '../services/api';

const AdminSummaryPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const now = new Date();
    const defaultTo = now.toISOString().slice(0, 16);
    const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const defaultFrom = fromDate.toISOString().slice(0, 16);
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
      const res = await getAdminSummary({
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString()
      });
      setSummary(res);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load summary');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const btnPrimary =
    'px-4 py-2 rounded-lg font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 transition-colors';
  const btnSecondary =
    'px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors';
  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  const formatCurrency = (value) => {
    if (!value || isNaN(value)) return '₹0';
    return `₹${Number(value).toLocaleString()}`;
  };

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
                onClick={() => navigate('/admin/manage')}
                className={btnSecondary}
              >
                Manage Users & Tasks
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
                type="datetime-local"
                className={inputClass}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
              <input
                type="datetime-local"
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
                  const toVal = now.toISOString().slice(0, 16);
                  const fromVal = new Date(
                    now.getTime() - 7 * 24 * 60 * 60 * 1000
                  ).toISOString().slice(0, 16);
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
                  const toVal = now.toISOString().slice(0, 16);
                  const fromVal = new Date(
                    now.getTime() - 30 * 24 * 60 * 60 * 1000
                  ).toISOString().slice(0, 16);
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
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Created
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-800">
                    {summary.counts?.created ?? 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    In Progress
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-amber-600">
                    {summary.counts?.inProgress ?? 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Completed
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-emerald-600">
                    {summary.counts?.completed ?? 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Pending
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-700">
                    {summary.counts?.pending ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-800 mb-4">
                CAPEX / REVEX Expenditure
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      CAPEX Total
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-slate-800">
                    {formatCurrency(summary.financial?.capexTotal)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      REVEX Total
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-slate-800">
                    {formatCurrency(summary.financial?.revexTotal)}
                  </div>
                </div>
                <div className="pt-3 mt-1 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Grand Total
                    </div>
                    <div className="text-xs text-slate-500">
                      CAPEX + REVEX within selected period
                    </div>
                  </div>
                  <div className="text-xl font-semibold text-primary-600">
                    {formatCurrency(summary.financial?.grandTotal)}
                  </div>
                </div>
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
    </div>
  );
};

export default AdminSummaryPage;

