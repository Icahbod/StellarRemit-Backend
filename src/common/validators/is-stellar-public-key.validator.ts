import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Address } from 'stellar-sdk';

@ValidatorConstraint({ name: 'isStellarPublicKey', async: false })
export class IsStellarPublicKeyConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    if (typeof value !== 'string' || value.length === 0) return false;
    try {
      new Address(value);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'publicKey must be a valid Stellar public key (starting with G)';
  }
}

export function IsStellarPublicKey(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStellarPublicKey',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStellarPublicKeyConstraint,
    });
  };
}
