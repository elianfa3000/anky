import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:3000",
});

export const getData = () => {
  return axiosInstance.get("/data");
};
export const updateData = (data: []) => {
  return axiosInstance.post("/updateData", data);
};
