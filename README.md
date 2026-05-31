# SchoolSaver

SchoolSaver คือเว็บแอปสำหรับจัดการการออมและการเก็บเงินในห้องเรียนหรือสถานศึกษา ช่วยให้ผู้ดูแลสามารถจัดการสมาชิก รอบการเก็บเงิน การรับชำระเงิน ยอดค้างชำระ ช่องทางชำระเงิน รายงาน และประวัติการใช้งานได้อย่างเป็นระบบ

โปรเจกต์นี้เหมาะสำหรับห้องเรียน ชมรม กลุ่มออมทรัพย์ขนาดเล็ก หรือหน่วยงานภายในโรงเรียนที่ต้องการลดการจดบันทึกด้วยมือ และต้องการระบบที่ตรวจสอบยอดเงินย้อนหลังได้ง่าย

## Features

- Workspace แยกข้อมูลตามห้องเรียนหรือกลุ่มงาน
- ระบบสมาชิก workspace พร้อมบทบาทผู้ใช้งาน เช่น ผู้ดูแล ผู้เก็บเงิน และผู้ดูข้อมูล
- จัดการข้อมูลสมาชิกนักเรียนหรือสมาชิกกลุ่ม
- สร้างรอบการเก็บเงิน กำหนดยอดเป้าหมาย ช่วงเวลา และค่าปรับ
- บันทึก รับ แก้ไข และยกเลิกธุรกรรมการชำระเงิน
- คำนวณยอดจ่ายแล้ว ยอดค้างชำระ และสถานะของแต่ละสมาชิก
- จัดการช่องทางการชำระเงิน เช่น เงินสด โอนธนาคาร PromptPay หรือช่องทางอื่น
- หน้า Member Card แบบสาธารณะสำหรับให้สมาชิกค้นหายอดของตัวเอง
- Dashboard และ Reports สำหรับดูภาพรวมยอดเงินและธุรกรรม
- Activity Log สำหรับตรวจสอบกิจกรรมสำคัญในระบบ
- ระบบสมัครสมาชิก เข้าสู่ระบบ ยืนยันอีเมล รีเซ็ตรหัสผ่าน และกู้คืนบัญชี

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 7
- PostgreSQL
- Zod
- SweetAlert2
- Chart.js
- Docker และ Jenkins สำหรับ deployment workflow

## Project Structure

```text
src/app/                 App Router pages and route entries
src/features/            Feature-first modules, actions, schemas, components
src/components/ui/       Shared UI primitives
src/components/layout/   App shell, navigation, role gates
src/lib/                 Session, auth, permissions, dates, money, Prisma helpers
src/constants/           Routes, roles, statuses, labels
prisma/                  Prisma schema, migrations, seed
public/                  Static assets
```

## Requirements

- Bun
- Node.js runtime compatible with Next.js 16
- PostgreSQL
- Docker, optional สำหรับรันแบบ container

## Environment Variables

สร้างไฟล์ `.env` จาก `.env.example` แล้วปรับค่าให้ตรงกับเครื่องหรือ environment ที่ใช้งาน

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/school_saver?schema=public"
SESSION_SECRET="change-this-long-random-secret"
RESEND_API_KEY="re_xxxxxxxxx"
RESEND_FROM_EMAIL="SchoolSaver <noreply@example.com>"
APP_URL="http://localhost:3000"
```

## Development

ติดตั้ง dependencies

```bash
bun install
```

สร้าง Prisma Client

```bash
bunx prisma generate
```

รัน migration สำหรับฐานข้อมูล local

```bash
bun run prisma:migrate
```

เริ่ม dev server

```bash
bun run dev
```

เปิดใช้งานที่ `http://localhost:3000`

## Useful Commands

```bash
bun run typecheck
bun run build
bun run start
bun run prisma:generate
bun run prisma:deploy
bun run prisma:seed
```

## Docker

คัดลอกไฟล์ env ตัวอย่างสำหรับ Docker ก่อนรัน

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

บริการหลักใน Docker Compose

- `db`: PostgreSQL 16
- `migrate`: รัน Prisma migration
- `app`: Next.js production server ที่ port `3000`

ดูสถานะ service

```bash
docker compose --env-file .env.docker ps
```

ดู log ของแอป

```bash
docker compose --env-file .env.docker logs -f app
```

หยุดระบบ

```bash
docker compose --env-file .env.docker down
```

Build เฉพาะ application image

```bash
docker build --target runner -t school-saver:local .
```

Build เฉพาะ migration image

```bash
docker build --target migrator -t school-saver:migrator .
```

## Jenkins

โปรเจกต์มี `Jenkinsfile` สำหรับ pipeline พื้นฐาน:

1. ติดตั้ง dependencies
2. ตรวจ TypeScript
3. Build Docker image สำหรับ application
4. Build Docker image สำหรับ migration
5. รัน Prisma migration
6. Push image ไปยัง registry เมื่อเปิดใช้งาน
7. Deploy ด้วย Docker Compose เมื่อเปิดใช้งาน

Credentials ที่ใช้บ่อยใน Jenkins:

- `school-saver-database-url`: Secret text สำหรับ production `DATABASE_URL`
- `docker-registry`: Username/Password สำหรับ Docker registry

ตัวแปรที่มักปรับตอนรัน pipeline:

- `DOCKER_IMAGE`
- `DOCKER_REGISTRY`
- `DOCKER_NETWORK`
- `RUN_MIGRATIONS`
- `PUSH_IMAGE`
- `DEPLOY_COMPOSE`

## Security Notes

- ข้อมูลในระบบถูก scope ด้วย `workspaceId`
- การเปลี่ยนแปลงข้อมูลสำคัญควรผ่าน server actions และตรวจสิทธิ์ด้วย role ของ workspace
- หน้า Member Card เป็น public page ที่ออกแบบให้เห็นเฉพาะข้อมูลที่ตั้งใจเปิดให้สมาชิกตรวจสอบ
- อย่า commit ไฟล์ `.env`, secret, production database URL หรือ API key จริง

## License

โปรเจกต์นี้เป็น private project สำหรับ SchoolSaver
