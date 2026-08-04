'use server';

import dbConnect from '@/lib/mongodb';
import ConsultationLead from '@/features/consultation/model';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Validates super admin authentication.
 */
async function checkSuperAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) {
    throw new Error('Unauthorized: No token provided');
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'super_admin') {
    throw new Error('Unauthorized: Super Admin access required');
  }

  return decoded;
}

/**
 * Computes lead intent qualification score based on budget & business income bracket.
 */
function computeQualificationScore(budgetRange: string, monthlyIncome: string): 'High Intent 🔥' | 'Medium Intent' | 'Exploring' {
  const b = budgetRange.toLowerCase();
  const i = monthlyIncome.toLowerCase();

  if (
    b.includes('50k -') ||
    b.includes('1.5') ||
    b.includes('5 lakh') ||
    b.includes('enterprise') ||
    i.includes('2l') ||
    i.includes('10l') ||
    i.includes('enterprise')
  ) {
    return 'High Intent 🔥';
  }

  if (b.includes('under') || i.includes('under')) {
    return 'Exploring';
  }

  return 'Medium Intent';
}

export interface SubmitConsultationData {
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  industry: string;
  purpose: string;
  monthlyIncome: string;
  budgetRange: string;
  timeline: string;
  description: string;
  restaurantId?: string;
}

/**
 * Public action to submit a high-intent consultation request.
 */
export async function submitConsultationForm(data: SubmitConsultationData) {
  try {
    if (!data.name || !data.email || !data.phone || !data.industry || !data.purpose || !data.description) {
      throw new Error('Please fill in all required fields.');
    }

    await dbConnect();

    const qualificationScore = computeQualificationScore(data.budgetRange, data.monthlyIncome);

    const lead = await ConsultationLead.create({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      companyName: data.companyName ? data.companyName.trim() : '',
      industry: data.industry,
      purpose: data.purpose,
      monthlyIncome: data.monthlyIncome,
      budgetRange: data.budgetRange,
      timeline: data.timeline,
      description: data.description.trim(),
      qualificationScore,
      status: 'new',
      restaurantId: data.restaurantId || '',
    });

    return {
      success: true,
      leadId: lead._id.toString(),
      qualificationScore,
      message: 'Consultation request submitted successfully!',
    };
  } catch (error) {
    console.error('Error submitting consultation form:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit consultation request.';
    throw new Error(message);
  }
}

/**
 * Super Admin action to fetch all submitted consultation leads.
 */
export async function getSuperAdminConsultations() {
  try {
    await checkSuperAdminAuth();
    await dbConnect();

    const leads = await ConsultationLead.find({}).sort({ createdAt: -1 }).lean();

    return JSON.parse(JSON.stringify(leads));
  } catch (error) {
    console.error('Error fetching consultation leads:', error);
    throw new Error('Failed to retrieve consultation leads');
  }
}

/**
 * Super Admin action to update a lead's status and internal notes.
 */
export async function updateConsultationStatus(
  id: string,
  status: 'new' | 'contacted' | 'in_discussion' | 'qualified' | 'converted' | 'archived',
  notes?: string
) {
  try {
    await checkSuperAdminAuth();
    await dbConnect();

    const updatePayload: any = { status };
    if (notes !== undefined) {
      updatePayload.notes = notes.trim();
    }

    const updated = await ConsultationLead.findByIdAndUpdate(id, updatePayload, { new: true });
    revalidatePath('/super-admin/consultations');
    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating consultation lead status:', error);
    throw new Error('Failed to update consultation lead status');
  }
}
