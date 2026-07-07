import axiosClient from "./axiosClient";

export const getJobs = () => axiosClient.get("/jobs").then((response) => response.data);

export const createJob = (payload) =>
  axiosClient.post("/jobs", payload).then((response) => response.data);

export const updateJob = (jobId, payload) =>
  axiosClient.put(`/jobs/${jobId}`, payload).then((response) => response.data);

export const getCvs = () => axiosClient.get("/cvs").then((response) => response.data);

export const getCv = (cvId) => axiosClient.get(`/cvs/${cvId}`).then((response) => response.data);

export const uploadCv = (file, turnstileToken = "") => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosClient
    .post("/cvs/upload", formData, { headers: { "Content-Type": "multipart/form-data", ...(turnstileToken ? { "X-Turnstile-Token": turnstileToken } : {}) } })
    .then((response) => response.data);
};

export const extractDocument = (file, turnstileToken = "") => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosClient
    .post("/documents/extract", formData, { headers: { "Content-Type": "multipart/form-data", ...(turnstileToken ? { "X-Turnstile-Token": turnstileToken } : {}) } })
    .then((response) => response.data);
};

export const updateCvData = (cvId, payload) =>
  axiosClient.put(`/cvs/${cvId}/extracted-data`, payload).then((response) => response.data);

export const deleteCv = (cvId) =>
  axiosClient.delete(`/cvs/${cvId}`).then((response) => response.data);

export const runMatching = (payload) =>
  axiosClient.post("/matches/run", payload).then((response) => response.data);

export const startMatchJob = (jobId, payload = {}) =>
  axiosClient.post(`/jobs/${jobId}/match`, payload).then((response) => response.data);

export const getMatchJob = (matchJobId) =>
  axiosClient.get(`/match-jobs/${matchJobId}`).then((response) => response.data);

export const listMatchJobs = () =>
  axiosClient.get("/match-jobs").then((response) => response.data);

export const getJobMatches = (jobId) =>
  axiosClient.get(`/jobs/${jobId}/matches`).then((response) => response.data);

export const submitMatchFeedback = (matchId, payload) =>
  axiosClient.post(`/matches/${matchId}/feedback`, payload).then((response) => response.data);

export const getRecruitmentAnalytics = () =>
  Promise.all([
    axiosClient.get("/analytics/model-quality"),
    axiosClient.get("/analytics/fairness"),
    axiosClient.get("/analytics/pipeline-health"),
    axiosClient.get("/analytics/skill-gaps"),
    axiosClient.get("/analytics/ranking-eval"),
  ]).then(([quality, fairness, pipeline, skills, rankingEval]) => ({
    quality: quality.data, fairness: fairness.data, pipeline: pipeline.data,
    skills: skills.data, rankingEval: rankingEval.data,
  }));

export const trainRanker = () =>
  axiosClient.post("/analytics/train-ranker").then((response) => response.data);

export const getMatches = (jobId) => {

  const query = jobId ? `?job_id=${jobId}` : "";
  return axiosClient.get(`/matches${query}`).then((response) => response.data);
};

export const getMatch = (matchId) =>
  axiosClient.get(`/matches/${matchId}`).then((response) => response.data);

export const updateMatchStatus = (matchId, payload) =>
  axiosClient.put(`/matches/${matchId}/status`, payload).then((response) => response.data);

export const getSkillAliases = () =>
  axiosClient.get("/skills/aliases").then((response) => response.data);

export const seedDemoData = () =>
  axiosClient.post("/demo/seed").then((response) => response.data);
