import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookOpen } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        icon={BookOpen}
        title="No courses yet"
        description="Create your first course to get started."
      />
    );

    expect(screen.getByText('No courses yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first course to get started.')).toBeInTheDocument();
  });

  it('renders an action button when provided', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();

    render(
      <EmptyState
        icon={BookOpen}
        title="No courses yet"
        description="Create your first course to get started."
        actionLabel="Add course"
        onAction={onAction}
      />
    );

    const button = screen.getByRole('button', { name: 'Add course' });
    await user.click(button);

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render a button without an action handler', () => {
    render(
      <EmptyState
        icon={BookOpen}
        title="No courses yet"
        description="Create your first course to get started."
        actionLabel="Add course"
      />
    );

    expect(screen.queryByRole('button', { name: 'Add course' })).not.toBeInTheDocument();
  });

  it('renders secondary action button variant', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();

    render(
      <EmptyState
        icon={BookOpen}
        title="No courses yet"
        description="Create your first course to get started."
        actionLabel="Learn more"
        onAction={onAction}
        actionVariant="secondary"
      />
    );

    const button = screen.getByRole('button', { name: 'Learn more' });
    expect(button.className).toContain('bg-slate-800');

    await user.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
