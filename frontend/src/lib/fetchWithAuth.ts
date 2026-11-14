import type { AxiosRequestConfig } from "axios";
import api from "@/lib/api";

export async function fetchWithAuth(url: string, config: AxiosRequestConfig = {}) {
  const response = await api.request({ ...config, url });
  return response.data;
}
