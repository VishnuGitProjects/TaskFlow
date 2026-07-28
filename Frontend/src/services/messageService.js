import api from "./api";

export const getProjectMessages = async (projectId) => {
  const res = await api.get(`/messages/${projectId}`);
  return res.data;
};

export const sendProjectMessage = async (projectId, messageText) => {
  const res = await api.post(`/messages/${projectId}`, { message: messageText });
  return res.data;
};

export const getUnreadMessagesCount = async () => {
  const res = await api.get("/messages/unread/count");
  return res.data;
};
