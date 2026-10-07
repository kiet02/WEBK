import { test, expect } from '@playwright/test';

test.describe('Kiểm thử Toàn diện (E2E Test): Luồng Thanh toán Đơn hàng', () => {
  test('người dùng duyệt trang checkout, nhập voucher, thanh toán và chuyển hướng thành công', async ({ page }) => {
    // 1. Mở trang thanh toán trên trình duyệt thật
    await page.goto('/checkout');

    // Kiểm tra tiêu đề trang
    await expect(page.getByRole('heading', { name: 'Thanh toán đơn hàng' })).toBeVisible();

    // 2. Nhập mã voucher giảm giá 20%
    const voucherInput = page.getByPlaceholder('Nhập mã voucher...');
    await voucherInput.fill('GIAM20');
    await page.getByRole('button', { name: 'Áp dụng' }).click();

    // Xác minh giảm giá xuất hiện
    await expect(page.getByText('Giảm giá (GIAM20):')).toBeVisible();

    // 3. Nhấn Xác nhận thanh toán
    const payButton = page.getByTestId('pay-button');
    await payButton.click();

    // 4. Kiểm tra điều hướng thật sang trang /checkout/success
    await page.waitForURL(/\/checkout\/success/);
    expect(page.url()).toContain('/checkout/success');

    // 5. Xác minh thông tin trên trang thành công
    await expect(page.getByRole('heading', { name: 'Đặt hàng thành công!' })).toBeVisible();
    const orderIdElement = page.getByTestId('confirmed-order-id');
    await expect(orderIdElement).toBeVisible();
    await expect(orderIdElement).toHaveText(/ORD-\d+/);

    // 6. Nhấn quay về trang chủ
    await page.getByRole('button', { name: 'Quay về trang chủ' }).click();
    await page.waitForURL('/');
    expect(page.url()).toBe('http://localhost:3000/');
  });

  test('người dùng chuyển đổi theme màu trên trang chủ và giao diện đổi màu thực tế', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');

    // 1. Nhấn chọn theme Blue
    await page.getByRole('button', { name: 'Blue' }).click();
    await expect(html).toHaveAttribute('data-theme', 'blue');
    const blueBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--theme-bg').trim()
    );
    expect(blueBg).toBe('#f0f7ff');

    // 2. Nhấn chọn theme Emerald
    await page.getByRole('button', { name: 'Emerald' }).click();
    await expect(html).toHaveAttribute('data-theme', 'emerald');
    const emeraldBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--theme-bg').trim()
    );
    expect(emeraldBg).toBe('#ecfdf5');

    // 3. Nhấn chọn theme Dark
    await page.getByRole('button', { name: 'Dark' }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(html).toHaveClass(/dark/);
    const darkBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--theme-bg').trim()
    );
    expect(darkBg).toBe('#09090b');
  });
});
