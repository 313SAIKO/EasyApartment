# EasyApartment Frontend

หน้าเว็บสำหรับผู้ดูแลและผู้เช่า ใช้ Next.js App Router, React, TypeScript และ Tailwind CSS

[กลับหน้าหลัก](../README.md) · [คู่มือ Backend](../backend/README.md)

## ติดตั้งและรัน

ใช้ Node.js 24 และเปิด Backend ตาม [คู่มือ Backend](../backend/README.md) ก่อน

รันจากโฟลเดอร์ repository:

```sh
cd frontend
npm ci
```

คัดลอก `.env.example` เป็น `.env` โดยตั้งค่า API URL ให้รวม `/api/v1`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

ตัวแปร `NEXT_PUBLIC_*` ถูกส่งไปยังเบราว์เซอร์ ใช้สำหรับ API URL เท่านั้น ห้ามใส่รหัสผ่านฐานข้อมูลหรือ secret

เปิด Frontend ด้วย:

```sh
npm run dev
```

เข้า [http://localhost:3001](http://localhost:3001) แล้วใช้ [บัญชีสาธิต](../README.md#local-setup) ที่สร้างจาก Backend seed

<a id="testing"></a>

## การทดสอบ

รันจากโฟลเดอร์ `frontend` หลังตั้งค่า API URL:

```sh
npm run build -- --webpack
npx playwright install chromium
npm run test:ui
```

Playwright เปิด Frontend ที่ build แล้วบนพอร์ต **3101** โดยอัตโนมัติ ครอบคลุม 16 หน้าทั้งขนาดคอมพิวเตอร์และมือถือ รวมถึงเมนู ฟอร์ม สถานะไม่มีข้อมูล ข้อผิดพลาด การลองใหม่ และการป้องกันกดส่งซ้ำ

ชุดทดสอบนี้ใช้ **API จำลอง** และไม่ต้องเปิด Backend ตรวจการบันทึกลงฐานข้อมูลจริงด้วย [Backend integration tests](../backend/README.md#testing)

ภาพหน้าจอและ trace เมื่อทดสอบไม่ผ่านอยู่ใน `test-results/` ซึ่งไม่ถูก commit บน GitHub Actions จะมี HTML report และไฟล์ผลทดสอบให้ดาวน์โหลดเป็น artifact เป็นเวลา 7 วัน

## Build และเปิดแบบไม่ใช้ dev server

```sh
npm run build -- --webpack
npm start
```

เปิดที่ `http://localhost:3001` เช่นเดิม หากเปลี่ยน `NEXT_PUBLIC_API_URL` ให้ build ใหม่ก่อนเปิด
