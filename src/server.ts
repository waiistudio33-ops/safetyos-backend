import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client'
import fastifyJwt from '@fastify/jwt'; 

const globalForPrisma = global as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const fastify = Fastify({ logger: true });

// 🔓 ปลดล็อก CORS
fastify.register(cors, { 
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// 🔐 ลงทะเบียน JWT
fastify.register(fastifyJwt, { 
  secret: 'super-secret-safetyos-mtt-2026-key!' 
});

fastify.decorate("authenticate", async function (request: any, reply: any) {
  try {
    await request.jwtVerify(); 
  } catch (err) {
    reply.status(401).send({ error: 'ไม่ได้รับอนุญาต (Token ไม่ถูกต้องหรือหมดอายุ)' });
  }
});

// 🚀 ==========================================
// 🔔 ตั้งค่า LINE Messaging API
// ==========================================
const LINE_CHANNEL_ACCESS_TOKEN = 'x9a6p21XJ5EptgMfXJ/AfyF8XvHh1ilsX7xOE7lpuAnJ+cSgFkNb5MLR5lYYqVhj98amxtXn1hW2ZWzejlH+2rUAYjCm1u5jO7UvnYVc0Olll3bJY/U/buSf5ajLKjBTMHen053xMQwMP/myAjIk3wdB04t89/1O/w1cDnyilFU='; 
const LINE_TARGET_ID = 'Ua3742ef5e75e2896265de81da0318262'; 
const WEB_APP_URL = process.env.FRONTEND_URL || 'https://liff.line.me/2009277207-jNY8QghJ'; 

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

const notifyLineInBackground = async (usersToNotify: any[], flexMessage: any, fallbackTargetId: string) => {
  try {
    const pushPromises = usersToNotify
      .filter(user => user.line_id)
      .map(user => sendFlexPush(user.line_id, flexMessage));

    if (pushPromises.length > 0) {
      await Promise.allSettled(pushPromises);
    } else {
      await sendFlexPush(fallbackTargetId, flexMessage);
    }
  } catch (error) {
    console.error("⚠️ Background Notification Failed:", error);
  }
};

fastify.get('/', async (request, reply) => {
  return reply.send({ status: 'OK', message: 'Enterprise Safety Backend is Running!' });
});

// ==========================================
// 👤 API ผู้ใช้งานและการ Login
// ==========================================
fastify.post('/login/line', async (request: any, reply) => {
  const { line_id, picture_url } = request.body;
  try {
    if (!line_id) return reply.status(400).send({ error: 'ไม่พบ LINE ID' });
    let user = await prisma.user.findFirst({ where: { line_id: line_id } });
    if (!user) return reply.status(401).send({ error: 'ยังไม่ได้ผูกบัญชี LINE' });

    if (picture_url && user.profile_url !== picture_url) {
      user = await prisma.user.update({ where: { id: user.id }, data: { profile_url: picture_url } });
    }

    const token = fastify.jwt.sign({ id: user.id, role: user.role, name: user.full_name });
    return reply.send({ message: 'เข้าสู่ระบบอัตโนมัติสำเร็จ', user, token }); 
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

    const token = fastify.jwt.sign({ id: user.id, role: user.role, name: user.full_name });
    return reply.send({ message: 'เข้าสู่ระบบสำเร็จ', user, token }); 
  } catch (error) {
    return reply.status(500).send({ error: 'เกิดข้อผิดพลาดในระบบเซิร์ฟเวอร์' });
  }
});

fastify.get('/users', async (request, reply) => {
  return reply.send(await prisma.user.findMany());
});

fastify.put('/users/:id/profile', async (request: any, reply) => {
  try {
    const { id } = request.params;
    
    const { 
      department, phone, email, profile_url, 
      blood_group, medical_cond, emergency_contact 
    } = request.body;

    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: {
        department: department,
        phone: phone, 
        email: email, 
        ...(profile_url && { profile_url: profile_url }),
        ...(blood_group && { blood_group: blood_group }),
        ...(medical_cond && { medical_cond: medical_cond }),
        ...(emergency_contact && { emergency_contact: emergency_contact })
      }
    });

    return reply.send({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("🚨 Error updating profile:", error);
    return reply.status(500).send({ success: false, error: 'ไม่สามารถอัปเดตข้อมูลได้' });
  }
});

fastify.get('/users/me/timeline', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => {
  try {
    const userId = request.user.id; 

    const [myPermits, myBbs] = await Promise.all([
      prisma.permits_v2.findMany({
        where: { applicant_id: userId },
        orderBy: { created_at: 'desc' },
        take: 20 
      }),
      prisma.bbsObservation.findMany({
        where: { observer_id: userId },
        orderBy: { created_at: 'desc' },
        take: 20
      })
    ]);

    return reply.send({
      success: true,
      data: {
        permits: myPermits,
        bbs: myBbs,
        certs: [], 
        elearning: [] 
      }
    });

  } catch (error) {
    console.error("🚨 Timeline Error:", error);
    return reply.status(500).send({ success: false, error: 'ไม่สามารถดึงข้อมูลประวัติกิจกรรมได้' });
  }
});

// ==========================================
// 📄 API จัดการ Work Permit
// ==========================================
fastify.get('/permits', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => {
  try {
    const user = request.user;
    const page = Number(request.query.page) || 1;
    const limit = Number(request.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 🔒 กรองสิทธิ์: เฉพาะ CONTRACTOR เท่านั้นที่เห็นแค่ของตัวเอง
    const isRestricted = user.role === 'CONTRACTOR';
    const whereClause = isRestricted ? { applicant_id: user.id } : {};

    const [permits, total] = await Promise.all([
      prisma.permits_v2.findMany({
        where: whereClause,
        skip: skip,
        take: limit,
        include: { 
          applicant: true, 
          approval_logs: { include: { approver: true } }, 
          gas_logs: true,
          hazard_details: true,
          attachments: true,
          loto_records: true,
          workers: true,
          extensions: true
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.permits_v2.count({ where: whereClause })
    ]);

    const formattedData = permits.map(p => {
      const hazardInfo = p.hazard_details?.[0] || {};
      const attached_file = p.attachments?.[0]?.public_url || null;
      const { hazard_details, attachments, ...rest } = p as any;
      return { ...rest, ...hazardInfo, attached_file }; 
    });

    return reply.send({
      data: formattedData,
      meta: {
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return reply.status(500).send({ error: 'ดึงข้อมูลล้มเหลว' });
  }
});

fastify.post('/permits', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => {
  const body = request.body as any;
  const decodedUser = request.user;

  try {
    const validTypes = ['COLD_WORK', 'HOT_WORK', 'CONFINED_SPACE', 'WORKING_AT_HEIGHT', 'EXCAVATION', 'ELECTRICAL'];
    const finalType = validTypes.includes(body.permit_type) ? body.permit_type : 'COLD_WORK';
    
    const safeTitle = body.title || 'ไม่มีหัวข้อ';
    const safeLocation = body.location_detail || 'ไม่ระบุพื้นที่';
    
    const typePrefix = finalType.substring(0, 2).toUpperCase(); 
    const permitNo = `${typePrefix}-${new Date().getFullYear()}${new Date().getMonth()+1}-${Math.floor(1000 + Math.random() * 9000)}`;

    const safeStartTime = body.start_time ? new Date(body.start_time) : new Date();
    const safeEndTime = body.end_time ? new Date(body.end_time) : new Date(Date.now() + 2 * 60 * 60 * 1000);

    const newPermit = await prisma.permits_v2.create({
      data: {
        permit_number: permitNo,
        title: safeTitle, 
        description: body.description, 
        permit_type: finalType, 
        status: 'PENDING_AREA_OWNER', 
        location_detail: safeLocation,
        start_time: safeStartTime, 
        end_time: safeEndTime, 
        applicant_id: decodedUser.id,
        applicant_phone: body.applicant_phone || null,
        contractor_company: body.contractor_company || null,
        contractor_supervisor: body.contractor_supervisor || null,
        project_manager: body.project_manager || null,
        work_sub_type: body.work_sub_type || null,
        tools_equipment: body.tools_equipment || null,
        safety_measures: body.safety_measures || null,
        ppe_required: body.ppe_required || null,
        workers: body.workers && body.workers.length > 0 ? {
          create: body.workers.map((name: string) => ({ worker_name: name }))
        } : undefined
      }
    });

    const hazardousTypes = ['HOT_WORK', 'CONFINED_SPACE', 'WORKING_AT_HEIGHT', 'ELECTRICAL'];
    if (hazardousTypes.includes(finalType)) {
      await prisma.permit_hazard_details.create({
        data: {
          permit_id: newPermit.id,
          supervisor_name: body.supervisor_name || null,
          gas_tester_name: body.gas_tester_name || null,
          standby_person_name: body.standby_person_name || null,
          rescuer_name: body.rescuer_name || null,
          communication_method: body.communication_method || null,
          height_level: body.height_level ? parseFloat(body.height_level) : null,
          rescue_plan_url: body.rescue_plan_url || null,
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

    prisma.user.findUnique({ where: { id: decodedUser.id } }).then(async (applicant) => {
      const areaOwners = await prisma.user.findMany({ where: { role: 'AREA_OWNER', line_id: { not: null } } });
      const flex = createPermitFlex("มีคำขอ Permit ใหม่เข้าพื้นที่", newPermit.permit_number, "🔶 รอเจ้าของพื้นที่ตรวจสอบ", safeLocation, applicant?.full_name || '-', "#f59e0b", `${WEB_APP_URL}?page=E_PERMIT`);
      notifyLineInBackground(areaOwners, flex, LINE_TARGET_ID);
    }).catch(err => console.error("Error fetching applicant for notification:", err));

    return reply.send(newPermit);
    
  } catch (error: any) {
    console.error("🚨 ERROR CREATE PERMIT:\n", error);
    return reply.status(500).send({ error: `เซิร์ฟเวอร์ขัดข้อง: ${error.message}` });
  }
});

fastify.put('/permits/:id', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => {
  const { id } = request.params as { id: string };
  const body = request.body as any; 
  const decodedUser = request.user; 

  try {
    const updatedPermit = await prisma.$transaction(async (tx) => {
      const currentPermit = await tx.permits_v2.findUnique({ where: { id } });
      if (!currentPermit) throw new Error("NOT_FOUND");

      const isAlreadyProcessed = ['APPROVED', 'REJECTED', 'CLOSED', 'REVOKED'].includes(currentPermit.status);
      if (isAlreadyProcessed && body.action !== 'CLOSE' && body.action !== 'REVOKE') {
        throw new Error("ALREADY_PROCESSED");
      }

      if (body.action === 'APPROVE') {
        const requiresGasTest = currentPermit.permit_type === 'HOT_WORK' || currentPermit.permit_type === 'CONFINED_SPACE';
        if (requiresGasTest) {
          const gasTestCount = await tx.permit_gas_logs.count({ where: { permit_id: id } });
          if (gasTestCount === 0) throw new Error("NO_GAS_TEST_RECORD");
        }
      }

      if (body.action === 'CLOSE' && currentPermit.permit_type === 'CONFINED_SPACE') {
        const peopleInside = await tx.confinedSpaceEntry.count({ where: { permit_id: id, status: 'INSIDE' } });
        if (peopleInside > 0) throw new Error("PEOPLE_STILL_INSIDE"); 
      }

      let updateData: any = { status: body.status };
      if (body.action === 'CLOSE') {
        updateData = { 
          status: 'CLOSED', is_closed: true, closeout_status: 'SAFE', 
          closeout_note: body.comment || 'เคลียร์พื้นที่เรียบร้อย', closed_at: new Date()
        };
      }

      const updated = await tx.permits_v2.update({ where: { id }, data: updateData });

      if (decodedUser.id) {
        await tx.approvalLog.create({ 
          data: { permit_id: id, approver_id: decodedUser.id, action: body.action || body.status, comment: body.comment || '-' } 
        });
      }
      return updated;
    });

    prisma.user.findUnique({ where: { id: updatedPermit.applicant_id || '' } }).then(async (applicant) => {
      if (updatedPermit.status === 'PENDING_SAFETY') {
        const safetyUsers = await prisma.user.findMany({ where: { role: 'SAFETY_ENGINEER', line_id: { not: null } } });
        const flex = createPermitFlex("เจ้าของพื้นที่อนุมัติแล้ว รอ จป. ตรวจสอบ", updatedPermit.permit_number, "🟦 รอ จป. อนุมัติขั้นสุดท้าย", updatedPermit.location_detail, applicant?.full_name || '-', "#2563eb", `${WEB_APP_URL}?page=E_PERMIT`);
        notifyLineInBackground(safetyUsers, flex, LINE_TARGET_ID);
      } 
      else if (updatedPermit.status === 'APPROVED') {
        const flex = createPermitFlex("จป. อนุมัติเรียบร้อย", updatedPermit.permit_number, "✅ อนุมัติสมบูรณ์ (เริ่มงานได้)", updatedPermit.location_detail, applicant?.full_name || '-', "#059669", `${WEB_APP_URL}?page=E_PERMIT`);
        if (applicant) notifyLineInBackground([applicant], flex, LINE_TARGET_ID);
        notifyLineInBackground([], flex, LINE_TARGET_ID);
      }
    }).catch(err => console.error("Error in status notification:", err));

    return reply.send(updatedPermit);
    
  } catch (error: any) { 
    if (error.message === "NO_GAS_TEST_RECORD") return reply.status(403).send({ error: 'ไม่อนุญาตให้อนุมัติ! ต้องทำการตรวจวัดสภาพอากาศให้ผ่านก่อน' });
    if (error.message === "PEOPLE_STILL_INSIDE") return reply.status(400).send({ error: 'ห้ามปิดงานเด็ดขาด! ยังมีผู้ปฏิบัติงานอยู่ด้านใน' });
    if (error.message === "ALREADY_PROCESSED") return reply.status(409).send({ error: 'เอกสารนี้ถูกดำเนินการไปแล้ว' });
    if (error.message === "NOT_FOUND") return reply.status(404).send({ error: 'ไม่พบเอกสารใบอนุญาตนี้' });
    return reply.status(500).send({ error: 'ไม่สามารถอัปเดตสถานะได้' }); 
  }
});

fastify.post('/permits/:id/toolbox-talk', async (request: any, reply) => {
  const { id } = request.params as { id: string };
  const { image_url } = request.body as any;
  try {
    await prisma.permitAttachment.create({
      data: {
        permit_id: id, file_name: 'Toolbox Talk Evidence', file_type: 'TOOLBOX_TALK', storage_path: 'supa', public_url: image_url
      }
    });
    return reply.send({ message: 'บันทึกภาพ Toolbox Talk สำเร็จ' });
  } catch (error) { return reply.status(500).send({ error: 'ไม่สามารถบันทึกภาพได้' }); }
});

fastify.put('/permits/:id/extend', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { new_end_time, reason, requested_by } = request.body as any;
  try {
    const permit = await prisma.permits_v2.findUnique({ where: { id }, include: { applicant: true } });
    if (!permit) return reply.status(404).send({ error: 'ไม่พบ Permit' });

    await prisma.permitExtension.create({
      data: { permit_id: id, new_start_time: permit.end_time, new_end_time: new Date(new_end_time), action_details: reason, applicant_name: requested_by || permit.applicant?.full_name || 'ไม่ระบุ' }
    });

    const updatedPermit = await prisma.permits_v2.update({
      where: { id }, data: { end_time: new Date(new_end_time), extension_reason: reason }
    });

    const flex = createPermitFlex("แจ้งขอขยายเวลาทำงานหน้างาน", permit.permit_number, "⏳ ขยายเวลา (ทำงานต่อ)", permit.location_detail, requested_by || permit.applicant?.full_name || '-', "#9333ea", `${WEB_APP_URL}?page=E_PERMIT`, `เหตุผล: ${reason}`);
    
    prisma.user.findMany({ where: { role: { in: ['AREA_OWNER', 'SAFETY_ENGINEER'] }, line_id: { not: null } } })
      .then(approvers => notifyLineInBackground(approvers, flex, LINE_TARGET_ID))
      .catch(e => console.log(e));

    return reply.send({ message: 'ขยายเวลาสำเร็จ', permit: updatedPermit });
  } catch (error) { return reply.status(500).send({ error: 'ไม่สามารถขยายเวลาได้' }); }
});


// ==========================================
// 💨 API ตรวจวัดก๊าซ & Confined Space
// ==========================================
fastify.post('/gas-logs', async (request: any, reply) => {
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
        h2s_level: body.h2s_level,
        safety_talk_done: body.safety_talk_done || false 
      } 
    });

    const isDangerous = body.o2_level < 19.5 || body.o2_level > 23.5 || body.lel_level >= 10 || body.co_level >= 25 || body.h2s_level >= 10;
    
    if (isDangerous) {
      const permit = await prisma.permits_v2.update({ 
        where: { id: body.permit_id }, data: { status: 'REVOKED' }, include: { applicant: true }
      });
      await prisma.confinedSpaceEntry.updateMany({ 
        where: { permit_id: body.permit_id, status: 'INSIDE' }, data: { status: 'OUTSIDE', time_out: new Date() } 
      });

      const flex = createPermitFlex("🚨 อพยพด่วน! ก๊าซพิษเกินมาตรฐาน", permit.permit_number, "❌ ถูกระงับงานฉุกเฉิน", permit.location_detail, permit.applicant?.full_name || '-', "#e11d48", `${WEB_APP_URL}?page=CONFINED_SPACE`, `O2:${body.o2_level}%, LEL:${body.lel_level}%, H2S:${body.h2s_level}, CO:${body.co_level}`);
      prisma.user.findMany({ where: { role: { in: ['SAFETY_ENGINEER', 'AREA_OWNER'] }, line_id: { not: null } } })
        .then(safetyTeam => notifyLineInBackground(safetyTeam, flex, LINE_TARGET_ID));
    }

    return reply.send({ message: 'บันทึกข้อมูลก๊าซสำเร็จ', data: newLog, isDangerous });

  } catch (error: any) { 
    return reply.status(500).send({ error: 'ไม่สามารถบันทึกข้อมูลก๊าซได้' }); 
  }
});

fastify.get('/permits/:id/gas-logs', async (request: any, reply) => {
  const { id } = request.params as { id: string };
  try { return reply.send(await prisma.permit_gas_logs.findMany({ where: { permit_id: id }, orderBy: { recorded_at: 'desc' } })); } 
  catch (error: any) { return reply.status(500).send({ error: 'ไม่สามารถดึงข้อมูลก๊าซได้' }); }
});

fastify.get('/confined-space/active-permits', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => { 
  const user = request.user;
  const isRestricted = user.role === 'CONTRACTOR';
  
  return reply.send(await prisma.permits_v2.findMany({ 
    where: { 
      permit_type: 'CONFINED_SPACE', 
      status: 'APPROVED',
      ...(isRestricted ? { applicant_id: user.id } : {}) // 🔒 กรองสิทธิ์
    }, 
    include: { 
      workers: true,
      gas_logs: { orderBy: { recorded_at: 'desc' }, take: 1 } 
    }, 
    orderBy: { created_at: 'desc' } 
  })); 
});

fastify.get('/confined-space/:permit_id/entries', async (request: any, reply) => { 
  return reply.send(await prisma.confinedSpaceEntry.findMany({ where: { permit_id: request.params.permit_id }, orderBy: { time_in: 'desc' } })); 
});

fastify.post('/confined-space/in', async (request: any, reply) => { 
  try { return reply.send(await prisma.confinedSpaceEntry.create({ data: request.body })); } 
  catch (error) { return reply.status(500).send({ error: 'Check-in Error' }); } 
});

fastify.put('/confined-space/out/:id', async (request: any, reply) => { 
  try { return reply.send(await prisma.confinedSpaceEntry.update({ where: { id: request.params.id }, data: { status: 'OUTSIDE', time_out: new Date() } })); } 
  catch (error) { return reply.status(500).send({ error: 'Check-out Error' }); } 
});

fastify.post('/confined-space/evacuate', async (request: any, reply) => { 
  const body = request.body;
  try {
    await prisma.confinedSpaceEntry.updateMany({ where: { permit_id: body.permit_id, status: 'INSIDE' }, data: { status: 'OUTSIDE', time_out: new Date() } });
    return reply.send({ message: 'สั่งอพยพสำเร็จ' });
  } catch (error) { return reply.status(500).send({ error: 'Evacuate Error' }); }
});


// ==========================================
// 🛠️ API อื่นๆ (BBS, Incident, Equipment)
// ==========================================
fastify.get('/bbs', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => {
  const user = request.user;
  const isRestricted = user.role === 'CONTRACTOR';
  const whereClause = isRestricted ? { observer_id: user.id } : {};

  reply.send(await prisma.bbsObservation.findMany({ 
    where: whereClause, // 🔒 กรองสิทธิ์
    include: { observer: true }, 
    orderBy: { created_at: 'desc' } 
  }));
});

fastify.post('/bbs', async (req: any, reply) => {
  try {
    const data = req.body;
    if (!data.observer_id) data.observer_id = req.user?.id || req.body.observer_id; 

    const newBbs = await prisma.bbsObservation.create({
      data: {
        date: data.date ? new Date(data.date) : new Date(),
        location: data.location || "ไม่ระบุ",
        behavior_type: data.behavior_type || "SAFE",
        category: data.category || "OTHER",
        description: data.description || "",
        action_taken: data.action_taken || "PRAISED",
        observer_id: data.observer_id,
        photos: data.image_url ? [data.image_url] : [],
        root_cause: data.root_cause || null,
        suggestion: data.suggestion || null
      }
    });

    return reply.send(newBbs);
  } catch (error: any) {
    console.error("🚨 BBS Create Error:", error);
    return reply.status(500).send({ error: 'บันทึกข้อมูลไม่สำเร็จ', details: error.message });
  }
});

// 🟢 1. ดึงข้อมูล Incident
fastify.get('/incidents', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => {
  try {
    const user = request.user;
    const isRestricted = user.role === 'CONTRACTOR';
    const whereClause = isRestricted ? { reporter_id: user.id } : {};

    const incidents = await prisma.incidentReport.findMany({
      where: whereClause, // 🔒 กรองสิทธิ์
      include: { reporter: { select: { full_name: true, profile_url: true } } }, 
      orderBy: { created_at: 'desc' } 
    });
    return reply.send(incidents);
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'ไม่สามารถดึงข้อมูลจุดเสี่ยงได้' });
  }
});

// 🟢 2. แจ้ง Incident ใหม่
fastify.post('/incidents', async (request: any, reply) => {
  try {
    const newIncident = await prisma.incidentReport.create({
      data: {
        reporter_id: request.body.reporter_id,
        title: request.body.title,
        description: request.body.description,
        type: request.body.type,
        lat: request.body.lat,
        lng: request.body.lng,
        image_url: request.body.image_url,
        status: 'OPEN'
      }
    });

    return reply.send(newIncident);
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'เกิดข้อผิดพลาดในการบันทึกจุดเสี่ยง' });
  }
});

// 🟢 3. อัปเดตสถานะ Incident
fastify.put('/incidents/:id/status', async (request: any, reply) => {
  try {
    const { id } = request.params;
    const { status } = request.body;

    const updatedIncident = await prisma.incidentReport.update({
      where: { id },
      data: { status }
    });

    return reply.send(updatedIncident);
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'ไม่สามารถอัปเดตสถานะได้' });
  }
});

fastify.get('/equipment/:qr', async (req: any, reply) => {
  try {
    const equipment = await prisma.equipment.findUnique({ 
      where: { qr_code: req.params.qr }, 
      include: { 
        logs: { 
          include: { inspector: true },
          orderBy: { created_at: 'desc' } // 🟢 สำคัญ! สั่งให้เรียงอันใหม่ขึ้นก่อน
        } 
      } 
    });
    return reply.send(equipment);
  } catch (error) {
    return reply.status(500).send({ error: 'ไม่สามารถดึงข้อมูลอุปกรณ์ได้' });
  }
});

fastify.put('/equipment/:id/inspect', async (req: any, reply) => {
  try {
    const { id } = req.params;
    const { status, inspector_id, inspector_name, details, photos } = req.body;

    // 1. อัปเดตสถานะของอุปกรณ์
    const updatedEquipment = await prisma.equipment.update({
      where: { id: id },
      data: { status: status }
    });

    // 2. สร้างประวัติการตรวจสอบ (Log) ลง Database
    const newLog = await prisma.equipmentInspectionLog.create({
      data: {
        equipment_id: id,
        inspector_id: inspector_id || 'user-001', // ถ้าไม่ได้ล็อกอินมา ให้ fallback เป็น user-001 กัน Error
        inspector_name: inspector_name || 'ไม่ระบุชื่อ',
        status: status,
        details: details || '{}',
        photos: photos ? JSON.parse(photos) : [] // แปลง String กลับเป็น JSON Array ก่อนบันทึก
      }
    });

    return reply.send({ success: true, equipment: updatedEquipment, log: newLog });
  } catch (error: any) {
    console.error("🚨 Error saving equipment inspection:", error);
    return reply.status(500).send({ error: 'ไม่สามารถบันทึกข้อมูลการตรวจสอบได้', details: error.message });
  }
});


// ==========================================
// 🎓 API ระบบใบรับรอง (Certificates)
// ==========================================

fastify.get('/certificates', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => {
  try {
    const user = request.user;
    const isRestricted = user.role === 'CONTRACTOR';
    const whereClause = isRestricted ? { user_id: user.id } : {};

    const certs = await prisma.certificate.findMany({
      where: whereClause, // 🔒 กรองสิทธิ์
      include: { user: { select: { full_name: true, department: true } } },
      orderBy: { created_at: 'desc' }
    });
    return reply.send(certs);
  } catch (error) {
    console.error("🚨 Get Certificates Error:", error);
    return reply.status(500).send({ error: 'ไม่สามารถดึงข้อมูลใบรับรองได้' });
  }
});

fastify.get('/users/me/certificates', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => {
  try {
    const userId = request.user.id;
    const myCerts = await prisma.certificate.findMany({
      where: { user_id: userId },
      orderBy: { issued_date: 'desc' }
    });
    return reply.send(myCerts);
  } catch (error) {
    console.error("🚨 Get My Certificates Error:", error);
    return reply.status(500).send({ error: 'ไม่สามารถดึงข้อมูลใบรับรองของคุณได้' });
  }
});

fastify.post('/certificates', async (request: any, reply) => {
  try {
    const { user_id, cert_name, file_url, issued_date, expiry_date, status } = request.body;

    if (!user_id || !cert_name || !file_url || !issued_date || !expiry_date) {
      return reply.status(400).send({ error: 'ข้อมูลไม่ครบถ้วน กรุณากรอกให้ครบ' });
    }

    const newCert = await prisma.certificate.create({
      data: {
        user_id, cert_name, file_url,
        issued_date: new Date(issued_date),
        expiry_date: new Date(expiry_date),
        status: status || 'PENDING' // ✅ ต้องเป็น PENDING เพื่อรอ จป. ตรวจครับ
      }
    });

    return reply.status(201).send(newCert);
  } catch (error) {
    console.error("🚨 Create Certificate Error:", error);
    return reply.status(500).send({ error: 'เกิดข้อผิดพลาดในการบันทึกใบรับรอง' });
  }
});

fastify.put('/certificates/:id/status', async (request: any, reply) => {
  try {
    const { id } = request.params;
    const { status } = request.body;

    const updatedCert = await prisma.certificate.update({
      where: { id }, data: { status }
    });

    return reply.send(updatedCert);
  } catch (error) {
    console.error("🚨 Update Certificate Status Error:", error);
    return reply.status(500).send({ error: 'ไม่สามารถอัปเดตสถานะใบรับรองได้' });
  }
});

fastify.delete('/certificates/:id', async (request: any, reply) => {
  try {
    const { id } = request.params;
    await prisma.certificate.delete({ where: { id } });
    return reply.send({ success: true, message: 'ลบใบรับรองเรียบร้อยแล้ว' });
  } catch (error) {
    console.error("🚨 Delete Certificate Error:", error);
    return reply.status(500).send({ error: 'ไม่สามารถลบใบรับรองได้' });
  }
});


// ==========================================
// 📊 API Dashboard
// ==========================================
fastify.get('/dashboard', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => {
  try {
    const user = request.user;
    
    // 🔒 กรองสิทธิ์: เฉพาะ CONTRACTOR เท่านั้นที่เห็นตัวเลขเฉพาะของตัวเอง
    const isRestricted = user.role === 'CONTRACTOR';

    const permitWhere = isRestricted ? { applicant_id: user.id } : {};
    const incidentWhere = isRestricted ? { reporter_id: user.id } : {};

    const [totalPermits, pendingPermits, openIncidents, defectiveEquip, permitGroupsRaw, recentIncidents, totalUsersCount] = await Promise.all([
      prisma.permits_v2.count({ where: permitWhere }), 
      prisma.permits_v2.count({ where: { ...permitWhere, status: { startsWith: 'PENDING' } } }),
      prisma.incidentReport.count({ where: { ...incidentWhere, status: 'OPEN' } }), 
      prisma.equipment.count({ where: { status: 'DEFECTIVE' } }), // 🟢 Equipment ให้ทุกคนเห็นของเสียรวม
      prisma.permits_v2.findMany({ where: permitWhere, select: { permit_type: true } }),
      prisma.incidentReport.findMany({ where: incidentWhere, take: 3, orderBy: { created_at: 'desc' }, include: { reporter: true } }),
      prisma.user.count({ where: { status: 'ACTIVE' } }) 
    ]);

    const groupedTypes = permitGroupsRaw.reduce((acc: any, permit: any) => {
      const type = permit.permit_type || 'COLD_WORK';
      if (!acc[type]) acc[type] = 0;
      acc[type]++;
      return acc;
    }, {});

    const permitGroups = Object.keys(groupedTypes).map(key => ({
      permit_type: key,
      _count: { permit_type: groupedTypes[key] }
    }));

    return reply.send({ 
      stats: { 
        totalPermits, 
        pendingPermits, 
        openIncidents, 
        defectiveEquip,
        totalUsers: totalUsersCount
      }, 
      permitGroups, 
      recentIncidents 
    });
  } catch (error: any) {
    console.error("🚨 Dashboard Data Error:", error);
    return reply.send({ stats: { totalPermits: 0, pendingPermits: 0, openIncidents: 0, defectiveEquip: 0, totalUsers: 0 }, permitGroups: [], recentIncidents: [] });
  }
});

const start = async () => {
  try {
    const PORT = Number(process.env.PORT) || 3000;
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Enterprise Safety Backend is running at http://0.0.0.0:${PORT}`);
  } catch (err) { fastify.log.error(err); process.exit(1); }
};
start();