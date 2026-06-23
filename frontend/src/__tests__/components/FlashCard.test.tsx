import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlashCard } from '../../components/FlashCard';

describe('FlashCard', () => {
  it('shows the question by default', () => {
    render(<FlashCard front="What is SM-2?" back="A spaced repetition algorithm" />);

    expect(screen.getByText('Question')).toBeInTheDocument();
    expect(screen.getByText('What is SM-2?')).toBeInTheDocument();
    expect(screen.queryByText('A spaced repetition algorithm')).not.toBeInTheDocument();
  });

  it('flips to show the answer when clicked', async () => {
    const user = userEvent.setup();

    render(<FlashCard front="What is SM-2?" back="A spaced repetition algorithm" />);

    await user.click(screen.getByText('What is SM-2?'));

    expect(screen.getByText('Answer')).toBeInTheDocument();
    expect(screen.getByText('A spaced repetition algorithm')).toBeInTheDocument();
  });

  it('calls onReview with the selected ease rating', async () => {
    const user = userEvent.setup();
    const onReview = jest.fn();

    render(
      <FlashCard
        front="Question"
        back="Answer"
        onReview={onReview}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Easy' }));
    expect(onReview).toHaveBeenCalledWith('easy');

    await user.click(screen.getByRole('button', { name: 'Hard' }));
    expect(onReview).toHaveBeenCalledWith('hard');

    await user.click(screen.getByRole('button', { name: 'Again' }));
    expect(onReview).toHaveBeenCalledWith('again');
  });

  it('hides review buttons when onReview is not provided', () => {
    render(<FlashCard front="Question" back="Answer" />);

    expect(screen.queryByRole('button', { name: 'Easy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
  });
});
