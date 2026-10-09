import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState, ErrorState } from './ui';

describe('state components', () => {
  it('renders an empty state with its title and hint', () => {
    render(<EmptyState title="No tasks found" hint="Create one to get started" />);
    expect(screen.getByText('No tasks found')).toBeInTheDocument();
    expect(screen.getByText('Create one to get started')).toBeInTheDocument();
  });
  it('renders an error state with a retry button', () => {
    render(<ErrorState message="Unable to load dashboard" onRetry={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load dashboard');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
