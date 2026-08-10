import dbConnect from '@/lib/mongodb';
import { ExpenseCategory, ExpenseItem, ExpenseLog, IExpenseLogDocument } from './model';
import {
  CreateExpenseCategoryDTO,
  CreateExpenseItemDTO,
  CreateExpenseLogDTO,
  UpdateExpenseItemDTO,
  UpdateExpenseLogDTO,
  ItemTimeSeriesBucket,
  ExpenseDashboardSummary,
} from './types';

// Helper to normalize restaurant ID string
function norm(id: string): string {
  return (id || '').trim().toLowerCase();
}

/**
 * 1. Category Operations
 */
export async function getCategories(restaurantId: string) {
  await dbConnect();
  return ExpenseCategory.find({ restaurantId: norm(restaurantId) })
    .sort({ name: 1 })
    .lean();
}

export async function createCategory(dto: CreateExpenseCategoryDTO) {
  await dbConnect();
  const restaurantId = norm(dto.restaurantId);
  const name = dto.name.trim();

  const existing = await ExpenseCategory.findOne({ restaurantId, name });
  if (existing) {
    throw new Error(`Category "${name}" already exists`);
  }

  return ExpenseCategory.create({ restaurantId, name });
}

export async function updateCategory(id: string, restaurantId: string, name: string) {
  await dbConnect();
  const restId = norm(restaurantId);
  const trimmedName = name.trim();

  const existing = await ExpenseCategory.findOne({
    restaurantId: restId,
    name: trimmedName,
    _id: { $ne: id },
  });
  if (existing) {
    throw new Error(`Category "${trimmedName}" already exists`);
  }

  const updated = await ExpenseCategory.findOneAndUpdate(
    { _id: id, restaurantId: restId },
    { name: trimmedName },
    { new: true }
  ).lean();

  if (!updated) {
    throw new Error('Category not found');
  }
  return updated;
}

export async function deleteCategory(id: string, restaurantId: string, forceReassign: boolean = true) {
  await dbConnect();
  const restId = norm(restaurantId);

  // Check if any items reference this category
  const itemCounts = await ExpenseItem.countDocuments({ categoryId: id, restaurantId: restId });
  if (itemCounts > 0) {
    if (!forceReassign) {
      throw new Error('Cannot delete category because items are assigned to it');
    }

    // Find or create fallback General category to reassign items
    let fallbackCategory = await ExpenseCategory.findOne({
      restaurantId: restId,
      _id: { $ne: id },
    });

    if (!fallbackCategory) {
      fallbackCategory = await ExpenseCategory.create({
        restaurantId: restId,
        name: 'General Raw Materials',
      });
    }

    // Reassign items to fallback category
    await ExpenseItem.updateMany(
      { categoryId: id, restaurantId: restId },
      { categoryId: fallbackCategory._id }
    );
  }

  const result = await ExpenseCategory.deleteOne({ _id: id, restaurantId: restId });
  if (result.deletedCount === 0) {
    throw new Error('Category not found');
  }
  return { success: true, itemsReassigned: itemCounts > 0 };
}

/**
 * 2. Item Operations
 */
export async function getItems(restaurantId: string, categoryId?: string) {
  await dbConnect();
  const query: Record<string, any> = { restaurantId: norm(restaurantId), isActive: true };
  if (categoryId) query.categoryId = categoryId;

  return ExpenseItem.find(query)
    .populate('categoryId', 'name')
    .sort({ name: 1 })
    .lean();
}

export async function createItem(dto: CreateExpenseItemDTO) {
  await dbConnect();
  const restaurantId = norm(dto.restaurantId);
  const name = dto.name.trim();

  const existing = await ExpenseItem.findOne({
    restaurantId,
    categoryId: dto.categoryId,
    name,
  });

  if (existing) {
    if (!existing.isActive) {
      // Re-activate soft deleted item
      existing.isActive = true;
      existing.unit = dto.unit;
      await existing.save();
      return existing.toObject();
    }
    throw new Error(`Item "${name}" already exists in this category`);
  }

  return ExpenseItem.create({
    restaurantId,
    categoryId: dto.categoryId,
    name,
    unit: dto.unit,
    isActive: true,
  });
}

