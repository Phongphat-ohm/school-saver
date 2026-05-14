"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, LinkIcon, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { fetchGoogleSheetRowsAction, importMembersAction } from "@/features/members/actions";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

type RawRow = Record<string, string>;

const memberFields = [
  { value: "memberCode", label: "รหัสสมาชิก" },
  { value: "studentNo", label: "เลขที่" },
  { value: "fullName", label: "ชื่อ-สกุล" },
  { value: "classroom", label: "ห้อง" },
  { value: "phone", label: "เบอร์โทร" },
] as const;

type Mapping = Record<(typeof memberFields)[number]["value"], string>;

function readCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value).replace(/^\uFEFF/, "").trim();
  if (/^#{2,}$/.test(text)) return "";
  return text.startsWith("'") ? text.slice(1).trim() : text;
}

function guessMapping(headers: string[]): Mapping {
  return {
    memberCode: headers.find((header) => /code|รหัส/i.test(header)) ?? "",
    studentNo: headers.find((header) => /no|เลข/i.test(header)) ?? "",
    fullName: headers.find((header) => /name|ชื่อ/i.test(header)) ?? "",
    classroom: headers.find((header) => /class|ห้อง/i.test(header)) ?? "",
    phone: headers.find((header) => /phone|tel|เบอร์/i.test(header)) ?? "",
  };
}

export function MemberImportModal() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [mapping, setMapping] = useState<Mapping>({
    memberCode: "",
    studentNo: "",
    fullName: "",
    classroom: "",
    phone: "",
  });

  const mappedRows = useMemo(
    () =>
      rows.map((row) => ({
        memberCode: readCell(row[mapping.memberCode]),
        studentNo: mapping.studentNo ? readCell(row[mapping.studentNo]) : "",
        fullName: readCell(row[mapping.fullName]),
        classroom: mapping.classroom ? readCell(row[mapping.classroom]) : "",
        phone: mapping.phone ? readCell(row[mapping.phone]) : "",
      })),
    [mapping, rows],
  );

  function applyRows(parsedRows: RawRow[], nextHeaders: string[]) {
    setHeaders(nextHeaders);
    setRows(parsedRows);
    setMapping(guessMapping(nextHeaders));
  }

  async function readFile(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", raw: false, cellText: true, cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    const parsedRows = json.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, readCell(value)])));
    const nextHeaders = parsedRows[0] ? Object.keys(parsedRows[0]) : [];
    applyRows(parsedRows, nextHeaders);
  }

  function fetchGoogleSheet() {
    startTransition(async () => {
      showLoading("กำลังดึงข้อมูลจาก Google Sheet");
      const result = await fetchGoogleSheetRowsAction({ url: googleSheetUrl });
      closeLoading();
      if (result.success) {
        applyRows(result.data.rows as RawRow[], result.data.headers);
        await showSuccess(result.message ?? "ดึงข้อมูลสำเร็จ");
      } else {
        await showError(result.message);
      }
    });
  }

  function submitImport() {
    if (!mapping.memberCode || !mapping.fullName) {
      showError("กรุณาเลือกคอลัมน์รหัสสมาชิกและชื่อ-สกุล");
      return;
    }
    startTransition(async () => {
      showLoading("กำลัง import สมาชิก");
      const result = await importMembersAction({ rows: mappedRows });
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "import สำเร็จ");
        setOpen(false);
        setRows([]);
        setHeaders([]);
        router.refresh();
      } else {
        await showError(result.message);
      }
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" className="gap-2" onClick={() => setOpen(true)}>
        <FileSpreadsheet size={18} />Import Excel/CSV/Sheet
      </Button>

      <Modal title="Import สมาชิกจากไฟล์หรือ Google Sheet" open={open} onClose={() => setOpen(false)}>
        <div className="grid gap-4">
          <label className="grid cursor-pointer gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-5 text-center text-sm text-blue-700">
            <Upload className="mx-auto" size={24} />
            <span className="font-bold">เลือกไฟล์ .xlsx, .xls หรือ .csv</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) readFile(file);
              }}
            />
          </label>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <LinkIcon size={18} className="text-blue-600" />
              Import จาก Google Sheet
            </div>
            <Input
              label="ลิงก์ Google Sheet"
              value={googleSheetUrl}
              onChange={(event) => setGoogleSheetUrl(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
            <p className="text-xs leading-5 text-slate-500">Sheet ต้องเปิดสิทธิ์ให้เข้าถึงได้ หรือ Publish to web เป็น CSV ก่อน ระบบจะอ่าน worksheet ตาม gid ในลิงก์</p>
            <Button type="button" variant="secondary" disabled={pending || !googleSheetUrl} onClick={fetchGoogleSheet}>
              ดึงข้อมูลจาก Google Sheet
            </Button>
          </div>

          {headers.length > 0 ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {memberFields.map((field) => (
                  <Select
                    key={field.value}
                    label={`${field.label}${field.value === "memberCode" || field.value === "fullName" ? " *" : ""}`}
                    value={mapping[field.value]}
                    onChange={(event) => setMapping((prev) => ({ ...prev, [field.value]: event.target.value }))}
                    options={[{ label: "ไม่ใช้คอลัมน์นี้", value: "" }, ...headers.map((header) => ({ label: header, value: header }))]}
                  />
                ))}
              </div>

              <div className="max-h-64 overflow-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-2">รหัส</th>
                      <th className="p-2">เลขที่</th>
                      <th className="p-2">ชื่อ</th>
                      <th className="p-2">ห้อง</th>
                      <th className="p-2">เบอร์โทร</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedRows.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-t border-slate-100">
                        <td className="p-2">{row.memberCode}</td>
                        <td className="p-2">{row.studentNo}</td>
                        <td className="p-2">{row.fullName}</td>
                        <td className="p-2">{row.classroom}</td>
                        <td className="p-2">{row.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500">พบข้อมูล {rows.length} รายการ แสดงตัวอย่าง 10 รายการแรก</p>
              <Button disabled={pending} onClick={submitImport} type="button">Import สมาชิก</Button>
            </>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
