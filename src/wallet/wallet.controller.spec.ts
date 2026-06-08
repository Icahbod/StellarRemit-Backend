import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

const mockWalletService = {
  listByUser: jest.fn(),
  getBalance: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  fund: jest.fn(),
};

const user = { id: 'user-1', email: 'test@example.com' };

describe('WalletController', () => {
  let controller: WalletController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [{ provide: WalletService, useValue: mockWalletService }],
    }).compile();
    controller = module.get<WalletController>(WalletController);
    jest.clearAllMocks();
  });

  describe('GET /wallet', () => {
    it('lists all wallets for the current user', async () => {
      const expected = [{ id: 'w1', publicKey: 'GABC1' }];
      mockWalletService.listByUser.mockResolvedValue(expected);

      const result = await controller.list(user as any);

      expect(mockWalletService.listByUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });
  });

  describe('GET /wallet/balance', () => {
    it('returns balances for the current user', async () => {
      const expected = [
        { id: 'w1', publicKey: 'GABC1', balances: [{ asset_type: 'native', balance: '100.0000000' }] },
      ];
      mockWalletService.getBalance.mockResolvedValue(expected);

      const result = await controller.balance(user as any);

      expect(mockWalletService.getBalance).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });

    it('returns empty array when user has no wallet', async () => {
      mockWalletService.getBalance.mockResolvedValue([]);

      const result = await controller.balance(user as any);

      expect(result).toEqual([]);
    });
  });

  describe('POST /wallet', () => {
    it('creates a wallet for the current user', async () => {
      const dto = { publicKey: 'GABC1', label: 'main' };
      mockWalletService.create.mockResolvedValue({ id: 'w1', ...dto });

      const result = await controller.create(user as any, dto);

      expect(mockWalletService.create).toHaveBeenCalledWith('user-1', 'GABC1', 'main');
      expect(result.id).toBe('w1');
    });
  });

  describe('PATCH /wallet/:id', () => {
    it('updates a wallet', async () => {
      const dto = { label: 'renamed' };
      mockWalletService.update.mockResolvedValue({ id: 'w1', label: 'renamed' });

      const result = await controller.update(user as any, 'w1', dto);

      expect(mockWalletService.update).toHaveBeenCalledWith('w1', 'user-1', { publicKey: undefined, label: 'renamed' });
      expect(result.label).toBe('renamed');
    });
  });

  describe('DELETE /wallet/:id', () => {
    it('deletes a wallet', async () => {
      mockWalletService.delete.mockResolvedValue({ id: 'w1' });

      const result = await controller.remove(user as any, 'w1');

      expect(mockWalletService.delete).toHaveBeenCalledWith('w1', 'user-1');
      expect(result.id).toBe('w1');
    });
  });

  describe('POST /wallet/fund', () => {
    it('funds a wallet', async () => {
      const dto = { publicKey: 'GABC1', label: 'main' };
      mockWalletService.fund.mockResolvedValue({ wallet: { id: 'w1' }, friendbot: { hash: 'tx' } });

      const result = await controller.fund(user as any, dto);

      expect(mockWalletService.fund).toHaveBeenCalledWith('user-1', 'GABC1', 'main');
      expect(result.wallet.id).toBe('w1');
    });
  });
});
