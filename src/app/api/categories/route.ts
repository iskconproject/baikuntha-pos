import { NextRequest, NextResponse } from 'next/server';
import { getLocalDb } from '@/lib/db/connection';
import { categories } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const db = getLocalDb();
    
    const allCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.name);

    return NextResponse.json({
      categories: allCategories,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}