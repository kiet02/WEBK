import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';
import { Button } from '../button';
import { Input } from '../input';
import { Badge } from '../badge';
import { Avatar } from '../avatar';

const meta = {
  component: Card,
  tags: ['autodocs', 'ai-generated'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Tổng quan dự án</CardTitle>
        <CardDescription>Báo cáo tiến độ và trạng thái tuần này.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Tất cả 12 tính năng của sprint hiện tại đã được triển khai và hoàn thành kiểm thử.
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm">Chi tiết</Button>
        <Button size="sm">Tiếp tục</Button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Tổng quan dự án')).toBeInTheDocument();
    await expect(canvas.getByText('Báo cáo tiến độ và trạng thái tuần này.')).toBeInTheDocument();
  },
};

export const WithHoverEffect: Story = {
  render: () => (
    <Card hoverEffect className="w-[360px] cursor-pointer">
      <CardHeader>
        <CardTitle>Thẻ có hiệu ứng Hover</CardTitle>
        <CardDescription>Rê chuột để thấy hiệu ứng nâng thẻ lên.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Hiệu ứng chuyển động mượt mà nâng cao trải nghiệm người dùng.
        </p>
      </CardContent>
    </Card>
  ),
};

const ComplexProfileCard = () => {
  const [name, setName] = useState('Alex Nguyen');
  const [email, setEmail] = useState('alex@example.com');
  const [nameError, setNameError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [avatarInitials, setAvatarInitials] = useState('AN');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (e.target.value.trim()) {
      setNameError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Họ và tên không được để trống.');
      return;
    }
    setIsLoading(true);
    setIsSuccess(false);

    // Giả lập cuộc gọi API bất đồng bộ
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      const initials = name
        .trim()
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      setAvatarInitials(initials || 'AN');
    }, 400);
  };

  return (
    <Card className="w-[420px] shadow-lg border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar fallback={avatarInitials} size="lg" status={isSuccess ? 'live' : 'online'} />
            <div>
              <CardTitle className="text-base">{name || 'Chưa đặt tên'}</CardTitle>
              <CardDescription className="text-xs">{email}</CardDescription>
            </div>
          </div>
          <Badge variant={isSuccess ? 'success' : isLoading ? 'warning' : 'outline'} dot>
            {isSuccess ? 'Đã lưu' : isLoading ? 'Đang lưu' : 'Bản nháp'}
          </Badge>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {isSuccess && (
            <div
              data-testid="success-banner"
              className="p-3 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            >
              Cập nhật hồ sơ thành công!
            </div>
          )}
          <Input
            label="Họ và tên"
            value={name}
            onChange={handleNameChange}
            error={nameError}
            placeholder="Nhập họ và tên..."
            disabled={isLoading}
          />
          <Input
            label="Địa chỉ Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tenban@example.com"
            disabled={isLoading}
          />
        </CardContent>
        <CardFooter className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            disabled={isLoading}
            onClick={() => {
              setName('Alex Nguyen');
              setNameError('');
              setIsSuccess(false);
              setAvatarInitials('AN');
            }}
          >
            Đặt lại
          </Button>
          <Button size="sm" type="submit" isLoading={isLoading}>
            Lưu thay đổi
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export const ComplexInteractiveFlow: Story = {
  render: () => <ComplexProfileCard />,
  play: async ({ canvas, userEvent }) => {
    // 1. Kiểm tra trạng thái hiển thị ban đầu
    const nameInput = canvas.getByRole('textbox', { name: /họ và tên/i });
    const submitBtn = canvas.getByRole('button', { name: /lưu thay đổi/i });
    await expect(nameInput).toHaveValue('Alex Nguyen');
    await expect(canvas.getByText('Bản nháp')).toBeInTheDocument();

    // 2. Kích hoạt Validation Error: Xóa rỗng tên và bấm Lưu
    await userEvent.clear(nameInput);
    await userEvent.click(submitBtn);
    await expect(canvas.getByText('Họ và tên không được để trống.')).toBeInTheDocument();

    // 3. Người dùng khắc phục lỗi: Nhập tên mới hợp lệ
    await userEvent.type(nameInput, 'Minh Nguyen');
    await expect(canvas.queryByText('Họ và tên không được để trống.')).not.toBeInTheDocument();

    // 4. Bấm Lưu và kiểm tra trạng thái kích hoạt Loading
    await userEvent.click(submitBtn);

    // 5. Chờ phản hồi bất đồng bộ và kiểm chứng trạng thái thành công hoàn chỉnh
    const successBanner = await canvas.findByTestId('success-banner');
    await expect(successBanner).toHaveTextContent('Cập nhật hồ sơ thành công!');
    await expect(canvas.getByText('Đã lưu')).toBeInTheDocument();
    await expect(canvas.getByText('MN')).toBeInTheDocument();
  },
};

