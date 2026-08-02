import api from "./api";

// No need to manually attach auth headers anymore —
// api.js interceptor handles it automatically.

export const getProjects = async () => {
  const res = await api.get("/projects");
  return res.data;
};

export const createProject = async (data) => {
  const res = await api.post("/projects", data);
  return res.data;
};

export const updateProject = async (id, data) => {
  const res = await api.put(`/projects/${id}`, data);
  return res.data;
};

export const deleteProject = async (id) => {
  const res = await api.delete(`/projects/${id}`);
  return res.data;
};

export const addMemberToProject = async (id, memberData) => {
  const res = await api.post(`/projects/${id}/members`, memberData);
  return res.data;
};

export const assignMemberRole = async (id, userId, role) => {
  const res = await api.post(`/projects/${id}/members/role`, { userId, role });
  return res.data;
};

export const leaveProject = async (id) => {
  const res = await api.post(`/projects/${id}/leave`);
  return res.data;
};

export const removeMemberFromProject = async (id, userId) => {
  const res = await api.delete(`/projects/${id}/members/${userId}`);
  return res.data;
};

export const transferProjectOwnership = async (id, userId) => {
  const res = await api.post(`/projects/${id}/transfer-ownership`, { userId });
  return res.data;
};

export const getProjectActivityLogs = async (id) => {
  const res = await api.get(`/projects/${id}/activity`);
  return res.data;
};

export const getProjectById = async (id) => {
  const res = await api.get(`/projects/${id}`);
  return res.data;
};
