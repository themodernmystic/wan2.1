import React, { useState, useRef, useCallback } from 'react';
import { Paperclip, X, FileText, Image, Film, Music, File, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function getFileIcon(file) {
  const type = file.type || '';
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Film;
  if (type.startsWith('audio/')) return Music;
  if (type.includes('pdf') || type.includes('text') || type.includes('document')) return FileText;
  return File;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function FileUploadZone({ attachments, setAttachments, disabled }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const uploadFiles = useCallback(async (files) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;
    setUploading(true);
    const results = [];
    for (const file of fileArray) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        results.push({ name: file.name, size: file.size, type: file.type, url: file_url });
      } catch (e) {
        results.push({ name: file.name, size: file.size, type: file.type, url: null, error: 'Upload failed' });
      }
    }
    setAttachments(prev => [...prev, ...results]);
    setUploading(false);
  }, [setAttachments]);

  const onFileInput = (e) => {
    if (e.target.files?.length) uploadFiles(e.target.files);
    e.target.value = '';
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {attachments.map((att, i) => {
            const Icon = getFileIcon(att);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#1a1a2e', border: `1px solid ${att.error ? '#7F1D1D' : '#C9A84C33'}`,
                borderRadius: 6, padding: '4px 8px 4px 6px',
                fontSize: 11, color: att.error ? '#EF4444' : '#C9A84C99',
                maxWidth: 200,
              }}>
                {att.type?.startsWith('image/') && att.url ? (
                  <img src={att.url} alt={att.name} style={{ width: 20, height: 20, borderRadius: 3, objectFit: 'cover' }} />
                ) : (
                  <Icon size={13} style={{ flexShrink: 0 }} />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                  {att.name}
                </span>
                <span style={{ color: '#444', flexShrink: 0 }}>{formatSize(att.size)}</span>
                <button onClick={() => removeAttachment(i)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Attach button */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        title="Attach files"
        style={{
          background: 'transparent', border: '1px solid #1a1a2e',
          borderRadius: 8, width: 40, height: 40, flexShrink: 0,
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: uploading ? '#C9A84C' : '#555',
          transition: 'all 0.2s',
          opacity: disabled ? 0.4 : 1,
        }}
        onMouseEnter={e => { if (!disabled && !uploading) e.currentTarget.style.borderColor = '#C9A84C44'; e.currentTarget.style.color = '#C9A84C'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a2e'; e.currentTarget.style.color = uploading ? '#C9A84C' : '#555'; }}
      >
        {uploading
          ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          : <Paperclip size={16} />
        }
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="*/*"
        style={{ display: 'none' }}
        onChange={onFileInput}
      />
    </div>
  );
}