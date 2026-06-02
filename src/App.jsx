import { useEffect, useState } from "react";
import { extractDocument, getDocument, getDocuments } from "./api/documentService";

const farmSteps = [
  {
    label: "React",
    detail: "Upload CV/JD PDF va hien thi text preview cho nguoi dung.",
  },
  {
    label: "FastAPI",
    detail: "Nhan file, validate PDF va goi service trich xuat text.",
  },
  {
    label: "PyMuPDF",
    detail: "Doc text tung trang de lam du lieu dau vao cho matching sau nay.",
  },
  {
    label: "MongoDB",
    detail: "Luu metadata, pages va full text de xem lai lich su xu ly.",
  },
];

const libraryNotes = [
  {
    name: "PyMuPDF",
    role: "Dang dung cho MVP",
    reason: "Nhanh, doc theo trang tot, phu hop demo doc text CV/JD.",
  },
  {
    name: "pypdf",
    role: "Phuong an nhe",
    reason: "De cai dat, hop PDF don gian nhung layout phuc tap yeu hon.",
  },
  {
    name: "pdfplumber",
    role: "Phuong an layout",
    reason: "Tot khi can bang bieu hoac text can giu cau truc hon.",
  },
  {
    name: "OCR",
    role: "Huong phat trien",
    reason: "Dung cho CV/JD dang scan anh, khi PDF khong co text that.",
  },
];

function formatDate(value) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
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
      setError("Hay chon file PDF de doc text CV/JD.");
      return;
    }

    setSelectedFile(file);
  };

  const handleExtract = async () => {
    if (!selectedFile) {
      setError("Chon mot file PDF truoc khi doc text.");
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
      setError(detail || "Khong doc duoc file PDF. Kiem tra backend va MongoDB roi thu lai.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleOpenHistory = async (documentId) => {
    setError("");
    try {
      const data = await getDocument(documentId);
      setResult(data);
      setActivePage(0);
    } catch {
      setError("Khong tai duoc document da luu.");
    }
  };

  const visiblePage = result?.pages?.[activePage];

  return (
    <main className="app-shell">
      <section className="hero-section">
        <nav className="top-bar">
          <div>
            <span className="eyebrow">FARM Stack Demo</span>
            <strong>CV-JD Match Lab</strong>
          </div>
          <a href="#upload" className="nav-pill">
            Upload PDF
          </a>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <span className="status-chip">MVP: PDF text extraction first</span>
            <h1>Doc CV va JD tu PDF, san sang cho buoc matching.</h1>
            <p>
              Giao dien nay bám sát hướng đề tài: người dùng upload CV hoặc JD dạng PDF,
              FastAPI trích xuất text bằng PyMuPDF, MongoDB lưu kết quả để sau này chấm độ
              phù hợp giữa ứng viên và mô tả công việc.
            </p>
            <div className="hero-actions">
              <a href="#upload" className="primary-action">
                Thu doc PDF
              </a>
              <a href="#architecture" className="secondary-action">
                Xem FARM flow
              </a>
            </div>
          </div>

          <div className="signal-card">
            <div className="signal-header">
              <span>Current pipeline</span>
              <strong>Ready</strong>
            </div>
            <div className="pipeline">
              {farmSteps.map((step) => (
                <article key={step.label}>
                  <span>{step.label}</span>
                  <p>{step.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="workspace-grid" id="upload">
        <div className="upload-card">
          <span className="eyebrow">Step 01</span>
          <h2>Upload CV/JD PDF</h2>
          <p>
            MVP hien tai chi tap trung vao doc text. Phan match CV voi JD se dung output nay
            lam input o buoc tiep theo.
          </p>

          <label className="dropzone">
            <input type="file" accept="application/pdf" onChange={handleFileChange} />
            <span className="dropzone-icon">PDF</span>
            <strong>{selectedFile ? selectedFile.name : "Chon file PDF"}</strong>
            <small>
              {selectedFile
                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                : "Ho tro CV hoac JD dang PDF co text that"}
            </small>
          </label>

          <button className="primary-action full-width" onClick={handleExtract} disabled={isExtracting}>
            {isExtracting ? "Dang doc text..." : "Doc text tu PDF"}
          </button>

          {error && <div className="error-box">{error}</div>}
        </div>

        <div className="result-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Step 02</span>
              <h2>Text extracted</h2>
            </div>
            {result && (
              <span className="saved-chip">
                {result.saved_to_mongodb ? "Saved to MongoDB" : "MongoDB not connected"}
              </span>
            )}
          </div>

          {result ? (
            <>
              <div className="metric-row">
                <div>
                  <span>{result.page_count}</span>
                  <small>Pages</small>
                </div>
                <div>
                  <span>{result.char_count}</span>
                  <small>Characters</small>
                </div>
                <div>
                  <span>{result.library_used}</span>
                  <small>Library</small>
                </div>
              </div>

              {result.storage_error && <div className="warning-box">{result.storage_error}</div>}

              <div className="page-tabs">
                {result.pages.map((page, index) => (
                  <button
                    key={page.page_number}
                    className={index === activePage ? "active" : ""}
                    onClick={() => setActivePage(index)}
                  >
                    Page {page.page_number}
                  </button>
                ))}
              </div>

              <pre className="text-preview">
                {visiblePage?.text || "Trang nay khong co text. Neu la PDF scan, can them OCR."}
              </pre>
            </>
          ) : (
            <div className="empty-state">
              <strong>Chua co text de hien thi</strong>
              <p>Upload mot file PDF de xem text theo tung trang.</p>
            </div>
          )}
        </div>
      </section>

      <section className="info-grid" id="architecture">
        <div className="history-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MongoDB</span>
              <h2>Lich su file da doc</h2>
            </div>
            {isLoadingHistory && <small>Dang tai...</small>}
          </div>

          {documents.length > 0 ? (
            <div className="history-list">
              {documents.map((document) => (
                <button key={document.id} onClick={() => handleOpenHistory(document.id)}>
                  <strong>{document.filename}</strong>
                  <span>
                    {document.page_count} pages · {document.char_count} chars ·{" "}
                    {formatDate(document.created_at)}
                  </span>
                  <small>{document.text_preview || "No preview"}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">
              <strong>Chua co lich su</strong>
              <p>Neu MongoDB dang chay, file upload thanh cong se xuat hien tai day.</p>
            </div>
          )}
        </div>

        <div className="library-card">
          <span className="eyebrow">PDF libraries</span>
          <h2>Bo thu vien doc text</h2>
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
        </div>
      </section>
    </main>
  );
}

export default App;
