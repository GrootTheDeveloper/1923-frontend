import axiosClient from "./axiosClient";

export const getJobs = () => axiosClient.get("/jobs").then((response) => response.data);

export const createJob = (payload) =>
  axiosClient.post("/jobs", payload).then((response) => response.data);

export const updateJob = (jobId, payload) =>
  axiosClient.put(`/jobs/${jobId}`, payload).then((response) => response.data);

export const getCvs = () => axiosClient.get("/cvs").then((response) => response.data);

export const getCv = (cvId) => axiosClient.get(`/cvs/${cvId}`).then((response) => response.data);

export const uploadCv = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosClient
    .post("/cvs/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
    .then((response) => response.data);
};

export const updateCvData = (cvId, payload) =>
  axiosClient.put(`/cvs/${cvId}/extracted-data`, payload).then((response) => response.data);

export const deleteCv = (cvId) =>
  axiosClient.delete(`/cvs/${cvId}`).then((response) => response.data);

export const runMatching = (payload) =>
  axiosClient.post("/matches/run", payload).then((response) => response.data);

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
