import { NextRequest, NextResponse } from 'next/server';
import { getLocalDb } from '@/lib/db/connection';
import { categories, products } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const db = getLocalDb();
    
    const categoryCounts = await db
      .select({
        categoryId: categories.id,
        count: sql<number>`COUNT(${products.id})`,
      })
      .from(categories)
      .leftJoin(products, and(
        eq(products.categoryId, categories.id),
        eq(products.isActive, true)
      ))
      .where(eq(categories.isActive, true))
      .groupBy(categories.id);

    const counts: Record<string, number> = {};
    categoryCounts.forEach(({ categoryId, count }) => {
      counts[categoryId] = Number(count);
    });

    return NextResponse.json({
      counts,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching category counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category counts' },
      { status: 500 }
    );
  }
}