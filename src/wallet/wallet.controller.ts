import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WalletService } from './wallet.service';
import { CreateWalletDto, UpdateWalletDto } from './dto/wallet.dto';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private wallet: WalletService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.wallet.listByUser(user.id);
  }

  @Get('balance')
  balance(@CurrentUser() user: any) {
    return this.wallet.getBalance(user.id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateWalletDto) {
    return this.wallet.create(user.id, dto.publicKey, dto.label);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateWalletDto,
  ) {
    return this.wallet.update(id, user.id, {
      publicKey: dto.publicKey,
      label: dto.label,
    });
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.wallet.delete(id, user.id);
  }

  @Post('fund')
  fund(@CurrentUser() user: any, @Body() dto: CreateWalletDto) {
    return this.wallet.fund(user.id, dto.publicKey, dto.label);
  }
}
