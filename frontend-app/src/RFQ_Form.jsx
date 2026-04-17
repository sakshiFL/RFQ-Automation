import { useState, useRef } from "react";

const RFQ_TYPES = ["Injection Moulding", "Extrusion", "Machining", "Heavy Moulding", "Casting"];
const CATEGORIES = ["Components", "Assembly", "Both Components and Assembly"];

export default function RFQForm() {
  const [form, setForm] = useState({ customerName: "", rfqType: "", category: "" });
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith(".zip")) {
      setErrorMsg("Only .zip files are allowed.");
      setFile(null);
      return;
    }
    setErrorMsg("");
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName || !form.rfqType || !form.category || !file) {
      setErrorMsg("All fields and a ZIP file are required.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const data = new FormData();
      data.append("customerName", form.customerName);
      data.append("rfqType", form.rfqType);
      data.append("category", form.category);
      data.append("file", file);

      const res = await fetch("http://localhost:4000/api/rfq/submit", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Submission failed");
      setResult(json);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  const reset = () => {
    setForm({ customerName: "", rfqType: "", category: "" });
    setFile(null);
    setStatus(null);
    setResult(null);
    setErrorMsg("");
  };

  if (status === "success" && result) {
    return (
      <div className="success-card">
        <div className="success-icon">✓</div>
        <h2>RFQ Submitted Successfully</h2>
        <button className="btn-primary" onClick={reset}>Submit Another RFQ</button>
      </div>
    );
  }

  return (
    <div className="form-wrapper">
      <div className="form-header">
        <span className="badge">RFQ</span>
        <h1>New Request for Quotation</h1>
        <p>Complete the form below to initiate a new RFQ. Your submission will be stored in Google Drive and tracked in Odoo.</p>
      </div>

      <form onSubmit={handleSubmit} className="rfq-form">
        <div className="field">
          <label>Customer Name</label>
          <input
          style={{minHeight:"4vh"}}
            name="customerName"
            value={form.customerName}
            onChange={handleChange}
            placeholder="e.g. Acme Corporation"
            required
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label>RFQ Type</label>
            <select name="rfqType" value={form.rfqType} onChange={handleChange} required>
              <option value="">Select type…</option>
              {RFQ_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Category</label>
            <select name="category" value={form.category} onChange={handleChange} required>
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Upload ZIP File</label>
          <div
            className={`drop-zone ${dragOver ? "drag-active" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".zip"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {file ? (
              <div className="file-info">
                <div>
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" className="remove-file" onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button>
              </div>
            ) : (
              <div className="drop-hint">
                <span className="upload-icon">↑</span>
                <p>Drag & drop your ZIP file here</p>
                <span className="sub">or click to browse</span>
              </div>
            )}
          </div>
        </div>

        {errorMsg && <div className="error-msg">{errorMsg}</div>}

        <button type="submit" className="btn-primary" disabled={status === "loading"}>
          {status === "loading" ? (
            <span className="spinner-row"><span className="spinner" />Submitting…</span>
          ) : "Submit RFQ"}
        </button>
      </form>
    </div>
  );
}

function ResultRow({ label, value, link }) {
  return (
    <div className="result-row">
      <span className="result-label">{label}</span>
      {link ? <a href={link} target="_blank" rel="noreferrer" className="result-link">{value}</a>
             : <span className="result-value">{value}</span>}
    </div>
  );
}