import api from "./api";

export const exportReportPDF = async (params) => {
  const res = await api.get("/reports/export", {
    params,
    responseType: "blob",
  });
  return res.data;
};
