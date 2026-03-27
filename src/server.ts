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
// 🔔 ตั้งค่า LINE Messaging API
// ==========================================
const LINE_CHANNEL_ACCESS_TOKEN = 'x9a6p21XJ5EptgMfXJ/AfyF8XvHh1ilsX7xOE7lpuAnJ+cSgFkNb5MLR5lYYqVhj98amxtXn1hW2ZWzejlH+2rUAYjCm1u5jO7UvnYVc0Olll3bJY/U/buSf5ajLKjBTMHen053xMQwMP/myAjIk3wdB04t89/1O/w1cDnyilFU='; 
const LINE_TARGET_ID = 'Ua3742ef5e75e2896265de81da0318262'; 
const WEB_APP_URL = process.env.FRONTEND_URL || 'https://liff.line.me/2009277207-jNY8QghJ'; 

const sendLineMessage = async (textMessage: string, attachmentUrl: string | null = null) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_TARGET_ID) return;
    const messages: any[] = [];
    let finalText = textMessage;

    if (attachmentUrl) finalText += `\n\n📄 ดูเอกสาร/รูปภาพแนบ คลิกที่นี่:\n${attachmentUrl}`;
    messages.push({ type: 'text', text: finalText });

    if (attachmentUrl && attachmentUrl.match(/\.(jpeg|jpg|png|webp)(\?.*)?$/i)) {
      messages.push({ type: 'image', originalContentUrl: attachmentUrl, previewImageUrl: attachmentUrl });
    }
    
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
      body: JSON.stringify({ to: LINE_TARGET_ID, messages: messages })
    });
  } catch (error) {
    console.error('❌ ไม่สามารถเชื่อมต่อกับ LINE ได้:', error);
  }
};

const createPermitFlex = (title: string, permitNo: string, status: string, location: string, applicant: string, color: string, actionUrl: string, extraNote: string | null = null) => {
  const detailsContent: any[] = [
    { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "เลขที่:", color: "#aaaaaa", size: "sm", flex: 1 }, { type: "text", text: permitNo, wrap: true, color: "#333333", size: "sm", weight: "bold", flex: 3 }] },
    { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "พื้นที่:", color: "#aaaaaa", size: "sm", flex: 1 }, { type: "text", text: location, wrap: true, color: "#666666", size: "sm", flex: 3 }] },
    { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "สถานะ:", color: "#aaaaaa", size: "sm", flex: 1 }, { type: "text", text: status, wrap: true, color: color, weight: "bold", size: "sm", flex: 3 }] },
    { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "ผู้ขอ:", color: "#aaaaaa", size: "sm", flex: 1 }, { type: "text", text: applicant, wrap: true, color: "#666666", size: "sm", flex: 3 }] }
  ];

  if (extraNote) {
    detailsContent.push({ type: "box", layout: "baseline", spacing: "sm", margin: "md", contents: [{ type: "text", text: "หมายเหตุ:", color: "#e11d48", size: "sm", flex: 1, weight: "bold" }, { type: "text", text: extraNote, wrap: true, color: "#e11d48", size: "sm", flex: 3 }] });
  }

  return {
    type: "flex",
    altText: `แจ้งเตือน Permit: ${permitNo} - ${status}`,
    contents: {
      type: "bubble",
      header: { type: "box", layout: "vertical", backgroundColor: color, contents: [{ type: "text", text: "SafetyOS Notification", weight: "bold", color: "#ffffff", size: "xs" }] },
      body: {
        type: "box", layout: "vertical",
        contents: [
          { type: "text", text: title, weight: "bold", size: "lg", margin: "md", wrap: true, color: "#1e293b" },
          { type: "separator", margin: "lg" },
          { type: "box", layout: "vertical", margin: "lg", spacing: "sm", contents: detailsContent }
        ]
      },
      footer: {
        type: "box", layout: "vertical", spacing: "sm",
        contents: [{ type: "button", style: "primary", height: "sm", color: color, action: { type: "uri", label: "เปิดแอป SafetyOS", uri: actionUrl } }]
      }
    }
  };
};

