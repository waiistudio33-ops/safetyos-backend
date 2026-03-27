import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const fastify = Fastify({ logger: true });

// 🚀 ==========================================
// ⚙️ ตั้งค่า CORS (ให้หน้าบ้านคุยได้)
// ==========================================
fastify.register(cors, { 
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// 🚀 ==========================================
// 🔔 ตั้งค่า LINE Messaging API & Flex Messages
// ==========================================
const LINE_CHANNEL_ACCESS_TOKEN = 'x9a6p21XJ5EptgMfXJ/AfyF8XvHh1ilsX7xOE7lpuAnJ+cSgFkNb5MLR5lYYqVhj98amxtXn1hW2ZWzejlH+2rUAYjCm1u5jO7UvnYVc0Olll3bJY/U/buSf5ajLKjBTMHen053xMQwMP/myAjIk3wdB04t89/1O/w1cDnyilFU='; 
const LINE_TARGET_ID = 'Ua3742ef5e75e2896265de81da0318262'; 
const WEB_APP_URL = process.env.FRONTEND_URL || 'https://liff.line.me/2009277207-jNY8QghJ'; 

const sendLineMessage = async (textMessage: string, attachmentUrl: string | null = null) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_TARGET_ID) return;
    const messages: any[] = [{ type: 'text', text: attachmentUrl ? `${textMessage}\n\n📄 ดูเอกสารแนบ:\n${attachmentUrl}` : textMessage }];
    if (attachmentUrl?.match(/\.(jpeg|jpg|png|webp)(\?.*)?$/i)) {
      messages.push({ type: 'image', originalContentUrl: attachmentUrl, previewImageUrl: attachmentUrl });
    }
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
      body: JSON.stringify({ to: LINE_TARGET_ID, messages })
    });
  } catch (error) { console.error('❌ LINE Send Error:', error); }
};

const createPermitFlex = (title: string, permitNo: string, status: string, location: string, applicant: string, color: string, actionUrl: string, extraNote: string | null = null) => {
  const detailsContent: any[] = [
    { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "เลขที่:", color: "#aaaaaa", size: "sm", flex: 1 }, { type: "text", text: permitNo, wrap: true, color: "#333333", size: "sm", weight: "bold", flex: 3 }] },
    { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "พื้นที่:", color: "#aaaaaa", size: "sm", flex: 1 }, { type: "text", text: location, wrap: true, color: "#666666", size: "sm", flex: 3 }] },
    { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "สถานะ:", color: "#aaaaaa", size: "sm", flex: 1 }, { type: "text", text: status, wrap: true, color: color, weight: "bold", size: "sm", flex: 3 }] },
    { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "ผู้ขอ:", color: "#aaaaaa", size: "sm", flex: 1 }, { type: "text", text: applicant, wrap: true, color: "#666666", size: "sm", flex: 3 }] }
  ];
  if (extraNote) detailsContent.push({ type: "box", layout: "baseline", spacing: "sm", margin: "md", contents: [{ type: "text", text: "หมายเหตุ:", color: "#e11d48", size: "sm", flex: 1, weight: "bold" }, { type: "text", text: extraNote, wrap: true, color: "#e11d48", size: "sm", flex: 3 }] });

  return {
    type: "flex", altText: `Permit: ${permitNo} - ${status}`,
    contents: {
      type: "bubble",
      header: { type: "box", layout: "vertical", backgroundColor: color, contents: [{ type: "text", text: "SafetyOS Notification", weight: "bold", color: "#ffffff", size: "xs" }] },
      body: { type: "box", layout: "vertical", contents: [{ type: "text", text: title, weight: "bold", size: "lg", margin: "md", wrap: true, color: "#1e293b" }, { type: "separator", margin: "lg" }, { type: "box", layout: "vertical", margin: "lg", spacing: "sm", contents: detailsContent }] },
      footer: { type: "box", layout: "vertical", spacing: "sm", contents: [{ type: "button", style: "primary", height: "sm", color: color, action: { type: "uri", label: "เปิดแอป SafetyOS", uri: actionUrl } }] }
    }
  };
};

