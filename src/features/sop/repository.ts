import dbConnect from '@/lib/mongodb';
import { SopTask, SopLog, SopStaff, ISopTaskDocument, ISopLogDocument, ISopStaffDocument } from './model';

export interface PlainSopStaff {
  _id: string;
  restaurantId: string;
  name: string;
  role?: string;
  active: boolean;
  createdAt?: string;
}

export interface PlainSopTask {
  _id: string;
  restaurantId: string;
  batchName: string;
  batchWindow: string;
  taskName: string;
  description?: string;
  targetMinutes: number;
  assignedStaffName?: string;
  active: boolean;
  orderIndex: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlainSopLog {
  _id: string;
  restaurantId: string;
  taskId: string;
  taskName: string;
  batchName: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  actualMinutes: number;
  targetMinutes: number;
  delayMinutes: number;
  status: 'completed' | 'delayed';
  delayReason?: string;
  dateStr: string;
  createdAt?: string;
}

function normalizeTask(plain: any): PlainSopTask {
  const p = plain.toObject ? plain.toObject() : plain;
  return {
    _id: p._id.toString(),
    restaurantId: p.restaurantId,
    batchName: p.batchName,
    batchWindow: p.batchWindow,
    taskName: p.taskName,
    description: p.description || '',
    targetMinutes: p.targetMinutes,
    assignedStaffName: p.assignedStaffName || '',
    active: p.active !== false,
    orderIndex: p.orderIndex || 0,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined,
  };
}

function normalizeLog(plain: any): PlainSopLog {
  const p = plain.toObject ? plain.toObject() : plain;
  return {
    _id: p._id.toString(),
    restaurantId: p.restaurantId,
    taskId: p.taskId.toString(),
    taskName: p.taskName,
    batchName: p.batchName,
    employeeName: p.employeeName,
    startTime: p.startTime ? new Date(p.startTime).toISOString() : '',
    endTime: p.endTime ? new Date(p.endTime).toISOString() : '',
    actualMinutes: p.actualMinutes,
    targetMinutes: p.targetMinutes,
    delayMinutes: p.delayMinutes || 0,
    status: p.status || 'completed',
    delayReason: p.delayReason || '',
    dateStr: p.dateStr,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
  };
}

// ── TASK CRUD ──

export async function findTasksByRestaurant(restaurantId: string, onlyActive = true): Promise<PlainSopTask[]> {
  await dbConnect();
  const query: any = { restaurantId: restaurantId.toLowerCase() };
  if (onlyActive) query.active = true;
  const docs = await SopTask.find(query).sort({ orderIndex: 1, createdAt: 1 }).lean();
  return docs.map(normalizeTask);
}

export async function createTask(data: Partial<ISopTaskDocument>): Promise<PlainSopTask> {
  await dbConnect();
  const doc = await SopTask.create({
    ...data,
    restaurantId: data.restaurantId?.toLowerCase(),
  });
  return normalizeTask(doc);
}

export async function updateTask(id: string, restaurantId: string, data: Partial<ISopTaskDocument>): Promise<PlainSopTask | null> {
  await dbConnect();
  const doc = await SopTask.findOneAndUpdate(
    { _id: id, restaurantId: restaurantId.toLowerCase() },
    { $set: data },
    { new: true }
  ).lean();
  return doc ? normalizeTask(doc) : null;
}

export async function updateTasksByBatch(
  restaurantId: string,
  batchName: string,
  data: Partial<ISopTaskDocument>
): Promise<number> {
  await dbConnect();
  const res = await SopTask.updateMany(
    { restaurantId: restaurantId.toLowerCase(), batchName },
    { $set: data }
  );
  return res.modifiedCount;
}

export async function reorderTasksBulk(restaurantId: string, orderedIds: string[]): Promise<void> {
  await dbConnect();
  const operations = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, restaurantId: restaurantId.toLowerCase() },
      update: { $set: { orderIndex: index + 1 } },
    },
  }));
  if (operations.length > 0) {
    await SopTask.bulkWrite(operations);
  }
}