const createGasTestFlex = (permitNo: string, testerName: string, o2: number, lel: number, co: number, h2s: number, actionUrl: string) => {
  return {
    type: "flex",
    altText: `ผลตรวจวัดสภาพอากาศ: ${permitNo}`,
    contents: {
      type: "bubble",
      header: {
        type: "box", layout: "vertical", backgroundColor: "#0891b2", 
        contents: [{ type: "text", text: "Atmospheric Test Report", weight: "bold", color: "#ffffff", size: "xs" }]
      },
      body: {
        type: "box", layout: "vertical",
        contents: [
          { type: "text", text: "บันทึกผลตรวจวัดก๊าซหน้างาน", weight: "bold", size: "lg", margin: "md", wrap: true, color: "#1e293b" },
          { type: "separator", margin: "lg" },
          { type: "box", layout: "vertical", margin: "lg", spacing: "sm", contents: [
            { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "เลขที่:", color: "#aaaaaa", size: "sm", flex: 2 }, { type: "text", text: permitNo, color: "#333333", size: "sm", weight: "bold", flex: 5 }] },
            { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "ผู้ตรวจ:", color: "#aaaaaa", size: "sm", flex: 2 }, { type: "text", text: testerName, color: "#666666", size: "sm", flex: 5 }] },
            { type: "box", layout: "baseline", spacing: "sm", margin: "md", contents: [{ type: "text", text: "O2:", color: "#aaaaaa", size: "sm", flex: 2 }, { type: "text", text: `${o2} %`, color: o2 >= 19.5 && o2 <= 23.5 ? "#059669" : "#e11d48", weight: "bold", size: "md", flex: 5 }] },
            { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "LEL:", color: "#aaaaaa", size: "sm", flex: 2 }, { type: "text", text: `${lel} %`, color: lel < 10 ? "#059669" : "#e11d48", weight: "bold", size: "md", flex: 5 }] },
            { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "CO:", color: "#aaaaaa", size: "sm", flex: 2 }, { type: "text", text: `${co} ppm`, color: co < 25 ? "#059669" : "#e11d48", weight: "bold", size: "md", flex: 5 }] },
            { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "H2S:", color: "#aaaaaa", size: "sm", flex: 2 }, { type: "text", text: `${h2s} ppm`, color: h2s < 10 ? "#059669" : "#e11d48", weight: "bold", size: "md", flex: 5 }] }
          ]}
        ]
      },
      footer: {
        type: "box", layout: "vertical", spacing: "sm",
        contents: [{ type: "button", style: "primary", height: "sm", color: "#0891b2", action: { type: "uri", label: "ดูรายละเอียดในแอป", uri: actionUrl } }]
      }
    }
  };
};

const sendFlexPush = async (targetLineId: string, flexMessage: any) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN || !targetLineId) return;
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
      body: JSON.stringify({ to: targetLineId, messages: [flexMessage] })
    });
    if (response.ok) console.log(`✅ ส่ง Flex Message หา ${targetLineId} สำเร็จ`);
    else console.error(`❌ ส่ง Flex Message พลาด:`, await response.text());
  } catch (error) {
    console.error("❌ LINE Push Error:", error);
  }
};

fastify.get('/', async (request, reply) => {
  return { status: 'OK', message: 'Enterprise Safety Backend is Running!' };
});

// 🚀 ========================================================
// 🔐 ระบบ LOGIN
// ========================================================
fastify.post('/login/line', async (request: any, reply) => {
  const { line_id, picture_url } = request.body;
  try {
    if (!line_id) return reply.status(400).send({ error: 'ไม่พบ LINE ID' });
    let user = await prisma.user.findFirst({ where: { line_id: line_id } });
    if (!user) return reply.status(401).send({ error: 'ยังไม่ได้ผูกบัญชี LINE' });

    if (picture_url && user.profile_url !== picture_url) {
      user = await prisma.user.update({ where: { id: user.id }, data: { profile_url: picture_url } });
    }
    return { message: 'เข้าสู่ระบบอัตโนมัติสำเร็จ', user };
  } catch (error) {
    return reply.status(500).send({ error: 'เกิดข้อผิดพลาดในระบบเซิร์ฟเวอร์' });
  }
});

