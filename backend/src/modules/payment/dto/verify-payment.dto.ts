export class VerifyPaymentDto {
    platform: 'ios' | 'android';
    productId: string;
    receipt: string; 
  }