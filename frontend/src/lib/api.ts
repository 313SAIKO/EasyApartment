import axios, { type InternalAxiosRequestConfig } from "axios";

type TokenPair = { access_token: string; refresh_token: string };
type SessionRequest = InternalAxiosRequestConfig & {
  sessionVersion?: number;
  refreshToken?: string | null;
  retried?: boolean;
};

type SignInResult = TokenPair & {
  user: { id: string; email: string; role: string };
};

const baseURL = process.env.NEXT_PUBLIC_API_URL;
const api = axios.create({ baseURL });
const authApi = axios.create({ baseURL });

let sessionVersion = 0;
let refreshInFlight: { token: string; promise: Promise<void> } | undefined;
let refreshedToken: string | undefined;

function saveTokens(tokens: TokenPair) {
  localStorage.setItem("accessToken", tokens.access_token);
  localStorage.setItem("refreshToken", tokens.refresh_token);
}

function clearTokens() {
  sessionVersion += 1;
  refreshedToken = undefined;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

function isTokenPair(data: TokenPair | null | undefined): data is TokenPair {
  return (
    typeof data?.access_token === "string" &&
    data.access_token.length > 0 &&
    typeof data.refresh_token === "string" &&
    data.refresh_token.length > 0
  );
}

function refreshSession(token: string) {
  if (refreshInFlight?.token === token) return refreshInFlight.promise;

  const version = sessionVersion;
  const promise = authApi
    .post<TokenPair>("/auth/refresh", {}, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(({ data }) => {
      if (!isTokenPair(data)) throw new Error("Invalid refresh response");
      if (version !== sessionVersion || localStorage.getItem("refreshToken") !== token) {
        throw new Error("Session changed during refresh");
      }
      saveTokens(data);
      refreshedToken = data.refresh_token;
    })
    .catch((error: unknown) => {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if ((status === 401 || status === 403) && version === sessionVersion && localStorage.getItem("refreshToken") === token) {
        clearTokens();
        if (window.location.pathname !== "/login") window.location.replace("/login");
      }
      throw error;
    })
    .finally(() => {
      if (refreshInFlight?.promise === promise) refreshInFlight = undefined;
    });

  refreshInFlight = { token, promise };
  return promise;
}

api.interceptors.request.use((config: SessionRequest) => {
  if (typeof window !== "undefined") {
    if (config.retried && config.sessionVersion !== sessionVersion) {
      throw new Error("Session changed before retry");
    }
    config.sessionVersion = sessionVersion;
    config.refreshToken = localStorage.getItem("refreshToken");
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
    else config.headers.delete("Authorization");
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (
      typeof window === "undefined" ||
      !axios.isAxiosError(error) ||
      error.response?.status !== 401
    ) {
      throw error;
    }

    const config: SessionRequest | undefined = error.config;
    const token = localStorage.getItem("refreshToken");
    const accessToken = localStorage.getItem("accessToken");
    if (!config || config.retried || config.sessionVersion !== sessionVersion || !token) {
      throw error;
    }

    config.retried = true;
    if (config.refreshToken === token) {
      await refreshSession(token);
    } else if (token !== refreshedToken || !accessToken) {
      throw error;
    }

    if (config.sessionVersion !== sessionVersion) throw error;
    return api.request(config);
  },
);

export async function signIn(email: string, password: string) {
  try {
    const { data } = await authApi.post<SignInResult>("/auth/signin", { email, password });
    if (!isTokenPair(data) || !data.user) return { error: "Login response ไม่ถูกต้อง" };

    sessionVersion += 1;
    refreshedToken = undefined;
    saveTokens(data);
    return { user: data.user };
  } catch (error: unknown) {
    const message = axios.isAxiosError<{ message?: string | string[] }>(error)
      ? error.response?.data?.message
      : undefined;
    return { error: (Array.isArray(message) ? message[0] : message) || "Login failed" };
  }
}

export async function logout() {
  const version = sessionVersion;
  try {
    if (localStorage.getItem("accessToken") || localStorage.getItem("refreshToken")) {
      await api.post("/auth/logout");
    }
  } finally {
    if (version === sessionVersion) clearTokens();
  }
}

export default api;
