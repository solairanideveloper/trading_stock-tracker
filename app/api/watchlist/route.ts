import { NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';

export async function GET(req: Request) {
  try {
    const session = getSessionCookie(req as any) as any;
    // Debug: log basic session info
    console.log('watchlist GET session:', !!session, session && (session.email || session?.user?.email || session?.sub));

    const email = session?.email || session?.user?.email || session?.session?.user?.email || session?.sub;

    if (!email) {
      return NextResponse.json({ error: 'Not authenticated', debug: { sessionPresent: !!session } }, { status: 401 });
    }

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('DB not connected');

    const user = await db.collection('user').findOne<{ id?: string; _id?: any; email?: string }>({ email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userId = (user.id as string) || String(user._id || '');
    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    const symbols = (items || []).map((i) => String(i.symbol));

    return NextResponse.json({ success: true, symbols });
  } catch (e) {
    console.error('GET /api/watchlist error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, company } = body || {};
    if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });

    const session = getSessionCookie(req as any) as any;
    // Debug: log basic session info to help diagnose auth issues
    console.log('watchlist POST session:', !!session, session && (session.email || session?.user?.email || session?.sub));

    const email = session?.email || session?.user?.email || session?.session?.user?.email || session?.sub;

    if (!email) {
      // Return limited debug info to client to assist local debugging (remove in prod)
      return NextResponse.json({ error: 'Not authenticated', debug: { sessionPresent: !!session } }, { status: 401 });
    }

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('DB not connected');

    // Find user document
    const user = await db.collection('user').findOne<{ id?: string; _id?: any; email?: string }>({ email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userId = (user.id as string) || String(user._id || '');

    try {
      await Watchlist.create({ userId, symbol: String(symbol).toUpperCase(), company: company || '' });
    } catch (e) {
      // duplicate key or other issue — ignore duplicates
      console.error('watchlist add error:', e);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('POST /api/watchlist error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { symbol } = body || {};
    if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });

    const session = getSessionCookie(req as any) as any;
    // Debug: log basic session info to help diagnose auth issues
    console.log('watchlist DELETE session:', !!session, session && (session.email || session?.user?.email || session?.sub));

    const email = session?.email || session?.user?.email || session?.session?.user?.email || session?.sub;

    if (!email) {
      // Return limited debug info to client to assist local debugging (remove in prod)
      return NextResponse.json({ error: 'Not authenticated', debug: { sessionPresent: !!session } }, { status: 401 });
    }

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('DB not connected');

    const user = await db.collection('user').findOne<{ id?: string; _id?: any; email?: string }>({ email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userId = (user.id as string) || String(user._id || '');

    await Watchlist.deleteOne({ userId, symbol: String(symbol).toUpperCase() }).catch((e) => console.error('watchlist remove error:', e));

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/watchlist error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
