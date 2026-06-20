import { useState } from "react";
import { uploadPDFs } from "../api/stemmateApi";

export default function UploadPdf() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!files.length) return;

    try {
      setLoading(true);

      await uploadPDFs(files);

      alert("PDFs uploaded successfully");
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple
        accept=".pdf"
        onChange={(e) =>
          setFiles(Array.from(e.target.files || []))
        }
      />

      <button onClick={handleUpload}>
        {loading ? "Uploading..." : "Upload PDFs"}
      </button>
    </div>
  );
}