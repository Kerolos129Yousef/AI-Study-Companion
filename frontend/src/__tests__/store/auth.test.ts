import { useAuthStore } from '../../store/auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });

  it('starts unauthenticated when storage is empty', () => {
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('persists user and token when set', () => {
    const user = { id: '1', email: 'user@example.com', name: 'User' };

    useAuthStore.getState().setUser(user);
    useAuthStore.getState().setToken('jwt-token');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.token).toBe('jwt-token');
    expect(state.isAuthenticated).toBe(true);
    expect(localStorage.getItem('user')).toBe(JSON.stringify(user));
    expect(localStorage.getItem('token')).toBe('jwt-token');
  });

  it('clears storage on logout', () => {
    const user = { id: '1', email: 'user@example.com', name: 'User' };
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().setToken('jwt-token');

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('removes user from storage when set to null', () => {
    const user = { id: '1', email: 'user@example.com', name: 'User' };
    useAuthStore.getState().setUser(user);

    useAuthStore.getState().setUser(null);

    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('clears token when set to null', () => {
    useAuthStore.getState().setToken('jwt-token');

    useAuthStore.getState().setToken(null);

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('handles corrupt user data in localStorage on init', async () => {
    jest.resetModules();
    localStorage.clear();
    localStorage.setItem('user', '{invalid-json');

    const { useAuthStore: freshStore } = await import('../../store/auth');

    expect(freshStore.getState().user).toBeNull();
  });
});
