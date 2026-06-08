import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { IsStellarPublicKey } from '../../common/validators/is-stellar-public-key.validator';

export class CreateWalletDto {
  @IsString()
  @IsNotEmpty()
  @IsStellarPublicKey()
  publicKey: string;

  @IsString()
  @IsOptional()
  label?: string;
}

export class UpdateWalletDto {
  @IsStellarPublicKey()
  @IsOptional()
  publicKey?: string;

  @IsString()
  @IsOptional()
  label?: string;
}
