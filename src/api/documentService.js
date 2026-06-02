import axiosClient from "./axiosClient";

export const extractDocument = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosClient.post("/documents/extract", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const getDocuments = async () => {
  const response = await axiosClient.get("/documents");
  return response.data;
};

export const getDocument = async (documentId) => {
  const response = await axiosClient.get(`/documents/${documentId}`);
  return response.data;
};
