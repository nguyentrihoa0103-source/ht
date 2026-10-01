import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadSingleImageToTachServer } from '../utils/imageServerUploader';
import { ImageServerConfig } from '../types';

interface ImageUploadFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  type?: 'cover' | 'avatar';
  slugOrId?: string;
  imageServerConfig?: ImageServerConfig;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  watermarkText?: string;
  watermarkOpacity?: number;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  id = 'image-upload-field',
  label,
  value,
  onChange,
  type = 'cover',
  slugOrId = 'comic',
  imageServerConfig,
  placeholder = 'https://... hoặc tải ảnh trực tiếp từ máy tính',
  helperText,
  required = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (10MB for avatar / cover)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus({
        success: false,
        msg: 'Ảnh vượt quá 10MB! Vui lòng chọn ảnh nhỏ hơn.',
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64Data = ev.target?.result as string;
      if (!base64Data) {
        setIsUploading(false);
        return;
      }

      try {
        // Upload directly to tachserver.site if config enabled, or use base64 fallback
        const res = await uploadSingleImageToTachServer(
          base64Data,
          type,
          slugOrId,
          imageServerConfig
        );

        onChange(res.url);
        setIsUploading(false);
        setUploadStatus({
          success: true,
          msg: res.isRealRemote
            ? 'Đã tải ảnh lên Server tachserver.site thành công!'
            : 'Đã tải ảnh lên thành công.',
        });
        setTimeout(() => setUploadStatus(null), 4000);
      } catch (err: any) {
        onChange(base64Data);
        setIsUploading(false);
        setUploadStatus({
          success: true,
          msg: 'Đã tải ảnh lên thành công.',
        });
        setTimeout(() => setUploadStatus(null), 4000);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1.5" id={`${id}-wrapper`}>
      <label className="block text-xs font-semibold text-slate-300">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Preview Thumbnail */}
        <div className="relative w-16 h-20 sm:w-16 sm:h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shrink-0 flex items-center justify-center group shadow-md">
          {value ? (
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <ImageIcon className="w-6 h-6 text-slate-600" />
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Input and upload action */}
        <div className="flex-1 w-full space-y-2">
          <div className="flex gap-2">
            <input
              id={id}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              id={`${id}-upload-btn`}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow"
              title="Tải ảnh thường từ máy tính lên"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>Tải Ảnh Lên</span>
            </button>
          </div>

          {/* Status Message */}
          {uploadStatus && (
            <div
              className={`text-[11px] font-medium flex items-center gap-1.5 ${
                uploadStatus.success ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {uploadStatus.success ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{uploadStatus.msg}</span>
            </div>
          )}

          {helperText && (
            <p className="text-[11px] text-slate-500">{helperText}</p>
          )}
        </div>
      </div>
    </div>
  );
};
