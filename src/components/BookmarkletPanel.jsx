import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';

function getBookmarkletCode(projectKey, jql, dashboardUrl) {
  // Use custom JQL if provided, otherwise default
  const jqlQuery = jql && jql.trim() 
    ? jql.trim().replace(/\n/g, ' ').replace(/"/g, '\\"')
    : 'project = "' + (projectKey || 'BXDBE') + '" ORDER BY created DESC';
  
  return `javascript:(function(){
  var PROJECT='${projectKey || 'BXDBE'}';
  var DASHBOARD='${dashboardUrl || 'http://localhost:5173'}';
  var JQL="${jqlQuery}";
  var u='/rest/api/latest/search?jql='+encodeURIComponent(JQL)+'&maxResults=500&fields=*all';
  var x=new XMLHttpRequest();
  x.open('GET',u,true);
  x.setRequestHeader('Accept','application/json');
  x.setRequestHeader('X-Atlassian-Token','no-check');
  x.onload=function(){
    if(x.status===200){
      var d=JSON.parse(x.responseText);
      var t=(d.issues||[]).map(function(i){
        var f=i.fields||{};
        var sf=f.customfield_10206||f.customfield_10020||f.customfield_10010||f.customfield_10007||f.customfield_10002||f.customfield_10021||f.customfield_10100||[];
        console.log('[SPRINT DEBUG] Sprint raw:',sf);
        var s=(Array.isArray(sf)?sf:[]).map(function(s){
          if(typeof s==='string'){
            var m=s.match(/name=([^,]+)/);
            return m?m[1]:s;
          }
          return(s&&s.name)||'';
        }).filter(Boolean);
        return {
          key:i.key,summary:f.summary||'',type:(f.issuetype||{}).name||'',
          status:(f.status||{}).name||'',assignee:(f.assignee||{}).displayName||(f.assignee||{}).name||'',
          comps:(f.components||[]).map(function(c){return c.name}).filter(Boolean),
          sprints:s,primarySprint:s.length>0?s[s.length-1]:'',
          timeSpentSec:f.timespent||0,timeSpentHr:(f.timespent||0)/3600,
          originalEstimateSec:f.timeoriginalestimate||0,originalEstimateHr:(f.timeoriginalestimate||0)/3600,
          estimateSec:f.timeestimate||0,estimateHr:(f.timeestimate||0)/3600,
          created:f.created||null,resolved:f.resolutiondate||null,startDate:f.created||null
        };
      });
      var p={tasks:t,project:PROJECT,jql:JQL,timestamp:new Date().toISOString(),count:t.length};
      var e=btoa(unescape(encodeURIComponent(JSON.stringify(p))));
      var w=window.open('','jira-dashboard');
      if(w&&!w.closed){w.location.href=DASHBOARD+'#jira-data='+e;w.focus()}
      else{window.open(DASHBOARD+'#jira-data='+e,'jira-dashboard')}
    }else{alert('\u274c L\u1ed7i '+x.status+'. \u0110\xe3 \u0111\u0103ng nh\u1eadp JIRA ch\u01b0a?')}
  };
  x.onerror=function(){alert('\u274c Kh\xf4ng k\u1ebft n\u1ed1i \u0111\u01b0\u1ee3c. \u0110ang \u1edf trang JIRA ph\u1ea3i kh\xf4ng?')};
  x.send();
})();`;
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export default function BookmarkletPanel() {
  const { state, dispatch } = useApp();
  const [copied, setCopied] = useState(false);
  const [jql, setJql] = useState(state.jiraConfig.jql || '');

  const closePanel = () => {
    dispatch({ type: 'SET_BOOKMARKLET_PANEL_OPEN', payload: false });
  };

  const { bookmarkletPanelOpen } = state;

  return (
    <AnimatePresence>
      {bookmarkletPanelOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={closePanel}
          />

          {/* Slide-out drawer */}
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[480px] max-w-[90vw] bg-[var(--bg-primary)] border-l border-[var(--border-primary)] shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Bookmarklet
                </h2>
              </div>
              <button
                onClick={closePanel}
                className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Intro */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-[var(--text-secondary)]">Không cần API Token</span>
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">Làm 1 lần</span>
              </div>

              <p className="text-xs text-[var(--text-tertiary)]">
                Tạo 1 bookmark trên thanh trình duyệt. Mỗi lần cần: <strong>mở JIRA → click bookmark → Dashboard tự mở</strong>.
                Dùng cookie đăng nhập sẵn — không cần quyền admin, không cần API token.
              </p>

              {/* JQL (tùy chọn) */}
              <div className="mb-1">
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                  JQL (tùy chọn)
                </label>
                <input
                  type="text"
                  value={jql}
                  onChange={(e) => setJql(e.target.value)}
                  placeholder='VD: project = "BXDBE" AND status != Cancelled ORDER BY created DESC'
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-[var(--border-primary)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--accent)] text-[var(--text-primary)]"
                />
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Để trống để dùng JQL mặc định.</p>
              </div>

              {/* Step 1: Copy code */}
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                  Bước 1: Copy đoạn code này
                </p>
                <div className="relative">
                  <textarea
                    readOnly
                    value={getBookmarkletCode(state.jiraConfig.projectKey, jql, window.location.origin)}
                    rows={4}
                    className="w-full text-xs font-mono bg-white dark:bg-slate-900 border border-green-300 dark:border-green-700 rounded-lg p-3 resize-none focus:outline-none text-[var(--text-primary)]"
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => {
                      const text = getBookmarkletCode(state.jiraConfig.projectKey, jql, window.location.origin);
                      copyToClipboard(text);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="absolute top-2 right-2 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer"
                  >
                    {copied ? 'Đã copy!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Step 2: Create bookmark */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  Bước 2: Tạo bookmark
                </p>
                <ol className="list-decimal pl-4 space-y-2 text-xs text-blue-700 dark:text-blue-400">
                  <li>Nhấn <kbd className="bg-white dark:bg-blue-900 px-1.5 py-0.5 rounded border text-xs font-mono">Ctrl+Shift+B</kbd> để hiện thanh bookmark</li>
                  <li><strong>Click chuột phải</strong> vào thanh bookmark → chọn <strong>"Thêm trang..."</strong></li>
                  <li>Ô <strong>Tên</strong>: điền <code className="bg-white dark:bg-blue-900 px-1 rounded">JIRA Sync</code></li>
                  <li>Ô <strong>URL</strong>: <strong>paste</strong> đoạn code đã copy ở Bước 1</li>
                  <li>Nhấn <strong>Lưu</strong></li>
                </ol>
              </div>

              {/* Step 3: Use */}
              <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-2">
                  Bước 3: Dùng hàng ngày
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-xs text-purple-700 dark:text-purple-400">
                  <li>Mở <strong>tab JIRA</strong> (đã đăng nhập)</li>
                  <li><strong>Click JIRA Sync</strong> trên thanh bookmark</li>
                  <li>Dashboard <strong>tự động mở</strong> trong tab mới với dữ liệu!</li>
                </ol>
              </div>

              <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Đang chờ dữ liệu từ JIRA...
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
