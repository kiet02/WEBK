import { describe, it, expect } from 'vitest';
import { calculateOrderTotal, formatCurrency } from './checkout';

describe('Kiểm thử Đơn vị (Unit Test): calculateOrderTotal', () => {
  it('tính toán đơn hàng tiêu chuẩn dưới 500k (có phí ship 30k, VAT 10%)', () => {
    const result = calculateOrderTotal({ subtotal: 300000 });
    // Tạm tính: 300.000đ
    // Giảm giá: 0đ
    // Phí ship: 30.000đ
    // VAT: 30.000đ (10% của 300.000)
    // Tổng cộng: 300.000 + 30.000 + 30.000 = 360.000đ
    expect(result.subtotal).toBe(300000);
    expect(result.discount).toBe(0);
    expect(result.shippingFee).toBe(30000);
    expect(result.vat).toBe(30000);
    expect(result.total).toBe(360000);
    expect(result.voucherError).toBeUndefined();
  });

  it('tự động miễn phí vận chuyển khi tạm tính >= 500.000đ', () => {
    const result = calculateOrderTotal({ subtotal: 600000 });
    expect(result.shippingFee).toBe(0);
    expect(result.vat).toBe(60000);
    expect(result.total).toBe(660000);
  });

  it('áp dụng thành công voucher giảm giá 20% (GIAM20)', () => {
    const result = calculateOrderTotal({ subtotal: 200000, voucherCode: 'GIAM20' });
    // Giảm giá: 20% * 200.000 = 40.000đ
    // Tạm tính sau giảm: 160.000đ
    // VAT: 16.000đ
    // Phí ship: 30.000đ
    // Tổng: 160.000 + 16.000 + 30.000 = 206.000đ
    expect(result.discount).toBe(40000);
    expect(result.voucherApplied).toBe('GIAM20');
    expect(result.total).toBe(206000);
    expect(result.voucherError).toBeUndefined();
  });

  it('áp dụng thành công voucher miễn phí vận chuyển (FREESHIP)', () => {
    const result = calculateOrderTotal({ subtotal: 200000, voucherCode: 'FREESHIP' });
    expect(result.shippingFee).toBe(0);
    expect(result.voucherApplied).toBe('FREESHIP');
  });

  it('thông báo lỗi khi mã voucher không tồn tại trong hệ thống', () => {
    const result = calculateOrderTotal({ subtotal: 200000, voucherCode: 'INVALID_CODE' });
    expect(result.discount).toBe(0);
    expect(result.voucherError).toBe('Mã voucher không hợp lệ');
  });

  it('ném lỗi khi số tiền tạm tính âm', () => {
    expect(() => calculateOrderTotal({ subtotal: -50000 })).toThrowError(
      'Số tiền tạm tính không được âm'
    );
  });
});

describe('Kiểm thử Đơn vị (Unit Test): formatCurrency', () => {
  it('định dạng đúng tiền tệ Việt Nam', () => {
    const formatted = formatCurrency(100000);
    expect(formatted).toContain('100.000');
  });
});
