import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'Ready'; // Default to Ready to ship packages
    const format = searchParams.get('format') || 'json'; // json or csv

    const dispatches = await prisma.dispatch.findMany({
      where: status === 'all' ? {} : { status },
      include: {
        influencer: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Transform into the exact columns expected by the Operations Manager's Google Sheet:
    // NAME, Address, Number, Pro , Amount, Qty, City, Order
    const rows = dispatches.map((d) => {
      const inf = d.influencer;
      const products = inf.products || inf.prPackage || 'Hair Revival Trio';

      // Estimate item quantity based on comma or plus signs in product string
      const itemCount = (products.match(/,/g) || []).length + (products.match(/\+/g) || []).length + 1;

      return {
        'NAME': inf.shippingName || inf.name,
        'Address': inf.address || '',
        'Number': inf.phone || '',
        'Pro ': products,
        'Amount': '0',
        'Qty': String(itemCount),
        'City': inf.city || 'Lahore',
        'Order': `#${inf.shippingName || inf.name}`,
      };
    });

    if (format === 'csv') {
      const csv = Papa.unparse(rows);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="hab-ops-dispatch-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Return JSON with both row objects and clipboard TSV text
    const tsvHeaders = ['NAME', 'Address', 'Number', 'Pro ', 'Amount', 'Qty', 'City', 'Order'].join('\t');
    const tsvLines = rows.map((r: any) =>
      [r['NAME'], r['Address'], r['Number'], r['Pro '], r['Amount'], r['Qty'], r['City'], r['Order']].join('\t')
    );
    const clipboardText = [tsvHeaders, ...tsvLines].join('\n');

    return NextResponse.json({
      count: rows.length,
      rows,
      clipboardText,
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
