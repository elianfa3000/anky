import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://anky-backend-production.up.railway.app",
});

export const getData = () => {
  return axiosInstance.get("/data");
};
export const updateData = (data: []) => {
  return axiosInstance.post("/updateData", data);
};
