export interface ImageUploadProps {
  id?: string;
  label?: string;
  description?: string;
  accept?: string;
  disabled?: boolean;
  file?: File | null;
  onFileChange: (file: File | null) => void;
  previewUrl?: string | null;
  previewAlt?: string;
  isUploading?: boolean;
  progress?: number;
  onUpload?: () => void;
  uploadButtonText?: string;
  uploadButtonDisabled?: boolean;
  error?: string | null;
  onImageError?: () => void;
  className?: string;
  children?: React.ReactNode;
}
