# School Saver

ระบบจัดการการออม/รอบชำระเงินสำหรับโรงเรียน สร้างด้วย Next.js, Prisma และ PostgreSQL

## Development

```bash
npm install
npm run dev
```

เปิดใช้งานที่ `http://localhost:3000`

## Docker

คัดลอกไฟล์ env ตัวอย่างก่อนรันด้วย Docker Compose:

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

คำสั่งนี้จะสร้าง 3 service:

- `db` PostgreSQL 16
- `migrate` รัน `prisma migrate deploy`
- `app` Next.js production server ที่ port `3000`

หลังรันสำเร็จ:

- แอปเปิดที่ `http://localhost:3000`
- PostgreSQL เปิดที่ `localhost:5432` หรือค่าที่ตั้งใน `POSTGRES_PORT`

ดูสถานะ service:

```bash
docker compose --env-file .env.docker ps
```

ดู log:

```bash
docker compose --env-file .env.docker logs -f app
```

หยุดระบบ:

```bash
docker compose --env-file .env.docker down
```

Build เฉพาะ application image:

```bash
docker build --target runner -t school-saver:local .
```

Build เฉพาะ migration image:

```bash
docker build --target migrator -t school-saver:migrator .
```

รัน migration ไปยังฐานข้อมูลภายนอก:

```bash
docker run --rm -e DATABASE_URL="postgresql://user:pass@host:5432/school_saver?schema=public" school-saver:migrator
```

## Jenkins

โปรเจกต์นี้มี `Jenkinsfile` สำหรับ pipeline มาตรฐาน:

1. `npm ci`
2. `npm run typecheck`
3. Build Docker image target `runner`
4. Build Docker image target `migrator`
5. รัน `prisma migrate deploy` จาก migration image
6. Push image ไป registry ถ้าเปิด `PUSH_IMAGE`
7. Deploy ด้วย Docker Compose ถ้าเปิด `DEPLOY_COMPOSE`

ตั้งค่า credentials ใน Jenkins:

- `school-saver-database-url` เป็น Secret text เก็บค่า production `DATABASE_URL`
- `docker-registry` เป็น Username/Password สำหรับ Docker registry ถ้าต้อง push image

ค่าที่มักปรับตอนรัน pipeline:

- `DOCKER_IMAGE`: เช่น `registry.example.com/team/school-saver`
- `DOCKER_REGISTRY`: เช่น `registry.example.com`
- `DOCKER_NETWORK`: ใส่ชื่อ Docker network ถ้า migration container ต้องต่อเข้า database network เดิม
- `RUN_MIGRATIONS`: เปิดเพื่อ deploy migration ก่อนปล่อยแอป
- `PUSH_IMAGE`: เปิดเมื่อ Jenkins ต้อง push image
- `DEPLOY_COMPOSE`: เปิดเมื่อ Jenkins agent เป็นเครื่อง deploy ด้วย `docker compose`
