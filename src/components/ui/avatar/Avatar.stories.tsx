import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fireEvent } from 'storybook/test';
import { Avatar } from './Avatar';

const meta = {
  component: Avatar,
  tags: ['autodocs', 'ai-generated'],
  parameters: {
    layout: 'centered',
  },
  args: {
    fallback: 'NV',
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof Avatar>;

export const FallbackInitials: Story = {
  args: {
    fallback: 'AN',
    size: 'lg',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('AN')).toBeInTheDocument();
  },
};

export const WithImage: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    alt: 'Avatar của người dùng',
    fallback: 'ND',
    size: 'lg',
  },
};

export const ImageErrorFallback: Story = {
  args: {
    src: 'https://invalid-url-domain.xyz/error.jpg',
    alt: 'Ảnh bị lỗi',
    fallback: 'ERR',
    size: 'lg',
  },
  play: async ({ canvas }) => {
    const img = canvas.getByRole('img');
    fireEvent.error(img);
    await expect(canvas.getByText('ERR')).toBeInTheDocument();
  },
};

export const OnlineStatus: Story = {
  args: {
    fallback: 'TS',
    status: 'online',
    size: 'lg',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('status-indicator')).toBeInTheDocument();
  },
};

export const BusyStatus: Story = {
  args: {
    fallback: 'LN',
    status: 'busy',
    size: 'lg',
  },
};

export const LiveStreaming: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    alt: 'Streamer đang live',
    fallback: 'YT',
    size: 'lg',
    status: 'live',
  },
  play: async ({ canvas }) => {
    const liveBadge = canvas.getByTestId('live-indicator');
    await expect(liveBadge).toBeInTheDocument();
    await expect(liveBadge).toHaveTextContent('LIVE');
  },
};

export const LiveStreamingFallback: Story = {
  args: {
    fallback: 'LV',
    size: 'lg',
    isLive: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Avatar size="sm" fallback="SM" status="online" />
      <Avatar size="md" fallback="MD" status="busy" />
      <Avatar size="lg" fallback="LG" status="live" />
      <Avatar size="xl" fallback="XL" status="offline" />
    </div>
  ),
};
