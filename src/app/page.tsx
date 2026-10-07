'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckoutCard } from '@/components/features/checkout';
import { SystemSettingsBar } from '@/components/features/settings';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const router = useRouter();

  const handlePaymentSuccess = (orderId: string, summary: { total: number }) => {
    // Chuyển hướng tới trang hoàn tất đơn hàng
    router.push(`/checkout/success?orderId=${orderId}&total=${summary.total}`);
  };

  return (
    <div
      className="min-h-screen font-sans flex flex-col justify-between transition-colors duration-200"
      style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}
    >
      {/* Header Điều Hướng */}
      <header
        className="backdrop-blur sticky top-0 z-50 border-b transition-colors duration-200"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--theme-card) 85%, transparent)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm transition-colors duration-200"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              S
            </div>
            <span className="font-bold text-base tracking-tight">SmartCheckout</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success" dot size="sm">
              Bảo mật 256-bit SSL
            </Badge>
          </div>
        </div>
      </header>

      {/* Nội dung Màn hình Thanh toán */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          {/* Thanh cài đặt i18n và Bảng màu */}
          <SystemSettingsBar />
          <div className="text-center space-y-2">
            <h1
              className="text-3xl font-extrabold tracking-tight transition-colors duration-200"
              style={{ color: 'var(--theme-text)' }}
            >
              Thanh toán đơn hàng
            </h1>
            <p className="text-sm opacity-70">
              Xác nhận thông tin mua sắm, áp dụng mã voucher và thanh toán an toàn.
            </p>
          </div>

          <CheckoutCard
            initialSubtotal={350000}
            customerName="Lê Hoàng Nam"
            customerEmail="nam.le@example.com"
            onPaymentSuccess={handlePaymentSuccess}
          />
        </div>
      </main>

      {/* Footer */}
      <footer
        className="border-t py-6 text-center text-xs opacity-70 transition-colors duration-200"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 SmartCheckout System. Thiết kế theo tiêu chuẩn Component-Driven Design.</p>
          <div className="flex gap-4">
            <span>Storybook</span>
            <span>Vitest</span>
            <span>Playwright</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
