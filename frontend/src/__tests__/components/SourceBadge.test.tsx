import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SourceBadge } from '../../components/SourceBadge';

describe('SourceBadge', () => {
  it('renders nothing without a lecture title', () => {
    const { container } = render(<SourceBadge courseName="Biology 101" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders lecture and course information', () => {
    render(
      <SourceBadge
        lectureTitle="Cell Structure"
        courseName="Biology 101"
        createdAt="2026-06-01T00:00:00.000Z"
      />
    );

    expect(screen.getByText('From Lecture')).toBeInTheDocument();
    expect(screen.getByText('Cell Structure')).toBeInTheDocument();
    expect(screen.getByText('Biology 101')).toBeInTheDocument();
    expect(screen.getByText('Jun 1, 2026')).toBeInTheDocument();
  });

  it('calls onNavigateToLecture when clicked', async () => {
    const user = userEvent.setup();
    const onNavigateToLecture = jest.fn();

    render(
      <SourceBadge
        lectureTitle="Cell Structure"
        onNavigateToLecture={onNavigateToLecture}
      />
    );

    await user.click(screen.getByText('Cell Structure'));

    expect(onNavigateToLecture).toHaveBeenCalledTimes(1);
    expect(screen.getByText('View →')).toBeInTheDocument();
  });

  it('renders lecture title without optional fields', () => {
    render(<SourceBadge lectureTitle="Intro to Physics" />);

    expect(screen.getByText('Intro to Physics')).toBeInTheDocument();
    expect(screen.queryByText('in')).not.toBeInTheDocument();
    expect(screen.queryByText('View →')).not.toBeInTheDocument();
  });

  it('formats Date objects for createdAt', () => {
    render(
      <SourceBadge
        lectureTitle="Cell Structure"
        createdAt={new Date('2026-03-15T00:00:00.000Z')}
      />
    );

    expect(screen.getByText('Mar 15, 2026')).toBeInTheDocument();
  });
});
