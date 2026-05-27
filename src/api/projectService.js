import axiosClient from "./axiosClient";

export const getProjects = () => axiosClient.get("/projects/");
export const getProject = (id) => axiosClient.get(`/projects/${id}`);
export const createProject = (data) => axiosClient.post("/projects/", data);
export const updateProject = (id, data) => axiosClient.put(`/projects/${id}`, data);
export const deleteProject = (id) => axiosClient.delete(`/projects/${id}`);
