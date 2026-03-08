import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const fastify = Fastify({ logger: true });

// ปลดล็อก CORS
fastify.register(cors, { 
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// 🚀 ==========================================
// 🔔 ตั้งค่า LINE Messaging API (พร้อมระบบส่งไฟล์/รูปภาพ)
// ==========================================
const LINE_CHANNEL_ACCESS_TOKEN = 'x9a6p21XJ5EptgMfXJ/AfyF8XvHh1ilsX7xOE7lpuAnJ+cSgFkNb5MLR5lYYqVhj98amxtXn1hW2ZWzejlH+2rUAYjCm1u5jO7UvnYVc0Olll3bJY/U/buSf5ajLKjBTMHen053xMQwMP/myAjIk3wdB04t89/1O/w1cDnyilFU='; 
const LINE_TARGET_ID = 'Ua3742ef5e75e2896265de81da0318262'; 

// 🔗 ตั้งค่า URL ของแอปหน้าบ้านให้ยืดหยุ่น 
const WEB_APP_URL = process.env.FRONTEND_URL || 'https://liff.line.me/2009277207-jNY8QghJ'; 

// 🛠️ อัปเกรดฟังก์ชันให้รับ URL ของไฟล์แนบได้ด้วย
const sendLineMessage = async (textMessage: string, attachmentUrl: string | null = null) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_TARGET_ID) {
      console.log('⚠️ ยังไม่ได้ใส่ Token หรือ User ID ข้ามการส่งข้อความ LINE...');
      return;
    }

    const messages: any[] = [];
    let finalText = textMessage;

    // 1. ถ้ามีไฟล์แนบ (PDF หรือรูป) ให้ต่อท้ายข้อความด้วยลิงก์
    if (attachmentUrl) {
      finalText += `\n\n📄 ดูเอกสาร/รูปภาพแนบ คลิกที่นี่:\n${attachmentUrl}`;
    }
    
    // ใส่ข้อความก้อนแรกลงไป
    messages.push({ type: 'text', text: finalText });

    // 2. 🌟 ความเจ๋งอยู่ตรงนี้: ถ้าไฟล์แนบเป็นรูปภาพ (jpg, png) ให้เด้งรูปโชว์ในแชท LINE ด้วยเลย!
    if (attachmentUrl && attachmentUrl.match(/\.(jpeg|jpg|png|webp)(\?.*)?$/i)) {
      messages.push({
        type: 'image',
        originalContentUrl: attachmentUrl,
        previewImageUrl: attachmentUrl
      });
    }
    
    // ยิง API ไปหา LINE
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: LINE_TARGET_ID, 
        messages: messages // ส่งไปทั้งข้อความ และ รูปภาพ(ถ้ามี)
      })
    });
    
    if (response.ok) {
      console.log('✅ ส่งข้อความเข้า LINE สำเร็จ!');
    } else {
      console.error('❌ ส่ง LINE พลาด:', await response.text());
    }
  } catch (error) {
    console.error('❌ ไม่สามารถเชื่อมต่อกับ LINE ได้:', error);
  }
};
// ==========================================

fastify.get('/', async (request, reply) => {
  return { status: 'OK', message: 'Enterprise Safety Backend is Running!' };
});

// 🚀 ========================================================
// 🔐 ระบบ LOGIN (อัปเกรดรองรับ LINE SSO + เก็บรูปภาพโปรไฟล์แบบเสถียร 100%)
// ========================================================

// 1. API สำหรับ Auto-Login ด้วย LINE ID 
fastify.post('/login/line', async (request: any, reply) => {
  const { line_id, picture_url } = request.body;
  try {
    if (!line_id) return reply.status(400).send({ error: 'ไม่พบ LINE ID' });

    // ค้นหาพนักงานที่เคยผูก LINE ID นี้ไว้แล้ว
    let user = await prisma.user.findFirst({ where: { line_id: line_id } });
    
    if (!user) return reply.status(401).send({ error: 'ยังไม่ได้ผูกบัญชี LINE' });

    // 🟢 ถ้าระบบพบว่ามีรูปส่งมา และรูปไม่เหมือนในฐานข้อมูล (เช่น ผู้ใช้เปลี่ยนรูปใน LINE) ให้อัปเดตทันที
    if (picture_url && user.profile_url !== picture_url) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { profile_url: picture_url }
      });
      console.log(`🔄 อัปเดตรูปโปรไฟล์ล่าสุดให้: ${user.full_name}`);
    }

    // ส่งข้อมูล user ที่อัปเดตล่าสุดกลับไปให้หน้าบ้าน
    return { message: 'เข้าสู่ระบบอัตโนมัติสำเร็จ', user };
  } catch (error) {
    console.error("LINE Login Error:", error);
    return reply.status(500).send({ error: 'เกิดข้อผิดพลาดในระบบเซิร์ฟเวอร์' });
  }
});