const createGasTestFlex = (permitNo: string, testerName: string, o2: number, lel: number, co: number, h2s: number, actionUrl: string) => {
  return {
    type: "flex", altText: `ผลตรวจก๊าซ: ${permitNo}`,
    contents: {
      type: "bubble",
      header: { type: "box", layout: "vertical", backgroundColor: "#0891b2", contents: [{ type: "text", text: "Atmospheric Test Report", weight: "bold", color: "#ffffff", size: "xs" }] },
      body: {
        type: "box", layout: "vertical",
        contents: [
          { type: "text", text: "บันทึกผลตรวจวัดก๊าซหน้างาน", weight: "bold", size: "lg", margin: "md", wrap: true, color: "#1e293b" },
          { type: "separator", margin: "lg" },
          { type: "box", layout: "vertical", margin: "lg", spacing: "sm", contents: [
            { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "เลขที่:", color: "#aaaaaa", size: "sm", flex: 2 }, { type: "text", text: permitNo, color: "#333333", size: "sm", weight: "bold", flex: 5 }] },
            { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "ผู้ตรวจ:", color: "#aaaaaa", size: "sm", flex: 2 }, { type: "text", text: testerName, color: "#666666", size: "sm", flex: 5 }] },
            { type: "box", layout: "baseline", spacing: "sm", margin: "md", contents: [{ type: "text", text: "O2:", color: "#aaaaaa", size: "sm", flex: 2 }, { type: "text", text: `${o2} %`, color: o2 >= 19.5 && o2 <= 23.5 ? "#059669" : "#e11d48", weight: "bold", size: "md", flex: 5 }] },
            { type: "box", layout: "baseline", spacing: "sm", contents: [{ type: "text", text: "LEL:", color: "#aaaaaa", size: "sm", flex: 2 }, { type: "text", text: `${lel} %`, color: lel < 10 ? "#059669" : "#e11d48", weight: "bold", size: "md", flex: 5 }] }
          ]}
        ]
      },
      footer: { type: "box", layout: "vertical", spacing: "sm", contents: [{ type: "button", style: "primary", height: "sm", color: "#0891b2", action: { type: "uri", label: "ดูรายละเอียดในแอป", uri: actionUrl } }] }
    }
  };
};

const sendFlexPush = async (targetLineId: string, flexMessage: any) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN || !targetLineId) return;
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
      body: JSON.stringify({ to: targetLineId, messages: [flexMessage] })
    });
    if (!res.ok) console.error(`❌ ส่ง Flex พลาด:`, await res.text());
  } catch (error) { console.error("❌ LINE Push Error:", error); }
};

fastify.get('/', async () => ({ status: 'OK', message: 'Enterprise Safety Backend is Running!' }));

// 🚀 ========================================================
// 🔐 MODULE: ระบบ LOGIN
// ========================================================
fastify.post('/login/line', async (request: any, reply) => {
  const { line_id, picture_url } = request.body;
  try {
    if (!line_id) return reply.status(400).send({ error: 'ไม่พบ LINE ID' });
    let user = await prisma.user.findFirst({ where: { line_id } });
    if (!user) return reply.status(401).send({ error: 'ยังไม่ได้ผูกบัญชี LINE' });
    if (picture_url && user.profile_url !== picture_url) {
      user = await prisma.user.update({ where: { id: user.id }, data: { profile_url: picture_url } });
    }
    return { message: 'เข้าสู่ระบบสำเร็จ', user };
  } catch (error) { return reply.status(500).send({ error: 'Server Error' }); }
});

