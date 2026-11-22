import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ParkedAction } from '@/components/ui/ParkedAction'

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>
}

describe('<ParkedAction>', () => {
  it('renders disabled, never navigates, and shows a neutral not-available state on tap', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    render(
      <MemoryRouter initialEntries={['/customer/dashboard']}>
        <ParkedAction label="Gift Cards" />
        <Where />
      </MemoryRouter>,
    )
    const btn = screen.getByRole('button', { name: /gift cards/i })
    expect(btn).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByText(/not available yet/i)).not.toBeInTheDocument()
    fireEvent.click(btn)
    expect(screen.getByText(/not available yet/i)).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('/customer/dashboard')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(btn.closest('a')).toBeNull()
  })
})
