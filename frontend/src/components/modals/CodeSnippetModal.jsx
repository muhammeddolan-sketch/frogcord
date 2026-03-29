import React, { useState } from 'react';
import { Code, X } from 'lucide-react';

export default function CodeSnippetModal({ onClose, onSend }) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [comment, setComment] = useState('');

  const languages = [
    { id: 'javascript', name: 'JavaScript' },
    { id: 'python', name: 'Python' },
    { id: 'html', name: 'HTML' },
    { id: 'css', name: 'CSS' },
    { id: 'typescript', name: 'TypeScript' },
    { id: 'json', name: 'JSON' },
    { id: 'csharp', name: 'C#' },
    { id: 'cpp', name: 'C++' },
    { id: 'go', name: 'Go' },
    { id: 'rust', name: 'Rust' },
    { id: 'sql', name: 'SQL' },
    { id: 'bash', name: 'Bash' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    let finalContent = '';
    if (comment.trim()) finalContent += comment + '\n';
    finalContent += `\`\`\`${language}\n${code}\n\`\`\``;
    onSend(finalContent);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-[var(--bg-dark)] border border-[var(--border-pixel)] w-full max-w-xl shadow-2xl overflow-hidden animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-[var(--border-pixel)] bg-[var(--bg-darker)]/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-[var(--accent-primary)]/10 p-2 rounded-lg">
                <Code className="w-5 h-5 text-[var(--accent-primary)]" />
             </div>
             <div>
                <h2 className="text-white font-black text-sm uppercase tracking-tighter">Kod Paylaş</h2>
                <p className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-widest opacity-60">Gölün sakini olarak bilgelik vıkla!</p>
             </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
           <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Yorum (Opsiyonel)</label>
              <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Bu kod ne yapar?" className="pixel-input text-xs" />
           </div>

           <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Kod Parçacığı</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-[var(--bg-darker)] border border-[var(--border-pixel)] text-[10px] font-bold text-[var(--accent-primary)] uppercase px-2 py-1 outline-none">
                   {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <textarea 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                rows={10} 
                required
                className="pixel-input font-mono text-xs resize-none bg-[#0a0a0a]" 
                placeholder="// Buraya kodunu vıkla..."
              />
           </div>

           <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={onClose} className="pixel-btn text-[10px] uppercase font-bold px-6">İPTAL</button>
              <button type="submit" className="pixel-btn-primary text-[10px] uppercase font-bold px-8 py-2">PAYLAŞ 🐸</button>
           </div>
        </form>
      </div>
    </div>
  );
}
