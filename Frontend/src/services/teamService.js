import api from "./api";

export const getTeams = async () => {
  const res = await api.get("/teams");
  return res.data;
};

export const createTeam = async (data) => {
  const res = await api.post("/teams", data);
  return res.data;
};

export const updateTeam = async (id, data) => {
  const res = await api.put(`/teams/${id}`, data);
  return res.data;
};

export const deleteTeam = async (id) => {
  const res = await api.delete(`/teams/${id}`);
  return res.data;
};
