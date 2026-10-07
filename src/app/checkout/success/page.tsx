'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/checkout';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || 'ORD-UNKNOWN';
  const total = Number(searchParams.get('total')) || 0;

  return (
    <Card className="w-full max-w-md shadow-2xl border-emerald-200 dark:border-emerald-800 text-center">
      <CardHeader className="space-y-3">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <CardTitle className="text-xl text-emerald-900 dark:text-emerald-200">
          Đặt hàng thành công!
        </CardTitle>
        <CardDescription>
          Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đang được xử lý để gửi đi sớm nhất.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex justify-between items-center">
          <span className="text-zinc-500">Mã đơn hàng:</span>
          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100" data-testid="confirmed-order-id">
            {orderId}
          </span>
        </div>
        {total > 0 && (
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex justify-between items-center">
            <span className="text-zinc-500">Đã thanh toán:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(total)}
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Link href="/" className="w-full">
          <Button variant="primary" size="lg" className="w-full">
            Quay về trang chủ
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6 font-sans transition-colors duration-200"
      style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}
    >
      <Suspense fallback={<div className="text-zinc-500">Đang tải thông tin đơn hàng...</div>}>
        <SuccessContent />
      </Suspense>
    </main>
  );
}
