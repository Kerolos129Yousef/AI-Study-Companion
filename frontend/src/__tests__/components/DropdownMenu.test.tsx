import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings, Trash2 } from 'lucide-react';
import { DropdownMenu } from '../../components/DropdownMenu';

describe('DropdownMenu', () => {
  const items = [
    { label: 'Edit', icon: <Settings data-testid="edit-icon" />, onClick: jest.fn() },
    {
      label: 'Delete',
      icon: <Trash2 data-testid="delete-icon" />,
      onClick: jest.fn(),
      isDanger: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the menu when the trigger is clicked', async () => {
    const user = userEvent.setup();

    render(<DropdownMenu items={items} />);

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls item onClick and closes the menu', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();

    render(
      <DropdownMenu
        items={[{ label: 'Edit', icon: <Settings />, onClick: onEdit }]}
      />
    );

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Edit'));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('closes the menu when clicking outside', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <div data-testid="outside">Outside</div>
        <DropdownMenu items={items} />
      </div>
    );

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Edit')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('applies danger styling to destructive items', async () => {
    const user = userEvent.setup();

    render(<DropdownMenu items={items} />);

    await user.click(screen.getByRole('button'));

    const deleteButton = screen.getByText('Delete').closest('button');
    expect(deleteButton?.className).toContain('text-red-400');
  });
});
