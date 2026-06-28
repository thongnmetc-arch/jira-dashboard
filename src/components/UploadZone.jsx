import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { parseCSV } from '../utils/csvParser';
import { parseJiraDate } from '../utils/dateUtils';

function findColumn(headers, name) {
  const n = name.toLowerCase();
  return headers.findIndex(h => h.toLowerCase() === n);
}

function findAllColumns(headers, name) {
  const n = name.toLowerCase();
  const indices = [];
  headers.forEach((h, i) => {
    if (h.toLowerCase() === n) indices.push(i);
  });
  return indices;
}

function getValue(row, idx) {
  return idx >= 0 && idx < row.length ? (row[idx] || '').trim() : '';
}

function cleanNum(str) {
  return parseFloat(String(str).replace(/[^0-9.-]/g, '')) || 0;
}

export default function UploadZone() {
  const { dispatch } = useApp();
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileStats, setFileStats] = useState('');

  const processFile = useCallback((file) => {
    if (!file) return;
    dispatch({ type: 'SET_LOADING', payload: true });

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const text = e.target.result;
        const parsed = parseCSV(text);

        if (parsed.length < 2) {
          throw new Error('File CSV không có dữ liệu hợp lệ. Vui lòng kiểm tra lại file.');
        }

        const headers = parsed[0].map(h => h.trim());
        if (headers.length > 0) {
          headers[0] = headers[0].replace(/^\uFEFF/, '');
        }
        const dataRows = parsed.slice(1);

        const colSummary = findColumn(headers, 'summary');
        const colKey = findColumn(headers, 'issue key');
        const colType = findColumn(headers, 'issue type');
        const colStatus = findColumn(headers, 'status');
        const colComponents = findAllColumns(headers, 'component/s');
        const colTimeSpent = findColumn(headers, 'time spent');
        const colEstimate = findColumn(headers, 'original estimate');
        const colCreated = findColumn(headers, 'created');
        const colResolved = findColumn(headers, 'resolved');
        const colStartDate = findColumn(headers, 'custom field (start date (time))');
        const colSprints = findAllColumns(headers, 'sprint');
        const colAssignee = findColumn(headers, 'assignee');
        const colPriority = findColumn(headers, 'priority');

        const missing = [];
        if (colKey < 0) missing.push('Issue key');
        if (colTimeSpent < 0) missing.push('Time Spent');
        if (colSummary < 0) missing.push('Summary');
        if (missing.length > 0) {
          const found = headers.slice(0, 5).map((h, i) => '[' + i + '] ' + h).join(' | ');
          throw new Error('Không tìm thấy cột: ' + missing.join(', ') +
            '. 5 cột đầu tiên tìm thấy: ' + found +
            '. Tổng số cột: ' + headers.length +
            '. Đảm bảo file là CSV xuất từ JIRA với dấu phân cách dấu chấm phẩy (;).');
        }

        const tasks = [];
        const parseErrors = [];

        for (let r = 0; r < dataRows.length; r++) {
          const row = dataRows[r];
          try {
            const key = getValue(row, colKey);
            if (!key) continue;
            if (row.length < 10) continue;

            const timeSpentSec = cleanNum(getValue(row, colTimeSpent));
            const estimateSec = colEstimate >= 0 ? cleanNum(getValue(row, colEstimate)) : 0;

            const comps = [];
            for (const ci of colComponents) {
              const v = getValue(row, ci);
              if (v && !comps.includes(v)) comps.push(v);
            }

            const sprints = [];
            for (const si of colSprints) {
              const v = getValue(row, si);
              if (v) sprints.push(v);
            }
            const primarySprint = sprints.length > 0 ? sprints[sprints.length - 1] : 'Không có Sprint';

            const summary = getValue(row, colSummary);
            const issueType = colType >= 0 ? getValue(row, colType) : 'Không có';
            const status = colStatus >= 0 ? getValue(row, colStatus) : '';
            const assignee = colAssignee >= 0 ? getValue(row, colAssignee) : 'Không có';
            const priority = colPriority >= 0 ? getValue(row, colPriority) : '';

            const created = parseJiraDate(getValue(row, colCreated));
            const resolved = colResolved >= 0 ? parseJiraDate(getValue(row, colResolved)) : null;
            const rawStart = colStartDate >= 0 ? getValue(row, colStartDate) : '';
            const startDate = rawStart ? (parseJiraDate(rawStart) || created) : (created || null);

            tasks.push({
              key, summary, issueType, status, priority,
              comps, sprints, primarySprint,
              timeSpentSec, estimateSec,
              timeSpentHr: timeSpentSec / 3600,
              estimateHr: estimateSec / 3600,
              created, resolved, startDate, assignee,
            });
          } catch (e) {
            parseErrors.push('Dòng ' + (r + 2) + ': ' + e.message);
          }
        }

        if (tasks.length === 0) {
          throw new Error('Không tìm thấy dữ liệu công việc hợp lệ trong file.');
        }

        const totalHr = tasks.reduce((s, t) => s + t.timeSpentHr, 0);
        const totalEst = tasks.reduce((s, t) => s + t.estimateHr, 0);

        setFileName(file.name);
        setFileStats(tasks.length + ' công việc · ' + totalHr.toFixed(1) + ' giờ đã log · ' + totalEst.toFixed(1) + ' giờ ước tính');

        dispatch({ type: 'SET_FILE_INFO', payload: { fileName: file.name, fileStats: tasks.length + ' công việc · ' + totalHr.toFixed(1) + ' giờ đã log · ' + totalEst.toFixed(1) + ' giờ ước tính' } });
        dispatch({ type: 'SET_DATA_SOURCE', payload: 'csv' });
        dispatch({ type: 'SET_TASKS', payload: tasks });
        dispatch({ type: 'SET_OT_LEAVE', payload: { otTotal: 0, leaveTotal: 0 } });
        try { localStorage.removeItem('jira-dash-ot-leave'); } catch(e) {}

        if (parseErrors.length > 0) {
          console.warn('Parse errors:', parseErrors);
        }

      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: 'Lỗi: ' + err.message });
        console.error(err);
      }
    };

    reader.onerror = function () {
      dispatch({ type: 'SET_ERROR', payload: 'Lỗi đọc file. Vui lòng thử lại.' });
    };

    reader.readAsText(file, 'UTF-8');
  }, [dispatch]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) processFile(files[0]);
  }, [processFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleBrowse = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e) => {
    if (e.target.files.length > 0) processFile(e.target.files[0]);
    e.target.value = '';
  }, [processFile]);

  return (
    <div>
      <div
        className={`relative w-full rounded-xl p-8 text-center cursor-pointer transition-all border-2 border-dashed
          ${dragOver
            ? 'border-[var(--accent)] bg-[var(--accent-light)]'
            : 'border-[var(--border-secondary)] bg-[var(--bg-primary)] hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)]'
          }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowse}
      >
        <div className="flex justify-center mb-3">
          <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)]">
            <Upload className="w-8 h-8 text-[var(--accent)]" strokeWidth={1.5} />
          </div>
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Kéo thả file CSV JIRA vào đây
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          hoặc nhấn để chọn file
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); handleBrowse(); }}
          className="mt-4 px-5 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-md font-medium text-xs transition-all cursor-pointer"
        >
          Chọn file CSV
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
          onClick={(e) => { e.stopPropagation(); }}
        />
      </div>

      {fileName && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 w-full p-3 bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)] rounded-lg text-sm flex items-start gap-2.5"
        >
          <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="block text-xs">{fileName}</strong>
            <span className="text-[0.7rem] opacity-80">{fileStats}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
