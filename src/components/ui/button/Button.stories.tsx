import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import { Button } from './Button';

const meta = {
  component: Button,
  tags: ['autodocs', 'ai-generated'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'link'],
      description: 'Visual appearance variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon'],
      description: 'Size of the button',
    },
    isLoading: {
      control: 'boolean',
      description: 'Toggle loading state',
    },
    disabled: {
      control: 'boolean',
      description: 'Toggle disabled state',
    },
    leftIcon: {
      control: 'select',
      description: 'Icon hiển thị bên trái',
      options: ['None', 'Plus', 'ArrowRight', 'Search'],
      mapping: {
        None: undefined,
        Plus: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        ),
        ArrowRight: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        ),
        Search: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        ),
      },
    },
    rightIcon: {
      control: 'select',
      description: 'Icon hiển thị bên phải',
      options: ['None', 'ArrowRight'],
      mapping: {
        None: undefined,
        ArrowRight: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        ),
      },
    },
  },
  args: {
    children: 'Button',
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Action',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Action',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete Item',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    children: 'Processing...',
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    children: 'Disabled Button',
    disabled: true,
  },
};

export const WithIcons: Story = {
  render: (args) => (
    <Button
      {...args}
      leftIcon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
      }
    >
      Add New Item
    </Button>
  ),
};

export const CssCheck: Story = {
  args: {
    variant: 'primary',
    children: 'Submit',
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: /submit/i });
    // Primary Button uses Tailwind v4 bg-zinc-900, which resolves to oklch in Chromium
    await expect(getComputedStyle(button).backgroundColor).toBe('oklch(0.21 0.006 285.885)');
  },
};

export const InteractiveClickTest: Story = {
  args: {
    children: 'Click Me',
    variant: 'primary',
  },
  play: async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole('button', { name: /Click Me/i });

    // Verify initial render
    await expect(button).toBeInTheDocument();
    await expect(button).not.toBeDisabled();

    // Perform interaction
    await userEvent.click(button);

    // Verify callback invocation
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const InteractiveLoadingTest: Story = {
  args: {
    children: 'Submitting',
    isLoading: true,
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: /Submitting/i });

    // Verify disabled & accessibility state during loading
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(canvas.getByTestId('loading-spinner')).toBeInTheDocument();
    await expect(window.getComputedStyle(button).pointerEvents).toBe('none');
  },
};
