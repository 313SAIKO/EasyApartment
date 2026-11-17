import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Patch,
  ParseEnumPipe,
  ParseArrayPipe,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomStatus } from './dto/create-room.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('rooms')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('admin')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  // ✅ สร้างหลายห้องพร้อมกัน (Bulk Create)
  @Post('bulk')
  async createMany(
    @Body(
      new ParseArrayPipe({
        items: CreateRoomDto,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    createRoomDtos: CreateRoomDto[],
  ) {
    if (!Array.isArray(createRoomDtos) || createRoomDtos.length === 0) {
      throw new BadRequestException('Body must be a non-empty array of rooms');
    }

    return this.roomsService.createMany(createRoomDtos);
  }

  @Get()
  findAll(
    @Query('status', new ParseEnumPipe(RoomStatus, { optional: true }))
    status?: RoomStatus,
  ) {
    return this.roomsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  // ✅ แก้ไขตรงนี้: รับเป็น Object เพื่อแก้ Error 400
  @Patch(':id/amenities')
  async updateAmenities(
    @Param('id') id: string,
    @Body() body: { amenities: string[] },
  ) {
    if (
      !body ||
      !Array.isArray(body.amenities) ||
      body.amenities.some((value) => typeof value !== 'string')
    ) {
      throw new BadRequestException('amenities must be an array of strings');
    }

    return this.roomsService.updateAmenities(id, body.amenities);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status', new ParseEnumPipe(RoomStatus)) status: RoomStatus,
  ) {
    return this.roomsService.updateStatus(id, status);
  }
}
