import {
  Controller,
  Get,
  Query,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common';
import { DashboardAdminService } from './dashboard_admin.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('dashboard-admin')
export class DashboardAdminController {
  constructor(private readonly dashboardService: DashboardAdminService) {}

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('admin')
  @Get('reports')
  report(@Query('period') period: string) {
    return this.dashboardService.getReport(period);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('admin')
  @Get('summary')
  async getSummary() {
    try {
      return await this.dashboardService.getStats();
    } catch {
      throw new InternalServerErrorException(
        'ไม่สามารถดึงข้อมูล Dashboard ได้',
      );
    }
  }
}
