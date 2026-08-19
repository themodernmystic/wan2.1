import React, { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play, RefreshCw, Maximize2, Minimize2, Code2,
  Eye, Download, Copy, Check, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_FILES = {
  html: {
    language: 'html',
    label: 'index.html',
    value: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Project</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="container">
    <header>
      <h1>Welcome to My Project</h1>
      <p>Edit this code and see it update live!</p>
    </header>
    <main>
      <div class="card">
        <h2>Getting Started</h2>
        <p>Use the editor on the left to modify HTML, CSS, and JavaScript. Your changes appear instantly in the preview.</p>
        <button id="btn" onclick="handleClick()">Click Me!</button>
        <p id="output" class="output"></p>
      </div>
    </main>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
  },
  css: {
    language: 'css',
    label: 'style.css',
    value: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  width: 100%;
  max-width: 640px;
  padding: 2rem;
}

header {
  text-align: center;
  margin-bottom: 2rem;
  color: white;
}

header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

header p {
  opacity: 0.85;
  font-size: 1.1rem;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

.card h2 {
  font-size: 1.4rem;
  margin-bottom: 1rem;
  color: #1a1a2e;
}

.card p {
  color: #555;
  line-height: 1.7;
  margin-bottom: 1.5rem;
}

button {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102,126,234,0.4);
}

.output {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: #f0f4ff;
  border-radius: 8px;
  color: #667eea;
  font-weight: 500;
  min-height: 2.5rem;
}`,
  },
  js: {
    language: 'javascript',
    label: 'script.js',
    value: `let clickCount = 0;

function handleClick() {
  clickCount++;
  const output = document.getElementById('output');
  const messages = [
    '🚀 You clicked! The editor is live!',
    '✨ Keep going, you\'re doing great!',
    '🎉 Three clicks! You\'re a pro!',
    '🔥 On fire! ' + clickCount + ' clicks total!',
  ];
  const msg = messages[Math.min(clickCount - 1, messages.length - 1)];
  output.textContent = msg;
  output.style.animation = 'none';
  output.offsetHeight; // reflow
  output.style.animation = 'fadeIn 0.3s ease';
}

// Add a fun animation
const style = document.createElement('style');
style.textContent = \`
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
\`;
document.head.appendChild(style);

console.log('Script loaded! Ready to code.');`,
  },
};

function buildSrcdoc(html, css, js) {
  return html
    .replace('<link rel="stylesheet" href="style.css" />', `<style>${css}</style>`)
    .replace('<script src="script.js"></script>', `<script>${js}</script>`);
}

export default function CodeEditor({ projectName = 'My Project' }) {
  const [files, setFiles] = useState(DEFAULT_FILES);
  const [activeTab, setActiveTab] = useState('html');
  const [previewKey, setPreviewKey] = useState(0);
  const [previewDoc, setPreviewDoc] = useState('');
  const [splitMode, setSplitMode] = useState('split'); // 'editor' | 'split' | 'preview'
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef(null);

  // Build preview on mount
  useEffect(() => {
    updatePreview(files);
  }, []);

  const updatePreview = useCallback((currentFiles) => {
    const doc = buildSrcdoc(
      currentFiles.html.value,
      currentFiles.css.value,
      currentFiles.js.value
    );
    setPreviewDoc(doc);
  }, []);

  const handleEditorChange = useCallback((value) => {
    const updated = {
      ...files,
      [activeTab]: { ...files[activeTab], value: value || '' },
    };
    setFiles(updated);

    // Debounce preview update by 400ms
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updatePreview(updated);
    }, 400);
  }, [files, activeTab, updatePreview]);

  const handleReset = () => {
    setFiles(DEFAULT_FILES);
    updatePreview(DEFAULT_FILES);
    toast.success('Reset to default');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(files[activeTab].value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = { html: 'html', css: 'css', js: 'js' }[activeTab];
    const blob = new Blob([files[activeTab].value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = files[activeTab].label;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runPreview = () => {
    updatePreview(files);
    setPreviewKey(k => k + 1);
    toast.success('Preview refreshed');
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-border overflow-hidden bg-[#1e1e1e]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#252526]">
        <div className="flex items-center gap-3">
          <Code2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-white/80">{projectName}</span>
          {/* File tabs */}
          <div className="flex items-center gap-1 ml-2">
            {Object.entries(files).map(([key, file]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                  activeTab === key
                    ? 'bg-[#1e1e1e] text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {file.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5 mr-2">
            {[
              { id: 'editor', icon: Code2, title: 'Editor only' },
              { id: 'split', icon: Maximize2, title: 'Split view' },
              { id: 'preview', icon: Eye, title: 'Preview only' },
            ].map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                onClick={() => setSplitMode(id)}
                title={title}
                className={`p-1.5 rounded transition-colors ${
                  splitMode === id ? 'bg-primary text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 px-2 text-white/70 hover:text-white hover:bg-white/10">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDownload} className="h-7 px-2 text-white/70 hover:text-white hover:bg-white/10">
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReset} className="h-7 px-2 text-white/70 hover:text-white hover:bg-white/10">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" onClick={runPreview} className="h-7 px-3 gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs ml-1">
            <Play className="w-3 h-3" /> Run
          </Button>
        </div>
      </div>

      {/* Editor + Preview pane */}
      <div className="flex flex-1 min-h-0" style={{ height: '600px' }}>
        {/* Editor pane */}
        {splitMode !== 'preview' && (
          <div className={splitMode === 'split' ? 'w-1/2 border-r border-white/10' : 'w-full'}>
            <Editor
              height="100%"
              language={files[activeTab].language}
              value={files[activeTab].value}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                tabSize: 2,
                formatOnPaste: true,
                formatOnType: true,
                suggest: { showSnippets: true },
                quickSuggestions: true,
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>
        )}

        {/* Preview pane */}
        {splitMode !== 'editor' && (
          <div className={`flex flex-col ${splitMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#252526] border-b border-white/10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
              </div>
              <span className="text-xs text-white/40 font-mono ml-1">preview</span>
              <div className="flex items-center gap-1 ml-auto">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-white/40">live</span>
              </div>
            </div>
            <div className="flex-1 bg-white">
              <iframe
                key={previewKey}
                srcDoc={previewDoc}
                title="Live Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}