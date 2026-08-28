import { useState, useRef } from 'react';
import { Upload, X, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadToCloudinary } from '../../services/cloudinary';
import toast from 'react-hot-toast';

export default function ImageUpload({
  value,
  onChange,
  folder = 'friday_uploads',
  label = 'Upload Image',
  description = 'PNG, JPG, JPEG up to 5MB',
  aspectRatio = 'video', // 'square', 'video', 'banner'
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, JPEG).');
      return;
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }

    // Local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    // Upload to Cloudinary
    setUploading(true);
    try {
      const uploadedUrl = await uploadToCloudinary(file, folder);
      setPreview(uploadedUrl);
      onChange(uploadedUrl);
      toast.success('Image uploaded successfully!');
    } catch (err) {
      console.error('Image upload failed:', err);
      toast.error('Image upload failed. Please try again.');
      setPreview(value || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative rounded-3xl overflow-hidden border border-border bg-slate-50 group">
          <img
            src={preview}
            alt="Upload preview"
            className="w-full h-48 object-cover"
          />
          {uploading ? (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-xs font-medium">Uploading to cloud...</p>
            </div>
          ) : (
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="rounded-3xl border-2 border-dashed border-border hover:border-black dark:hover:border-white p-8 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50 flex flex-col items-center justify-center space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-muted-foreground">
            {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
