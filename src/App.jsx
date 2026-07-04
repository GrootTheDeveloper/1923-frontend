import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createJob,
  deleteCv,
  getCv,
  getCvs,
  getJobs,
  getMatch,
  getMatches,
  runMatching,
  seedDemoData,
  updateCvData,
  updateJob,
  updateMatchStatus,
  uploadCv,
} from "./api/cvmatchService";
import CvUploadPanel from "./components/CvUploadPanel";
import JobInputPanel from "./components/JobInputPanel";
import MatchDetail from "./components/MatchDetail";
import RankingList from "./components/RankingList";
import RequirementEditor from "./components/RequirementEditor";
import { Field, Metric, TextField } from "./components/cvmatchPrimitives";
import { emptyCvForm, emptyJobForm } from "./constants/cvmatch";
import {
  averageScore,
  csvCell,
  formatExtractionMethod,
  fromCvForm,
  normalizeRequirementDraft,
  readError,
  toCvForm,
  toRequirementsDraft,
} from "./utils/cvmatchTransforms";

function App() {
  const [jobs, setJobs] = useState([]);
  const [cvs, setCvs] = useState([]);
  const [checkedCvIds, setCheckedCvIds] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedCvId, setSelectedCvId] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [modalCv, setModalCv] = useState(null);
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [cvForm, setCvForm] = useState(emptyCvForm);
  const [requirementsDraft, setRequirementsDraft] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [scoreFilter, setScoreFilter] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) || null,
    [jobs, selectedJobId],
  );

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const statusOk = statusFilter === "All" || match.pipeline_status === statusFilter;
      const scoreOk = Number(match.final_score || 0) >= Number(scoreFilter || 0);
      return statusOk && scoreOk;
    });
  }, [matches, scoreFilter, statusFilter]);

  const loadMatches = useCallback(async (jobId) => {
    try {
      const data = await getMatches(jobId);
      setMatches(data);
      setSelectedMatch(data[0] || null);
      setNoteDraft(data[0]?.note || "");
    } catch {
      setMatches([]);
      setSelectedMatch(null);
      setNoteDraft("");
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [jobData, cvData] = await Promise.all([getJobs(), getCvs()]);
      setJobs(jobData);
      setCvs(cvData);
      setCheckedCvIds(cvData.map((c) => c.id));
      if (jobData[0]) {
        setSelectedJobId(jobData[0].id);
        setRequirementsDraft(toRequirementsDraft(jobData[0]));
        await loadMatches(jobData[0].id);
      } else {
        setSelectedJobId("");
        setRequirementsDraft([]);
        setMatches([]);
        setSelectedMatch(null);
        setNoteDraft("");
      }
      if (cvData[0]) {
        setSelectedCvId(cvData[0].id);
        setCvForm(toCvForm(cvData[0].extracted_data || {}));
      } else {
        setSelectedCvId("");
        setCvForm(emptyCvForm);
      }
    } catch (requestError) {
      setError(readError(requestError, "Could not load CVMatch data."));
    } finally {
      setLoading(false);
    }
  }, [loadMatches]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadInitialData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadInitialData]);

  const handleSelectJob = (job) => {
    setSelectedJobId(job.id);
    setRequirementsDraft(toRequirementsDraft(job));
    loadMatches(job.id);
  };


  const evaluateJob = async (jobId, message, cvIds) => {
    const targetCvIds = cvIds || (checkedCvIds.length > 0 ? checkedCvIds : undefined);
    const data = await runMatching({
      job_id: jobId,
      cv_ids: targetCvIds
    });
    setMatches(data);
    setSelectedMatch(data[0] || null);
    setNoteDraft(data[0]?.note || "");
    setSuccess(message || `Tự động đối chiếu thành công cho ${data.length} CV.`);
    return data;
  };
  const handleCreateJob = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setWorking("job");
    try {
      const created = await createJob(jobForm);
      setJobs((previous) => [created, ...previous]);
      setSelectedJobId(created.id);
      setRequirementsDraft(toRequirementsDraft(created));
      setMatches([]);
      setSelectedMatch(null);
      setNoteDraft("");
      setJobForm(emptyJobForm);
      if (cvs.length > 0) {
        await evaluateJob(created.id, "JD analyzed. Existing CVs were evaluated automatically.");
      } else {
        setSuccess("JD analyzed by Gemini. Upload a CV to auto evaluate.");
      }
    } catch (requestError) {
      setError(readError(requestError, "Could not create this JD."));
    } finally {
      setWorking("");
    }
  };

  const handleSaveRequirements = async () => {
    if (!selectedJob) return;
    setError("");
    setSuccess("");
    setWorking("job-skills");
    try {
      const updated = await updateJob(selectedJob.id, {
        requirements_config: requirementsDraft.map(normalizeRequirementDraft),
      });
      setJobs((previous) => previous.map((job) => (job.id === updated.id ? updated : job)));
      setRequirementsDraft(toRequirementsDraft(updated));
      await loadMatches(updated.id);
      setSuccess("JD requirement config updated. Existing matches were marked as needing re-run.");
    } catch (requestError) {
      setError(readError(requestError, "Could not update JD requirements."));
    } finally {
      setWorking("");
    }
  };


  const handleRequirementChange = (index, field, value) => {
    setRequirementsDraft((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (field === "weight") return { ...item, weight: Number(value) };
        if (field === "is_knockout") return { ...item, is_knockout: Boolean(value) };
        return { ...item, [field]: value };
      }),
    );
  };

  const handleAddRequirement = () => {
    setRequirementsDraft((previous) => [
      ...previous,
      { name: "", type: "skill", priority: "preferred", weight: 5, is_knockout: false },
    ]);
  };

  const handleRemoveRequirement = (index) => {
    setRequirementsDraft((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };
  const handleUploadCv = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    setError("");
    setSuccess("");
    setWorking("cv-upload");
    try {
      const uploadPromises = files.map((file) => uploadCv(file));
      const uploadedList = await Promise.all(uploadPromises);

      const cvList = await getCvs();
      setCvs(cvList);

      const lastUploaded = uploadedList[uploadedList.length - 1];
      if (lastUploaded) {
        setSelectedCvId(lastUploaded.id);
        setCvForm(toCvForm(lastUploaded.extracted_data || {}));
      }

      const newIds = uploadedList.map((item) => item.id);
      const newCheckedCvIds = [...checkedCvIds, ...newIds];
      setCheckedCvIds(newCheckedCvIds);

      if (selectedJobId) {
        await evaluateJob(
          selectedJobId,
          `Đã trích xuất thành công ${uploadedList.length} CV và đối chiếu với JD đang chọn.`,
          newCheckedCvIds,
        );
      } else {
        setSuccess(`Đã trích xuất thành công ${uploadedList.length} CV. Hãy chọn hoặc tạo JD để đối chiếu.`);
      }
    } catch (requestError) {
      setError(readError(requestError, "Không thể tải lên hoặc trích xuất thông tin một số CV."));
    } finally {
      setWorking("");
    }
  };


  const handleDeleteCv = async (cvId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa CV này không? Hành động này cũng sẽ xóa toàn bộ kết quả đối chiếu liên quan.")) return;
    setError("");
    setSuccess("");
    setWorking("cv-delete");
    try {
      await deleteCv(cvId);
      setCvs((previous) => previous.filter((cv) => cv.id !== cvId));
      setCheckedCvIds((previous) => previous.filter((id) => id !== cvId));
      if (selectedCvId === cvId) {
        setSelectedCvId("");
        setCvForm(emptyCvForm);
      }
      if (selectedJobId) {
        await loadMatches(selectedJobId);
      }
      setSuccess("Đã xóa CV thành công.");
    } catch (requestError) {
      setError(readError(requestError, "Không thể xóa CV này."));
    } finally {
      setWorking("");
    }
  };

  const handleDeleteSelectedCvs = async () => {
    if (checkedCvIds.length === 0) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa ${checkedCvIds.length} CV đã chọn không? Hành động này cũng sẽ xóa toàn bộ kết quả đối chiếu liên quan.`
      )
    )
      return;
    setError("");
    setSuccess("");
    setWorking("cv-delete-multiple");
    try {
      const targetIds = [...checkedCvIds];
      await Promise.all(targetIds.map((id) => deleteCv(id)));
      setCvs((previous) => previous.filter((cv) => !targetIds.includes(cv.id)));
      setCheckedCvIds([]);
      if (targetIds.includes(selectedCvId)) {
        setSelectedCvId("");
        setCvForm(emptyCvForm);
      }
      if (selectedJobId) {
        await loadMatches(selectedJobId);
      }
      setSuccess(`Đã xóa ${targetIds.length} CV đã chọn thành công.`);
    } catch (requestError) {
      setError(readError(requestError, "Không thể xóa một số CV đã chọn."));
    } finally {
      setWorking("");
    }
  };

  const handleOpenCvModal = async (cv) => {
    setModalCv(cv);
    try {
      const fullCv = await getCv(cv.id);
      setCvForm(toCvForm(fullCv.extracted_data || {}));
    } catch (requestError) {
      setError(readError(requestError, "Không thể tải thông tin chi tiết CV."));
    }
  };

  const handleSaveCvModalData = async () => {
    if (!modalCv) return;
    setError("");
    setSuccess("");
    setWorking("cv-save");
    try {
      const updated = await updateCvData(modalCv.id, fromCvForm(cvForm));
      setCvs((previous) => previous.map((cv) => (cv.id === updated.id ? updated : cv)));
      setModalCv(null);
      setSuccess("Đã lưu thông tin CV hiệu chỉnh.");
    } catch (requestError) {
      setError(readError(requestError, "Không thể lưu dữ liệu CV."));
    } finally {
      setWorking("");
    }
  };

  const handleRunMatching = async () => {
    if (!selectedJob) {
      setError("Create or select a JD before matching.");
      return;
    }
    if (cvs.length === 0) {
      setError("Upload at least one CV before matching.");
      return;
    }

    setError("");
    setSuccess("");
    setWorking("matching");
    try {
      await evaluateJob(selectedJob.id, undefined);
    } catch (requestError) {
      setError(readError(requestError, "Could not run matching."));
    } finally {
      setWorking("");
    }
  };

  const handleLoadDemoData = async () => {
    setError("");
    setSuccess("");
    setWorking("demo");
    try {
      const data = await seedDemoData();
      const [jobData, cvData] = await Promise.all([getJobs(), getCvs()]);
      setJobs(jobData);
      setCvs(cvData);
      setCheckedCvIds(cvData.map((c) => c.id));
      setMatches(data.matches || []);
      setSelectedJobId(data.job?.id || jobData[0]?.id || "");
      setRequirementsDraft(data.job ? toRequirementsDraft(data.job) : toRequirementsDraft(jobData[0] || {}));
      const firstCv = cvData.find((cv) => cv.id === data.cvs?.[0]?.id) || cvData[0];
      setSelectedCvId(firstCv?.id || "");
      setCvForm(toCvForm(firstCv?.extracted_data || {}));
      setSelectedMatch(data.matches?.[0] || null);
      setNoteDraft(data.matches?.[0]?.note || "");
      setSuccess("Đã nạp dữ liệu demo thành công: 1 JD, 5 CV và điểm xếp hạng sẵn sàng.");
    } catch (requestError) {
      setError(readError(requestError, "Không thể nạp dữ liệu demo."));
    } finally {
      setWorking("");
    }
  };

  const handleOpenMatch = async (matchId) => {
    try {
      const data = await getMatch(matchId);
      setSelectedMatch(data);
      setNoteDraft(data.note || "");
    } catch (requestError) {
      setError(readError(requestError, "Could not open match detail."));
    }
  };

  const handleUpdateStatus = async (pipelineStatus) => {
    if (!selectedMatch) return;
    setError("");
    setSuccess("");
    setWorking("status");
    try {
      const updated = await updateMatchStatus(selectedMatch.id, {
        pipeline_status: pipelineStatus,
        note: noteDraft,
      });
      setSelectedMatch(updated);
      setNoteDraft(updated.note || "");
      setMatches((previous) => previous.map((match) => (match.id === updated.id ? updated : match)));
      setSuccess("Pipeline status updated.");
    } catch (requestError) {
      setError(readError(requestError, "Could not update status."));
    } finally {
      setWorking("");
    }
  };

  const handleExportCsv = () => {
    if (!filteredMatches.length) return;
    const headers = [
      "Candidate Name",
      "Email",
      "JD Title",
      "Final Score",
      "Recruiter Priority Score",
      "Recruiter Priority",
      "Level",
      "Matched Skills",
      "Missing Skills",
      "Status",
      "Note",
    ];
    const rows = filteredMatches.map((match) => [
      match.candidate_name,
      match.candidate_email,
      match.job_title,
      match.final_score,
      match.recruiter_priority_score ?? match.final_score,
      match.recruiter_priority || "",
      match.match_level,
      (match.matched_skills || []).join("; "),
      (match.missing_skills || []).join("; "),
      match.pipeline_status,
      match.note || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cvmatch-ranking.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main className="app-shell app-center">
        <section className="empty-panel">
          <strong>CVMatch AI</strong>
          <span>Loading workspace...</span>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">CVMatch AI</span>
          <h1>Đánh Giá & Xếp Hạng Ứng Viên Theo JD</h1>
        </div>
        <div className="topbar-actions">
          <button className="btn secondary" type="button" onClick={handleLoadDemoData} disabled={working === "demo"}>
            {working === "demo" ? "Đang tải dữ liệu mẫu..." : "Nạp dữ liệu mẫu Demo"}
          </button>
          <button className="btn secondary" type="button" onClick={loadInitialData}>
            Tải lại trang
          </button>
        </div>
      </header>

      {(error || success) && (
        <section className={`message ${error ? "error" : "success"}`}>
          {error || success}
        </section>
      )}

      <section className="metrics-row">
        <Metric label="JD đã tạo" value={jobs.length} />
        <Metric label="CV đã tải lên" value={cvs.length} />
        <Metric label="Bản đối chiếu" value={matches.length} />
        <Metric label="Điểm trung bình" value={averageScore(matches)} />
      </section>

      <section className="workflow-container">
        {/* TIER 1: INPUT AND EXTRACTION */}
        <section className="workflow-tier">
          <div className="tier-header">
            <span className="tier-step-badge">1</span>
            <h2>Bước 1: Cung cấp Job Description & Hồ sơ ứng viên (CVs)</h2>
          </div>
          <div className="tier-grid">
            <JobInputPanel
              jobs={jobs}
              selectedJobId={selectedJobId}
              jobForm={jobForm}
              setJobForm={setJobForm}
              onCreateJob={handleCreateJob}
              onSelectJob={handleSelectJob}
              working={working}
            />
            <CvUploadPanel
              checkedCvIds={checkedCvIds}
              cvs={cvs}
              onDeleteCv={handleDeleteCv}
              onDeleteSelectedCvs={handleDeleteSelectedCvs}
              onOpenCvModal={handleOpenCvModal}
              onUploadCv={handleUploadCv}
              selectedCvId={selectedCvId}
              setCheckedCvIds={setCheckedCvIds}
              working={working}
            />
          </div>
        </section>
        {/* TIER 2: VERIFICATION AND REVIEW */}
        {selectedJob && (
          <section className="workflow-tier">
            <div className="tier-header">
              <span className="tier-step-badge">2</span>
              <h2>Bước 2: Xác nhận & Hiệu chỉnh Cấu hình yêu cầu JD</h2>
            </div>
            <div className="tier-grid-full">
              <RequirementEditor
                selectedJob={selectedJob}
                requirementsDraft={requirementsDraft}
                onAddRequirement={handleAddRequirement}
                onRemoveRequirement={handleRemoveRequirement}
                onRequirementChange={handleRequirementChange}
                onSaveRequirements={handleSaveRequirements}
                working={working}
              />
            </div>
          </section>
        )}
        {/* TIER 3: EVALUATION & RANKING RESULTS */}
        <section className="workflow-tier">
          <div className="evaluation-trigger-container">
            <button
              className="btn primary evaluate-btn"
              type="button"
              onClick={handleRunMatching}
              disabled={working === "matching" || !selectedJobId || checkedCvIds.length === 0}
            >
              {working === "matching" ? "⚡ Đang tiến hành đối chiếu..." : "⚡ Bắt đầu Đối chiếu & Xếp hạng Candidates"}
            </button>
          </div>

          <div className="tier-header">
            <span className="tier-step-badge">3</span>
            <h2>Bước 3: Kết quả Đối chiếu & Xếp hạng Ứng viên</h2>
          </div>

          <div className="tier-grid ranking-grid-layout">
            <RankingList
              filteredMatches={filteredMatches}
              onExportCsv={handleExportCsv}
              onOpenMatch={handleOpenMatch}
              scoreFilter={scoreFilter}
              selectedMatch={selectedMatch}
              setScoreFilter={setScoreFilter}
              setStatusFilter={setStatusFilter}
              statusFilter={statusFilter}
            />
            <div className="workflow-card">
              <MatchDetail
                match={selectedMatch}
                noteDraft={noteDraft}
                setNoteDraft={setNoteDraft}
                onUpdateStatus={handleUpdateStatus}
                working={working}
              />
            </div>
          </div>
        </section>

      </section>

      {modalCv && (
        <div className="cv-modal-backdrop" onClick={() => setModalCv(null)}>
          <div className="cv-modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="cv-modal-header">
              <h2>Hiệu chỉnh thông tin ứng viên</h2>
              <button className="cv-modal-close" onClick={() => setModalCv(null)}>&times;</button>
            </header>

            <div className="cv-modal-body">
              <div className="source-line">
                <strong>AI Trích xuất ({formatExtractionMethod(modalCv.extraction_method)})</strong>
                {modalCv.extraction_error ? (
                  <span className="error-text">Lỗi: {modalCv.extraction_error}</span>
                ) : (
                  <span>Xem và hiệu chỉnh toàn bộ thông tin chi tiết của ứng viên trước khi đối chiếu.</span>
                )}
              </div>

              <div className="cv-modal-form-grid">
                <div className="form-group-row">
                  <Field label="Tên ứng viên" value={cvForm.candidate_name} onChange={(value) => setCvForm({ ...cvForm, candidate_name: value })} />
                  <Field label="Email" value={cvForm.email} onChange={(value) => setCvForm({ ...cvForm, email: value })} />
                </div>

                <div className="form-group-row">
                  <Field label="Số điện thoại" value={cvForm.phone} onChange={(value) => setCvForm({ ...cvForm, phone: value })} />
                  <Field label="Liên kết (Links)" value={cvForm.links} onChange={(value) => setCvForm({ ...cvForm, links: value })} />
                </div>

                <Field label="Kỹ năng (Skills)" value={cvForm.skills} onChange={(value) => setCvForm({ ...cvForm, skills: value })} />
                <Field label="Ngoại ngữ" value={cvForm.languages} onChange={(value) => setCvForm({ ...cvForm, languages: value })} />

                <TextField label="Tóm tắt hồ sơ (Summary)" value={cvForm.summary} onChange={(value) => setCvForm({ ...cvForm, summary: value })} rows={2} />
                <TextField label="Kinh nghiệm làm việc" value={cvForm.experience} onChange={(value) => setCvForm({ ...cvForm, experience: value })} rows={4} />
                <TextField label="Dự án thực tế" value={cvForm.projects} onChange={(value) => setCvForm({ ...cvForm, projects: value })} rows={4} />
                <TextField label="Học vấn" value={cvForm.education} onChange={(value) => setCvForm({ ...cvForm, education: value })} rows={3} />
                <TextField label="Chứng chỉ" value={cvForm.certifications} onChange={(value) => setCvForm({ ...cvForm, certifications: value })} rows={3} />
              </div>
            </div>

            <footer className="cv-modal-footer">
              <button className="btn secondary" type="button" onClick={() => setModalCv(null)}>
                Đóng
              </button>
              <button className="btn primary" type="button" onClick={handleSaveCvModalData} disabled={working === "cv-save"}>
                {working === "cv-save" ? "Đang lưu..." : "Lưu thông tin hiệu chỉnh"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
