import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';

const mockPrisma = {
  wallet: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
};

const mockStellar = {
  getBalances: jest.fn(),
  fundAccount: jest.fn(),
};

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StellarService, useValue: mockStellar },
      ],
    }).compile();
    service = module.get<WalletService>(WalletService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a wallet for the user', async () => {
      mockPrisma.wallet.create.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        publicKey: 'GABC123',
        label: 'main',
      });

      const result = await service.create('user-1', 'GABC123', 'main');

      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', publicKey: 'GABC123', label: 'main' },
      });
      expect(result.publicKey).toBe('GABC123');
    });

    it('throws ConflictException when publicKey already exists for user', async () => {
      const p2002Error = new Error('Unique constraint failed');
      (p2002Error as any).code = 'P2002';
      mockPrisma.wallet.create.mockRejectedValue(p2002Error);

      await expect(service.create('user-1', 'GABC123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws when publicKey is empty', async () => {
      await expect(service.create('user-1', '')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listByUser', () => {
    it('returns all wallets for a user', async () => {
      mockPrisma.wallet.findMany.mockResolvedValue([
        { id: 'wallet-1', userId: 'user-1', publicKey: 'GABC1', label: 'main' },
        { id: 'wallet-2', userId: 'user-1', publicKey: 'GABC2', label: 'savings' },
      ]);

      const result = await service.listByUser('user-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.wallet.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('getBalance', () => {
    it('returns empty array when no wallets exist', async () => {
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.getBalance('user-1');

      expect(result).toEqual([]);
    });

    it('returns balances for all wallets', async () => {
      mockPrisma.wallet.findMany.mockResolvedValue([
        { id: 'w1', userId: 'user-1', publicKey: 'GABC1', label: 'main' },
        { id: 'w2', userId: 'user-1', publicKey: 'GABC2', label: null },
      ]);
      mockStellar.getBalances.mockResolvedValueOnce({
        balances: [{ asset_type: 'native', balance: '100' }],
      });
      mockStellar.getBalances.mockResolvedValueOnce({
        balances: [{ asset_type: 'native', balance: '200' }],
      });

      const result = await service.getBalance('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].balances).toEqual([{ asset_type: 'native', balance: '100' }]);
      expect(result[1].balances).toEqual([{ asset_type: 'native', balance: '200' }]);
    });

    it('handles failed balance fetches gracefully', async () => {
      mockPrisma.wallet.findMany.mockResolvedValue([
        { id: 'w1', userId: 'user-1', publicKey: 'GABC1', label: 'main' },
      ]);
      mockStellar.getBalances.mockRejectedValue(new Error('Network error'));

      const result = await service.getBalance('user-1');

      expect(result[0].balances).toEqual([]);
      expect(result[0].error).toBe('Network error');
    });
  });

  describe('update', () => {
    it('updates a wallet', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        publicKey: 'GABC1',
      });
      mockPrisma.wallet.update.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        publicKey: 'GABC1',
        label: 'renamed',
      });

      const result = await service.update('wallet-1', 'user-1', { label: 'renamed' });

      expect(result.label).toBe('renamed');
    });

    it('throws ConflictException when updating to a duplicate publicKey', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        publicKey: 'GABC1',
      });
      const p2002Error = new Error('Unique constraint failed');
      (p2002Error as any).code = 'P2002';
      mockPrisma.wallet.update.mockRejectedValue(p2002Error);

      await expect(
        service.update('wallet-1', 'user-1', { publicKey: 'GABC1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when wallet belongs to different user', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        userId: 'other-user',
        publicKey: 'GABC1',
      });

      await expect(
        service.update('wallet-1', 'user-1', { label: 'nope' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when wallet does not exist', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      await expect(
        service.update('wallet-1', 'user-1', { label: 'nope' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes a wallet', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        publicKey: 'GABC1',
      });
      mockPrisma.wallet.delete.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        publicKey: 'GABC1',
      });

      const result = await service.delete('wallet-1', 'user-1');

      expect(result.id).toBe('wallet-1');
    });

    it('throws NotFoundException for non-existent wallet', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      await expect(service.delete('wallet-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('fund', () => {
    it('funds an account and upserts wallet with label', async () => {
      mockStellar.fundAccount.mockResolvedValue({ hash: 'txhash' });
      mockPrisma.wallet.upsert.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        publicKey: 'GABC1',
        label: 'main',
      });

      const result = await service.fund('user-1', 'GABC1', 'main');

      expect(mockStellar.fundAccount).toHaveBeenCalledWith('GABC1');
      expect(result.friendbot).toEqual({ hash: 'txhash' });
      expect(result.wallet.label).toBe('main');
    });

    it('funds an account without label', async () => {
      mockStellar.fundAccount.mockResolvedValue({ hash: 'txhash' });
      mockPrisma.wallet.upsert.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        publicKey: 'GABC1',
      });

      const result = await service.fund('user-1', 'GABC1');

      expect(mockStellar.fundAccount).toHaveBeenCalledWith('GABC1');
      expect(result.friendbot).toEqual({ hash: 'txhash' });
    });

    it('throws when publicKey is empty', async () => {
      await expect(service.fund('user-1', '')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
