import { test, expect } from '@playwright/test';

test.describe('GameLingo AI Studio - End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    // Wait for main studio title to appear
    await expect(page.getByRole('heading', { name: 'GameLingo AI Studio' })).toBeVisible();
  });

  test('Flow 1: Khởi động giao diện & Nạp dự án mẫu RPG Maker thành công', async ({ page }) => {
    // Verify header and sample project section exists
    await expect(page.getByText('Dự Án Mẫu Có Sẵn (1-Click Test)')).toBeVisible();

    // Click on RPG Maker sample button
    const sampleBtn = page.getByRole('button', { name: /RPG Maker/i }).first();
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();

    // Verify statistics counter displays segments
    await expect(page.getByText('Tiến độ dịch')).toBeVisible();
    await expect(page.getByText('Mã Tag An Toàn')).toBeVisible();

    // Verify dialogue lines appear
    await expect(page.getByText(/Trưởng làng|Eldoria|Hiệp sĩ/i).first()).toBeVisible();
  });

  test('Flow 2: Điều hướng phân trang 20 câu/tab', async ({ page }) => {
    // Ensure Tab strip is visible
    await expect(page.getByText('Phân Tab Hội Thoại')).toBeVisible();
    await expect(page.getByText(/20 câu \/ tab/i)).toBeVisible();

    // Check that Tab 1 is active by default
    const tab1Btn = page.getByRole('button', { name: /Tab 1/i });
    await expect(tab1Btn).toBeVisible();

    // If Tab 2 exists, switch to Tab 2
    const tab2Btn = page.getByRole('button', { name: /Tab 2/i });
    if (await tab2Btn.isVisible()) {
      await tab2Btn.click();
      // Should show question numbers in 20s
      await expect(page.getByText(/#21/i).first()).toBeVisible();

      // Click "◀ Trước" button
      const prevBtn = page.getByRole('button', { name: /◀ Trước/i });
      await prevBtn.click();
      await expect(page.getByText(/#1/i).first()).toBeVisible();
    }
  });

  test('Flow 3: Tìm kiếm câu thoại theo từ khóa', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Tìm kiếm chuỗi thoại/i);
    await expect(searchInput).toBeVisible();

    // Type a keyword
    await searchInput.fill('Eldoria');

    // Wait for filtered results
    await expect(page.getByText(/Eldoria/i).first()).toBeVisible();

    // Clear search
    await searchInput.clear();
  });

  test('Flow 4: Mở Modal Nhân Vật & Bật/Tắt Tô Màu Đại Từ', async ({ page }) => {
    // Click "🎭 Đại Từ & Nhân Vật" button
    const personasBtn = page.getByRole('button', { name: /Đại Từ & Nhân Vật/i });
    await expect(personasBtn).toBeVisible();
    await personasBtn.click();

    // Verify modal title
    await expect(page.getByRole('heading', { name: /Phân Tích Đại Từ & Vai Trò Nhân Vật/i })).toBeVisible();

    // Close modal
    const closeBtn = page.getByRole('button', { name: /Áp Dụng & Đóng/i });
    await closeBtn.click();
    await expect(page.getByRole('heading', { name: /Phân Tích Đại Từ & Vai Trò Nhân Vật/i })).not.toBeVisible();

    // Toggle pronoun highlight mode
    const highlightToggle = page.getByRole('button', { name: /Tô Màu Đại Từ/i });
    await expect(highlightToggle).toBeVisible();
    await highlightToggle.click();
  });

  test('Flow 5: Chỉnh sửa bản dịch & Duyệt câu', async ({ page }) => {
    // Find the first translation textarea
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    // Type translation
    const testText = 'Bản dịch thử nghiệm E2E test';
    await textarea.fill(testText);
    await expect(textarea).toHaveValue(testText);

    // Click row "Duyệt" button (exact match to not hit the filter tab "Đã duyệt")
    const reviewBtn = page.getByRole('button', { name: /^Duyệt$/, exact: true }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await expect(page.getByRole('button', { name: /✓ Đã Duyệt/i }).first()).toBeVisible();
  });
});