fastify.post('/login', async (request: any, reply) => {
  const { username, password, line_id, picture_url } = request.body;
  try {
    let user = await prisma.user.findFirst({ where: { username, password } });
    if (!user) return reply.status(401).send({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!' });
    if (line_id && (!user.line_id || user.profile_url !== picture_url)) {
      user = await prisma.user.update({ where: { id: user.id }, data: { line_id, profile_url: picture_url || user.profile_url } });
    }
    return { message: 'เข้าสู่ระบบสำเร็จ', user };
  } catch (error) { return reply.status(500).send({ error: 'Server Error' }); }
});

fastify.get('/users', async () => await prisma.user.findMany());

// 🚀 ========================================================
// 🌱 MODULE: SEED DATA (ล้างข้อมูลเก่า + สร้างใหม่)
// ========================================================
fastify.get('/seed', async (request, reply) => {
  try {
    // ลบข้อมูลจากตารางใหม่ทั้งหมดก่อนกัน Error Foreign Key
    await prisma.permitWorker.deleteMany(); 
    await prisma.permitDailyInspection.deleteMany(); 
    await prisma.permitExtension.deleteMany();
    await prisma.confinedSpaceEntry.deleteMany(); 
    await prisma.bbsObservation.deleteMany();
    await prisma.approvalLog.deleteMany();
    await prisma.permitAttachment.deleteMany();
    await prisma.permit_gas_logs.deleteMany(); 
    await prisma.permit_hazard_details.deleteMany(); 
    await prisma.loto_records_v2.deleteMany(); 
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

    const course1 = await prisma.course.create({ data: { title: 'ปฐมนิเทศความปลอดภัย MTT', description: 'ข้อกำหนดความปลอดภัยเบื้องต้น', passing_score: 80 } });
    await prisma.examQuestion.create({ data: { course_id: course1.id, question: 'ข้อใดคือสิ่งแรกที่ต้องทำเมื่อได้ยินเสียงเตือนอพยพ?', choices: ['วิ่งหนี', 'หยุดเครื่องจักรแล้วไปจุดรวมพล', 'โทรหาหัวหน้า', 'แอบ'], answer: 'หยุดเครื่องจักรแล้วไปจุดรวมพล' }});

    await prisma.equipment.createMany({ data: [{ qr_code: 'EXT-001', name: 'ถังดับเพลิง โซน A', type: 'FIRE_EXTINGUISHER' }, { qr_code: 'SCAF-001', name: 'นั่งร้าน Tank 01', type: 'SCAFFOLDING' }] });

    await prisma.incidentReport.create({ data: { reporter_id: contractor.id, title: 'นั่งร้านชำรุด', description: 'นั่งร้านชั้น 2 ขาโก่งงอ', type: 'UNSAFE_CONDITION', lat: 12.678, lng: 101.256, status: 'OPEN' } });

    return { message: '🎉 เสกข้อมูลผู้ใช้งานเรียบร้อย!', users: { contractor, areaOwner, safety } };
  } catch (error: any) { return reply.status(500).send({ error: 'เสกข้อมูลพลาด', details: error.message }); }
});

// 🚀 ========================================================
// 📝 MODULE: E-PERMIT V2 & GAS TESTING
// ========================================================
fastify.get('/permits', async (request, reply) => {
  try {
    const permits = await prisma.permits_v2.findMany({
      include: { 
        applicant: true, 
        approval_logs: { include: { approver: true } }, 
        gas_logs: true,
        hazard_details: true,
        attachments: true,
        loto_records: true,
        workers: true,       // 🟢 โหลดรายชื่อผู้ปฏิบัติงาน
        extensions: true     // 🟢 โหลดประวัติการต่อเวลา
      },
      orderBy: { created_at: 'desc' }
    });

    // Flatten data เพื่อให้เข้ากับระบบ Frontend
    return permits.map(p => {
      const hazardInfo = p.hazard_details?.[0] || {};
      const attached_file = p.attachments?.[0]?.public_url || null;
      const { hazard_details, attachments, ...rest } = p as any;
      return { ...rest, ...hazardInfo, attached_file }; 
    });
  } catch (error) { return reply.status(500).send({ error: 'ดึงข้อมูลล้มเหลว' }); }
});

fastify.post('/permits', async (request, reply) => {
  const body = request.body as any;
  try {
    const finalType = ['COLD_WORK', 'HOT_WORK', 'CONFINED_SPACE', 'WORKING_AT_HEIGHT', 'ELECTRICAL'].includes(body.permit_type) ? body.permit_type : 'COLD_WORK';
    const typePrefix = finalType.substring(0, 2).toUpperCase(); 
    const permitNo = `${typePrefix}-${new Date().getFullYear()}${new Date().getMonth()+1}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPermit = await prisma.permits_v2.create({
      data: {
        permit_number: permitNo,
        title: body.title || 'ไม่มีหัวข้อ', 
        description: body.description, 
        permit_type: finalType, 
        status: 'PENDING_AREA_OWNER', 
        location_detail: body.location_detail || 'ไม่ระบุพื้นที่',
        start_time: new Date(body.start_time), 
        end_time: new Date(body.end_time), 
        applicant_id: body.applicant_id,
        // 🟢 ข้อมูลผู้รับเหมาเพิ่มเติม
        applicant_phone: body.applicant_phone,
        contractor_company: body.contractor_company,
        contractor_supervisor: body.contractor_supervisor,
        project_manager: body.project_manager,
        // 🟢 JSON Fields
        work_sub_type: body.work_sub_type || [],
        tools_equipment: body.tools_equipment || [],
        safety_measures: body.safety_measures || [],
        ppe_required: body.ppe_required || ['HARD_HAT', 'SAFETY_SHOES'],
        // 🟢 เพิ่มชื่อคนงาน (ถ้ามี)
        workers: {
          create: body.workers?.map((name: string) => ({ worker_name: name })) || []
        }
      }
    });

    if (['HOT_WORK', 'CONFINED_SPACE', 'WORKING_AT_HEIGHT', 'ELECTRICAL'].includes(finalType)) {
      await prisma.permit_hazard_details.create({
        data: {
          permit_id: newPermit.id,
          supervisor_name: body.supervisor_name,
          gas_tester_name: body.gas_tester_name,
          standby_person_name: body.standby_person_name,
          rescuer_name: body.rescuer_name,
          communication_method: body.communication_method,
          height_level: body.height_level ? parseFloat(body.height_level) : null,
          rescue_plan_url: body.rescue_plan_url,
          is_med_cert_verified: body.is_med_cert_verified || false,
          is_loto_required: body.is_loto_required || false
        }
      });
    }

    if (body.is_loto_required && body.loto_isolation_point) {
      await prisma.loto_records_v2.create({
        data: { permit_id: newPermit.id, isolation_point: body.loto_isolation_point, energy_type: body.loto_energy_type || 'UNKNOWN', lock_number: body.loto_lock_number || '-' }
      });
    }

    if (body.attachment_url) {
      await prisma.permitAttachment.create({
        data: { permit_id: newPermit.id, file_name: body.attachment_name || 'Document', file_type: 'FILE', storage_path: 'supa', public_url: body.attachment_url }
      });
    }

    const applicant = await prisma.user.findUnique({ where: { id: body.applicant_id } });
    const areaOwners = await prisma.user.findMany({ where: { role: 'AREA_OWNER', line_id: { not: null } } });
    const flex = createPermitFlex("มีคำขอ Permit ใหม่", permitNo, "🔶 รอเจ้าของพื้นที่ตรวจสอบ", body.location_detail, applicant?.full_name || '-', "#f59e0b", `${WEB_APP_URL}?page=E_PERMIT`);
    for (const owner of areaOwners) if (owner.line_id) await sendFlexPush(owner.line_id, flex);
    
    return reply.send(newPermit);
  } catch (error: any) { return reply.status(500).send({ error: `เซิร์ฟเวอร์ขัดข้อง: ${error.message}` }); }
});

fastify.put('/permits/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = request.body as any; 
  try {
    let updateData: any = { status: body.status };

    // 🟢 ระบบขอปิดงาน (Close-out)
    if (body.action === 'CLOSE') {
      updateData = { 
        status: 'CLOSED', 
        is_closed: true, 
        closeout_status: 'SAFE', // ถือว่าปลอดภัยถ้ากดยืนยันมา
        closeout_note: body.comment || 'เคลียร์พื้นที่เรียบร้อย',
        closed_at: new Date()
      };
    }

    const updatedPermit = await prisma.permits_v2.update({ where: { id }, data: updateData });
    
    if (body.approver_id) {
      await prisma.approvalLog.create({ data: { permit_id: id, approver_id: body.approver_id, action: body.action || body.status, comment: body.comment || '-' } });
    }

    const applicant = await prisma.user.findUnique({ where: { id: updatedPermit.applicant_id || '' } });

    if (updateData.status === 'PENDING_SAFETY') {
      const safetyUsers = await prisma.user.findMany({ where: { role: 'SAFETY_ENGINEER', line_id: { not: null } } });
      const flex = createPermitFlex("รอ จป. ตรวจสอบขั้นสุดท้าย", updatedPermit.permit_number, "🟦 รอ จป. อนุมัติ", updatedPermit.location_detail, applicant?.full_name || '-', "#2563eb", `${WEB_APP_URL}?page=E_PERMIT`);
      for (const u of safetyUsers) if (u.line_id) await sendFlexPush(u.line_id, flex);
    } 
    else if (updateData.status === 'APPROVED') {
      const flex = createPermitFlex("อนุมัติเริ่มงานได้", updatedPermit.permit_number, "✅ อนุมัติสมบูรณ์", updatedPermit.location_detail, applicant?.full_name || '-', "#059669", `${WEB_APP_URL}?page=E_PERMIT`);
      if (applicant?.line_id) await sendFlexPush(applicant.line_id, flex);
    } 

    return updatedPermit;
  } catch (error) { return reply.status(500).send({ error: 'ไม่สามารถอัปเดตสถานะได้' }); }
});

fastify.put('/permits/:id/extend', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { new_end_time, reason, requested_by } = request.body as any;
  
  try {
    const permit = await prisma.permits_v2.findUnique({ where: { id }, include: { applicant: true } });
    if (!permit) return reply.status(404).send({ error: 'ไม่พบ Permit' });

    // 🟢 สร้างประวัติการต่ออายุ
    await prisma.permitExtension.create({
      data: {
        permit_id: id,
        new_start_time: permit.end_time,
        new_end_time: new Date(new_end_time),
        action_details: reason,
        applicant_name: requested_by || permit.applicant?.full_name || 'ไม่ระบุ'
      }
    });

    const updatedPermit = await prisma.permits_v2.update({
      where: { id }, data: { end_time: new Date(new_end_time), extension_reason: reason }
    });

    const flex = createPermitFlex("ขอขยายเวลาทำงาน", permit.permit_number, "⏳ ขอขยายเวลา", permit.location_detail, requested_by || permit.applicant?.full_name || '-', "#9333ea", `${WEB_APP_URL}?page=E_PERMIT`, `เหตุผล: ${reason}`);
    const approvers = await prisma.user.findMany({ where: { role: { in: ['AREA_OWNER', 'SAFETY_ENGINEER'] }, line_id: { not: null } } });
    for (const u of approvers) if (u.line_id) await sendFlexPush(u.line_id, flex);

    return reply.send({ message: 'ต่อเวลาสำเร็จ', permit: updatedPermit });
  } catch (error) { return reply.status(500).send({ error: 'ไม่สามารถต่อเวลาได้' }); }
});

// 🚀 ========================================================
// 🕳️ MODULE: Confined Space, BBS, Training, Incident, Equipment
// ========================================================
fastify.post('/gas-logs', async (request, reply) => {
  const body = request.body as any;
  try {
    const tester = await prisma.user.findUnique({ where: { id: body.tester_id } });
    const newLog = await prisma.permit_gas_logs.create({ data: { permit_id: body.permit_id, inspector_name: tester?.full_name || 'ผู้ตรวจ', o2_level: body.o2_level, lel_level: body.lel_level, co_level: body.co_level, h2s_level: body.h2s_level } });
    return reply.send({ message: 'บันทึกสำเร็จ', data: newLog });
  } catch (error) { return reply.status(500).send({ error: 'บันทึกไม่ได้' }); }
});

fastify.get('/permits/:id/gas-logs', async (request, reply) => {
  const { id } = request.params as { id: string };
  try { return reply.send(await prisma.permit_gas_logs.findMany({ where: { permit_id: id }, orderBy: { recorded_at: 'desc' } })); } 
  catch (error) { return reply.status(500).send({ error: 'ดึงก๊าซไม่ได้' }); }
});

fastify.get('/confined-space/active-permits', async () => await prisma.permits_v2.findMany({ where: { permit_type: 'CONFINED_SPACE', status: 'APPROVED' }, orderBy: { created_at: 'desc' } }));
fastify.get('/confined-space/:permit_id/entries', async (req: any) => await prisma.confinedSpaceEntry.findMany({ where: { permit_id: req.params.permit_id }, orderBy: { time_in: 'desc' } }));
fastify.post('/confined-space/in', async (req: any) => await prisma.confinedSpaceEntry.create({ data: req.body }));
fastify.put('/confined-space/out/:id', async (req: any) => await prisma.confinedSpaceEntry.update({ where: { id: req.params.id }, data: { status: 'OUTSIDE', time_out: new Date() } }));

fastify.get('/bbs', async () => await prisma.bbsObservation.findMany({ include: { observer: true }, orderBy: { created_at: 'desc' } }));
fastify.post('/bbs', async (req: any) => await prisma.bbsObservation.create({ data: { ...req.body, date: req.body.date ? new Date(req.body.date) : new Date() } }));

fastify.get('/certificates', async () => await prisma.certificate.findMany({ include: { user: true }, orderBy: { created_at: 'desc' } }));
fastify.post('/certificates', async (req: any) => await prisma.certificate.create({ data: { ...req.body, issued_date: new Date(req.body.issued_date), expiry_date: new Date(req.body.expiry_date), status: 'PENDING' } }));
fastify.put('/certificates/:id/verify', async (req: any) => await prisma.certificate.update({ where: { id: req.params.id }, data: { status: req.body.status } }));

fastify.get('/courses', async () => await prisma.course.findMany({ orderBy: { created_at: 'desc' } }));
fastify.get('/courses/:id/questions', async (req: any) => await prisma.examQuestion.findMany({ where: { course_id: req.params.id } }));

fastify.get('/incidents', async () => await prisma.incidentReport.findMany({ include: { reporter: true }, orderBy: { created_at: 'desc' } }));
fastify.post('/incidents', async (req: any) => await prisma.incidentReport.create({ data: { ...req.body, status: 'OPEN' } }));
fastify.put('/incidents/:id/status', async (req: any) => await prisma.incidentReport.update({ where: { id: req.params.id }, data: { status: req.body.status } }));

fastify.get('/equipment/:qr', async (req: any) => await prisma.equipment.findUnique({ where: { qr_code: req.params.qr }, include: { logs: { include: { inspector: true } } } }));
fastify.put('/equipment/:id/inspect', async (req: any) => await prisma.equipment.update({ where: { id: req.params.id }, data: { status: req.body.status } }));

fastify.get('/dashboard', async () => {
  const [totalPermits, pendingPermits, openIncidents, defectiveEquip, permitGroups, recentIncidents] = await Promise.all([
    prisma.permits_v2.count(), prisma.permits_v2.count({ where: { status: { startsWith: 'PENDING' } } }),
    prisma.incidentReport.count({ where: { status: 'OPEN' } }), prisma.equipment.count({ where: { status: 'DEFECTIVE' } }),
    prisma.permits_v2.groupBy({ by: ['permit_type'], _count: { permit_type: true } }),
    prisma.incidentReport.findMany({ take: 3, orderBy: { created_at: 'desc' }, include: { reporter: true } })
  ]);
  return { stats: { totalPermits, pendingPermits, openIncidents, defectiveEquip }, permitGroups, recentIncidents };
});

const start = async () => {
  try {
    const PORT = Number(process.env.PORT) || 3000;
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Enterprise Safety Backend is running at http://0.0.0.0:${PORT}`);
  } catch (err) { fastify.log.error(err); process.exit(1); }
};
start();