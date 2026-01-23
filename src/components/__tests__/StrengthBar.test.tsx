import React from 'react';
import { render } from '@testing-library/react';
import StrengthBar from '../StrengthBar';

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

    // count filled segments by checking computed background color and opacity
    let filledCount = 0;
    for (const child of Array.from(root.children)) {
      const el = child as HTMLElement;
      const computed = getComputedStyle(el);
      if (computed.opacity === '1' && (computed.backgroundColor === 'rgb(255, 0, 0)' || computed.backgroundColor === 'rgb(255,0,0)')) {
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
      expect(getComputedStyle(el).opacity).toBe('1');
    });
    unfilled.forEach(el => {
      expect(getComputedStyle(el).opacity).toBe('0.5');
    });
  });
});
