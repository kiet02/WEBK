'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckoutCard } from '@/components/features/checkout';

export default function CheckoutPage() {
  const router = useRouter();

  const handlePaymentSuccess = (orderId: string, summary: { total: number }) => {
    // Chuyển trang thực tế trong Next.js App Router
    router.push(`/checkout/success?orderId=${orderId}&total=${summary.total}`);
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6 font-sans transition-colors duration-200"
      style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Thanh toán đơn hàng
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Kiểm tra thông tin chi tiết và áp dụng ưu đãi trước khi thanh toán.
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
  );
}
