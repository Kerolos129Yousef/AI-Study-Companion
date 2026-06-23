import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizQuestion } from '../../components/QuizQuestion';

const defaultProps = {
  question: 'What is photosynthesis?',
  options: ['Process A', 'Process B', 'Process C', 'Process D'],
  onSelectAnswer: jest.fn(),
};

describe('QuizQuestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders answer options with letter labels', () => {
    render(<QuizQuestion {...defaultProps} />);

    expect(screen.getByText(/A\./)).toBeInTheDocument();
    expect(screen.getByText(/Process A/)).toBeInTheDocument();
    expect(screen.getByText(/D\./)).toBeInTheDocument();
  });

  it('does not show the question text during the quiz', () => {
    render(<QuizQuestion {...defaultProps} />);

    expect(screen.queryByText('What is photosynthesis?')).not.toBeInTheDocument();
  });

  it('calls onSelectAnswer with the option letter when clicked', async () => {
    const user = userEvent.setup();
    const onSelectAnswer = jest.fn();

    render(<QuizQuestion {...defaultProps} onSelectAnswer={onSelectAnswer} />);

    await user.click(screen.getByText(/B\./));

    expect(onSelectAnswer).toHaveBeenCalledWith('B');
  });

  it('highlights the selected answer', () => {
    render(<QuizQuestion {...defaultProps} selectedAnswer="C" />);

    const selectedButton = screen.getByText(/C\./).closest('button');
    expect(selectedButton?.className).toContain('border-blue-500');
  });

  it('shows question and correct/wrong styling in review mode', async () => {
    const user = userEvent.setup();
    const onSelectAnswer = jest.fn();

    render(
      <QuizQuestion
        {...defaultProps}
        selectedAnswer="B"
        showCorrect
        correctAnswer="A"
        onSelectAnswer={onSelectAnswer}
      />
    );

    expect(screen.getByText('What is photosynthesis?')).toBeInTheDocument();

    const correctButton = screen.getByText(/A\./).closest('button');
    const wrongButton = screen.getByText(/B\./).closest('button');

    expect(correctButton?.className).toContain('border-green-500');
    expect(wrongButton?.className).toContain('border-red-500');

    await user.click(correctButton!);
    expect(onSelectAnswer).not.toHaveBeenCalled();
  });
});