export async function deleteTask(id: string, restaurantId: string): Promise<boolean> {
  await dbConnect();
  const res = await SopTask.deleteOne({ _id: id, restaurantId: restaurantId.toLowerCase() });
  return res.deletedCount > 0;
}

export async function insertManyTasks(tasks: Partial<ISopTaskDocument>[]): Promise<PlainSopTask[]> {
  await dbConnect();
  const docs = await SopTask.insertMany(tasks);
  return docs.map(normalizeTask);
}

export async function deleteAllTasksByRestaurant(restaurantId: string): Promise<boolean> {
  await dbConnect();
  const res = await SopTask.deleteMany({ restaurantId: restaurantId.toLowerCase() });
  return res.deletedCount > 0;
}

// ── LOG CRUD & ANALYTICS ──

export async function createLog(data: Partial<ISopLogDocument>): Promise<PlainSopLog> {
  await dbConnect();
  const doc = await SopLog.create({
    ...data,
    restaurantId: data.restaurantId?.toLowerCase(),
  });
  return normalizeLog(doc);
}

export async function findLogsByRestaurant(
  restaurantId: string,
  startDateStr?: string,
  endDateStr?: string,
  batchName?: string
): Promise<PlainSopLog[]> {
  await dbConnect();
  const query: any = { restaurantId: restaurantId.toLowerCase() };

  if (startDateStr || endDateStr) {
    query.dateStr = {};
    if (startDateStr) query.dateStr.$gte = startDateStr;
    if (endDateStr) query.dateStr.$lte = endDateStr;
  }

  if (batchName && batchName !== 'all') {
    query.batchName = batchName;
  }

  const docs = await SopLog.find(query).sort({ createdAt: -1 }).limit(300).lean();
  return docs.map(normalizeLog);
}

export async function getTodayLogsByRestaurant(restaurantId: string, dateStr: string): Promise<PlainSopLog[]> {
  await dbConnect();
  const docs = await SopLog.find({
    restaurantId: restaurantId.toLowerCase(),
    dateStr,
  }).sort({ createdAt: -1 }).lean();
  return docs.map(normalizeLog);
}

export async function deleteLogByTaskAndDate(restaurantId: string, taskId: string, dateStr: string): Promise<boolean> {
  await dbConnect();
  const res = await SopLog.deleteMany({
    restaurantId: restaurantId.toLowerCase(),
    taskId,
    dateStr,
  });
  return res.deletedCount > 0;
}

// ── STAFF PROFILE CRUD ──

function normalizeStaff(plain: any): PlainSopStaff {
  const p = plain.toObject ? plain.toObject() : plain;
  return {
    _id: p._id.toString(),
    restaurantId: p.restaurantId,
    name: p.name,
    role: p.role || 'Kitchen Staff',
    active: p.active !== false,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
  };
}

export async function findStaffByRestaurant(restaurantId: string): Promise<PlainSopStaff[]> {
  await dbConnect();
  const docs = await SopStaff.find({ restaurantId: restaurantId.toLowerCase(), active: true }).sort({ name: 1 }).lean();
  return docs.map(normalizeStaff);
}

export async function createStaffProfileInRepo(data: { restaurantId: string; name: string; role?: string }): Promise<PlainSopStaff> {
  await dbConnect();
  const doc = await SopStaff.create({
    restaurantId: data.restaurantId.toLowerCase(),
    name: data.name.trim(),
    role: data.role?.trim() || 'Kitchen Staff',
    active: true,
  });
  return normalizeStaff(doc);
}

export async function deleteStaffProfileInRepo(id: string, restaurantId: string): Promise<boolean> {
  await dbConnect();
  const res = await SopStaff.deleteOne({ _id: id, restaurantId: restaurantId.toLowerCase() });
  return res.deletedCount > 0;
}
