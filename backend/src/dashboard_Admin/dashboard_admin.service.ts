import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DashboardAdminService {
  constructor(private readonly db: PrismaService) {}

  async getReport(period: string) {
    if (typeof period !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      throw new BadRequestException('Period must be YYYY-MM');
    }
    const invoices = await this.db.invoice.findMany({
      where: { billingPeriod: period },
      include: { room: true, tenant: true },
      orderBy: { createdAt: 'asc' },
    });
    const total = invoices.reduce(
      (sum, item) => sum.plus(item.grandTotal),
      new Prisma.Decimal(0),
    );
    const paid = invoices.filter((item) => item.status === 'paid');
    const collected = paid.reduce(
      (sum, item) => sum.plus(item.grandTotal),
      new Prisma.Decimal(0),
    );
    return {
      period,
      summary: {
        totalInvoices: invoices.length,
        paidInvoices: paid.length,
        totalBilled: Number(total),
        collected: Number(collected),
        outstanding: Number(total.minus(collected)),
      },
      invoices: invoices.map((item) => ({
        id: item.id,
        roomNumber: item.room.roomNumber,
        tenant: item.tenant.fullName ?? item.tenant.email,
        amount: Number(item.grandTotal),
        status: item.status,
      })),
    };
  }
  async getStats() {
    const now = new Date();
    const year = now.getFullYear();
    const [
      total,
      available,
      occupied,
      pendingMaintenance,
      revenue,
      recent,
      periods,
    ] = await Promise.all([
      this.db.room.count(),
      this.db.room.count({ where: { status: 'available' } }),
      this.db.room.count({ where: { status: 'occupied' } }),
      this.db.maintenance.count({
        where: { status: { in: ['pending', 'in_progress'] } },
      }),
      this.db.invoice.aggregate({
        where: {
          status: 'paid',
          confirmedAt: { gte: new Date(year, now.getMonth(), 1) },
        },
        _sum: { grandTotal: true },
      }),
      this.db.invoice.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { tenant: true },
      }),
      this.db.invoice.groupBy({
        by: ['billingPeriod'],
        where: { status: 'paid', billingPeriod: { startsWith: `${year}-` } },
        _sum: { grandTotal: true },
      }),
    ]);
    const totals = new Map(
      periods.map((period) => [
        period.billingPeriod,
        Number(period._sum.grandTotal ?? 0),
      ]),
    );
    return {
      stats: {
        monthlyRevenue: Number(revenue._sum.grandTotal ?? 0),
        occupancyRate: total ? Math.round((occupied / total) * 100) : 0,
        pendingMaintenance,
        availableRooms: available,
      },
      recentInvoices: recent.map((invoice) => ({
        id: invoice.id,
        invoiceNo: `#INV-${invoice.id.slice(-8)}`,
        tenant: invoice.tenant.fullName ?? invoice.tenant.email,
        amount: `฿${Number(invoice.grandTotal).toLocaleString()}`,
        status: invoice.status,
      })),
      revenueChart: [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ].map((month, index) => ({
        month,
        revenue:
          totals.get(`${year}-${String(index + 1).padStart(2, '0')}`) ?? 0,
      })),
    };
  }
}