// 2. API เข้าสู่ระบบปกติ (พร้อมแอบผูก LINE ID และ รูปภาพ ให้เลยถ้ามี)
fastify.post('/login', async (request: any, reply) => {
  const { username, password, line_id, picture_url } = request.body;
  try {
    let user = await prisma.user.findFirst({
      where: { username: username, password: password }
    });

    if (!user) return reply.status(401).send({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!' });

    // 🟢 ถ้าล็อกอินสำเร็จ มีส่ง line_id มาด้วย และยังไม่เคยผูก หรือรูปเปลี่ยน ให้ทำการอัปเดต!
    if (line_id) {
      const needUpdateLine = !user.line_id;
      const needUpdatePic = picture_url && user.profile_url !== picture_url;

      if (needUpdateLine || needUpdatePic) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { 
            line_id: line_id, // ผูกบัญชี
            profile_url: picture_url || user.profile_url // เซฟรูป
          } 
        });
        console.log(`🔗 ผูกบัญชีและอัปเดตข้อมูล LINE ให้กับ ${user.full_name} สำเร็จ!`);
      }
    }

    return { message: 'เข้าสู่ระบบสำเร็จ', user };
  } catch (error) {
    console.error("Manual Login Error:", error);
    return reply.status(500).send({ error: 'เกิดข้อผิดพลาดในระบบเซิร์ฟเวอร์' });
  }
});

// --------------------------------------------------------
// 1. API: เสกข้อมูลพนักงานตั้งต้น (Seed Users & Mock Data)
// --------------------------------------------------------
fastify.get('/seed', async (request, reply) => {
  try {
    // 🧹 ล้างตารางลูกก่อน (เพิ่มตารางใหม่ 2 อันเข้าไปด้วย)
    await prisma.confinedSpaceEntry.deleteMany(); 
    await prisma.bbsObservation.deleteMany();
    await prisma.approvalLog.deleteMany();
    await prisma.permitAttachment.deleteMany();
    await prisma.gas_logs.deleteMany(); // ล้าง log ก๊าซก่อน
    await prisma.permit.deleteMany();
    await prisma.certificate.deleteMany(); 
    await prisma.trainingRecord.deleteMany(); 
    await prisma.incidentReport.deleteMany(); 
    await prisma.course.deleteMany(); 
    await prisma.equipmentInspectionLog.deleteMany(); 
    await prisma.equipment.deleteMany(); 
    
    // ล้างตารางแม่
    await prisma.user.deleteMany();

    // 🚀 เสกผู้ใช้งาน (เพิ่ม username และ password ให้ทุกคนคือ 1234)
    const contractor = await prisma.user.create({ data: { full_name: 'สมชาย ใจสู้', department: 'บจก. ผู้รับเหมาดีเด่น', role: 'CONTRACTOR', username: 'somchai', password: '1234' } });
    const areaOwner = await prisma.user.create({ data: { full_name: 'พี่สมศักดิ์ คุมโซน', department: 'Production Zone A', role: 'AREA_OWNER', username: 'somsak', password: '1234' } });
    const safety = await prisma.user.create({ data: { full_name: 'คุณวิว (View Nitad)', department: 'Safety & Environment', role: 'SAFETY_ENGINEER', username: 'view', password: '1234' } });

    // เสกคอร์สอบรม (E-Learning)
    const course1 = await prisma.course.create({
      data: {
        title: 'ปฐมนิเทศความปลอดภัย MTT ประจำปี 2026',
        description: 'ข้อกำหนดความปลอดภัยเบื้องต้นก่อนเข้าพื้นที่',
        passing_score: 80
      }
    });

    // 🚀 เสกข้อมูลอุปกรณ์ (QR Code)
    await prisma.equipment.createMany({
      data: [
        { qr_code: 'EXT-001', name: 'ถังดับเพลิงชนิดผงเคมีแห้ง โซน A', type: 'FIRE_EXTINGUISHER', status: 'NORMAL' },
        { qr_code: 'SCAF-001', name: 'นั่งร้านเหล็ก ซ่อมบำรุง Tank 01', type: 'SCAFFOLDING', status: 'NORMAL' },
      ]
    });

    // เสกข้อมูลแจ้งจุดเสี่ยง (Incident Report)
    await prisma.incidentReport.create({
      data: {
        reporter_id: contractor.id,
        title: 'พบนั่งร้านชำรุด ขาโก่ง',
        description: 'นั่งร้านชั้น 2 บริเวณ Tank Farm A ขาโก่งงอ เสี่ยงต่อการทรุดตัวครับ',
        type: 'UNSAFE_CONDITION',
        lat: 12.678123, 
        lng: 101.256456, // พิกัด GPS จำลอง
        image_url: 'https://example.com/scaffold-danger.jpg',
        status: 'OPEN'
      }
    });

    return { 
      message: '🎉 เสกข้อมูลผู้ใช้งาน (พร้อมระบบ Login), ข้อสอบ, อุปกรณ์ และจุดเสี่ยง ลง Database เรียบร้อย!', 
      users: { contractor, areaOwner, safety } 
    };
  } catch (error: any) {
    console.error("🚨🚨🚨 ERROR SEED DATA 🚨🚨🚨\n", error);
    return reply.status(500).send({ error: 'ไม่สามารถเสกข้อมูลได้', details: error.message });
  }
});

