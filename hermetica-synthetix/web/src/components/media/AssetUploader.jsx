import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function AssetUploader({ onClose }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setName(f.name.replace(/\.[^.]+$/, ''));
    if (f.type.startsWith('image/')) {
      setMediaType('image');
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else if (f.type.startsWith('video/')) {
      setMediaType('video');
      setPreview(null);
    } else if (f.type.startsWith('audio/')) {
      setMediaType('audio');
      setPreview(null);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.MediaAsset.create({
      name: name || file.name,
      media_type: mediaType,
      file_url,
      status: 'ready',
    });
    queryClient.invalidateQueries({ queryKey: ['media'] });
    toast.success('Asset uploaded!');
    setUploading(false);
    onClose?.();
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {preview ? (
          <img src={preview} alt="preview" className="mx-auto max-h-40 rounded-lg object-contain mb-3" />
        ) : (
          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        )}
        {file ? (
          <p className="text-sm font-medium">{file.name}</p>
        ) : (
          <>
            <p className="text-sm font-medium">Drop a file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Images, videos, audio</p>
          </>
        )}
      </div>

      {file && (
        <>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Asset name" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={mediaType} onValueChange={setMediaType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="illustration">Illustration</SelectItem>
                <SelectItem value="icon">Icon</SelectItem>
                <SelectItem value="infographic">Infographic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setFile(null); setPreview(null); }}>
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
            <Button className="flex-1 gap-2" onClick={handleUpload} disabled={uploading}>
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload</>}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}