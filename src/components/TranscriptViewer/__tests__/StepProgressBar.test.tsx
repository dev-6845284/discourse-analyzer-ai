import React from 'react';
import { render, screen } from '@testing-library/react';
import StepProgressBar, { StepInfo } from '../StepProgressBar';

describe('StepProgressBar', () => {
  it('renders step labels and icons', () => {
    const steps: StepInfo[] = [
      { step: 'transcript', status: 'pending', label: 'Transcript' },
      { step: 'topics', status: 'completed', label: 'Topics' },
    ];

    const { container } = render(<StepProgressBar steps={steps} currentStep={'transcript'} onStepClick={() => {}} />);

    // Verify buttons with titles exist
    expect(screen.getByTitle('Transcript')).toBeInTheDocument();
    expect(screen.getByTitle('Topics')).toBeInTheDocument();

    // Icons are rendered as SVG elements (lucide icons render svgs)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });
});