fastify.get('/users', async (request, reply) => {
  return await prisma.user.findMany();
});

// ========================================================
// 👁️ MODULE: BBS Observation 
// ========================================================
fastify.get('/bbs', async (request, reply) => {
  return await prisma.bbsObservation.findMany({
    include: { observer: true },
    orderBy: { created_at: 'desc' }
  });
});

fastify.post('/bbs', async (request, reply) => {
  const { 
    location, observed_group, behavior_type, category, 
    action_taken, description, root_cause, suggestion, observer_id, date 
  } = request.body as any;

  try {
    const bbs = await prisma.bbsObservation.create({
      data: {
        date: date ? new Date(date) : new Date(), // รับเวลาจากหน้าบ้าน
        location,
        observed_group,
        behavior_type,
        category,
        action_taken,
        description,
        root_cause: root_cause || null, // ถ้าไม่มีให้เป็น null
        suggestion: suggestion || null, // ถ้าไม่มีให้เป็น null
        observer_id
      }
    });
    return reply.send(bbs);
  } catch (error) {
    console.error("BBS Create Error:", error);
    return reply.status(500).send({ error: 'ไม่สามารถบันทึกข้อมูล BBS ได้' });
  }
});

// ========================================================
// 🕳️ MODULE: Confined Space Board 
// ========================================================
fastify.get('/confined-space/active-permits', async (request, reply) => {
  return await prisma.permit.findMany({
    where: { permit_type: 'CONFINED_SPACE', status: 'APPROVED' },
    orderBy: { created_at: 'desc' }
  });
});

fastify.get('/confined-space/:permit_id/entries', async (request, reply) => {
  const { permit_id } = request.params as { permit_id: string };
  return await prisma.confinedSpaceEntry.findMany({
    where: { permit_id: permit_id },
    orderBy: { time_in: 'desc' }
  });
});

fastify.post('/confined-space/in', async (request, reply) => {
  const body = request.body as any;
  try {
    return await prisma.confinedSpaceEntry.create({ data: body });
  } catch (error) {
    return reply.status(500).send({ error: 'ไม่สามารถ Check-in ได้' });
  }
});

fastify.put('/confined-space/out/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    return await prisma.confinedSpaceEntry.update({
      where: { id: id },
      data: { status: 'OUTSIDE', time_out: new Date() }
    });
  } catch (error) {
    return reply.status(500).send({ error: 'ไม่สามารถ Check-out ได้' });
  }
});

