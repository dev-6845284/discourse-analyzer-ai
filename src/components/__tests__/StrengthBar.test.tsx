import React from 'react';
import { render } from '@testing-library/react';
import StrengthBar from '../ui/StrengthBar';

describe('StrengthBar', () => {
  test.each([
    [0, 5, 0],
    [1, 5, 1],
    [3, 5, 3],
    [5, 5, 5],
  ])('level %i with max %i fills %i segments', (level, max, expectedFilled) => {
    const tooltip = `level-${level}`;
    const color = '#ff0000';
    const { getByTitle } = render(
      <StrengthBar level={level} max={max} color={color} tooltip={tooltip} />
    );
    const root = getByTitle(tooltip);

    // number of segments
    expect(root.children.length).toBe(max);

    // count filled segments by checking inline background color and opacity class
    let filledCount = 0;
    for (const child of Array.from(root.children)) {
      const el = child as HTMLElement;
      // Inline style should be preserved
      const hasBg = el.style.backgroundColor === 'rgb(255, 0, 0)' || el.style.backgroundColor === '#ff0000';
      // Tailwind class for opacity
      const isOpaque = el.classList.contains('opacity-100');

      if (isOpaque && hasBg) {
        filledCount++;
      }
    }

    expect(filledCount).toBe(expectedFilled);
  });

  test('unfilled segments have lower opacity', () => {
    const tooltip = 'opacity-test';
    const { getByTitle } = render(
      <StrengthBar level={2} max={5} color="#00ff00" tooltip={tooltip} />
    );
    const root = getByTitle(tooltip);
    const elements = Array.from(root.children) as HTMLElement[];
    const filled = elements.slice(0, 2);
    const unfilled = elements.slice(2);

    filled.forEach(el => {
      expect(el.classList.contains('opacity-100')).toBe(true);
    });
    unfilled.forEach(el => {
      expect(el.classList.contains('opacity-50')).toBe(true);
    });
  });
});
