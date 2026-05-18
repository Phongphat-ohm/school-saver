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

export async function showTextInputConfirm(input: {
  title: string;
  text: string;
  placeholder?: string;
  confirmButtonText?: string;
}) {
  const result = await Swal.fire<string>({
    icon: "warning",
    title: input.title,
    text: input.text,
    input: "text",
    inputPlaceholder: input.placeholder,
    inputAttributes: {
      autocapitalize: "off",
      autocorrect: "off",
    },
    showCancelButton: true,
    confirmButtonText: input.confirmButtonText ?? "ยืนยัน",
    cancelButtonText: "ยกเลิก",
    inputValidator: (value) => {
      if (!value) return "กรุณากรอกข้อมูลเพื่อยืนยัน";
    },
  });

  return result.isConfirmed ? (result.value ?? "") : null;
}

export function showLoading(title = "กำลังดำเนินการ") {
  Swal.fire({ title, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
}

export function closeLoading() {
  Swal.close();
}
