# EasyApartment Backend

API สำหรับผู้ดูแลและผู้เช่า พัฒนาด้วย NestJS, PostgreSQL และ Prisma

[กลับหน้าหลัก](../README.md) · [คู่มือ Frontend](../frontend/README.md)

## ติดตั้งและรัน

ใช้ Node.js 24, npm และ PostgreSQL 18 สร้างฐานข้อมูลว่างชื่อ `easyapartment_dev` ก่อนเริ่ม

รันจากโฟลเดอร์ repository:

```sh
cd backend
npm ci
```

คัดลอก `.env.example` เป็น `.env` แล้วตั้งค่า:

| ตัวแปร | ค่าที่ต้องเตรียม |
| --- | --- |
| `DATABASE_URL` | URL ของ PostgreSQL ที่ชี้ไปยัง `easyapartment_dev` |
| `JWT_ACCESS_SECRET` | สุ่ม secret สำหรับ access token |
| `JWT_REFRESH_SECRET` | สุ่ม secret อีกค่าหนึ่งสำหรับ refresh token |
| `SEED_PASSWORD` | รหัสผ่านบัญชีสาธิตอย่างน้อย 12 ตัวอักษร |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | จำเป็นเมื่อต้องการอัปโหลดรูปจริง |

สร้าง secret ด้วยคำสั่งนี้ รันสองครั้งเพื่อให้ได้คนละค่า แล้วใส่ใน `.env` ของเครื่อง:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

เก็บรหัสผ่านและ secret ใน `.env` เท่านั้น ไม่ commit ไฟล์นี้

เมื่อกำหนดค่าแล้ว รันจากโฟลเดอร์ `backend`:

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

API เปิดที่ [http://localhost:3000/api/v1](http://localhost:3000/api/v1) ส่วน CORS ตั้งให้รับ Frontend จาก `http://localhost:3001`

Seed ทำงานเฉพาะฐานข้อมูล `easyapartment_dev` สร้างบัญชีและห้องตาม [รายการข้อมูลสาธิต](../README.md#local-setup) การรันซ้ำจะไม่เปลี่ยนรหัสผ่านหรือเขียนทับข้อมูลเดิม

<a id="testing"></a>

## การทดสอบ

หลังตั้งค่า `.env` และ migrations แล้ว รันจากโฟลเดอร์ `backend`:

```sh
npm test -- --runInBand
npm run test:e2e
```

| ชุดทดสอบ | สิ่งที่ตรวจ |
| --- | --- |
| `npm test` | Unit tests และสิทธิ์ API โดยใช้ฐานข้อมูลจำลอง |
| `npm run test:e2e` | Build และตรวจ workflow กับ PostgreSQL จริง ตั้งแต่ login, session, สิทธิ์, ห้อง, สัญญา, บิล, มิเตอร์, แจ้งซ่อม ไปจนถึงรายงาน |

Integration tests สร้างข้อมูลที่ระบุได้เฉพาะรอบทดสอบและลบเฉพาะข้อมูลนั้น ใช้ได้กับ `easyapartment_dev` เท่านั้น โดยจำลอง Cloudinary และ rate limiter จึงไม่ได้ทดสอบบริการอัปโหลดภายนอกหรือการจำกัดจำนวนคำขอจริง

อีกทางหนึ่ง ใช้ `npm run test:integration` เพื่อ build และรันตัวตรวจ PostgreSQL โดยตรง ชุดตรวจนี้เป็นตัวเดียวกับที่ `test:e2e` เรียกใช้ ไม่จำเป็นต้องรันซ้ำทั้งสองคำสั่ง

## กติกาสำคัญของข้อมูล

- ห้องหนึ่งมีสัญญาที่ใช้งานได้ครั้งละหนึ่งฉบับ สถานะห้องสัมพันธ์กับสัญญา
- การลบสัญญาเป็นการยกเลิกและเก็บประวัติ สัญญาที่ออกบิลแล้วไม่สามารถย้ายผู้เช่าหรือห้องได้
- ค่าน้ำ 10 บาท/หน่วย และค่าไฟ 8 บาท/หน่วย คำนวณด้วย decimal
- ลบได้เฉพาะบิลล่าสุดของห้องที่ยังไม่ชำระและไม่มีหลักฐานชำระเงิน โดยคืนเลขมิเตอร์ใน transaction เดียวกัน
- รายงานสรุปตามเดือนของรอบบิล ยอดรับชำระนับเฉพาะบิลที่ผู้ดูแลยืนยันแล้ว
- Logout, เปลี่ยนรหัสผ่าน และรีเซ็ตรหัสผ่านจะเพิกถอน session เดิม
- การแก้โปรไฟล์บันทึกได้เฉพาะชื่อและเบอร์โทรของบัญชีที่เข้าสู่ระบบ
- หากสร้างบัญชีสำเร็จแต่สร้างสัญญาล้มเหลว ให้ลองใหม่ในหน้าลงทะเบียนเดิม ระบบจะใช้บัญชีที่เพิ่งสร้าง เก็บรหัสผ่านชั่วคราวก่อนออกจากหน้า

Schema และ SQL migrations อยู่ใน `prisma/` รหัสข้อมูลเป็น UUID โดย API คงฟิลด์ `_id` และรูปแบบข้อมูลซ้อนเดิมไว้เพื่อรองรับ Frontend

## Build และเปิดแบบไม่ใช้ watch

```sh
npm run build
npm run start:prod
```

## หากเปิดระบบไม่ได้

- **เชื่อมต่อฐานข้อมูลไม่ได้:** ตรวจว่า PostgreSQL ทำงาน มีฐานข้อมูล `easyapartment_dev` และ `DATABASE_URL` ถูกต้อง
- **ไม่พบตารางหรือคอลัมน์:** รัน `npm run db:migrate` ก่อนเปิด API
- **CORS:** เปิด Frontend ผ่าน `http://localhost:3001` และตรวจ `NEXT_PUBLIC_API_URL` ใน Frontend
- **อัปโหลดไม่ได้:** ตรวจค่าของ Cloudinary ใน `.env` การผ่าน integration tests ยังไม่ยืนยันว่าค่าบริการจริงถูกต้อง
