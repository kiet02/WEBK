/**
 * Hệ thống từ điển i18n song ngữ (Tiếng Việt & Tiếng Anh)
 * Hỗ trợ tra cứu theo cấu trúc phân cấp (dot-notation key) và thay thế tham số.
 */
export const translations = {
  vi: {
    common: {
      welcome: 'Xin chào quý khách',
      language: 'Ngôn ngữ',
      theme: 'Giao diện',
      colorPalette: 'Bảng màu chủ đạo',
      apply: 'Áp dụng',
      loading: 'Đang xử lý...',
      success: 'Thành công',
      error: 'Đã xảy ra lỗi',
      light: 'Sáng',
      dark: 'Tối',
      system: 'Hệ thống',
    },
    checkout: {
      title: 'Thanh toán đơn hàng',
      subtitle: 'Xác nhận thông tin mua sắm, áp dụng mã voucher và thanh toán an toàn.',
      customerInfo: 'Thông tin người nhận',
      orderSummary: 'Tóm tắt đơn hàng',
      subtotal: 'Tạm tính',
      vat: 'Thuế VAT (10%)',
      shippingFee: 'Phí vận chuyển',
      discount: 'Giảm giá',
      total: 'Tổng thanh toán',
      voucherPlaceholder: 'Nhập mã voucher...',
      voucherApplied: 'Áp dụng voucher thành công!',
      voucherInvalid: 'Mã voucher không tồn tại hoặc đã hết hạn',
      payNow: 'Xác nhận thanh toán',
      processingPayment: 'Đang tiến hành thanh toán...',
      securityBadge: 'Bảo mật 256-bit SSL',
    },
    success: {
      title: 'Đặt hàng thành công!',
      subtitle: 'Cảm ơn quý khách đã tin tưởng và mua sắm tại SmartCheckout.',
      orderId: 'Mã đơn hàng',
      paidAmount: 'Đã thanh toán',
      backHome: 'Quay lại trang chủ',
    },
  },
  en: {
    common: {
      welcome: 'Welcome guest',
      language: 'Language',
      theme: 'Theme',
      colorPalette: 'Theme Accent Color',
      apply: 'Apply',
      loading: 'Processing...',
      success: 'Success',
      error: 'An error occurred',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    },
    checkout: {
      title: 'Order Checkout',
      subtitle: 'Verify your order details, apply voucher codes, and pay securely.',
      customerInfo: 'Customer Information',
      orderSummary: 'Order Summary',
      subtotal: 'Subtotal',
      vat: 'VAT (10%)',
      shippingFee: 'Shipping Fee',
      discount: 'Discount',
      total: 'Total Amount',
      voucherPlaceholder: 'Enter voucher code...',
      voucherApplied: 'Voucher applied successfully!',
      voucherInvalid: 'Voucher code is invalid or expired',
      payNow: 'Confirm Payment',
      processingPayment: 'Processing payment...',
      securityBadge: '256-bit SSL Secure',
    },
    success: {
      title: 'Order Placed Successfully!',
      subtitle: 'Thank you for shopping with SmartCheckout.',
      orderId: 'Order ID',
      paidAmount: 'Amount Paid',
      backHome: 'Back to Home',
    },
  },
} as const;

export type SupportedLanguage = keyof typeof translations;

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof translations['vi']>;

/**
 * Tra cứu bản dịch an toàn theo dot-notation key (vd: 'checkout.title', 'common.welcome')
 */
export function translate(
  lang: SupportedLanguage,
  key: TranslationKey | (string & Record<never, never>),
  params?: Record<string, string | number>
): string {
  const segments = key.split('.');
  const dictionary: Record<string, unknown> = translations[lang] || translations.vi;
  let current: unknown = dictionary;

  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in current) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      // Fallback sang từ điển Tiếng Việt nếu thiếu
      const fallbackDict: Record<string, unknown> = translations.vi;
      let fallbackCurrent: unknown = fallbackDict;
      for (const fbSegment of segments) {
        if (fallbackCurrent && typeof fallbackCurrent === 'object' && fbSegment in fallbackCurrent) {
          fallbackCurrent = (fallbackCurrent as Record<string, unknown>)[fbSegment];
        } else {
          return key;
        }
      }
      current = fallbackCurrent;
      break;
    }
  }

  if (typeof current !== 'string') {
    return key;
  }

  let result = current;
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    }
  }

  return result;
}
