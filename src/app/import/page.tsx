'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

export default function ImportPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setAllUsers(data.allUsers || []);
      } else {
        window.location.href = '/login';
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      setError('Please select or paste CSV data first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentUser={currentUser} allUsers={allUsers} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar role={currentUser.role} />

        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-900">
              Master Sheet Migration & CSV Import
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              One-time or continuous bulk migration from Google Sheets into the HAB Outreach Dashboard.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            {/* Upload Zone */}
            <div className="border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-2xl p-8 text-center transition-colors">
              <FileSpreadsheet className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800">
                Upload your Google Master Sheet (.CSV)
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Supports column headers: Name, Instagram Id, Contact Number, Address, Products To Send, Status, etc.
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                Select CSV File
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Paste Alternative */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Or Paste Raw CSV Data Below
              </label>
              <textarea
                rows={6}
                placeholder="Paste CSV text here..."
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Error or Success Alert */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-sm text-red-700">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Import Successful!</span>
                </div>
                <p className="text-xs">
                  Created <span className="font-bold">{result.createdCount}</span> new influencer records.
                  Skipped <span className="font-bold">{result.skippedCount}</span> existing handles.
                </p>
              </div>
            )}

            {/* Import Trigger */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleImport}
                disabled={loading || !csvText.trim()}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-md shadow-rose-200 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {loading ? 'Importing Data...' : 'Run Migration Import'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