// 🚀 API ใหม่: สั่งอพยพฉุกเฉิน (Evacuate All)
fastify.post('/confined-space/evacuate', async (request: any, reply) => {
  const { permit_id, triggered_by } = request.body as any;
  try {
    // นำคนที่เป็น INSIDE ทั้งหมด เปลี่ยนเป็น OUTSIDE (อพยพ)
    await prisma.confinedSpaceEntry.updateMany({
      where: { permit_id: permit_id, status: 'INSIDE' },
      data: { status: 'OUTSIDE', time_out: new Date() }
    });

    const permit = await prisma.permit.findUnique({ where: { id: permit_id }});
    
    // ยิง LINE แจ้งเตือนฉุกเฉิน
    const msg = `🚨🚨 [EMERGENCY EVACUATION] 🚨🚨\nหัวข้องาน: ${permit?.title}\nพื้นที่: ${permit?.location_detail}\nสั่งโดย: ${triggered_by}\n\n⚠️ มีการสั่งอพยพพนักงานออกจากที่อับอากาศทั้งหมดทันที โปรดตรวจสอบความปลอดภัยหน้างานด่วน!`;
    await sendLineMessage(msg);

    return { message: 'สั่งอพยพและส่งแจ้งเตือนสำเร็จ!' };
  } catch (error) {
    return reply.status(500).send({ error: 'ไม่สามารถสั่งอพยพได้' });
  }
});

// ========================================================
// 🎓 MODULE 1: ระบบอบรม & ใบ Cert. (Onboarding & E-Learning)
// ========================================================

fastify.get('/certificates', async (request, reply) => {
  return await prisma.certificate.findMany({ include: { user: true }, orderBy: { created_at: 'desc' } });
});

fastify.post('/certificates', async (request, reply) => {
  const body = request.body as any;
  return await prisma.certificate.create({
    data: {
      user_id: body.user_id, cert_name: body.cert_name, file_url: body.file_url,   
      issued_date: new Date(body.issued_date), expiry_date: new Date(body.expiry_date), status: 'PENDING', 
    }
  });
});

fastify.put('/certificates/:id/verify', async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = request.body as any; 
  return await prisma.certificate.update({ where: { id: id }, data: { status: body.status } });
});

// --- API E-Learning ---
fastify.get('/courses', async (request, reply) => {
  return await prisma.course.findMany({ orderBy: { title: 'asc' } });
});

fastify.post('/training-records', async (request, reply) => {
  const { user_id, course_id, score } = request.body as any;
  try {
    const course = await prisma.course.findUnique({ where: { id: course_id } });
    if (!course) return reply.status(404).send({ error: 'ไม่พบวิชาที่สอบ' });

    const isPassed = score >= course.passing_score;

    const record = await prisma.trainingRecord.create({
      data: { user_id, course_id, score, passed: isPassed }
    });
    return { message: isPassed ? 'ยินดีด้วย สอบผ่าน!' : 'เสียใจด้วย สอบไม่ผ่าน', record };
  } catch (error) {
    return reply.status(500).send({ error: 'ไม่สามารถบันทึกคะแนนสอบได้' });
  }
});

// ========================================================
// ⚠️ MODULE 2: ระบบแจ้งจุดเสี่ยง (Incident Report / Near Miss)
// ========================================================

fastify.get('/incidents', async (request, reply) => {
  return await prisma.incidentReport.findMany({
    include: { reporter: true }, 
    orderBy: { created_at: 'desc' }
  });
});

