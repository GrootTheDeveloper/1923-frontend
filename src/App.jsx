import { useEffect, useState } from "react";
import { extractDocument, getDocument, getDocuments } from "./api/documentService";

const workflowSteps = [
  {
    title: "Upload source",
    detail: "Choose a CV or JD PDF with selectable text.",
  },
  {
    title: "Extract text",
    detail: "FastAPI uses PyMuPDF to read each page.",
  },
  {
    title: "Prepare matching",
    detail: "MongoDB stores text for the next matching module.",
  },
];

const libraryNotes = [
  {
    name: "PyMuPDF",
    role: "MVP choice",
    reason: "Fast, reliable page-level extraction for CV and JD PDFs.",
  },
  {
    name: "pypdf",
    role: "Lightweight option",
    reason: "Simple setup, but less predictable with complex layouts.",
  },
  {
    name: "pdfplumber",
    role: "Layout option",
    reason: "Useful when table or column structure matters.",
  },
  {
    name: "OCR",
    role: "Next phase",
    reason: "Needed for scanned PDFs that do not contain real text.",
  },
];

function formatDate(value) {
  if (!value) return "Just now";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSize(file) {
  if (!file) return "";
  return `${(file.size / 1024 / 1024).toFixed(2)} MB`;
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState("CV");
  const [result, setResult] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activePage, setActivePage] = useState(0);

  const loadDocuments = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch {
      setDocuments([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    let shouldIgnore = false;

    getDocuments()
      .then((data) => {
        if (!shouldIgnore) {
          setDocuments(data);
        }
      })
      .catch(() => {
        if (!shouldIgnore) {
          setDocuments([]);
        }
      })
      .finally(() => {
        if (!shouldIgnore) {
          setIsLoadingHistory(false);
        }
      });

    return () => {
      shouldIgnore = true;
    };
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setError("");
    setResult(null);
    setActivePage(0);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setSelectedFile(null);
      setError("Please choose a PDF file before extracting text.");
      return;
    }

    setSelectedFile(file);
  };

  const handleExtract = async () => {
    if (!selectedFile) {
      setError("Choose a CV or JD PDF first.");
      return;
    }

    setIsExtracting(true);
    setError("");

    try {
      const data = await extractDocument(selectedFile);
      setResult(data);
      setActivePage(0);
      await loadDocuments();
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setError(detail || "Could not extract this PDF. Check backend and MongoDB connection.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleOpenHistory = async (documentId) => {
    if (!documentId) return;

    setError("");
    try {
      const data = await getDocument(documentId);
      setResult(data);
      setActivePage(0);
    } catch {
      setError("Could not load the saved document.");
    }
  };

  const visiblePage = result?.pages?.[activePage];

  return (
    <main className="app-shell">
      <header className="product-header">
        <a className="brand-mark" href="#top" aria-label="CV-JD Match Lab home">
          <span>CM</span>
          <div>
            <strong>CV-JD Match Lab</strong>
            <small>FARM PDF extraction MVP</small>
          </div>
        </a>

        <nav className="header-nav" aria-label="Primary navigation">
          <a href="#workspace">Workspace</a>
          <a href="#history">History</a>
          <a href="#stack">Stack</a>
        </nav>
      </header>

      <section className="hero-panel" id="top">
        <div className="hero-copy">
          <span className="section-kicker">Production-oriented demo</span>
          <h1>Extract CV and JD text before matching candidates to roles.</h1>
          <p>
            A focused FARM workflow for tomorrow's report: React handles the workspace,
            FastAPI processes PDF uploads, PyMuPDF extracts text, and MongoDB stores
            extraction history for the future matching engine.
          </p>
        </div>

        <div className="hero-summary" aria-label="Product status">
          <div>
            <span className="summary-value">4</span>
            <span className="summary-label">FARM modules</span>
          </div>
          <div>
            <span className="summary-value">{documents.length}</span>
            <span className="summary-label">Saved documents</span>
          </div>
          <div>
            <span className="summary-value">{result?.library_used || "PyMuPDF"}</span>
            <span className="summary-label">Extraction library</span>
          </div>
        </div>
      </section>

      <section className="workflow-strip" aria-label="CV-JD extraction workflow">
        {workflowSteps.map((step, index) => (
          <article key={step.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="workspace" id="workspace">
        <aside className="control-panel">
          <div className="panel-heading">
            <span className="section-kicker">Input</span>
            <h2>Document intake</h2>
            <p>Upload a PDF source. This MVP extracts text only; matching comes next.</p>
          </div>

          <div className="type-toggle" aria-label="Document type">
            {["CV", "JD"].map((type) => (
              <button
                key={type}
                className={documentType === type ? "active" : ""}
                onClick={() => setDocumentType(type)}
                type="button"
              >
                {type}
              </button>
            ))}
          </div>

          <label className="upload-dropzone">
            <input type="file" accept="application/pdf" onChange={handleFileChange} />
            <span className="file-badge">{documentType}</span>
            <strong>{selectedFile ? selectedFile.name : `Upload ${documentType} PDF`}</strong>
            <small>
              {selectedFile ? formatSize(selectedFile) : "PDF with selectable text is recommended"}
            </small>
          </label>

          <button
            className="primary-button"
            disabled={isExtracting}
            onClick={handleExtract}
            type="button"
          >
            {isExtracting ? "Extracting text..." : "Extract PDF text"}
          </button>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="readiness-card">
            <strong>Ready for next milestone</strong>
            <p>
              The extracted text can become input for keyword matching, skill scoring,
              and CV-to-JD fit explanation.
            </p>
          </div>
        </aside>

        <section className="viewer-panel">
          <div className="viewer-header">
            <div>
              <span className="section-kicker">Output</span>
              <h2>Extraction result</h2>
            </div>
            {result && (
              <span className={result.saved_to_mongodb ? "status-pill success" : "status-pill warning"}>
                {result.saved_to_mongodb ? "Stored in MongoDB" : "Preview only"}
              </span>
            )}
          </div>

          {result ? (
            <>
              <div className="metrics-grid">
                <article>
                  <span>{result.page_count}</span>
                  <small>Pages</small>
                </article>
                <article>
                  <span>{result.char_count}</span>
                  <small>Characters</small>
                </article>
                <article>
                  <span>{result.library_used}</span>
                  <small>Library</small>
                </article>
              </div>

              {result.storage_error && <div className="alert alert-warning">{result.storage_error}</div>}

              <div className="page-toolbar">
                <span>Page preview</span>
                <div className="page-tabs">
                  {result.pages.map((page, index) => (
                    <button
                      key={page.page_number}
                      className={index === activePage ? "active" : ""}
                      onClick={() => setActivePage(index)}
                      type="button"
                    >
                      {page.page_number}
                    </button>
                  ))}
                </div>
              </div>

              <pre className="text-preview">
                {visiblePage?.text || "No selectable text found on this page. OCR is needed for scanned PDFs."}
              </pre>
            </>
          ) : (
            <div className="empty-viewer">
              <span>PDF</span>
              <strong>No document extracted yet</strong>
              <p>Choose a CV or JD PDF on the left to generate the first text preview.</p>
            </div>
          )}
        </section>
      </section>

      <section className="support-grid">
        <section className="history-panel" id="history">
          <div className="panel-heading horizontal">
            <div>
              <span className="section-kicker">MongoDB history</span>
              <h2>Recent extractions</h2>
            </div>
            {isLoadingHistory && <small>Loading...</small>}
          </div>

          {documents.length > 0 ? (
            <div className="history-list">
              {documents.map((document) => (
                <button key={document.id} onClick={() => handleOpenHistory(document.id)} type="button">
                  <span className="history-icon">PDF</span>
                  <div>
                    <strong>{document.filename}</strong>
                    <small>
                      {document.page_count} pages / {document.char_count} chars /{" "}
                      {formatDate(document.created_at)}
                    </small>
                    <p>{document.text_preview || "No preview available"}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-compact">
              <strong>No saved documents yet</strong>
              <p>When MongoDB is connected, successful uploads will appear here.</p>
            </div>
          )}
        </section>

        <section className="stack-panel" id="stack">
          <div className="panel-heading">
            <span className="section-kicker">PDF library decision</span>
            <h2>Extraction stack</h2>
          </div>

          <div className="library-list">
            {libraryNotes.map((library) => (
              <article key={library.name}>
                <div>
                  <strong>{library.name}</strong>
                  <span>{library.role}</span>
                </div>
                <p>{library.reason}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