fastify.post('/login', async (request: any, reply) => {
  const { username, password, line_id, picture_url } = request.body;
  try {
    let user = await prisma.user.findFirst({ where: { username: username, password: password } });
    if (!user) return reply.status(401).send({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!' });

    if (line_id) {
      const needUpdateLine = !user.line_id;
      const needUpdatePic = picture_url && user.profile_url !== picture_url;
      if (needUpdateLine || needUpdatePic) {
        user = await prisma.user.update({ where: { id: user.id }, data: { line_id: line_id, profile_url: picture_url || user.profile_url } });
      }
    }
    return { message: 'เข้าสู่ระบบสำเร็จ', user };
  } catch (error) {
    return reply.status(500).send({ error: 'เกิดข้อผิดพลาดในระบบเซิร์ฟเวอร์' });
  }
});

// ========================================================
// 🌱 SEED DATA
// ========================================================
fastify.get('/seed', async (request, reply) => {
  try {
    await prisma.confinedSpaceEntry.deleteMany(); 
    await prisma.bbsObservation.deleteMany();
    await prisma.approvalLog.deleteMany();
    await prisma.permitAttachment.deleteMany();
    await prisma.permit_gas_logs.deleteMany(); 
    await prisma.permit_hazard_details.deleteMany(); 
    await prisma.permits_v2.deleteMany();
    await prisma.certificate.deleteMany(); 
    await prisma.trainingRecord.deleteMany(); 
    await prisma.incidentReport.deleteMany(); 
    await prisma.examQuestion.deleteMany(); 
    await prisma.course.deleteMany(); 
    await prisma.equipmentInspectionLog.deleteMany(); 
    await prisma.equipment.deleteMany(); 
    await prisma.user.deleteMany();

    const contractor = await prisma.user.create({ data: { full_name: 'สมชาย ใจสู้', department: 'บจก. ผู้รับเหมาดีเด่น', role: 'CONTRACTOR', username: 'somchai', password: '1234' } });
    const areaOwner = await prisma.user.create({ data: { full_name: 'พี่สมศักดิ์ คุมโซน', department: 'Production Zone A', role: 'AREA_OWNER', username: 'somsak', password: '1234' } });
    const safety = await prisma.user.create({ data: { full_name: 'คุณวิว (View Nitad)', department: 'Safety & Environment', role: 'SAFETY_ENGINEER', username: 'view', password: '1234' } });

    const course1 = await prisma.course.create({ data: { title: 'ปฐมนิเทศความปลอดภัย MTT', description: 'ข้อกำหนดความปลอดภัยเบื้องต้นก่อนเข้าพื้นที่', passing_score: 80 } });

    await prisma.examQuestion.create({ data: { course_id: course1.id, question: 'ข้อใดคือสิ่งแรกที่ต้องทำเมื่อได้ยินเสียงเตือนอพยพ?', choices: ['วิ่งหนีกลับบ้าน', 'หยุดเครื่องจักรแล้วไปจุดรวมพล', 'โทรหาหัวหน้า', 'แอบในห้องน้ำ'], answer: 'หยุดเครื่องจักรแล้วไปจุดรวมพล' }});

    await prisma.equipment.createMany({
      data: [
        { qr_code: 'EXT-001', name: 'ถังดับเพลิงชนิดผงเคมีแห้ง โซน A', type: 'FIRE_EXTINGUISHER', status: 'NORMAL' },
        { qr_code: 'SCAF-001', name: 'นั่งร้านเหล็ก ซ่อมบำรุง Tank 01', type: 'SCAFFOLDING', status: 'NORMAL' },
      ]
    });

    await prisma.incidentReport.create({
      data: { reporter_id: contractor.id, title: 'พบนั่งร้านชำรุด ขาโก่ง', description: 'นั่งร้านชั้น 2 บริเวณ Tank Farm A ขาโก่งงอ เสี่ยงต่อการทรุดตัวครับ', type: 'UNSAFE_CONDITION', lat: 12.678123, lng: 101.256456, image_url: 'https://example.com/scaffold-danger.jpg', status: 'OPEN' }
    });

    return { message: '🎉 เสกข้อมูลผู้ใช้งานเรียบร้อย!', users: { contractor, areaOwner, safety } };
  } catch (error: any) {
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
  return await prisma.bbsObservation.findMany({ include: { observer: true }, orderBy: { created_at: 'desc' } });
});

fastify.post('/bbs', async (request, reply) => {
  const { location, observed_group, behavior_type, category, action_taken, description, root_cause, suggestion, observer_id, date } = request.body as any;
  try {
    const bbs = await prisma.bbsObservation.create({
      data: { date: date ? new Date(date) : new Date(), location, observed_group, behavior_type, category, action_taken, description, root_cause: root_cause || null, suggestion: suggestion || null, observer_id }
    });
    return reply.send(bbs);
  } catch (error) {
    return reply.status(500).send({ error: 'ไม่สามารถบันทึกข้อมูล BBS ได้' });
  }
});

// ========================================================
// 🕳️ MODULE: Confined Space Board 
// ========================================================
fastify.get('/confined-space/active-permits', async (request, reply) => {
  return await prisma.permits_v2.findMany({ where: { permit_type: 'CONFINED_SPACE', status: 'APPROVED' }, orderBy: { created_at: 'desc' } });
});

fastify.get('/confined-space/:permit_id/entries', async (request, reply) => {
  const { permit_id } = request.params as { permit_id: string };
  return await prisma.confinedSpaceEntry.findMany({ where: { permit_id: permit_id }, orderBy: { time_in: 'desc' } });
});

fastify.post('/confined-space/in', async (request, reply) => {
  const body = request.body as any;
  try { return await prisma.confinedSpaceEntry.create({ data: body }); } 
  catch (error) { return reply.status(500).send({ error: 'ไม่สามารถ Check-in ได้' }); }
});

fastify.put('/confined-space/out/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  try { return await prisma.confinedSpaceEntry.update({ where: { id: id }, data: { status: 'OUTSIDE', time_out: new Date() } }); } 
  catch (error) { return reply.status(500).send({ error: 'ไม่สามารถ Check-out ได้' }); }
});

fastify.post('/confined-space/evacuate', async (request: any, reply) => {
  const { permit_id, triggered_by } = request.body as any;
  try {
    await prisma.confinedSpaceEntry.updateMany({ where: { permit_id: permit_id, status: 'INSIDE' }, data: { status: 'OUTSIDE', time_out: new Date() } });
    const permit = await prisma.permits_v2.findUnique({ where: { id: permit_id }});
    const msg = `🚨🚨 [EMERGENCY EVACUATION] 🚨🚨\nหัวข้องาน: ${permit?.title}\nพื้นที่: ${permit?.location_detail}\nสั่งโดย: ${triggered_by}\n\n⚠️ มีการสั่งอพยพพนักงานออกจากที่อับอากาศทั้งหมดทันที โปรดตรวจสอบความปลอดภัยหน้างานด่วน!`;
    await sendLineMessage(msg);
    return { message: 'สั่งอพยพและส่งแจ้งเตือนสำเร็จ!' };
  } catch (error) {
    return reply.status(500).send({ error: 'ไม่สามารถสั่งอพยพได้' });
  }
});

// ========================================================
// 🎓 MODULE 1: ระบบอบรม & ใบ Cert.
// ========================================================
fastify.get('/certificates', async (request, reply) => { return await prisma.certificate.findMany({ include: { user: true }, orderBy: { created_at: 'desc' } }); });
fastify.post('/certificates', async (request, reply) => { const body = request.body as any; return await prisma.certificate.create({ data: { user_id: body.user_id, cert_name: body.cert_name, file_url: body.file_url, issued_date: new Date(body.issued_date), expiry_date: new Date(body.expiry_date), status: 'PENDING' } }); });
fastify.put('/certificates/:id/verify', async (request, reply) => { const { id } = request.params as { id: string }; const body = request.body as any; return await prisma.certificate.update({ where: { id: id }, data: { status: body.status } }); });

fastify.get('/courses', async (request: any, reply) => {
  const { user_id } = request.query; 

  try {
    const courses = await prisma.course.findMany({ orderBy: { created_at: 'desc' } });
    if (!user_id) return courses;

    let userRecords: any[] = [];
    try {
      userRecords = await prisma.trainingRecord.findMany({
        where: { user_id: String(user_id) }
      });
    } catch (e) {
      console.error("Record fetching failed, but continuing...");
    }

    const mappedCourses = courses.map((course) => {
      const record = userRecords.find(r => r.course_id === course.id);
      const isPassed = record?.passed || false;

      return {
        id: course.id,
        title: course.title,
        description: course.description || '',
        video_url: course.video_url || '',
        thumbnail: course.thumbnail || '',
        duration: course.duration || '',
        status: isPassed ? 'COMPLETED' : 'REQUIRED', 
        progress: isPassed ? 100 : 0
      };
    });

    return mappedCourses;
  } catch (error: any) {
    console.error("🚨 Courses API Error:", error);
    return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
  }
});

fastify.get('/courses/:id/questions', async (request: any, reply) => {
  const { id } = request.params;
  try {
    const questions = await prisma.examQuestion.findMany({
      where: { course_id: id }
    });
    return reply.send(questions);
  } catch (error) {
    console.error("Fetch Questions Error:", error);
    return reply.status(500).send({ error: 'ดึงข้อมูลข้อสอบไม่สำเร็จ' });
  }
});

fastify.post('/training-records', async (request, reply) => {
  const { user_id, course_id, score } = request.body as any;
  try {
    const course = await prisma.course.findUnique({ where: { id: course_id } });
    if (!course) return reply.status(404).send({ error: 'ไม่พบวิชาที่สอบ' });
    const isPassed = score >= course.passing_score;
    const record = await prisma.trainingRecord.create({ data: { user_id, course_id, score, passed: isPassed } });
    
    if (isPassed) {
      const existingCert = await prisma.certificate.findFirst({
        where: { user_id: user_id, cert_name: course.title }
      });
      if (!existingCert) {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        await prisma.certificate.create({
          data: {
            user_id: user_id,
            cert_name: course.title,
            file_url: 'AUTO_GENERATED',
            issued_date: new Date(),
            expiry_date: expiryDate,
            status: 'APPROVED'
          }
        });
      }
    }
    
    return { message: isPassed ? 'ยินดีด้วย สอบผ่าน!' : 'เสียใจด้วย สอบไม่ผ่าน', record, isPassed };
  } catch (error) { return reply.status(500).send({ error: 'ไม่สามารถบันทึกคะแนนสอบได้' }); }
});

// ========================================================
// ⚠️ MODULE 2: ระบบแจ้งจุดเสี่ยง (Incident Report)
// ========================================================
fastify.get('/incidents', async (request, reply) => { return await prisma.incidentReport.findMany({ include: { reporter: true }, orderBy: { created_at: 'desc' } }); });
fastify.post('/incidents', async (request, reply) => {
  const body = request.body as any;
  try {
    const newIncident = await prisma.incidentReport.create({
      data: { reporter_id: body.reporter_id, title: body.title, description: body.description, type: body.type, lat: body.lat, lng: body.lng, image_url: body.image_url, status: 'OPEN' }
    });
    const reporter = await prisma.user.findUnique({ where: { id: body.reporter_id } });
    const incidentTypeTH = body.type === 'NEAR_MISS' ? '⚠️ Near Miss' : body.type === 'UNSAFE_ACT' ? '🚫 Unsafe Act' : '🏭 Unsafe Condition';
    const msg = `🚨 แจ้งเตือนจุดเสี่ยงใหม่ (SafetyOS) 🚨\nหัวข้อ: ${body.title}\nประเภท: ${incidentTypeTH}\nผู้แจ้ง: ${reporter?.full_name || 'ไม่ระบุ'}\nรายละเอียด: ${body.description}`;
    await sendLineMessage(msg, body.image_url);
    return newIncident;
  } catch (error) { return reply.status(500).send({ error: 'ไม่สามารถบันทึกข้อมูลแจ้งจุดเสี่ยงได้' }); }
});
fastify.put('/incidents/:id/status', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { status } = request.body as any;
  try {
    const updatedIncident = await prisma.incidentReport.update({ where: { id: id }, data: { status: status } });
    return updatedIncident;
  } catch (error) { return reply.status(500).send({ error: 'ไม่สามารถอัปเดตสถานะจุดเสี่ยงได้' }); }
});

// ========================================================
// 📝 MODULE 3: ระบบ E-Permit V2 & Gas Testing
// ========================================================

fastify.get('/permits', async (request, reply) => {
  try {
    const permits = await prisma.permits_v2.findMany({
      include: { 
        applicant: true, 
        approval_logs: { include: { approver: true } }, 
        gas_logs: true,
        hazard_details: true,
        attachments: true
      },
      orderBy: { created_at: 'desc' }
    });

    // Flatten data ให้หน้าบ้านไม่พัง (ยุบรวม Hazard เข้ากับก้อนหลัก)
    const formattedData = permits.map(p => {
      const hazardInfo = p.hazard_details?.[0] || {};
      const attached_file = p.attachments?.[0]?.public_url || null;
      
      const { hazard_details, attachments, ...rest } = p as any;
      return { ...rest, ...hazardInfo, attached_file }; 
    });

    return formattedData;
  } catch (error: any) {
    console.error("GET PERMITS ERR:", error);
    return reply.status(500).send({ error: 'ดึงข้อมูลล้มเหลว' });
  }
});

fastify.post('/permits', async (request, reply) => {
  const body = request.body as any;
  try {
    const permitNo = `PTW-${new Date().getFullYear()}${new Date().getMonth()+1}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. สร้าง Permit หลัก
    const newPermit = await prisma.permits_v2.create({
      data: {
        permit_number: permitNo,
        title: body.title || 'ไม่มีหัวข้อ', 
        description: body.description, 
        permit_type: body.permit_type || 'COLD_WORK', 
        status: 'PENDING_AREA_OWNER', 
        location_detail: body.location_detail || 'ไม่ระบุพื้นที่',
        start_time: new Date(body.start_time), 
        end_time: new Date(body.end_time), 
        applicant_id: body.applicant_id,
        // ยัดข้อมูล Checklists ลง JSON
        work_sub_type: body.work_sub_type || [],
        tools_equipment: body.tools_equipment || [],
        safety_measures: body.safety_measures || [],
        ppe_required: body.ppe_required || ['HARD_HAT', 'SAFETY_SHOES'] // Default PPE
      }
    });

    // 2. บันทึกรายละเอียดความเสี่ยง (Dynamic Fields)
    const hazardousTypes = ['HOT_WORK', 'CONFINED_SPACE', 'WORKING_AT_HEIGHT', 'ELECTRICAL'];
    if (hazardousTypes.includes(body.permit_type)) {
      await prisma.permit_hazard_details.create({
        data: {
          permit_id: newPermit.id,
          supervisor_name: body.supervisor_name,
          gas_tester_name: body.gas_tester_name,
          standby_person_name: body.standby_person_name,
          rescuer_name: body.rescuer_name, // สำหรับอับอากาศ
          height_level: body.height_level ? parseFloat(body.height_level) : null, // สำหรับที่สูง
          communication_method: body.communication_method,
          fire_extinguisher: body.fire_extinguisher || null,
          rescue_plan_url: body.rescue_plan_url,
          is_med_cert_verified: body.is_med_cert_verified || false,
          is_loto_required: body.is_loto_required || false
        }
      });
    }

    // (ส่วนบันทึกไฟล์แนบ และส่ง LINE ยังคงเดิม ไม่ต้องแก้)
    
    return reply.send(newPermit);
  } catch (error: any) {
    console.error("🚨 ERROR CREATE PERMIT:\n", error);
    return reply.status(500).send({ error: `เซิร์ฟเวอร์ขัดข้อง: ${error.message}` });
  }
});

fastify.post('/gas-logs', async (request, reply) => {
  const body = request.body as any;
  try {
    const tester = await prisma.user.findUnique({ where: { id: body.tester_id } });
    const newLog = await prisma.permit_gas_logs.create({
      data: {
        permit_id: body.permit_id,
        inspector_name: tester?.full_name || 'ผู้ตรวจสอบ',
        o2_level: body.o2_level,
        lel_level: body.lel_level,
        co_level: body.co_level,
        h2s_level: body.h2s_level
      }
    });

    const permit = await prisma.permits_v2.findUnique({ where: { id: body.permit_id } });

    if (permit) {
      const flex = createGasTestFlex(permit.permit_number, tester?.full_name || 'ผู้ตรวจสอบ', body.o2_level, body.lel_level, body.co_level, body.h2s_level, `${WEB_APP_URL}?page=E_PERMIT`);
      
      const notifyUsers = await prisma.user.findMany({ where: { role: { in: ['AREA_OWNER', 'SAFETY_ENGINEER'] }, line_id: { not: null } } });
      for (const user of notifyUsers) {
        if (user.line_id) await sendFlexPush(user.line_id, flex);
      }
      await sendFlexPush(LINE_TARGET_ID, flex);
    }

    return reply.send({ message: 'บันทึกข้อมูลก๊าซสำเร็จ', data: newLog });
  } catch (error: any) { return reply.status(500).send({ error: 'ไม่สามารถบันทึกข้อมูลก๊าซได้', details: error.message }); }
});

fastify.get('/permits/:id/gas-logs', async (request, reply) => {
  const { id } = request.params as { id: string };
  try { return reply.send(await prisma.permit_gas_logs.findMany({ where: { permit_id: id }, orderBy: { recorded_at: 'desc' } })); } 
  catch (error: any) { return reply.status(500).send({ error: 'ไม่สามารถดึงข้อมูลก๊าซได้' }); }
});

fastify.put('/permits/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = request.body as any; 
  try {
    const updatedPermit = await prisma.permits_v2.update({ where: { id: id }, data: { status: body.status } });
    
    if (body.approver_id) {
      await prisma.approvalLog.create({ data: { permit_id: id, approver_id: body.approver_id, action: body.status, comment: body.comment || '-' } });
    }

    const applicant = await prisma.user.findUnique({ where: { id: updatedPermit.applicant_id || '' } });

    if (body.status === 'PENDING_SAFETY') {
      const safetyUsers = await prisma.user.findMany({ where: { role: 'SAFETY_ENGINEER', line_id: { not: null } } });
      const flex = createPermitFlex("เจ้าของพื้นที่อนุมัติแล้ว รอ จป. ตรวจสอบ", updatedPermit.permit_number, "🟦 รอ จป. อนุมัติขั้นสุดท้าย", updatedPermit.location_detail, applicant?.full_name || '-', "#2563eb", `${WEB_APP_URL}?page=E_PERMIT`);
      for (const user of safetyUsers) if (user.line_id) await sendFlexPush(user.line_id, flex);
    } 
    else if (body.status === 'APPROVED') {
      const flex = createPermitFlex("จป. อนุมัติเรียบร้อย", updatedPermit.permit_number, "✅ อนุมัติสมบูรณ์ (เริ่มงานได้)", updatedPermit.location_detail, applicant?.full_name || '-', "#059669", `${WEB_APP_URL}?page=E_PERMIT`);
      if (applicant?.line_id) await sendFlexPush(applicant.line_id, flex);
      await sendFlexPush(LINE_TARGET_ID, flex);
    } 
    else if (body.status === 'REJECTED') {
      if (applicant?.line_id) {
        const flex = createPermitFlex("คำขออนุญาตถูกปฏิเสธ", updatedPermit.permit_number, "❌ ไม่อนุมัติ", updatedPermit.location_detail, applicant.full_name, "#e11d48", `${WEB_APP_URL}?page=E_PERMIT`, body.comment || "ผิดมาตรการความปลอดภัย");
        await sendFlexPush(applicant.line_id, flex);
      }
    }

    return updatedPermit;
  } catch (error) {
    return reply.status(500).send({ error: 'ไม่สามารถอัปเดตสถานะได้' });
  }
});

fastify.put('/permits/:id/extend', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { new_end_time, reason, requested_by } = request.body as any;
  
  try {
    const permit = await prisma.permits_v2.findUnique({ where: { id }, include: { applicant: true } });
    if (!permit) return reply.status(404).send({ error: 'ไม่พบ Permit' });

    const updatedPermit = await prisma.permits_v2.update({
      where: { id }, data: { end_time: new Date(new_end_time), extension_reason: reason }
    });

    const newTimeStr = new Date(new_end_time).toLocaleString('th-TH', { 
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const flex = createPermitFlex(
      "แจ้งขอขยายเวลาทำงานหน้างาน", 
      permit.permit_number, 
      "⏳ ขยายเวลา (ทำงานต่อ)", 
      permit.location_detail, 
      requested_by || permit.applicant?.full_name || '-', 
      "#9333ea", 
      `${WEB_APP_URL}?page=E_PERMIT`,
      `เหตุผล: ${reason} (เวลาใหม่: ${newTimeStr} น.)` 
    );

    const approvers = await prisma.user.findMany({ where: { role: { in: ['AREA_OWNER', 'SAFETY_ENGINEER'] }, line_id: { not: null } } });
    for (const user of approvers) {
      if (user.line_id) await sendFlexPush(user.line_id, flex);
    }

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
    const equipment = await prisma.equipment.findUnique({ where: { qr_code: qr }, include: { logs: { orderBy: { created_at: 'desc' }, include: { inspector: true } } } });
    if (!equipment) return reply.status(404).send({ error: 'ไม่พบอุปกรณ์รหัสนี้' });
    const result = { ...equipment, history: equipment.logs ? equipment.logs.map((log: any) => ({ ...log, inspector_name: log.inspector ? log.inspector.full_name : 'ไม่ระบุชื่อ' })) : [] };
    return result;
  } catch (error) { return reply.status(500).send({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลอุปกรณ์' }); }
});

fastify.put('/equipment/:id/inspect', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { status, inspector_id, details } = request.body as any;
  try {
    const [updatedEquipment, newLog] = await prisma.$transaction([
      prisma.equipment.update({ where: { id: id }, data: { status: status } }),
      prisma.equipmentInspectionLog.create({ data: { equipment_id: id, inspector_id: inspector_id, status: status, details: details || "{}" } })
    ]);
    return updatedEquipment;
  } catch (error) { return reply.status(500).send({ error: 'ไม่สามารถอัปเดตสถานะอุปกรณ์ได้' }); }
});

// ========================================================
// 📊 MODULE 5: Executive Dashboard 
// ========================================================
fastify.get('/dashboard', async (request, reply) => {
  try {
    const totalPermits = await prisma.permits_v2.count();
    const pendingPermits = await prisma.permits_v2.count({ where: { status: { startsWith: 'PENDING' } } });
    const openIncidents = await prisma.incidentReport.count({ where: { status: 'OPEN' } });
    const defectiveEquip = await prisma.equipment.count({ where: { status: 'DEFECTIVE' } });
    const totalUsers = await prisma.user.count();
    const permitGroups = await prisma.permits_v2.groupBy({ by: ['permit_type'], _count: { permit_type: true } });
    const recentIncidents = await prisma.incidentReport.findMany({ take: 3, orderBy: { created_at: 'desc' }, include: { reporter: true } });
    return { stats: { totalPermits, pendingPermits, openIncidents, defectiveEquip, totalUsers }, permitGroups, recentIncidents };
  } catch (error) { return reply.status(500).send({ error: 'ไม่สามารถดึงข้อมูล Dashboard ได้' }); }
});

// 🚀 สั่งรันแอปให้รองรับ Cloud Deployment
const start = async () => {
  try {
    const PORT = Number(process.env.PORT) || 3000;
    const HOST = '0.0.0.0'; 
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Enterprise Safety Backend is running at http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();