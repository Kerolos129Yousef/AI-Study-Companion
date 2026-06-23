import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudyGroupCard } from '../../components/StudyGroupCard';

describe('StudyGroupCard', () => {
  const baseProps = {
    name: 'Biology Study Group',
    memberCount: 5,
    materialCount: 12,
    isOwner: false,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders group name and stats', () => {
    render(
      <StudyGroupCard
        {...baseProps}
        description="Weekly review sessions"
      />
    );

    expect(screen.getByText('Biology Study Group')).toBeInTheDocument();
    expect(screen.getByText('Weekly review sessions')).toBeInTheDocument();
    expect(screen.getByText('5 members')).toBeInTheDocument();
    expect(screen.getByText('12 materials')).toBeInTheDocument();
  });

  it('uses singular labels for single member and material', () => {
    render(<StudyGroupCard {...baseProps} memberCount={1} materialCount={1} />);

    expect(screen.getByText('1 member')).toBeInTheDocument();
    expect(screen.getByText('1 material')).toBeInTheDocument();
  });

  it('calls onClick when the card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(<StudyGroupCard {...baseProps} onClick={onClick} />);

    await user.click(screen.getByText('Biology Study Group'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows owner badge and edit/delete actions for owners', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    const onDelete = jest.fn();

    render(
      <StudyGroupCard
        {...baseProps}
        isOwner
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('Owner')).toBeInTheDocument();

    await user.click(screen.getByTitle('Edit group'));
    await user.click(screen.getByTitle('Delete group'));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows leave action for non-owners', async () => {
    const user = userEvent.setup();
    const onLeave = jest.fn();

    render(<StudyGroupCard {...baseProps} onLeave={onLeave} />);

    await user.click(screen.getByTitle('Leave group'));

    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Owner')).not.toBeInTheDocument();
  });
});
