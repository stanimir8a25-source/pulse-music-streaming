import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export default function RegisterPage({ onSwitch, onSuccess }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'listener',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const email = form.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      setError('Моля, въведи валиден имейл (пример: name@gmail.com).');
      return;
    }

    setBusy(true);
    try {
      await register({ ...form, email });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel auth-card">
      <h2>Създай акаунт в Pulse</h2>
      <p className="hint">
        Ползвай реален имейл адрес. Временни и несъществуващи адреси се отхвърлят.
      </p>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Потребителско име
          <input
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            required
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="name@gmail.com"
            required
          />
        </label>

        <label>
          Парола
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            minLength={6}
            required
          />
        </label>

        <label>
          Роля
          <select
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
          >
            <option value="listener">Слушател</option>
            <option value="artist">Изпълнител / Артист</option>
          </select>
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? 'Проверка на имейл...' : 'Създай акаунт'}
        </button>
      </form>

      <p className="switch">
        Вече имаш акаунт?{' '}
        <button type="button" className="link" onClick={onSwitch}>
          Вход
        </button>
      </p>
    </section>
  );
}
