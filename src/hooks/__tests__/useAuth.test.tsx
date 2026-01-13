import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import api from '../../utils/api';
import { I18nProvider } from '../../i18n';

// Mock api
jest.mock('../../utils/api', () => ({
    post: jest.fn(),
    get: jest.fn(),
}));

// Mock config
jest.mock('../../config/app.config', () => ({
    GOOGLE_CLIENT_ID: 'mock-client-id'
}));

// Mock auth utils
jest.mock('../../utils/auth', () => ({
    shouldBypassAuth: jest.fn().mockReturnValue(false),
    getDefaultLocalUser: jest.fn(),
}));

const TestComponent: React.FC = () => {
    const { loginWithPassword, loginError } = useAuth();

    return (
        <div>
            <button onClick={() => loginWithPassword('test@example.com', 'password')}>Login</button>
            {loginError && <div data-testid="error-message">{loginError}</div>}
        </div>
    );
};

describe('useAuth', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.setItem('discourse_analyzer_lang', 'en');
    });

    it('displays error message with retryAfter details when login fails with 429', async () => {
        // Setup mock error response
        const mockError = {
            response: {
                data: {
                    error: "Too many requests",
                    message: "Please try again later",
                    retryAfter: "30"
                }
            }
        };
        (api.post as jest.Mock).mockRejectedValue(mockError);

        render(
            <I18nProvider>
                <TestComponent />
            </I18nProvider>
        );

        fireEvent.click(screen.getByText('Login'));

        await waitFor(() => {
            const errorElement = screen.getByTestId('error-message');
            expect(errorElement.textContent).toMatch(/(Please wait|Prašome palaukti) 30/);
        });
    });

    it('displays standard error message when retryAfter is missing', async () => {
        // Setup mock error response without retryAfter
        const mockError = {
            response: {
                data: {
                    message: "Invalid credentials"
                }
            }
        };
        (api.post as jest.Mock).mockRejectedValue(mockError);

        render(
            <I18nProvider>
                <TestComponent />
            </I18nProvider>
        );

        fireEvent.click(screen.getByText('Login'));

        await waitFor(() => {
            const errorElement = screen.getByTestId('error-message');
            expect(errorElement.textContent).toBe('Invalid credentials');
        });
    });
});