export async function updateItem(id: string, restaurantId: string, dto: UpdateExpenseItemDTO) {
  await dbConnect();
  const restId = norm(restaurantId);

  const updates: Record<string, any> = {};
  if (dto.name) updates.name = dto.name.trim();
  if (dto.unit) updates.unit = dto.unit;
  if (dto.categoryId) updates.categoryId = dto.categoryId;
  if (typeof dto.isActive === 'boolean') updates.isActive = dto.isActive;

  const updated = await ExpenseItem.findOneAndUpdate(
    { _id: id, restaurantId: restId },
    updates,
    { new: true }
  ).lean();

  if (!updated) throw new Error('Item not found');
  return updated;
}

export async function deleteItem(id: string, restaurantId: string) {
  await dbConnect();
  const restId = norm(restaurantId);

  const logCount = await ExpenseLog.countDocuments({ itemId: id, restaurantId: restId });
  if (logCount > 0) {
    // Soft delete to preserve historical trend integrity
    await ExpenseItem.updateOne({ _id: id, restaurantId: restId }, { isActive: false });
    return { success: true, softDeleted: true };
  }

  // Hard delete if 0 logs exist
  await ExpenseItem.deleteOne({ _id: id, restaurantId: restId });
  return { success: true, softDeleted: false };
}

/**
 * 3. Delta Computation & Chain Repair Logic
 */
async function computeAndUpdateDeltasForLog(logId: string) {
  const target = await ExpenseLog.findById(logId);
  if (!target) return;

  // Find chronologically prior log for the same item
  const prevLog = await ExpenseLog.findOne({
    restaurantId: target.restaurantId,
    itemId: target.itemId,
    $or: [
      { purchaseDate: { $lt: target.purchaseDate } },
      { purchaseDate: target.purchaseDate, createdAt: { $lt: target.createdAt } },
    ],
  })
    .sort({ purchaseDate: -1, createdAt: -1 })
    .lean();

  if (prevLog) {
    const deltaPerUnit = target.pricePerUnit - prevLog.pricePerUnit;
    const deltaTotal = deltaPerUnit * target.quantity;
    const deltaPercent = prevLog.pricePerUnit > 0
      ? ((deltaPerUnit / prevLog.pricePerUnit) * 100)
      : 0;

    target.previousLogId = prevLog._id as any;
    target.deltaPerUnit = Math.round(deltaPerUnit * 10000) / 10000;
    target.deltaTotal = Math.round(deltaTotal * 100) / 100;
    target.deltaPercent = Math.round(deltaPercent * 100) / 100;
  } else {
    target.previousLogId = null;
    target.deltaPerUnit = null;
    target.deltaTotal = null;
    target.deltaPercent = null;
  }

  await target.save();

  // Repair the immediately next chronological log for this item
  const nextLog = await ExpenseLog.findOne({
    restaurantId: target.restaurantId,
    itemId: target.itemId,
    $or: [
      { purchaseDate: { $gt: target.purchaseDate } },
      { purchaseDate: target.purchaseDate, createdAt: { $gt: target.createdAt } },
    ],
  })
    .sort({ purchaseDate: 1, createdAt: 1 });

  if (nextLog) {
    const nextDeltaPerUnit = nextLog.pricePerUnit - target.pricePerUnit;
    const nextDeltaTotal = nextDeltaPerUnit * nextLog.quantity;
    const nextDeltaPercent = target.pricePerUnit > 0
      ? ((nextDeltaPerUnit / target.pricePerUnit) * 100)
      : 0;

    nextLog.previousLogId = target._id as any;
    nextLog.deltaPerUnit = Math.round(nextDeltaPerUnit * 10000) / 10000;
    nextLog.deltaTotal = Math.round(nextDeltaTotal * 100) / 100;
    nextLog.deltaPercent = Math.round(nextDeltaPercent * 100) / 100;
    await nextLog.save();
  }
}

/**
 * 4. Purchase Log Operations
 */
export async function createExpenseLog(dto: CreateExpenseLogDTO) {
  await dbConnect();
  const restaurantId = norm(dto.restaurantId);

  if (dto.quantity <= 0) throw new Error('Quantity must be greater than 0');
  if (dto.totalPrice < 0) throw new Error('Total price cannot be negative');

  const purchaseDate = new Date(dto.purchaseDate);
  const pricePerUnit = dto.totalPrice / dto.quantity;

  const newLog = await ExpenseLog.create({
    restaurantId,
    itemId: dto.itemId,
    purchaseDate,
    quantity: dto.quantity,
    totalPrice: dto.totalPrice,
    pricePerUnit,
    note: dto.note || '',
    vendor: dto.vendor || '',
    createdBy: dto.createdBy,
  });

  // Calculate deltas and repair chain
  await computeAndUpdateDeltasForLog(newLog._id.toString());

  const populated = await ExpenseLog.findById(newLog._id)
    .populate({
      path: 'itemId',
      select: 'name unit categoryId',
      populate: { path: 'categoryId', select: 'name' },
    })
    .lean();

  return populated;
}

