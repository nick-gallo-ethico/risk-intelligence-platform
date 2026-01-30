import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertySection } from '../property-section';

describe('PropertySection', () => {
  it('renders title correctly', () => {
    render(
      <PropertySection title="Status & Classification">
        <div>Content</div>
      </PropertySection>
    );

    expect(screen.getByText('Status & Classification')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <PropertySection title="Test Section">
        <div data-testid="child-content">Child content here</div>
      </PropertySection>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('is expanded by default', () => {
    render(
      <PropertySection title="Test Section">
        <div data-testid="content">Content</div>
      </PropertySection>
    );

    // Content should be visible
    expect(screen.getByTestId('content')).toBeVisible();
  });

  it('can start collapsed when defaultOpen is false', () => {
    render(
      <PropertySection title="Test Section" defaultOpen={false}>
        <div data-testid="content">Content</div>
      </PropertySection>
    );

    // Content should not be visible (collapsed)
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('collapses when header is clicked', async () => {
    const user = userEvent.setup();

    render(
      <PropertySection title="Test Section">
        <div data-testid="content">Content</div>
      </PropertySection>
    );

    // Initially visible
    expect(screen.getByTestId('content')).toBeVisible();

    // Click header to collapse
    await user.click(screen.getByText('Test Section'));

    // Content should be hidden
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('expands when collapsed header is clicked', async () => {
    const user = userEvent.setup();

    render(
      <PropertySection title="Test Section" defaultOpen={false}>
        <div data-testid="content">Content</div>
      </PropertySection>
    );

    // Initially hidden
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();

    // Click header to expand
    await user.click(screen.getByText('Test Section'));

    // Content should be visible
    expect(screen.getByTestId('content')).toBeVisible();
  });

  it('shows chevron icon that rotates when collapsed', async () => {
    const user = userEvent.setup();

    render(
      <PropertySection title="Test Section">
        <div>Content</div>
      </PropertySection>
    );

    // Find the chevron SVG
    const chevron = document.querySelector('svg');
    expect(chevron).toBeInTheDocument();

    // Initially rotated (expanded state shows rotate-180)
    expect(chevron).toHaveClass('rotate-180');

    // Click to collapse
    await user.click(screen.getByText('Test Section'));

    // Chevron should not have rotate-180 class
    expect(chevron).not.toHaveClass('rotate-180');
  });

  it('applies custom className', () => {
    const { container } = render(
      <PropertySection title="Test Section" className="custom-class">
        <div>Content</div>
      </PropertySection>
    );

    // The Card component should have the custom class
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has hover style on header', () => {
    render(
      <PropertySection title="Test Section">
        <div>Content</div>
      </PropertySection>
    );

    // Find the header element (CardHeader with cursor-pointer class)
    const header = screen.getByText('Test Section').closest('[class*="cursor-pointer"]');
    expect(header).toHaveClass('cursor-pointer');
    expect(header).toHaveClass('hover:bg-gray-50');
  });

  it('toggles multiple times correctly', async () => {
    const user = userEvent.setup();

    render(
      <PropertySection title="Test Section">
        <div data-testid="content">Content</div>
      </PropertySection>
    );

    const header = screen.getByText('Test Section');

    // Initial: expanded
    expect(screen.getByTestId('content')).toBeVisible();

    // Click 1: collapse
    await user.click(header);
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();

    // Click 2: expand
    await user.click(header);
    expect(screen.getByTestId('content')).toBeVisible();

    // Click 3: collapse again
    await user.click(header);
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });
});
