import { useRef, useState } from "react";
import { uploadPDFs } from "../api/stemmateApi";

interface Props {
  onClose: () => void;
}

export default function UploadModal({ onClose }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setMessage("");
    try {
      await uploadPDFs(files);
      setMessage("✓ PDFs uploaded successfully! StemMate can now use them.");
      setTimeout(onClose, 1500);
    } catch {
      setMessage("Upload failed. Make sure the server is running.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-overlay" onClick={onClose}>
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Upload study materials</h3>
        <p>
          Add textbooks, notes, or past papers (PDF) so StemMate can tutor you
          from your own materials.
        </p>

        <div
          className="upload-dropzone"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            multiple
            hidden
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          {files.length > 0 ? (
            <p>{files.length} file(s) selected</p>
          ) : (
            <p>Click to select PDF files</p>
          )}
        </div>

        {message && (
          <p style={{ marginTop: 12, fontSize: 14, color: message.startsWith("✓") ? "#009543" : "#b91c1c" }}>
            {message}
          </p>
        )}

        <div className="upload-modal-actions">
          <button type="button" className="header-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="header-btn primary"
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
