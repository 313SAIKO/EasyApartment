import api from "./api";

export async function getProfile() {
  const token = localStorage.getItem("accessToken");

  try {
    const res = await api.get("/auth/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data;
  } catch {
    return null;
  }
}



export async function changePassword(
  oldPassword: string,
  newPassword: string,
  confirmNewpassword:string,
) {
  try {
    const res = await api.patch("/users/me/password", {
      oldPassword,
      newPassword,
      confirmNewpassword,
    });
    return res.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "เปลี่ยนรหัสผ่านไม่สำเร็จ";

    throw new Error(message); 
  }
}
