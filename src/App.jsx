import { useEffect, useState } from "react";
import { extractDocument, getDocument, getDocuments } from "./api/documentService";

const processSteps = [
  "Uploading CV",
  "Reading document text",
  "Preparing review",
];

const checklistCards = [
  {
    title: "Content",
    items: ["Readable CV text", "Clear sections", "Keyword-ready content"],
  },
  {
    title: "Format",
    items: ["PDF file support", "Page-by-page review", "Complete text preview"],
  },
  {
    title: "CV sections",
    items: ["Contact information", "Experience details", "Skills and education"],
  },
  {
    title: "Review",
    items: ["Extracted text history", "All-text mode", "Page inspection"],
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
  const [screen, setScreen] = useState("landing");
  const [selectedFile, setSelectedFile] = useState(null);
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

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setSelectedFile(null);
      setError("Please choose a PDF CV file.");
      return;
    }

    setSelectedFile(file);
    await handleExtract(file);
  };

  const handleExtract = async (file) => {
    setError("");
    setIsExtracting(true);
    setResult(null);
    setActivePage("all");
    setScreen("processing");

    try {
      const data = await extractDocument(file);
      setResult(data);
      setScreen("results");
      await loadDocuments();
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setError(detail || "Could not read this CV. Please try another PDF file.");
      setScreen("landing");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleOpenHistory = async (documentId) => {
    if (!documentId) return;

    setError("");
    setScreen("processing");
    try {
      const data = await getDocument(documentId);
      setResult(data);
      setActivePage("all");
      setScreen("results");
    } catch {
      setError("Could not load the saved CV.");
      setScreen("landing");
    }
  };

  const visibleText =
    activePage === "all"
      ? result?.full_text
      : result?.pages?.[activePage]?.text;

  const uploadControl = (
    <label className="upload-box">
      <input type="file" accept="application/pdf" onChange={handleFileChange} disabled={isExtracting} />
      <span className="upload-title">{selectedFile ? selectedFile.name : "Upload Your CV"}</span>
      <small>{selectedFile ? formatSize(selectedFile) : "PDF only. Selectable text works best."}</small>
    </label>
  );

  if (screen === "processing") {
    return (
      <main className="app-shell processing-shell">
        <section className="processing-card">
          <div className="processing-visual">
            <div className="scan-frame">
              <div className="scan-line" />
              <div className="document-skeleton">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>

          <div className="processing-copy">
            <span className="section-kicker">CV Checker</span>
            <h1>Reading your CV</h1>
            <p>We are extracting text from your PDF and preparing it for review.</p>

            <div className="progress-track">
              <span />
            </div>

            <div className="process-list">
              {processSteps.map((step, index) => (
                <article key={step}>
                  <span>{index + 1}</span>
                  <strong>{step}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (screen === "results" && result) {
    return (
      <main className="app-shell result-shell">
        <header className="simple-header">
          <button type="button" onClick={() => setScreen("landing")}>
            Back to checker
          </button>
          <strong>CV Checker Result</strong>
        </header>

        <section className="result-layout">
          <aside className="score-panel">
            <span className="section-kicker">Score</span>
            <h1>Pending</h1>
            <p>
              The current version has extracted your CV text. A match score will appear
              after job description comparison is connected.
            </p>

            <div className="score-meter" aria-label="Score pending">
              <div />
              <span>--</span>
            </div>

            <div className="result-stats">
              <article>
                <strong>{result.page_count}</strong>
                <span>Pages</span>
              </article>
              <article>
                <strong>{result.char_count}</strong>
                <span>Characters</span>
              </article>
              <article>
                <strong>{result.saved_to_mongodb ? "Saved" : "Preview"}</strong>
                <span>Status</span>
              </article>
            </div>
          </aside>

          <section className="cv-text-panel">
            <div className="result-heading">
              <div>
                <span className="section-kicker">Extracted CV</span>
                <h2>{result.filename}</h2>
              </div>
              <label className="secondary-upload">
                Upload another CV
                <input type="file" accept="application/pdf" onChange={handleFileChange} disabled={isExtracting} />
              </label>
            </div>

            {result.storage_error && <div className="alert alert-warning">{result.storage_error}</div>}

            <div className="page-toolbar">
              <span>View mode</span>
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
                    Page {page.page_number}
                  </button>
                ))}
              </div>
            </div>

            <pre className="text-preview">
              {visibleText || "No selectable text found. Scanned PDFs may need OCR."}
            </pre>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell landing-shell">
      <header className="landing-header">
        <a href="#top" className="brand">
          <span>CV</span>
          <strong>CV Checker</strong>
        </a>
        <nav>
          <a href="#how">How it works</a>
          <a href="#checks">Checks</a>
          <a href="#history">History</a>
        </nav>
      </header>

      <section className="hero-section" id="top">
        <div className="hero-copy">
          <div className="breadcrumb">Home / CV Checker</div>
          <h1>The CV checker that prepares your resume for review.</h1>
          <p>
            Upload your CV PDF, extract readable content, and review the text before
            comparing it with a job description.
          </p>

          <div className="hero-upload">
            <p>Drop your CV here or choose a file.</p>
            {uploadControl}
            <strong className="privacy-note">Privacy focused. Your CV is only used for this review.</strong>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
        </div>

      </section>

      <section className="dual-system-section" id="how">
        <div className="grader-illustration" aria-hidden="true">
          <div className="grader-machine">
            <strong>RESUME GRADER</strong>
            <div className="gauge" />
            <div className="paper-feed" />
          </div>
          <div className="resume-sheet">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="dual-copy">
          <h2>Review your CV through a structured reading flow.</h2>
          <p>
            A good checker starts by understanding the document itself: the content,
            sections, and text that can later be compared against a job description.
          </p>

          <div className="numbered-point">
            <span>1</span>
            <div>
              <h3>Content interpretation</h3>
              <p>We extract the CV text so it can be reviewed clearly and consistently.</p>
            </div>
          </div>

          <div className="numbered-point">
            <span>2</span>
            <div>
              <h3>Document readiness</h3>
              <p>The extracted result helps identify whether the CV is readable enough for matching.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="checklist-section" id="checks">
        <div className="checklist-heading">
          <h2>Beyond typographical errors</h2>
          <p>Start with a readable CV foundation before moving into role-fit scoring.</p>
        </div>

        <div className="checklist-grid">
          {checklistCards.map((card) => (
            <article key={card.title}>
              <span className="check-icon">✓</span>
              <h3>{card.title}</h3>
              {card.items.map((item) => (
                <p key={item}>
                  <span>✓</span>
                  {item}
                </p>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section className="history-section" id="history">
        <div>
          <span className="section-kicker">Recent documents</span>
          <h2>Open a saved extraction</h2>
        </div>
        {isLoadingHistory ? (
          <p>Loading recent CVs...</p>
        ) : documents.length > 0 ? (
          <div className="history-list">
            {documents.map((document) => (
              <button key={document.id} onClick={() => handleOpenHistory(document.id)} type="button">
                <strong>{document.filename}</strong>
                <span>
                  {document.page_count} pages / {document.char_count} chars /{" "}
                  {formatDate(document.created_at)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p>No saved CV extractions yet.</p>
        )}
      </section>
    </main>
  );
}

export default App;
