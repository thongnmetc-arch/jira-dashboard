import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  PlusCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { createIssue } from '../utils/jiraApi';

const ISSUE_TYPES = ['Task', 'Bug', 'Story', 'Sub-task'];

export default function CreateTaskPanel() {
  const { state } = useApp();
  const { t } = useI18n();

  const { url, token, projectKey, assignee } = state.jiraConfig || {};

  const [issueType, setIssueType] = useState('Task');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeName, setAssigneeName] = useState(assignee || '');
  const [sprint, setSprint] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [originalEstimate, setOriginalEstimate] = useState('');
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [createdIssueKey, setCreatedIssueKey] = useState('');

  // Reset feedback when form changes
  const resetFeedback = useCallback(() => {
    if (result || error) {
      setResult(null);
      setError('');
      setCreatedIssueKey('');
    }
  }, [result, error]);

  const handleSubmit = useCallback(async () => {
    if (!summary.trim() || !token) {
      if (!summary.trim()) setError('Vui lòng nhập tóm tắt công việc.');
      return;
    }

    setCreating(true);
    setError('');
    setResult(null);
    setCreatedIssueKey('');

    try {
      const issueData = {
        issueType,
        summary: summary.trim(),
        description: description.trim(),
        assignee: assigneeName.trim() || undefined,
        sprint: sprint.trim() || undefined,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        originalEstimate: originalEstimate || undefined,
      };

      const data = await createIssue(url, token, projectKey, issueData);
      setResult({ success: true });
      setCreatedIssueKey(data.key || '');

      // Reset form
      setSummary('');
      setDescription('');
      setSprint('');
      setStartDate('');
      setDueDate('');
      setOriginalEstimate('');
      // Keep issueType and assigneeName as they are defaults
    } catch (err) {
      setError(err.message || 'Lỗi khi tạo công việc.');
      setResult({ success: false });
    } finally {
      setCreating(false);
    }
  }, [summary, description, issueType, assigneeName, sprint, startDate, dueDate, originalEstimate, url, token, projectKey]);

  // ── Guard: no JIRA config ──

  if (!state.jiraConfig?.url) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-xl text-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-10">
            <PlusCircle className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
              {t('createTask.title')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Vui lòng kết nối JIRA trước khi sử dụng tính năng này.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {t('createTask.title')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('createTask.subtitle')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4"
        >
          {/* Project Key (read-only) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('createTask.projectKey')}
            </label>
            <input
              type="text"
              value={projectKey || ''}
              readOnly
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
            />
          </div>

          {/* Issue Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('createTask.issueType')}
            </label>
            <select
              value={issueType}
              onChange={(e) => { setIssueType(e.target.value); resetFeedback(); }}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-shadow"
              disabled={creating}
            >
              {ISSUE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('createTask.summary')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => { setSummary(e.target.value); resetFeedback(); }}
              placeholder={t('createTask.summaryPlaceholder')}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-shadow placeholder:text-slate-400 dark:placeholder:text-slate-500"
              disabled={creating}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('createTask.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); resetFeedback(); }}
              placeholder={t('createTask.descriptionPlaceholder')}
              rows={3}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-shadow placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
              disabled={creating}
            />
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('createTask.assignee')}
            </label>
            <input
              type="text"
              value={assigneeName}
              onChange={(e) => { setAssigneeName(e.target.value); resetFeedback(); }}
              placeholder={t('createTask.assigneePlaceholder')}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-shadow placeholder:text-slate-400 dark:placeholder:text-slate-500"
              disabled={creating}
            />
          </div>

          {/* Sprint */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('createTask.sprint')}
            </label>
            <input
              type="text"
              value={sprint}
              onChange={(e) => { setSprint(e.target.value); resetFeedback(); }}
              placeholder={t('createTask.sprintPlaceholder')}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-shadow placeholder:text-slate-400 dark:placeholder:text-slate-500"
              disabled={creating}
            />
          </div>

          {/* Start Date & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('createTask.startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); resetFeedback(); }}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-shadow"
                disabled={creating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('createTask.dueDate')}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => { setDueDate(e.target.value); resetFeedback(); }}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-shadow"
                disabled={creating}
              />
            </div>
          </div>

          {/* Original Estimate */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('createTask.estimate')}
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={originalEstimate}
              onChange={(e) => { setOriginalEstimate(e.target.value); resetFeedback(); }}
              placeholder="0"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-shadow"
              disabled={creating}
            />
          </div>

          {/* Submit button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={creating || !summary.trim() || !token}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-600 dark:disabled:to-slate-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('createTask.creating')}
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                {t('createTask.button')}
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Feedback: success */}
        {result?.success && createdIssueKey && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>
              {t('createTask.success')}{' '}
              <a
                href={`${url?.replace(/\/$/, '')}/browse/${createdIssueKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold underline hover:text-green-800 dark:hover:text-green-200"
              >
                {createdIssueKey}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </span>
          </motion.div>
        )}

        {/* Feedback: error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 whitespace-pre-wrap break-words">{error}</div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
