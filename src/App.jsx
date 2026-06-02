import { useEffect, useState } from "react";
import { extractDocument, getDocument, getDocuments } from "./api/documentService";

const workflowSteps = [
  {
    title: "Choose a document",
    detail: "Upload a CV or job description in PDF format.",
  },
  {
    title: "Review extracted text",
    detail: "Check the full document or inspect each page individually.",
  },
  {
    title: "Keep your workspace",
    detail: "Recent documents stay available for quick review.",
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
  const [activePage, setActivePage] = useState("all");

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
    setActivePage("all");

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
      setActivePage("all");
      await loadDocuments();
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setError(detail || "Could not extract this PDF. Please check the service connection and try again.");
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
      setActivePage("all");
    } catch {
      setError("Could not load the saved document.");
    }
  };

  const visibleText =
    activePage === "all"
      ? result?.full_text
      : result?.pages?.[activePage]?.text;

  return (
    <main className="app-shell">
      <header className="product-header">
        <a className="brand-mark" href="#top" aria-label="CV-JD Match Lab home">
          <span>CM</span>
          <div>
            <strong>CV-JD Match Lab</strong>
            <small>CV and job description reader</small>
          </div>
        </a>

        <nav className="header-nav" aria-label="Primary navigation">
          <a href="#workspace">Workspace</a>
          <a href="#history">History</a>
        </nav>
      </header>

      <section className="hero-panel" id="top">
        <div className="hero-copy">
          <span className="section-kicker">Document workspace</span>
          <h1>Read CV and job description PDFs in one clean workspace.</h1>
          <p>
            Upload a CV or job description, extract readable text, and review the
            content before using it for candidate-to-role matching.
          </p>
        </div>

        <div className="hero-summary" aria-label="Product status">
          <div>
            <span className="summary-value">{documents.length}</span>
            <span className="summary-label">Recent documents</span>
          </div>
          <div>
            <span className="summary-value">{result?.page_count || "-"}</span>
            <span className="summary-label">Pages in view</span>
          </div>
          <div>
            <span className="summary-value">{result?.char_count || "-"}</span>
            <span className="summary-label">Characters extracted</span>
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
            <p>Upload a CV or job description PDF to make its content easy to review.</p>
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
        </aside>

        <section className="viewer-panel">
          <div className="viewer-header">
            <div>
              <span className="section-kicker">Output</span>
              <h2>Extraction result</h2>
            </div>
            {result && (
              <span className={result.saved_to_mongodb ? "status-pill success" : "status-pill warning"}>
                {result.saved_to_mongodb ? "Saved" : "Preview only"}
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
                  <span>{result.saved_to_mongodb ? "Saved" : "Local"}</span>
                  <small>Status</small>
                </article>
              </div>

              {result.storage_error && <div className="alert alert-warning">{result.storage_error}</div>}

              <div className="page-toolbar">
                <span>Page preview</span>
                <div className="page-tabs">
                  <button
                    className={activePage === "all" ? "active" : ""}
                    onClick={() => setActivePage("all")}
                    type="button"
                  >
                    All text
                  </button>
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
                {visibleText || "No selectable text found. Scanned PDFs may need OCR."}
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
              <span className="section-kicker">History</span>
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
              <p>Successful uploads will appear here once they are saved.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default App;
