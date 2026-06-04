import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AccessControlManagement from '../AccessControlManagement';

// Mock the api module
jest.mock('../../../utils/api', () => ({
  getAccessControlList: jest.fn(),
  updateAccessControl: jest.fn(),
  createAccessControl: jest.fn(),
}));

import { getAccessControlList, updateAccessControl, createAccessControl } from '../../../utils/api';

describe('AccessControlManagement', () => {
  beforeEach(() => {
    (getAccessControlList as jest.Mock).mockReset();
    (updateAccessControl as jest.Mock).mockReset();
    (createAccessControl as jest.Mock).mockReset();
  });

  it('renders list and saves updated role', async () => {
    const mockItems = [
      { _id: '1', method: 'GET', path: '/api/quotes', requiredRole: 'viewer' },
      { _id: '2', method: 'POST', path: '/api/quotes', requiredRole: 'editor' },
    ];
    (getAccessControlList as jest.Mock).mockResolvedValue({ data: mockItems });
    (updateAccessControl as jest.Mock).mockResolvedValue({ data: { ok: true } });

    const onClose = jest.fn();
    const { container } = render(<AccessControlManagement onClose={onClose} />);

    // wait for items to load
    await waitFor(() => expect(getAccessControlList).toHaveBeenCalled());

    // ensure items are rendered (there may be duplicates for path because multiple methods)
    await waitFor(() => expect(screen.getByText(/GET/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText('/api/quotes').length).toBeGreaterThan(0));

    // change first item's role to 'admin' by selecting the radio inside the first group's name
    const adminRadio = container.querySelector('input[name="role-1-0"][value="admin"]') as HTMLInputElement | null;
    expect(adminRadio).not.toBeNull();
    if (adminRadio) fireEvent.click(adminRadio);

    // click save for the first item
    const saveButtons = screen.getAllByText('Save');
    expect(saveButtons.length).toBeGreaterThan(0);
    fireEvent.click(saveButtons[0]);

    await waitFor(() => expect(updateAccessControl).toHaveBeenCalled());
  });
});