fastify.post('/incidents', async (request, reply) => {
  const body = request.body as any;
  try {
    const newIncident = await prisma.incidentReport.create({
      data: {
        reporter_id: body.reporter_id,
        title: body.title,
        description: body.description,
        type: body.type, 
        lat: body.lat, 
        lng: body.lng, 
        image_url: body.image_url,
        status: 'OPEN' 
      }
    });

    // 🔔 ยิง LINE แจ้งเตือนเรื่องจุดเสี่ยง แบบปรับ UI ใหม่
    const reporter = await prisma.user.findUnique({ where: { id: body.reporter_id } });
    
    // แปลง Type ให้สวยงาม
    const incidentTypeTH = 
      body.type === 'NEAR_MISS' ? '⚠️ Near Miss (เกือบเกิดอุบัติเหตุ)' : 
      body.type === 'UNSAFE_ACT' ? '🚫 Unsafe Act (การกระทำที่ไม่ปลอดภัย)' : 
      '🏭 Unsafe Condition (สภาพแวดล้อมอันตราย)';

    const msg = `🚨 แจ้งเตือนจุดเสี่ยงใหม่ (SafetyOS) 🚨
--------------------------------------
📌 หัวข้อ: ${body.title}
🏷️ ประเภท: ${incidentTypeTH}
👷 ผู้แจ้ง: ${reporter?.full_name || 'ไม่ระบุชื่อ'}
📝 รายละเอียด: 
${body.description}

📍 พิกัด GPS: ${body.lat && body.lng ? `${body.lat}, ${body.lng}` : 'ไม่ระบุ'}
🔗 แผนที่: ${body.lat && body.lng ? `http://maps.google.com/?q=$${body.lat},${body.lng}` : '-'}
--------------------------------------
กรุณาตรวจสอบและดำเนินการแก้ไขด่วน! 🛠️
🌐 เข้าสู่ระบบ: ${WEB_APP_URL}`;
    
    // ส่งทั้งข้อความ และแนบ URL รูปภาพเข้าไปใน LINE
    await sendLineMessage(msg, body.image_url);

    return newIncident;
  } catch (error) {
    console.error("🚨 ERROR CREATE INCIDENT:\n", error);
    return reply.status(500).send({ error: 'ไม่สามารถบันทึกข้อมูลแจ้งจุดเสี่ยงได้' });
  }
});

fastify.put('/incidents/:id/status', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { status } = request.body as any;
  try {
    const updatedIncident = await prisma.incidentReport.update({
      where: { id: id },
      data: { status: status }
    });

    let msg = '';
    if (status === 'IN_PROGRESS') {
      msg = `⏳ [อัปเดตจุดเสี่ยง]\nหัวข้อ: ${updatedIncident.title}\nสถานะ: ช่างกำลังเข้าดำเนินการแก้ไขครับ 🛠️\n\n🌐 ดูรายละเอียด:\n${WEB_APP_URL}`;
    } else if (status === 'CLOSED' || status === 'RESOLVED') {
      msg = `✅ [แก้ไขจุดเสี่ยงเรียบร้อย]\nหัวข้อ: ${updatedIncident.title}\nสถานะ: ดำเนินการแก้ไข/ปิดงานเรียบร้อยแล้ว ปลอดภัย! 🛡️\n\n🌐 ดูรายละเอียด:\n${WEB_APP_URL}`;
    }
    if (msg) await sendLineMessage(msg);

    return updatedIncident;
  } catch (error) {
    return reply.status(500).send({ error: 'ไม่สามารถอัปเดตสถานะจุดเสี่ยงได้' });
  }
});

// ========================================================
// 📝 MODULE 3: ระบบ E-Permit & Gas Testing
// ========================================================

fastify.get('/permits', async (request, reply) => {
  const permits = await prisma.permit.findMany({
    // 🟢 ดึงข้อมูล gas_logs มาพร้อมกับ Permit เพื่อให้หน้าบ้านเช็คสถานะปุ่มได้
    include: { 
      applicant: true, 
      approval_logs: { include: { approver: true } },
      gas_logs: true 
    },
    orderBy: { created_at: 'desc' }
  });
  const attachments = await prisma.permitAttachment.findMany();
  return permits.map(p => {
    const file = attachments.find(a => a.permit_id === p.id);
    return { ...p, attached_file: file ? file.public_url : null }; 
  });
});

// [POST] สร้าง Permit (แก้ไขให้ครบถ้วน)
fastify.post('/permits', async (request, reply) => {
  const body = request.body as any;
  try {
    console.log("📥 กำลังสร้าง Permit ด้วยข้อมูล:", body);

    const validTypes = ['COLD_WORK', 'HOT_WORK', 'CONFINED_SPACE', 'WORKING_AT_HEIGHT', 'EXCAVATION', 'ELECTRICAL'];
    const finalType = validTypes.includes(body.permit_type) ? body.permit_type : 'COLD_WORK';

    // 🟢 ป้องกันบัค String ยาวเกินฐานข้อมูลรับไหว (ตัดเหลือ 500 ตัวอักษร)
    const safeDescription = body.description ? String(body.description).substring(0, 500) : '-';
    const safeTitle = body.title ? String(body.title).substring(0, 190) : 'ไม่มีหัวข้อ';
    const safeLocation = body.location_detail ? String(body.location_detail).substring(0, 190) : 'ไม่ระบุพื้นที่';

    // 🟢 เตรียมข้อมูลฟิลด์ใหม่ (เฟส 1) ป้องกันข้อมูลเป็น null หรือยาวเกินไป
    const gasTester = body.gas_tester_name ? String(body.gas_tester_name).substring(0, 190) : null;
    const standbyPerson = body.standby_person_name ? String(body.standby_person_name).substring(0, 190) : null;
    const commEquip = body.communication_equip ? String(body.communication_equip).substring(0, 190) : null;
    const isolationList = body.isolation_checklist ? body.isolation_checklist : null; // ส่งเป็น Array/JSON ได้เลย

    // 🟢 บันทึกลงฐานข้อมูลผ่าน Prisma
    const newPermit = await prisma.permit.create({
      data: {
        permit_number: `PTW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        title: safeTitle, 
        description: safeDescription, 
        permit_type: finalType, 
        status: 'PENDING_AREA_OWNER', 
        location_detail: safeLocation,
        start_time: new Date(body.start_time), 
        end_time: new Date(body.end_time),
        applicant_id: body.applicant_id,
        
        // ฟิลด์ใหม่ที่ถูกเพิ่มเข้ามาในฐานข้อมูล
        gas_tester_name: gasTester,
        standby_person_name: standbyPerson,
        communication_equip: commEquip,
        isolation_checklist: isolationList
      }
    });

    let fileUrl = null;
    if (body.attachment_url) {
      const attachment = await prisma.permitAttachment.create({
        data: { 
          permit_id: newPermit.id, 
          file_name: String(body.attachment_name || 'Attached Document').substring(0, 190), 
          file_type: 'FILE', 
          storage_path: 'supa-storage', 
          public_url: body.attachment_url 
        }
      });
      fileUrl = attachment.public_url;
    }

    // 🔔 ยิง LINE แจ้งเตือนขอ Permit ใหม่
    const applicant = await prisma.user.findUnique({ where: { id: body.applicant_id } });
    
    const permitTypeTH = 
      finalType === 'HOT_WORK' ? '🔥 งานร้อน (Hot Work)' : 
      finalType === 'CONFINED_SPACE' ? '🕳️ งานในที่อับอากาศ (Confined Space)' : 
      finalType === 'WORKING_AT_HEIGHT' ? '🧗 ทำงานบนที่สูง (Working at Height)' : 
      finalType === 'EXCAVATION' ? '🚜 งานขุดเจาะ (Excavation)' : 
      finalType === 'ELECTRICAL' ? '⚡ งานระบบไฟฟ้า (Electrical)' : 
      '❄️ งานทั่วไป (Cold Work)';

    const msg = `📋 คำขอ Work Permit ใหม่ (SafetyOS) 📋
--------------------------------------
📌 งาน: ${safeTitle}
🏷️ ประเภท: ${permitTypeTH}
📍 พื้นที่: ${safeLocation}
👷 จำนวนช่าง: ${body.workers || '-'} คน
👤 ผู้ขออนุญาต: ${applicant?.full_name || 'ไม่ระบุชื่อ'}

📝 มาตรการ/รายละเอียด:
${safeDescription}
--------------------------------------
👉 จป. / Area Owner โปรดเข้าสู่ระบบเพื่อตรวจสอบ
🌐 เข้าสู่ระบบ: ${WEB_APP_URL}`;
    
    await sendLineMessage(msg, fileUrl);

    return reply.send(newPermit);

  } catch (error: any) {
    console.error("🚨 ERROR CREATE PERMIT:\n", error);
    // 🟢 ส่งข้อความ Error จากฐานข้อมูลกลับไปบอกแอปหน้าบ้านแบบตรงๆ
    return reply.status(500).send({ 
      error: `เซิร์ฟเวอร์ขัดข้อง: ${error.message}` 
    });
  }
});

