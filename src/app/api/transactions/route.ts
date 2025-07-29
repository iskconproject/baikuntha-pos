import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/services/database/transactions';
import { getSession } from '@/lib/auth/session';
import { z } from 'zod';

// Validation schema for transaction creation
const createTransactionSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
  })).min(1),
  paymentMethod: z.enum(['cash', 'upi']),
  paymentReference: z.string().optional(),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
});

const querySchema = z.object({
  userId: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createTransactionSchema.parse(body);

    // Create transaction with current user
    const transaction = await transactionService.createTransaction({
      ...validatedData,
      userId: session.id,
    });

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Transaction creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    let transactions;

    if (query.userId) {
      transactions = await transactionService.findByUser(
        query.userId,
        query.limit ? parseInt(query.limit) : undefined
      );
    } else if (query.status) {
      transactions = await transactionService.findByStatus(query.status);
    } else if (query.startDate && query.endDate) {
      transactions = await transactionService.findByDateRange(
        new Date(query.startDate),
        new Date(query.endDate)
      );
    } else {
      // Get all transactions with optional limit
      transactions = await transactionService.findAll(
        query.limit ? parseInt(query.limit) : undefined
      );
    }

    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}