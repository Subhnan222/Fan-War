import { UploadCloud } from "lucide-react";
import { useRef } from "react";

export default function ImageUploadBox({ id, label, imageUrl, onImageChange }) {
  const inputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    onImageChange({ previewUrl, file });
  };

  return (
    <div className="upload-field">
      <span>{label}</span>
      <button
        className={`image-upload-box ${imageUrl ? "has-image" : ""}`}
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={`Upload ${label}`}
      >
        <span className="upload-action">
          <span className="upload-icon">
            <UploadCloud aria-hidden="true" size={30} />
          </span>
          <strong>Upload</strong>
          <em>Optional</em>
        </span>
        <span className="upload-preview" aria-hidden={!imageUrl}>
          {imageUrl && <img src={imageUrl} alt={`${label} preview`} />}
        </span>
      </button>
      <input
        ref={inputRef}
        id={id}
        className="hidden-file-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
}