// 🧪 [POST] บันทึกผลตรวจวัดก๊าซและ Safety Talk
fastify.post('/gas-logs', async (request, reply) => {
  const body = request.body as any;
  try {
    const newLog = await prisma.gas_logs.create({
      data: {
        permit_id: body.permit_id,
        tester_id: body.tester_id,
        o2_level: body.o2_level,
        lel_level: body.lel_level,
        co_level: body.co_level,
        h2s_level: body.h2s_level,
        safety_talk_done: body.safety_talk_done
      }
    });
    return reply.send({ message: 'บันทึกข้อมูลก๊าซสำเร็จ', data: newLog });
  } catch (error: any) {
    console.error("❌ Error saving gas log:", error);
    return reply.status(500).send({ error: 'ไม่สามารถบันทึกข้อมูลก๊าซได้', details: error.message });
  }
});

// 📊 [GET] ดึงประวัติการตรวจก๊าซของ Permit นั้นๆ เพื่อเอาไปโชว์ในหน้า Detail
fastify.get('/permits/:id/gas-logs', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const logs = await prisma.gas_logs.findMany({
      where: { permit_id: id },
      include: { tester: true }, // ดึงชื่อคนตรวจสอบมาด้วย
      orderBy: { recorded_at: 'desc' } // เรียงลำดับจากล่าสุด
    });
    return reply.send(logs);
  } catch (error: any) {
    console.error("❌ Error fetching gas logs:", error);
    return reply.status(500).send({ error: 'ไม่สามารถดึงข้อมูลก๊าซได้', details: error.message });
  }
});

