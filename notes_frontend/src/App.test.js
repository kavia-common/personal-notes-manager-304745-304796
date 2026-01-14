import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Notes header', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /notes/i })).toBeInTheDocument();
});
