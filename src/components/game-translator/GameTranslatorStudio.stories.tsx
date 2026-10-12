import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent } from 'storybook/test';
import { GameTranslatorStudio } from './GameTranslatorStudio';

const meta = {
  title: 'GameTranslator/GameTranslatorStudio',
  component: GameTranslatorStudio,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof GameTranslatorStudio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InteractiveSwitchDemo: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify main header
    const heading = await canvas.findByText('GameLingo AI Studio');
    await expect(heading).toBeInTheDocument();

    // Verify sample demo buttons
    const renpyBtn = await canvas.findByText("Ren'Py VN");
    await expect(renpyBtn).toBeInTheDocument();

    // Switch to Ren'Py
    await userEvent.click(renpyBtn);

    // Verify Ren'Py detection badge appears
    const renpyBadge = await canvas.findByText("Ren'Py Visual Novel Engine");
    await expect(renpyBadge).toBeInTheDocument();
  },
};
