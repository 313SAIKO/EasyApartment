// src/contracts/contracts.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('contracts')
@UseGuards(AccessTokenGuard, RolesGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Roles('admin')
  create(@Body() createDto: CreateContractDto) {
    return this.contractsService.create(createDto);
  }

  @Get()
  @Roles('admin')
  findAll() {
    return this.contractsService.findAll();
  }

  @Get('me')
  @Roles('tenant')
  getMyContract(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.contractsService.findByTenantId(userId);
  }

  @Get(':id')
  @Roles('admin', 'tenant')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.contractsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateDto: UpdateContractDto) {
    return this.contractsService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.contractsService.remove(id);
  }
}
