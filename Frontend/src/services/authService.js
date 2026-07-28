import api from "./api";

/**
 * Auth services — these don't need the token interceptor
 * for login/register, but we use the same instance for consistency.
 */

export const register = async (data) => {
  const res = await api.post("/auth/register", data);
  return res.data;
};

export const login = async (data) => {
  const res = await api.post("/auth/login", data);
  // Store token so the interceptor picks it up on subsequent requests
  if (res.data.token) {
    sessionStorage.setItem("token", res.data.token);
  }
  return res.data;
};

export const logout = () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
};

export const forgotPassword = async (email) => {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data;
};

export const resetPassword = async (token, password) => {
  const res = await api.post("/auth/reset-password", { token, password });
  return res.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const res = await api.post("/auth/change-password", { currentPassword, newPassword });
  return res.data;
};

export const updateProfile = async (data) => {
  const res = await api.put("/auth/update-profile", data);
  return res.data;
};

export const resendVerificationEmail = async (email) => {
  const res = await api.post("/auth/resend-verification", { email });
  return res.data;
};

export const socialLogin = async (socialData) => {
  const res = await api.post("/auth/social-login", socialData);
  if (res.data.token) {
    sessionStorage.setItem("token", res.data.token);
  }
  return res.data;
};

export const googleOAuthLogin = async (code, redirectUri) => {
  const res = await api.post("/auth/google-login", { code, redirectUri });
  if (res.data.token) {
    sessionStorage.setItem("token", res.data.token);
  }
  return res.data;
};

export const getCurrentUser = async () => {
  const res = await api.get("/users/me");
  return res.data;
};

export const deleteAccount = async () => {
  const res = await api.delete("/auth/delete-account");
  return res.data;
};