export async function updateExpenseLog(id: string, restaurantId: string, dto: UpdateExpenseLogDTO) {
  await dbConnect();
  const restId = norm(restaurantId);

  const existing = await ExpenseLog.findOne({ _id: id, restaurantId: restId });
  if (!existing) throw new Error('Expense log entry not found');

  if (dto.purchaseDate) existing.purchaseDate = new Date(dto.purchaseDate);
  if (typeof dto.quantity === 'number') {
    if (dto.quantity <= 0) throw new Error('Quantity must be greater than 0');
    existing.quantity = dto.quantity;
  }
  if (typeof dto.totalPrice === 'number') {
    if (dto.totalPrice < 0) throw new Error('Total price cannot be negative');
    existing.totalPrice = dto.totalPrice;
  }
  if (dto.note !== undefined) existing.note = dto.note;
  if (dto.vendor !== undefined) existing.vendor = dto.vendor;

  existing.pricePerUnit = existing.totalPrice / existing.quantity;
  await existing.save();

  // Repair deltas for this log and chronological neighbors
  await computeAndUpdateDeltasForLog(existing._id.toString());

  return ExpenseLog.findById(id)
    .populate({
      path: 'itemId',
      select: 'name unit categoryId',
      populate: { path: 'categoryId', select: 'name' },
    })
    .lean();
}

export async function deleteExpenseLog(id: string, restaurantId: string) {
  await dbConnect();
  const restId = norm(restaurantId);

  const target = await ExpenseLog.findOne({ _id: id, restaurantId: restId });
  if (!target) throw new Error('Expense log entry not found');

  // Find next log that depended on this entry
  const nextLog = await ExpenseLog.findOne({
    restaurantId: restId,
    itemId: target.itemId,
    previousLogId: target._id,
  });

  await ExpenseLog.deleteOne({ _id: id, restaurantId: restId });

  // Repair chain for next log if present
  if (nextLog) {
    await computeAndUpdateDeltasForLog(nextLog._id.toString());
  }

  return { success: true };
}

