import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 กำลังเริ่ม Seed ข้อมูล...');

  // =========================================
  // 1. สร้าง User จำลอง (Admin, Safety, Area Owner, Worker)
  // =========================================
  console.log('สร้างผู้ใช้งาน (Users)...');
  
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      full_name: 'คุณสมชาย ใจสู้ (Admin)',
      department: 'IT / System Admin',
      role: 'ADMIN',
      username: 'admin',
      password: 'password123',
      email: 'admin@safetyos.com',
      phone: '081-111-1111',
    },
  });

  const safetyUser = await prisma.user.upsert({
    where: { username: 'safety01' },
    update: {},
    create: {
      full_name: 'จป. วิชัย ปลอดภัยไว้ก่อน',
      department: 'Safety / SHE',
      role: 'SAFETY_ENGINEER',
      username: 'safety01',
      password: 'password123',
      email: 'wichai.s@safetyos.com',
      phone: '082-222-2222',
      blood_group: 'O',
      emergency_contact: '089-999-9999 (ภรรยา)',
    },
  });

  const areaOwnerUser = await prisma.user.upsert({
    where: { username: 'owner01' },
    update: {},
    create: {
      full_name: 'คุณนพดล คุมโซน',
      department: 'Production (Tank Farm)',
      role: 'AREA_OWNER',
      username: 'owner01',
      password: 'password123',
      email: 'nopadol.a@safetyos.com',
      phone: '083-333-3333',
    },
  });

  const workerUser = await prisma.user.upsert({
    where: { username: 'worker01' },
    update: {},
    create: {
      full_name: 'นายสมหมาย ขยันงาน',
      department: 'Maintenance',
      role: 'EMPLOYEE',
      username: 'worker01',
      password: 'password123',
      email: 'sommai.w@safetyos.com',
      phone: '084-444-4444',
      blood_group: 'B',
    },
  });

  // =========================================
  // 2. สร้าง Equipment จำลอง (ถังดับเพลิง)
  // =========================================
  console.log('สร้างรายการอุปกรณ์ (Equipments)...');
  
  await prisma.equipment.upsert({
    where: { qr_code: 'EXT-A-001' },
    update: {},
    create: {
      qr_code: 'EXT-A-001',
      name: 'ถังดับเพลิง CO2 ขนาด 10 ปอนด์',
      type: 'FIRE_EXTINGUISHER',
      status: 'NORMAL',
    },
  });

  await prisma.equipment.upsert({
    where: { qr_code: 'EXT-A-002' },
    update: {},
    create: {
      qr_code: 'EXT-A-002',
      name: 'ถังดับเพลิง Dry Chemical ขนาด 15 ปอนด์',
      type: 'FIRE_EXTINGUISHER',
      status: 'DEFECTIVE', // สมมติว่าพังอยู่
    },
  });

  // =========================================
  // 3. สร้าง Incident จำลอง (จุดเสี่ยง)
  // =========================================
  console.log('สร้างรายการแจ้งจุดเสี่ยง (Incidents)...');

  await prisma.incidentReport.createMany({
    data: [
      {
        reporter_id: workerUser.id,
        title: 'พบนั่งร้านชั้น 2 ขาโก่ง',
        description: 'บริเวณ Tank Farm A นั่งร้านมีอาการโยกเยกและขาโก่งงอ เสี่ยงต่อการทรุดตัว',
        type: 'SAFETY_HAZARD',
        status: 'OPEN',
        lat: 13.7563,
        lng: 100.5018,
      },
      {
        reporter_id: areaOwnerUser.id,
        title: 'สายไฟเปลือยบริเวณปั๊มน้ำ P-102',
        description: 'ฉนวนหุ้มสายไฟฉีกขาด เห็นทองแดงด้านใน อยู่ใกล้บริเวณที่มีน้ำขัง',
        type: 'UNSAFE_CONDITION', // ใช้ค่า Legacy ได้ เพราะประกาศไว้ใน Enum แล้ว
        status: 'IN_PROGRESS',
      },
      {
        reporter_id: safetyUser.id,
        title: 'พนักงานไม่สวมแว่นตานิรภัยตอนเจียรเหล็ก',
        description: 'ตักเตือนและให้สวมใส่เรียบร้อยแล้ว',
        type: 'NEAR_MISS',
        status: 'RESOLVED',
      },
    ],
    skipDuplicates: true, // ป้องกันการสร้างซ้ำถ้ารัน seed หลายรอบ
  });

  console.log('✅ Seed ข้อมูลสำเร็จเรียบร้อย!');
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาดในการ Seed ข้อมูล:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });