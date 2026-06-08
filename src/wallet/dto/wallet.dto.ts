import { IsString, IsNotEmpty } from 'class-validator';
import { IsStellarPublicKey } from '../../common/validators/is-stellar-public-key.validator';

export class UpsertWalletDto {
  @IsString()
  @IsNotEmpty()
  @IsStellarPublicKey()
  publicKey: string;
}