fastify.put('/permits/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = request.body as any; 
  try {
    const updatedPermit = await prisma.permit.update({ where: { id: id }, data: { status: body.status } });
    
    let approverName = 'ระบบ';
    if (body.approver_id) {
      const approver = await prisma.user.findUnique({ where: { id: body.approver_id } });
      if (approver) approverName = approver.full_name;
      await prisma.approvalLog.create({ data: { permit_id: id, approver_id: body.approver_id, action: body.status, comment: body.comment || '-' } });
    }

    let statusMsg = '';
    if (body.status === 'PENDING_SAFETY') {
      statusMsg = `🔶 [อัปเดต Permit: ${updatedPermit.permit_number}]\nหัวข้อ: ${updatedPermit.title}\nผู้อนุมัติ: ${approverName}\n\n👉 สถานะ: เจ้าของพื้นที่อนุมัติแล้ว รอ จป. ตรวจสอบต่อครับ!\n\n🌐 เข้าสู่ระบบเพื่อตรวจสอบ:\n${WEB_APP_URL}`;
    } else if (body.status === 'APPROVED') {
      statusMsg = `✅ [อนุมัติ Permit สำเร็จ!]\nเลขที่: ${updatedPermit.permit_number}\nหัวข้อ: ${updatedPermit.title}\nผู้อนุมัติขั้นสุดท้าย: ${approverName}\n\n🎉 สามารถเริ่มปฏิบัติงานได้เลยครับ!`;
    } else if (body.status === 'REJECTED') {
      statusMsg = `❌ [ไม่อนุมัติ Permit]\nเลขที่: ${updatedPermit.permit_number}\nผู้สั่งปฏิเสธ: ${approverName}\nเหตุผล: ${body.comment || 'ผิดมาตรการความปลอดภัย'}\n\n⚠️ กรุณาแก้ไขข้อมูล/เอกสาร JSA แล้วขออนุญาตใหม่ครับ`;
    }

    if (statusMsg) await sendLineMessage(statusMsg);

    return updatedPermit;
  } catch (error) {
    return reply.status(500).send({ error: 'ไม่สามารถอัปเดตสถานะได้' });
  }
});
// ⏳ [PUT] ขอขยายเวลาทำงาน (Extend Permit)
fastify.put('/permits/:id/extend', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { new_end_time, reason, requested_by } = request.body as any;
  
  try {
    const permit = await prisma.permit.findUnique({ where: { id } });
    if (!permit) return reply.status(404).send({ error: 'ไม่พบ Permit' });

   // 1. อัปเดตเวลาสิ้นสุดใหม่ และเก็บเหตุผลลง Database ด้วย
    const updatedPermit = await prisma.permit.update({
      where: { id },
      data: { 
        end_time: new Date(new_end_time),
        extension_reason: reason  // 🟢 เพิ่มบรรทัดนี้เข้ามาครับ!
      }
    });

    // 2. ยิง LINE แจ้งเตือน จป. และ Area Owner ให้รับทราบ
    const msg = `⏳ [แจ้งขอขยายเวลาทำงาน]\nเลขที่: ${permit.permit_number}\nหัวข้อ: ${permit.title}\nผู้ขอ: ${requested_by}\n\n📝 เหตุผล: ${reason}\n⏰ เวลาสิ้นสุดใหม่: ${new Date(new_end_time).toLocaleString('th-TH')}\n\n👉 จป. / Area Owner โปรดรับทราบและตรวจสอบความปลอดภัยหน้างานเพิ่มเติมครับ`;
    await sendLineMessage(msg);

    return reply.send({ message: 'ขยายเวลาสำเร็จ', permit: updatedPermit });
  } catch (error) {
    console.error("Extend Permit Error:", error);
    return reply.status(500).send({ error: 'ไม่สามารถขยายเวลาได้' });
  }
});
// ========================================================
// 🌟 MODULE 4: ระบบตรวจอุปกรณ์ (Equipment Inspection)
// ========================================================

