import api from "./api";

export const getTasks = async (params = {}) => {
  const res = await api.get("/tasks", { params });
  return res.data;
};

export const getTaskById = async (id) => {
  const res = await api.get(`/tasks/${id}`);
  return res.data;
};

export const createTask = async (data) => {
  const res = await api.post("/tasks", data);
  return res.data;
};

export const updateTask = async (id, data) => {
  const res = await api.put(`/tasks/${id}`, data);
  return res.data;
};

export const deleteTask = async (id) => {
  const res = await api.delete(`/tasks/${id}`);
  return res.data;
};

export const addTaskAttachment = async (id, data) => {
  const res = await api.post(`/tasks/${id}/attachments`, data);
  return res.data;
};

export const addTaskComment = async (id, data) => {
  const res = await api.post(`/tasks/${id}/comments`, data);
  return res.data;
};

export const replyToTaskComment = async (id, commentId, data) => {
  const res = await api.post(`/tasks/${id}/comments/${commentId}/replies`, data);
  return res.data;
};
