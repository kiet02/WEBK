import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Input } from './Input';

const meta = {
  component: Input,
  tags: ['autodocs', 'ai-generated'],
  parameters: {
    layout: 'centered',
  },
  args: {
    placeholder: 'Nhập nội dung...',
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Nhập họ và tên',
  },
};

export const WithLabelAndHelper: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'tenban@example.com',
    helperText: 'Chúng tôi cam kết không chia sẻ email của bạn.',
  },
};

export const WithError: Story = {
  args: {
    label: 'Mật khẩu',
    type: 'password',
    defaultValue: '123',
    error: 'Mật khẩu phải chứa ít nhất 8 ký tự.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Tài khoản',
    value: 'user_readonly',
    disabled: true,
  },
};

export const WithIcon: Story = {
  args: {
    label: 'Tìm kiếm',
    placeholder: 'Tìm kiếm dự án...',
    leftIcon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
  },
};

export const InteractiveTypingTest: Story = {
  args: {
    label: 'Tên người dùng',
    placeholder: 'Nhập tên...',
  },
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole('textbox', { name: /Tên người dùng/i });

    // Initial check
    await expect(input).toBeInTheDocument();
    await expect(input).toHaveValue('');

    // Type text
    await userEvent.type(input, 'Alex Nguyen');
    await expect(input).toHaveValue('Alex Nguyen');
  },
};
