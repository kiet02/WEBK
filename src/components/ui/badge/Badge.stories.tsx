import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Badge } from './Badge';

const meta = {
  component: Badge,
  tags: ['autodocs', 'ai-generated'],
  parameters: {
    layout: 'centered',
  },
  args: {
    children: 'Badge',
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    variant: 'default',
    children: 'Default',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Default')).toBeInTheDocument();
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Active',
    dot: true,
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Pending',
    dot: true,
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Failed',
    dot: true,
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Draft',
  },
};
