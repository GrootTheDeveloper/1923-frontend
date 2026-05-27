import axiosClient from "./axiosClient";

export const getTasks = (projectId) =>
  axiosClient.get("/tasks/", { params: { project_id: projectId } });
export const getTask = (id) => axiosClient.get(`/tasks/${id}`);
export const createTask = (data) => axiosClient.post("/tasks/", data);
export const updateTask = (id, data) => axiosClient.put(`/tasks/${id}`, data);
export const deleteTask = (id) => axiosClient.delete(`/tasks/${id}`);
