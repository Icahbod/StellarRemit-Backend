import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService, private stellar: StellarService) {}

  async create(userId: string, publicKey: string, label?: string) {
    if (!publicKey) throw new BadRequestException('publicKey is required');

    try {
      return await this.prisma.wallet.create({
        data: { userId, publicKey, label },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A wallet with this public key already exists for this user',
        );
      }
      throw error;
    }
  }

  async listByUser(userId: string) {
    return this.prisma.wallet.findMany({ where: { userId } });
  }

  async getBalance(userId: string) {
    const wallets = await this.prisma.wallet.findMany({ where: { userId } });
    if (wallets.length === 0) return [];

    const results = await Promise.allSettled(
      wallets.map((w) => this.stellar.getBalances(w.publicKey)),
    );

    return wallets.map((wallet, i) => {
      const result = results[i];
      return {
        id: wallet.id,
        publicKey: wallet.publicKey,
        label: wallet.label,
        balances:
          result.status === 'fulfilled' ? result.value.balances : [],
        error:
          result.status === 'rejected'
            ? (result.reason as Error).message
            : undefined,
      };
    });
  }

  async update(
    walletId: string,
    userId: string,
    data: { publicKey?: string; label?: string },
  ) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet || wallet.userId !== userId) {
      throw new NotFoundException('Wallet not found');
    }

    try {
      return await this.prisma.wallet.update({
        where: { id: walletId },
        data,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A wallet with this public key already exists for this user',
        );
      }
      throw error;
    }
  }

  async delete(walletId: string, userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet || wallet.userId !== userId) {
      throw new NotFoundException('Wallet not found');
    }

    return this.prisma.wallet.delete({ where: { id: walletId } });
  }

  async fund(userId: string, publicKey: string, label?: string) {
    if (!publicKey) throw new BadRequestException('publicKey is required');

    const friendbotResult = await this.stellar.fundAccount(publicKey);

    // Upsert ensures the wallet record exists. On duplicate (same userId+publicKey)
    // we intentionally update nothing — the wallet already exists as-is.
    const wallet = await this.prisma.wallet.upsert({
      where: {
        userId_publicKey: { userId, publicKey },
      },
      create: { userId, publicKey, label },
      update: {},
    });

    return {
      wallet,
      friendbot: friendbotResult,
    };
  }
}
