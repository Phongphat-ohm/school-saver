"use client";

import Swal from "sweetalert2";

export function showSuccess(message: string) {
  return Swal.fire({ icon: "success", title: "สำเร็จ", text: message, confirmButtonText: "ตกลง" });
}

export function showError(message: string) {
  return Swal.fire({ icon: "error", title: "ไม่สำเร็จ", text: message, confirmButtonText: "ตกลง" });
}

export async function showConfirm(title: string, text: string) {
  const result = await Swal.fire({
    icon: "question",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: "ยืนยัน",
    cancelButtonText: "ยกเลิก",
  });
  return result.isConfirmed;
}

export function showLoading(title = "กำลังดำเนินการ") {
  Swal.fire({ title, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
}

export function closeLoading() {
  Swal.close();
}