export async function getExpenseLogsPaginated(params: {
  restaurantId: string;
  itemId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  await dbConnect();
  const restId = norm(params.restaurantId);
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const query: Record<string, any> = { restaurantId: restId };
  if (params.itemId) query.itemId = params.itemId;

  if (params.from || params.to) {
    query.purchaseDate = {};
    if (params.from) query.purchaseDate.$gte = new Date(params.from);
    if (params.to) {
      const endOfDay = new Date(params.to);
      endOfDay.setHours(23, 59, 59, 999);
      query.purchaseDate.$lte = endOfDay;
    }
  }

  const [logs, totalCount] = await Promise.all([
    ExpenseLog.find(query)
      .populate({
        path: 'itemId',
        select: 'name unit categoryId',
        populate: { path: 'categoryId', select: 'name' },
      })
      .sort({ purchaseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ExpenseLog.countDocuments(query),
  ]);

  return {
    logs,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

/**
 * 5. MongoDB Aggregation Analytics
 */
export async function getItemPriceTrendsAggregation(params: {
  restaurantId: string;
  itemId: string;
  range: 'daily' | 'weekly' | 'monthly';
  from?: string;
  to?: string;
}): Promise<ItemTimeSeriesBucket[]> {
  await dbConnect();
  const restId = norm(params.restaurantId);

  const matchQuery: Record<string, any> = {
    restaurantId: restId,
    itemId: new (require('mongoose').Types.ObjectId)(params.itemId),
  };

  if (params.from || params.to) {
    matchQuery.purchaseDate = {};
    if (params.from) matchQuery.purchaseDate.$gte = new Date(params.from);
    if (params.to) {
      const endOfDay = new Date(params.to);
      endOfDay.setHours(23, 59, 59, 999);
      matchQuery.purchaseDate.$lte = endOfDay;
    }
  }

  let groupFormat: any;
  if (params.range === 'daily') {
    groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$purchaseDate' } };
  } else if (params.range === 'weekly') {
    groupFormat = {
      $concat: [
        { $dateToString: { format: '%Y-W', date: '$purchaseDate' } },
        { $toString: { $isoWeek: '$purchaseDate' } },
      ],
    };
  } else {
    groupFormat = { $dateToString: { format: '%Y-%m', date: '$purchaseDate' } };
  }

  const pipeline: any[] = [
    { $match: matchQuery },
    { $sort: { purchaseDate: 1 } },
    {
      $group: {
        _id: groupFormat,
        avgPricePerUnit: { $avg: '$pricePerUnit' },
        minPricePerUnit: { $min: '$pricePerUnit' },
        maxPricePerUnit: { $max: '$pricePerUnit' },
        totalQuantity: { $sum: '$quantity' },
        totalSpend: { $sum: '$totalPrice' },
        purchaseCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const rawBuckets = await ExpenseLog.aggregate(pipeline);

  return rawBuckets.map((b, idx, arr) => {
    const prev = idx > 0 ? arr[idx - 1] : null;
    const deltaVsPrevPeriod = prev && prev.avgPricePerUnit > 0
      ? Math.round(((b.avgPricePerUnit - prev.avgPricePerUnit) / prev.avgPricePerUnit) * 10000) / 100
      : null;

    return {
      period: b._id,
      avgPricePerUnit: Math.round(b.avgPricePerUnit * 100) / 100,
      minPricePerUnit: Math.round(b.minPricePerUnit * 100) / 100,
      maxPricePerUnit: Math.round(b.maxPricePerUnit * 100) / 100,
      totalQuantity: Math.round(b.totalQuantity * 100) / 100,
      totalSpend: Math.round(b.totalSpend * 100) / 100,
      purchaseCount: b.purchaseCount,
      deltaVsPrevPeriod,
    };
  });
}

export async function getExpenseSummaryAnalytics(params: {
  restaurantId: string;
  from?: string;
  to?: string;
}): Promise<ExpenseDashboardSummary> {
  await dbConnect();
  const restId = norm(params.restaurantId);

  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    thisWeekAgg,
    lastWeekAgg,
    thisMonthAgg,
    lastMonthAgg,
    topItemsAgg,
    recentLogs,
  ] = await Promise.all([
    ExpenseLog.aggregate([
      { $match: { restaurantId: restId, purchaseDate: { $gte: startOfThisWeek } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
    ExpenseLog.aggregate([
      { $match: { restaurantId: restId, purchaseDate: { $gte: startOfLastWeek, $lt: startOfThisWeek } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
    ExpenseLog.aggregate([
      { $match: { restaurantId: restId, purchaseDate: { $gte: startOfThisMonth } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
    ExpenseLog.aggregate([
      { $match: { restaurantId: restId, purchaseDate: { $gte: startOfLastMonth, $lt: startOfThisMonth } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
    ExpenseLog.aggregate([
      { $match: { restaurantId: restId } },
      {
        $group: {
          _id: '$itemId',
          totalSpend: { $sum: '$totalPrice' },
          totalQuantity: { $sum: '$quantity' },
        },
      },
      { $sort: { totalSpend: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'expenseitems',
          localField: '_id',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: '$item' },
      {
        $lookup: {
          from: 'expensecategories',
          localField: 'item.categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    ]),
    ExpenseLog.find({ restaurantId: restId, deltaPercent: { $ne: null } })
      .populate({
        path: 'itemId',
        select: 'name unit categoryId',
        populate: { path: 'categoryId', select: 'name' },
      })
      .populate('previousLogId')
      .sort({ purchaseDate: -1, createdAt: -1 })
      .limit(50)
      .lean(),
  ]);

  const totalSpendThisWeek = thisWeekAgg[0]?.total || 0;
  const totalSpendLastWeek = lastWeekAgg[0]?.total || 0;
  const weekOverWeekDelta = totalSpendThisWeek - totalSpendLastWeek;
  const weekOverWeekPercent = totalSpendLastWeek > 0 ? (weekOverWeekDelta / totalSpendLastWeek) * 100 : 0;

  const totalSpendThisMonth = thisMonthAgg[0]?.total || 0;
  const totalSpendLastMonth = lastMonthAgg[0]?.total || 0;
  const monthOverMonthDelta = totalSpendThisMonth - totalSpendLastMonth;
  const monthOverMonthPercent = totalSpendLastMonth > 0 ? (monthOverMonthDelta / totalSpendLastMonth) * 100 : 0;

  const topSpendItems = topItemsAgg.map((ti) => ({
    itemId: ti._id.toString(),
    itemName: ti.item?.name || 'Unknown Item',
    categoryName: ti.category?.name || 'General',
    unit: ti.item?.unit || 'unit',
    totalSpend: Math.round(ti.totalSpend * 100) / 100,
    totalQuantity: Math.round(ti.totalQuantity * 100) / 100,
  }));

  // Find item with highest price jump % in recent logs
  let highestJump: ExpenseDashboardSummary['highestPriceJumpItem'] = null;
  let maxJumpPct = -Infinity;

  recentLogs.forEach((log: any) => {
    if (log.deltaPercent && log.deltaPercent > maxJumpPct && log.itemId) {
      maxJumpPct = log.deltaPercent;
      const prevPrice = log.previousLogId?.pricePerUnit || (log.pricePerUnit - (log.deltaPerUnit || 0));
      highestJump = {
        itemId: log.itemId._id ? log.itemId._id.toString() : log.itemId.toString(),
        itemName: log.itemId.name || 'Unknown Item',
        categoryName: log.itemId.categoryId?.name || 'General',
        unit: log.itemId.unit || 'unit',
        prevPrice: Math.round(prevPrice * 100) / 100,
        currentPrice: Math.round(log.pricePerUnit * 100) / 100,
        deltaPercent: Math.round(log.deltaPercent * 100) / 100,
      };
    }
  });

  return {
    totalSpendThisWeek: Math.round(totalSpendThisWeek * 100) / 100,
    totalSpendLastWeek: Math.round(totalSpendLastWeek * 100) / 100,
    weekOverWeekDelta: Math.round(weekOverWeekDelta * 100) / 100,
    weekOverWeekPercent: Math.round(weekOverWeekPercent * 100) / 100,

    totalSpendThisMonth: Math.round(totalSpendThisMonth * 100) / 100,
    totalSpendLastMonth: Math.round(totalSpendLastMonth * 100) / 100,
    monthOverMonthDelta: Math.round(monthOverMonthDelta * 100) / 100,
    monthOverMonthPercent: Math.round(monthOverMonthPercent * 100) / 100,

    topSpendItems,
    highestPriceJumpItem: highestJump,
  };
}

/**
 * 6. Margin Impact & Inflation Analytics (Profit / Margin Loss Analyzer)
 */
export async function getItemMarginImpactAnalytics(params: {
  restaurantId: string;
  timeframe?: 'week' | 'month' | '30days' | '90days' | 'custom';
  from?: string;
  to?: string;
  categoryId?: string;
}): Promise<import('./types').MarginImpactSummary> {
  await dbConnect();
  const restId = norm(params.restaurantId);
  const now = new Date();

  let startDate: Date;
  let endDate: Date = new Date();
  let timeframeLabel = 'This Month';

  if (params.from && params.to) {
    startDate = new Date(params.from);
    endDate = new Date(params.to);
    endDate.setHours(23, 59, 59, 999);
    timeframeLabel = `${params.from} to ${params.to}`;
  } else if (params.timeframe === 'week') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
    timeframeLabel = 'This Week (7 Days)';
  } else if (params.timeframe === '90days') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 90);
    timeframeLabel = 'Last 90 Days';
  } else {
    // Default to last 30 days
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 30);
    timeframeLabel = 'Last 30 Days';
  }

  const query: Record<string, any> = {
    restaurantId: restId,
    purchaseDate: { $gte: startDate, $lte: endDate },
  };

  const logs = await ExpenseLog.find(query)
    .populate({
      path: 'itemId',
      select: 'name unit categoryId',
      populate: { path: 'categoryId', select: 'name' },
    })
    .sort({ purchaseDate: 1, createdAt: 1 })
    .lean();

  // Group logs by itemId
  const itemLogsMap: Record<string, any[]> = {};
  logs.forEach((log: any) => {
    if (!log.itemId) return;
    const itemIdStr = typeof log.itemId === 'object' ? log.itemId._id.toString() : log.itemId.toString();

    // Filter by categoryId if requested
    if (params.categoryId && params.categoryId !== 'all') {
      const catId = typeof log.itemId === 'object' && log.itemId.categoryId
        ? (typeof log.itemId.categoryId === 'object' ? log.itemId.categoryId._id.toString() : log.itemId.categoryId.toString())
        : null;
      if (catId !== params.categoryId) return;
    }

    if (!itemLogsMap[itemIdStr]) itemLogsMap[itemIdStr] = [];
    itemLogsMap[itemIdStr].push(log);
  });

  const marginItems: import('./types').ItemMarginImpact[] = [];
  let totalPeriodSpend = 0;
  let totalExtraSpendDueToInflation = 0;
  let totalSavingsFromPriceDrops = 0;

  Object.entries(itemLogsMap).forEach(([itemId, iLogs]) => {
    if (iLogs.length === 0) return;

    const firstLog = iLogs[0];
    const latestLog = iLogs[iLogs.length - 1];

    const firstPricePerUnit = firstLog.pricePerUnit;
    const latestPricePerUnit = latestLog.pricePerUnit;

    const prices = iLogs.map((l) => l.pricePerUnit);
    const maxPricePerUnit = Math.max(...prices);
    const minPricePerUnit = Math.min(...prices);

    const itemTotalQty = iLogs.reduce((acc, l) => acc + l.quantity, 0);
    const itemTotalSpend = iLogs.reduce((acc, l) => acc + l.totalPrice, 0);

    totalPeriodSpend += itemTotalSpend;

    // Extra paid due to deltas
    let itemExtraPaid = 0;
    let itemSaved = 0;

    iLogs.forEach((l) => {
      if (typeof l.deltaTotal === 'number') {
        if (l.deltaTotal > 0) itemExtraPaid += l.deltaTotal;
        else if (l.deltaTotal < 0) itemSaved += Math.abs(l.deltaTotal);
      }
    });

    totalExtraSpendDueToInflation += itemExtraPaid;
    totalSavingsFromPriceDrops += itemSaved;

    const netExtraSpend = Math.round((itemExtraPaid - itemSaved) * 100) / 100;
    
    let inflationPercent = 0;
    if (latestPricePerUnit !== firstPricePerUnit && firstPricePerUnit > 0) {
      inflationPercent = Math.round((((latestPricePerUnit - firstPricePerUnit) / firstPricePerUnit) * 100) * 10) / 10;
    } else if (itemExtraPaid > 0 && itemTotalSpend > itemExtraPaid) {
      inflationPercent = Math.round(((itemExtraPaid / (itemTotalSpend - itemExtraPaid)) * 100) * 10) / 10;
    }

    let riskLevel: import('./types').ItemMarginImpact['riskLevel'] = 'STABLE';
    if (inflationPercent >= 10 || netExtraSpend >= 500) riskLevel = 'HIGH_RISK';
    else if (inflationPercent >= 5 || netExtraSpend > 0) riskLevel = 'MEDIUM_RISK';
    else if (netExtraSpend < 0) riskLevel = 'SAVINGS';

    const itemName = typeof firstLog.itemId === 'object' ? firstLog.itemId.name : 'Item';
    const unit = typeof firstLog.itemId === 'object' ? firstLog.itemId.unit : 'unit';
    const categoryName = typeof firstLog.itemId === 'object' && firstLog.itemId.categoryId
      ? (typeof firstLog.itemId.categoryId === 'object' ? firstLog.itemId.categoryId.name : 'General')
      : 'General';

    marginItems.push({
      itemId,
      itemName,
      categoryName,
      unit,
      totalQuantity: Math.round(itemTotalQty * 100) / 100,
      totalSpend: Math.round(itemTotalSpend * 100) / 100,
      firstPricePerUnit: Math.round(firstPricePerUnit * 100) / 100,
      latestPricePerUnit: Math.round(latestPricePerUnit * 100) / 100,
      maxPricePerUnit: Math.round(maxPricePerUnit * 100) / 100,
      minPricePerUnit: Math.round(minPricePerUnit * 100) / 100,
      totalExtraPaid: Math.round(itemExtraPaid * 100) / 100,
      totalMoneySaved: Math.round(itemSaved * 100) / 100,
      netExtraSpend,
      inflationPercent,
      riskLevel,
    });
  });

  // Rank items by netExtraSpend descending (highest margin loss first)
  marginItems.sort((a, b) => b.netExtraSpend - a.netExtraSpend);

  const netInflationImpact = Math.round((totalExtraSpendDueToInflation - totalSavingsFromPriceDrops) * 100) / 100;
  const overallInflationPercent = totalPeriodSpend > 0
    ? Math.round(((netInflationImpact / (totalPeriodSpend - netInflationImpact)) * 100) * 10) / 10
    : 0;

  return {
    timeframe: timeframeLabel,
    totalPeriodSpend: Math.round(totalPeriodSpend * 100) / 100,
    totalExtraSpendDueToInflation: Math.round(totalExtraSpendDueToInflation * 100) / 100,
    totalSavingsFromPriceDrops: Math.round(totalSavingsFromPriceDrops * 100) / 100,
    netInflationImpact,
    overallInflationPercent,
    topMarginEaterItem: marginItems[0] || null,
    items: marginItems,
  };
}