fastify.get('/equipment/:qr', async (request, reply) => {
  const { qr } = request.params as { qr: string };
  
  try {
    const equipment = await prisma.equipment.findUnique({ 
      where: { qr_code: qr },
      include: {
        logs: {
          orderBy: { created_at: 'desc' },
          include: { inspector: true } 
        }
      }
    });

    if (!equipment) return reply.status(404).send({ error: 'ไม่พบอุปกรณ์รหัสนี้' });
    
    const result = {
      ...equipment,
      // 🟢 เชื่อมประวัติ (history) ให้หน้าบ้านอ่านได้แบบสวยงาม
      history: equipment.logs ? equipment.logs.map((log: any) => ({
        ...log,
        inspector_name: log.inspector ? log.inspector.full_name : 'ไม่ระบุชื่อ'
      })) : []
    };

    return result;
  } catch (error) {
    console.error("GET Equipment Error:", error);
    return reply.status(500).send({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลอุปกรณ์' });
  }
});

fastify.put('/equipment/:id/inspect', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { status, inspector_id, details } = request.body as any;
  
  try {
    const [updatedEquipment, newLog] = await prisma.$transaction([
      prisma.equipment.update({
        where: { id: id },
        data: { status: status }
      }),
      prisma.equipmentInspectionLog.create({
        data: {
          equipment_id: id,
          inspector_id: inspector_id,
          status: status,
          details: details || "{}"
        }
      })
    ]);

    return updatedEquipment;
  } catch (error) {
    console.error("PUT Inspect Error:", error);
    return reply.status(500).send({ error: 'ไม่สามารถอัปเดตสถานะอุปกรณ์ได้' });
  }
});

// ========================================================
// 📊 MODULE 5: Executive Dashboard (สรุปสถิติผู้บริหาร)
// ========================================================
fastify.get('/dashboard', async (request, reply) => {
  try {
    const totalPermits = await prisma.permit.count();
    const pendingPermits = await prisma.permit.count({ where: { status: { startsWith: 'PENDING' } } });
    const openIncidents = await prisma.incidentReport.count({ where: { status: 'OPEN' } });
    const defectiveEquip = await prisma.equipment.count({ where: { status: 'DEFECTIVE' } });
    const totalUsers = await prisma.user.count();

    const permitGroups = await prisma.permit.groupBy({
      by: ['permit_type'],
      _count: { permit_type: true }
    });

    const recentIncidents = await prisma.incidentReport.findMany({
      take: 3,
      orderBy: { created_at: 'desc' },
      include: { reporter: true }
    });

    return {
      stats: { totalPermits, pendingPermits, openIncidents, defectiveEquip, totalUsers },
      permitGroups,
      recentIncidents
    };
  } catch (error) {
    return reply.status(500).send({ error: 'ไม่สามารถดึงข้อมูล Dashboard ได้' });
  }
});

// 🚀 สั่งรันแอปให้รองรับ Cloud Deployment (Render.com)
const start = async () => {
  try {
    // Render จะส่งพอร์ตมาให้ผ่าน process.env.PORT ถ้าไม่มีค่อยใช้ 3000
    const PORT = Number(process.env.PORT) || 3000;
    const HOST = '0.0.0.0'; // 👈 ต้องเป็น 0.0.0.0 เท่านั้นเพื่อให้ Render เจอแอปเรา

    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Enterprise Safety Backend is running at http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();