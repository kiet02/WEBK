export interface OrderSummary {
  subtotal: number;
  discount: number;
  shippingFee: number;
  vat: number;
  total: number;
  voucherApplied?: string;
  voucherError?: string;
}

export const VALID_VOUCHERS: Record<string, { type: 'percent' | 'shipping'; value: number }> = {
  GIAM20: { type: 'percent', value: 0.2 },
  GIAM50: { type: 'percent', value: 0.5 },
  FREESHIP: { type: 'shipping', value: 1 },
};

/**
 * Tính toán hóa đơn đặt hàng theo quy chuẩn nghiệp vụ:
 * - Thuế VAT: 10% trên số tiền sau giảm giá
 * - Phí ship: Miễn phí nếu tạm tính >= 500.000đ, ngược lại 30.000đ
 * - Voucher: Áp dụng theo mã (giảm % hoặc miễn phí ship)
 */
export function calculateOrderTotal({
  subtotal,
  voucherCode,
}: {
  subtotal: number;
  voucherCode?: string;
}): OrderSummary {
  if (subtotal < 0) {
    throw new Error('Số tiền tạm tính không được âm');
  }

  // 1. Phí vận chuyển mặc định
  let shippingFee = subtotal >= 500000 ? 0 : 30000;
  let discount = 0;
  let voucherApplied: string | undefined;
  let voucherError: string | undefined;

  // 2. Xử lý Voucher
  if (voucherCode && voucherCode.trim()) {
    const code = voucherCode.trim().toUpperCase();
    const voucher = VALID_VOUCHERS[code];

    if (voucher) {
      voucherApplied = code;
      if (voucher.type === 'percent') {
        discount = Math.round(subtotal * voucher.value);
      } else if (voucher.type === 'shipping') {
        shippingFee = 0;
      }
    } else {
      voucherError = 'Mã voucher không hợp lệ';
    }
  }

  // 3. Tính tiền sau giảm và VAT
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const vat = Math.round(discountedSubtotal * 0.1);
  const total = discountedSubtotal + vat + shippingFee;

  return {
    subtotal,
    discount,
    shippingFee,
    vat,
    total,
    voucherApplied,
    voucherError,
  };
}

/**
 * Định dạng tiền tệ VND
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}
